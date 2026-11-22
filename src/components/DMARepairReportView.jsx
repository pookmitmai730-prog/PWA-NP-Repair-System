import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { MapPin, Layers, CheckCircle2, RefreshCw, CalendarDays, Droplets, X, Gauge, Eye, EyeOff, Search } from 'lucide-react';

// 🌐 URL ของ Google Apps Script Web App หลัก
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbydqD3x19rIfyttJPLhZung7NxIBh4LXetkGlZbhW4GmqLtJ-LI6HQ0vX-p_vrJ-QsH9w/exec";

// 🗺️ พาธไฟล์ขอบเขตพื้นที่ DMA (.gpkg) ในโฟลเดอร์ public/
const DMA_GPKG_URL = "/B5522027_DMA_BOUNDARY.gpkg";

// 📍 จุดศูนย์กลางแผนที่เริ่มต้นที่จังหวัดนครพนม
const defaultCenter = [17.4157, 104.7877];

const ZONE_PALETTE = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#4f46e5', '#65a30d'];

// 🔴 Custom Marker สีแดงขนาดเล็ก
const smallRedDotIcon = L.divIcon({
  className: 'custom-red-dot',
  html: `<div style="width: 12px; height: 12px; background-color: #ef4444; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// 🕒 แปลงวันที่/เวลา เป็นรูปแบบวันเวลาไทยเต็ม (เช่น 17 พฤศจิกายน 2569 เวลา 14.38 น.)
const formatThaiDateTime = (rawDate) => {
  if (!rawDate || rawDate === '-') return '-';
  let dateObj = null;

  if (typeof rawDate === 'string' && rawDate.includes('/') && !rawDate.includes('T')) {
    const [datePart, timePart] = rawDate.trim().split(' ');
    const parts = datePart.split('/');
    if (parts.length === 3) {
      let year = parseInt(parts[2], 10);
      if (year > 2400) year -= 543;
      const month = String(parts[1]).padStart(2, '0');
      const day = String(parts[0]).padStart(2, '0');
      const timeStr = timePart ? timePart : '00:00';
      dateObj = new Date(`${year}-${month}-${day}T${timeStr}`);
    }
  } else {
    dateObj = new Date(rawDate);
  }

  if (!dateObj || isNaN(dateObj.getTime())) return String(rawDate);

  const thaiMonthsFull = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(dateObj);

  const getPart = (type) => parts.find(p => p.type === type)?.value || '';
  const day = parseInt(getPart('day'), 10);
  const monthIdx = parseInt(getPart('month'), 10) - 1;
  const yearBE = parseInt(getPart('year'), 10) + 543;
  const hour = getPart('hour');
  const minute = getPart('minute');

  return `${day} ${thaiMonthsFull[monthIdx]} ${yearBE} เวลา ${hour}.${minute} น.`;
};

// 📍 หาจุดกึ่งกลางของ Polygon เพื่อวางป๊อบอัพลอยประจำพื้นที่
const getPolygonCentroid = (paths) => {
  if (!Array.isArray(paths) || paths.length === 0) return defaultCenter;
  let latSum = 0;
  let lngSum = 0;
  let count = 0;
  paths.forEach(([lat, lng]) => {
    if (!isNaN(lat) && !isNaN(lng)) {
      latSum += lat;
      lngSum += lng;
      count += 1;
    }
  });
  return count > 0 ? [latSum / count, lngSum / count] : defaultCenter;
};

// 📐 ตรวจสอบพิกัดใน Polygon (Ray-Casting)
const isPointInPolygon = (point, polygonPaths) => {
  const x = point.lat;
  const y = point.lng;
  let inside = false;
  for (let i = 0, j = polygonPaths.length - 1; i < polygonPaths.length; j = i++) {
    const xi = polygonPaths[i][0], yi = polygonPaths[i][1];
    const xj = polygonPaths[j][0], yj = polygonPaths[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// 💧 คำนวณอัตราการไหลสูญเสียต่อวัน (ลบ.ม./วัน) ที่แรงดันตามพื้นที่ (รูรั่ว 2%)
const calculateDailyFlowRate = (sizeMm, pressureBar) => {
  if (!sizeMm || isNaN(sizeMm) || sizeMm <= 0) return 0;
  const pipeRadiusM = (sizeMm / 1000) / 2;
  const pipeAreaM2 = Math.PI * Math.pow(pipeRadiusM, 2);
  const leakAreaRatio = 0.02; 
  const effectiveLeakAreaM2 = pipeAreaM2 * leakAreaRatio;
  const pressurePa = pressureBar * 100000;
  const velocity = Math.sqrt((2 * pressurePa) / 1000); 
  const flowRateM3PerSec = effectiveLeakAreaM2 * velocity * 0.62; 
  return flowRateM3PerSec * 86400;
};

// 🧩 แปลง GeoPackage Binary Geometry (WKB) เป็นอาร์เรย์ของ Polygon ([ [lat, lng], ... ])
const parseGeoPackageGeometry = (blob) => {
  if (!blob || blob.length < 8) return [];
  let offset = 0;
  let flags = 0;
  if (blob[0] === 0x47 && blob[1] === 0x50) {
    flags = blob[3];
    const envelopeType = (flags >> 1) & 0x07;
    const envelopeSizes = [0, 32, 48, 48, 64];
    offset = 8 + (envelopeSizes[envelopeType] || 0);
  }

  const view = new DataView(blob.buffer, blob.byteOffset + offset, blob.byteLength - offset);
  let pos = 0;

  const readUint32 = (littleEndian) => {
    const val = view.getUint32(pos, littleEndian);
    pos += 4;
    return val;
  };

  const readDouble = (littleEndian) => {
    const val = view.getFloat64(pos, littleEndian);
    pos += 8;
    return val;
  };

  const parseWkbGeometry = () => {
    if (pos + 5 > view.byteLength) return [];
    const byteOrder = view.getUint8(pos);
    pos += 1;
    const littleEndian = byteOrder === 1;
    let wkbType = readUint32(littleEndian);
    if (wkbType >= 1000 && wkbType < 2000) wkbType -= 1000;
    else if (wkbType >= 2000 && wkbType < 3000) wkbType -= 2000;
    else if (wkbType >= 3000 && wkbType < 4000) wkbType -= 3000;
    else if (wkbType > 0x20000000) wkbType &= 0xff;

    const polygons = [];

    if (wkbType === 3) {
      const numRings = readUint32(littleEndian);
      for (let r = 0; r < numRings; r++) {
        const numPoints = readUint32(littleEndian);
        const ring = [];
        for (let p = 0; p < numPoints; p++) {
          const x = readDouble(littleEndian); // lng
          const y = readDouble(littleEndian); // lat
          if (!isNaN(y) && !isNaN(x)) {
            ring.push([y, x]);
          }
        }
        if (ring.length > 0 && r === 0) {
          polygons.push(ring);
        }
      }
    } else if (wkbType === 6) {
      const numPolygons = readUint32(littleEndian);
      for (let i = 0; i < numPolygons; i++) {
        polygons.push(...parseWkbGeometry());
      }
    }

    return polygons;
  };

  try {
    return parseWkbGeometry();
  } catch (err) {
    console.error("Error parsing GPKG geometry:", err);
    return [];
  }
};

// 📦 โหลดขอบเขต DMA จากไฟล์ B5522027_DMA_BOUNDARY.gpkg
const loadDmaBoundariesFromGpkg = async (url) => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`ไม่พบไฟล์ ${url} (HTTP ${response.status}) — ตรวจสอบว่าวางไฟล์ไว้ที่โฟลเดอร์ public/ แล้ว`);
  }

  const buffer = await response.arrayBuffer();
  const SQL = await initSqlJs({
    locateFile: () => sqlWasmUrl
  });

  const db = new SQL.Database(new Uint8Array(buffer));

  try {
    const contentsRes = db.exec(
      "SELECT table_name FROM gpkg_contents WHERE data_type = 'features' LIMIT 1"
    );
    const tableName = contentsRes?.[0]?.values?.[0]?.[0];
    if (!tableName) {
      throw new Error("ไม่พบตารางข้อมูลเชิงพื้นที่ (features) ในไฟล์ .gpkg");
    }

    const geomColRes = db.exec(
      `SELECT column_name FROM gpkg_geometry_columns WHERE table_name = '${String(tableName).replace(/'/g, "''")}' LIMIT 1`
    );
    const geomCol = geomColRes?.[0]?.values?.[0]?.[0] || 'geom';

    const rowsRes = db.exec(`SELECT * FROM "${String(tableName).replace(/"/g, '""')}"`);
    if (!rowsRes || rowsRes.length === 0) return [];

    const { columns, values } = rowsRes[0];
    const geomIdx = columns.findIndex(c => String(c).toLowerCase() === String(geomCol).toLowerCase());
    const nameColIdx = columns.findIndex(c =>
      ['dma_name', 'dmaname', 'name', 'dma', 'zone_name', 'label'].includes(String(c).toLowerCase())
    );
    const idColIdx = columns.findIndex(c =>
      ['dma_code', 'dmacode', 'code', 'id', 'fid', 'objectid'].includes(String(c).toLowerCase())
    );

    const zones = [];
    values.forEach((row, idx) => {
      const geomBlob = geomIdx >= 0 ? row[geomIdx] : null;
      const rings = parseGeoPackageGeometry(geomBlob);
      const rawName = nameColIdx >= 0 && row[nameColIdx] ? String(row[nameColIdx]).trim() : '';
      const rawId = idColIdx >= 0 && row[idColIdx] ? String(row[idColIdx]).trim() : `DMA-${idx + 1}`;
      const zoneName = rawName || rawId || `ขอบเขต DMA ${idx + 1}`;
      const color = ZONE_PALETTE[idx % ZONE_PALETTE.length];

      rings.forEach((path, ringIdx) => {
        if (Array.isArray(path) && path.length >= 3) {
          zones.push({
            id: `${rawId}-${ringIdx}`,
            name: zoneName,
            color,
            pressureBar: 1.0,
            esp32DeviceId: `ESP32-${rawId}`,
            paths: path,
            centroid: getPolygonCentroid(path)
          });
        }
      });
    });

    return zones;
  } finally {
    db.close();
  }
};

// 🖱️ ดักจับคลิกบนแผนที่
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function DmaMapReport({ jobs: propJobs }) {
  const [jobsData, setJobsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dmaZones, setDmaZones] = useState([]);
  const [loadingDma, setLoadingDma] = useState(false);
  const [dmaError, setDmaError] = useState('');
  // 🔌 เตรียมโครงสร้างค่าแรงดันแต่ละพื้นที่ DMA เพื่อรองรับการอัปเดตแบบ Realtime จาก ESP32 ในอนาคต
  const [esp32PressuresByZone, setEsp32PressuresByZone] = useState({});
  // 🎛️ สถานะเปิด/ปิดป๊อบอัพลอยรายพื้นที่ DMA
  const [visibleFloatingZones, setVisibleFloatingZones] = useState({});
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');
  const [reportType, setReportType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clickedReport, setClickedReport] = useState(null);

  // 🗺️ State สำหรับสลับโหมดแผนที่ ( เริ่มต้นเป็นแผนที่ถนนมาตรฐาน )
  const [mapLayerMode, setMapLayerMode] = useState('streets');

  const todayStr = new Date().toISOString().split('T')[0];

  const parseJobDate = (rawDate) => {
    if (!rawDate || rawDate === '-') return null;
    let parsedDate;
    if (typeof rawDate === 'string' && rawDate.includes('/')) {
      const parts = rawDate.split(' ')[0].split('/');
      if (parts.length === 3) {
        let year = parseInt(parts[2], 10);
        if (year > 2400) year -= 543;
        parsedDate = new Date(`${year}-${parts[1]}-${parts[0]}`);
      }
    } else {
      parsedDate = new Date(rawDate);
    }
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  };

  const fetchJobsFromSheet = async () => {
    setLoading(true);
    try {
      const response = await fetch(WEB_APP_URL);
      const data = await response.json();
      if (Array.isArray(data)) {
        setJobsData(data);
      } else if (data && typeof data === 'object') {
        const list = Array.isArray(data.data) ? data.data : Object.values(data);
        setJobsData(list);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDmaBoundaries = async () => {
    setLoadingDma(true);
    setDmaError('');
    try {
      const zones = await loadDmaBoundariesFromGpkg(DMA_GPKG_URL);
      setDmaZones(zones);
      setVisibleFloatingZones((prev) => {
        const next = {};
        zones.forEach((z) => {
          next[z.id] = prev[z.id] !== undefined ? prev[z.id] : true;
        });
        return next;
      });
    } catch (error) {
      console.error("Error loading DMA boundary file:", error);
      setDmaError(error?.message || `ไม่สามารถโหลดไฟล์ ${DMA_GPKG_URL} ได้`);
      setDmaZones([]);
    } finally {
      setLoadingDma(false);
    }
  };

  useEffect(() => {
    fetchDmaBoundaries();
  }, []);

  useEffect(() => {
    if (propJobs && Array.isArray(propJobs) && propJobs.length > 0) {
      setJobsData(propJobs);
    } else {
      fetchJobsFromSheet();
    }
  }, [propJobs]);

  const handleClearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const isZoneFloatingVisible = (zoneId) => {
    return visibleFloatingZones[zoneId] !== false;
  };

  const toggleZoneFloating = (zoneId) => {
    setVisibleFloatingZones((prev) => ({
      ...prev,
      [zoneId]: !(prev[zoneId] !== false)
    }));
  };

  const setAllFloatingZones = (show) => {
    const next = {};
    dmaZones.forEach((z) => {
      next[z.id] = show;
    });
    setVisibleFloatingZones(next);
  };

  const filteredDmaZonesForMenu = useMemo(() => {
    const q = zoneSearchQuery.trim().toLowerCase();
    if (!q) return dmaZones;
    return dmaZones.filter((z) => String(z.name || '').toLowerCase().includes(q));
  }, [dmaZones, zoneSearchQuery]);

  const activeFloatingCount = useMemo(() => {
    return dmaZones.filter((z) => isZoneFloatingVisible(z.id)).length;
  }, [dmaZones, visibleFloatingZones]);

  const filteredCompletedJobs = useMemo(() => {
    const now = new Date();
    return (jobsData || []).filter(job => {
      const status = (job.Status || job.status || '').toUpperCase();
      if (status !== 'COMPLETED') return false;

      const lat = parseFloat(job.Latitude || job.latitude);
      const lng = parseFloat(job.Longitude || job.longitude);
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return false;

      const rawClosed = job.ClosedAt || job.closedAt;

      if (startDate || endDate) {
        if (!rawClosed || rawClosed === '-') return false;
        const closedDate = parseJobDate(rawClosed);
        if (!closedDate) return false;
        const closedDateStr = closedDate.toISOString().split('T')[0];
        if (startDate && closedDateStr < startDate) return false;
        if (endDate && closedDateStr > endDate) return false;
      } else if (reportType !== 'all') {
        if (!rawClosed || rawClosed === '-') return false;
        const closedDate = parseJobDate(rawClosed);
        if (!closedDate) return false;
        const closedDateStr = closedDate.toISOString().split('T')[0];

        if (reportType === 'daily') {
          if (closedDateStr !== todayStr) return false;
        } else if (reportType === 'weekly') {
          const diffTime = Math.abs(now - closedDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 7) return false;
        } else if (reportType === 'monthly') {
          if (closedDate.getMonth() !== now.getMonth() || closedDate.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [jobsData, reportType, startDate, endDate, todayStr]);

  const getZonePressureBar = (zone) => {
    const realtimeVal = esp32PressuresByZone[zone.id];
    const parsed = parseFloat(realtimeVal);
    return !isNaN(parsed) && parsed > 0 ? parsed : zone.pressureBar;
  };

  const handleMapClick = (latlng) => {
    const clickedPoint = { lat: latlng.lat, lng: latlng.lng };
    const matchedZone = dmaZones.find(zone => isPointInPolygon(clickedPoint, zone.paths));

    if (matchedZone) {
      const zonePressure = getZonePressureBar(matchedZone);
      const jobsInZone = filteredCompletedJobs.filter(job => {
        const lat = parseFloat(job.Latitude || job.latitude);
        const lng = parseFloat(job.Longitude || job.longitude);
        return isPointInPolygon({ lat, lng }, matchedZone.paths);
      });

      let grandTotalLoss = 0;
      let totalValidJobs = 0;

      const pipeStatsMap = jobsInZone.reduce((acc, job) => {
        const type = job.PipeType || job.pipeType || '';
        const rawSize = job.PipeSize || job.pipeSize || '';
        const sizeNum = parseFloat(rawSize) || 0;

        if (!type || type === '-' || type === 'ไม่ระบุชนิด' || !rawSize || rawSize === '-' || sizeNum <= 0) {
          return acc;
        }

        const timestampStr = job.Timestamp || job.timestamp;
        const closedAtStr = job.ClosedAt || job.closedAt;

        const dateStart = parseJobDate(timestampStr);
        const dateEnd = parseJobDate(closedAtStr);

        let durationDays = 1; 
        if (dateStart && dateEnd && dateEnd >= dateStart) {
          const diffMs = dateEnd - dateStart;
          durationDays = Math.max(diffMs / (1000 * 60 * 60 * 24), 0.04);
        }

        const dailyRate = calculateDailyFlowRate(sizeNum, zonePressure);
        const totalLossForJob = dailyRate * durationDays;

        const label = `ท่อ ${type} ขนาด ${rawSize} มม.`;

        if (!acc[label]) {
          acc[label] = { count: 0, totalLoss: 0, sizeNum };
        }
        acc[label].count += 1;
        acc[label].totalLoss += totalLossForJob;

        grandTotalLoss += totalLossForJob;
        totalValidJobs += 1;

        return acc;
      }, {});

      const sortedPipes = Object.entries(pipeStatsMap).sort((a, b) => b[1].sizeNum - a[1].sizeNum);

      setClickedReport({
        zoneName: matchedZone.name,
        color: matchedZone.color,
        pressure: zonePressure,
        totalJobs: totalValidJobs,
        grandTotalLoss: grandTotalLoss.toFixed(1),
        sortedPipes,
        position: [latlng.lat, latlng.lng]
      });
    } else {
      setClickedReport(null);
    }
  };

  // 🗺️ กำหนดรายละเอียด TileLayer ของแต่ละโหมดแผนที่
  const getTileLayerConfig = () => {
    switch (mapLayerMode) {
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri'
        };
      case 'topo':
        return {
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenTopoMap'
        };
      case 'dark':
        return {
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          attribution: '&copy; CARTO'
        };
      case 'streets':
      default:
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenStreetMap'
        };
    }
  };

  const currentTile = getTileLayerConfig();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 text-slate-800 font-sans">
      
      {/* 🌟 ส่วนหัวรายงานและตัวกรองช่วงเวลา */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-2xl">
              <MapPin className="w-5 h-5" />
            </div>
            แผนที่คำนวณปริมาณน้ำสูญเสียสะสม
          </h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium flex-wrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            แสดงหมุดจุดซ่อมที่ปิดงานแล้ว ({filteredCompletedJobs.length} จุด) • แรงดันอ้างอิง 1.0 บาร์ (รอเชื่อมต่อ ESP32 Realtime)
            {loadingDma && <span>• กำลังโหลดขอบเขต DMA...</span>}
            {!loadingDma && dmaZones.length > 0 && <span>• ขอบเขต DMA ({dmaZones.length} พื้นที่)</span>}
            {dmaError && <span className="text-rose-600">• {dmaError}</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          
          {/* 📅 ตัวเลือกช่วงวันที่กำหนดเอง */}
          <div className="bg-slate-50 border border-slate-200 p-2 rounded-2xl flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 px-1 text-slate-600 text-xs font-bold">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <span>วันที่ซ่อมเสร็จ:</span>
            </div>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700"
            />
            <span className="text-xs text-slate-400 font-bold">ถึง</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700"
            />
            {(startDate || endDate) && (
              <button 
                onClick={handleClearDateFilter}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> ล้าง
              </button>
            )}
          </div>

          {/* แถบเลือกช่วงเวลารวดเร็ว */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'daily', label: 'วันนี้' },
              { id: 'weekly', label: '7 วัน' },
              { id: 'monthly', label: 'เดือนนี้' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setReportType(tab.id); setStartDate(''); setEndDate(''); }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  !startDate && !endDate && reportType === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => { fetchJobsFromSheet(); fetchDmaBoundaries(); }}
            disabled={loading || loadingDma}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || loadingDma) ? 'animate-spin' : ''}`} />
            {(loading || loadingDma) ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
        </div>
      </div>

      {/* 🗺️ แผนที่ Leaflet พร้อมแถบสลับโหมดแผนที่ด้านบน และเมนูควบคุมป๊อบอัพลอยด้านขวา */}
      <div className="bg-white p-3 rounded-3xl shadow-sm border border-slate-100 space-y-3">
        
        {/* 🎛️ แถบปุ่มสลับโหมดแผนที่ (วางไว้เหนือแผนที่ชัดเจน) */}
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 px-1">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>เลือกรูปแบบแผนที่:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'streets', label: '🗺️ แผนที่ถนน' },
              { id: 'satellite', label: '🛰️ ดาวเทียม' },
              { id: 'topo', label: '⛰️ ภูมิประเทศ' },
              { id: 'dark', label: '🌙 โหมดมืด' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setMapLayerMode(mode.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                  mapLayerMode === mode.id 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* พื้นที่แผนที่หลัก */}
          <div className="lg:col-span-8 xl:col-span-9 relative w-full h-[620px] rounded-2xl overflow-hidden border border-slate-200">
            <MapContainer 
              center={defaultCenter} 
              zoom={10} 
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution={currentTile.attribution}
                url={currentTile.url}
              />

              <MapClickHandler onMapClick={handleMapClick} />

              {/* 1. ขอบเขต Polygon จากไฟล์ B5522027_DMA_BOUNDARY.gpkg พร้อมป๊อบอัพลอยแสดงแรงดัน */}
              {dmaZones.map((zone) => {
                const currentPressure = getZonePressureBar(zone);
                const isRealtimeConnected = esp32PressuresByZone[zone.id] !== undefined && esp32PressuresByZone[zone.id] !== null;
                const showFloating = isZoneFloatingVisible(zone.id);

                return (
                  <Polygon
                    key={zone.id}
                    positions={zone.paths}
                    pathOptions={{
                      color: zone.color,
                      fillColor: zone.color,
                      fillOpacity: 0.15,
                      weight: 2
                    }}
                  >
                    {showFloating && (
                      <Tooltip
                        permanent
                        direction="center"
                        className="dma-floating-pressure-tooltip"
                      >
                        <div className="px-2.5 py-1 rounded-xl bg-white/95 border border-slate-200 shadow-md text-slate-800 font-sans leading-tight text-center pointer-events-none">
                          <div className="text-[11px] font-bold" style={{ color: zone.color }}>
                            {zone.name}
                          </div>
                          <div className="text-[11px] font-extrabold text-slate-900 mt-0.5">
                            แรงดัน: {Number(currentPressure).toFixed(2)} บาร์
                          </div>
                          <div className="text-[9px] text-slate-500 mt-0.5">
                            {isRealtimeConnected ? 'ESP32 Realtime' : 'รอเชื่อมต่อ ESP32'}
                          </div>
                        </div>
                      </Tooltip>
                    )}
                  </Polygon>
                );
              })}

              {/* 2. หมุดจุดซ่อมสีแดงขนาดเล็ก */}
              {filteredCompletedJobs.map((job, idx) => {
                const lat = parseFloat(job.Latitude || job.latitude);
                const lng = parseFloat(job.Longitude || job.longitude);
                const technicianName = job.Technician || job.technician || job.Team || '-';
                return (
                  <Marker key={job.JobID || idx} position={[lat, lng]} icon={smallRedDotIcon}>
                    <Popup>
                      <div className="p-1 space-y-1 text-xs font-sans text-slate-800">
                        <div className="flex items-center justify-between gap-2 border-b pb-1">
                          <span className="font-mono font-bold text-blue-600">
                            {job.JobID || job.receivedNo || '-'}
                          </span>
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ปิดงานแล้ว
                          </span>
                        </div>
                        <p><strong>สถานที่:</strong> {job.Location || '-'}</p>
                        <p>
                          <strong>ชนิด/ขนาดท่อ:</strong>{' '}
                          <span className="text-orange-600 font-bold">
                            {job.PipeType && job.PipeType !== '-' && job.PipeSize && job.PipeSize !== '-'
                              ? `${job.PipeType} (${job.PipeSize} มม.)`
                              : (job.Equipment || job.equipment || 'อื่นๆ')}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500"><strong>แจ้ง:</strong> {formatThaiDateTime(job.Timestamp || job.timestamp)}</p>
                        <p className="text-[11px] text-slate-500"><strong>ซ่อมเสร็จ:</strong> {formatThaiDateTime(job.ClosedAt || job.closedAt)}</p>
                        <p className="text-[11px] text-slate-700"><strong>ทีมซ่อม:</strong> {technicianName}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* 📊 Popup รายงานปริมาณน้ำสูญเสียสะสม */}
              {clickedReport && (
                <Popup position={clickedReport.position} onClose={() => setClickedReport(null)}>
                  <div className="p-1.5 min-w-[260px] font-sans text-slate-800 space-y-2">
                    <div className="border-b border-slate-200 pb-1">
                      <span 
                        className="text-[10px] font-bold text-white px-2 py-0.5 rounded"
                        style={{ backgroundColor: clickedReport.color }}
                      >
                        รายงานน้ำสูญเสียสะสม (รูรั่ว 2%)
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 mt-1">{clickedReport.zoneName}</h4>
                      <p className="text-[10px] text-slate-500">แรงดัน {Number(clickedReport.pressure).toFixed(2)} Bar • คำนวณจากวันแจ้งถึงวันซ่อม</p>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-600">จุดซ่อมที่มีขนาดท่อ:</span>
                        <span className="font-bold text-emerald-600">{clickedReport.totalJobs} จุด</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-200 pt-1">
                        <span className="font-bold text-slate-800">ปริมาณน้ำสูญเสียรวมสะสม:</span>
                        <span className="font-bold text-blue-700 text-sm">~{clickedReport.grandTotalLoss} ลบ.ม.</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-blue-500" />
                        รายละเอียดแยกตามขนาดท่อ:
                      </p>
                      {clickedReport.sortedPipes.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">ไม่มีข้อมูลท่อที่มีขนาดระบุในช่วงเวลานี้</p>
                      ) : (
                        <ul className="space-y-1 text-xs max-h-36 overflow-y-auto pr-1">
                          {clickedReport.sortedPipes.map(([pipeLabel, data], i) => (
                            <li key={i} className="flex justify-between items-center bg-blue-50/60 px-2 py-1 rounded text-[11px]">
                              <span className="font-medium text-slate-700">{pipeLabel} ({data.count} จุด)</span>
                              <span className="font-bold text-blue-700">~{data.totalLoss.toFixed(1)} ลบ.ม.</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </Popup>
              )}
            </MapContainer>
          </div>

          {/* 🎛️ เมนูด้านขวาของแผนที่: เลือกแสดง / ปิดป๊อบอัพลอยแรงดันแต่ละพื้นที่ DMA */}
          <aside className="lg:col-span-4 xl:col-span-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col h-[620px]">
            <div className="space-y-2.5 pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-xl">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">ขอบเขตพื้นที่ DMA</h3>
                    <p className="text-[10px] text-slate-500">
                      แสดงอยู่ {activeFloatingCount} / {dmaZones.length} พื้นที่
                    </p>
                  </div>
                </div>
              </div>

              {/* ปุ่มสั่งแสดงทั้งหมด / ซ่อนทั้งหมด */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setAllFloatingZones(true)}
                  disabled={dmaZones.length === 0}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Eye className="w-3.5 h-3.5" /> แสดงทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setAllFloatingZones(false)}
                  disabled={dmaZones.length === 0}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <EyeOff className="w-3.5 h-3.5" /> ซ่อนทั้งหมด
                </button>
              </div>

              {/* ช่องค้นหาพื้นที่ DMA */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={zoneSearchQuery}
                  onChange={(e) => setZoneSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อพื้นที่ DMA..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                {zoneSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setZoneSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* รายการพื้นที่ DMA แบบสวิตช์เปิด-ปิด */}
            <div className="mt-2.5 space-y-1.5 overflow-y-auto pr-1 flex-1">
              {loadingDma ? (
                <div className="text-center py-10 text-xs text-slate-400">กำลังโหลดรายชื่อพื้นที่ DMA...</div>
              ) : filteredDmaZonesForMenu.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  {dmaZones.length === 0 ? 'ไม่พบข้อมูลขอบเขตพื้นที่ DMA' : 'ไม่พบพื้นที่ที่ค้นหา'}
                </div>
              ) : (
                filteredDmaZonesForMenu.map((zone) => {
                  const isShown = isZoneFloatingVisible(zone.id);
                  const currentPressure = getZonePressureBar(zone);
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => toggleZoneFloating(zone.id)}
                      className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                        isShown
                          ? 'bg-white border-slate-200 shadow-2xs hover:border-blue-300'
                          : 'bg-slate-100/80 border-slate-200/70 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: zone.color }}
                          />
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {zone.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 pl-4 mt-0.5">
                          แรงดัน: <span className="font-bold text-slate-700">{Number(currentPressure).toFixed(2)} บาร์</span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                          isShown
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isShown ? (
                          <>
                            <Eye className="w-3 h-3" /> แสดง
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> ปิด
                          </>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
