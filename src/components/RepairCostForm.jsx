import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Trash2, Calculator, DollarSign, FileText, CheckCircle2, Loader2, Printer, Eye, X, Search, Check, Layers, Clock, MapPin, History, Edit3 } from 'lucide-react';

// 🌐 URL ของ Google Apps Script Web App
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbydqD3x19rIfyttJPLhZung7NxIBh4LXetkGlZbhW4GmqLtJ-LI6HQ0vX-p_vrJ-QsH9w/exec";

// 📋 ข้อมูลสำรอง (Fallback Item Master)
const DEFAULT_ITEMS_BY_CATEGORY = {
  cat1: [
    { id: '1', name: 'ทุบสกัดทางเท้าตัวหนอน', category: 'cat1', unit: 'ตร.ม.', materialPrice: 0, laborPrice: 24 },
    { id: '2', name: 'ทุบทางเท้าคอนกรีตบล็อก', category: 'cat1', unit: 'ตร.ม.', materialPrice: 0, laborPrice: 24 },
    { id: '3', name: 'ทุบคอนกรีตไม่เสริมเหล็ก หนา 0.05 ม.', category: 'cat1', unit: 'ตร.ม.', materialPrice: 0, laborPrice: 26 },
    { id: '4', name: 'ทุบคอนกรีตไม่เสริมเหล็ก หนา 0.10 ม.', category: 'cat1', unit: 'ตร.ม.', materialPrice: 0, laborPrice: 52 },
  ],
  cat2: [
    { id: 'C2-01', name: 'ท่อ PB SDR 13.5 ขนาด 20 มม.', category: 'cat2', unit: 'เมตร', materialPrice: 49, laborPrice: 19 },
    { id: 'C2-02', name: 'ท่อ PB SDR 13.5', category: 'cat2', unit: 'เมตร', materialPrice: 49, laborPrice: 19 },
    { id: 'C2-03', name: 'ข้อต่อตรง PB', category: 'cat2', unit: 'ตัว', materialPrice: 100, laborPrice: 0 },
  ],
  cat3: [
    { id: 'C3-01', name: 'ข้อต่อตรง PB ขนาด 20x20 มม.', category: 'cat3', unit: 'ตัว', materialPrice: 85, laborPrice: 35 },
    { id: 'C3-02', name: 'ข้อต่อตรง PB / อุปกรณ์ประกอบ', category: 'cat3', unit: 'ตัว', materialPrice: 85, laborPrice: 35 },
  ],
  cat4: [
    { id: '1', name: 'ค่าซ่อมคอนกรีตทางเท้า', category: 'cat4', unit: 'ตร.ม.', materialPrice: 0, laborPrice: 300 },
    { id: '2', name: 'ค่าซ่อมถนนคอนกรีต', category: 'cat4', unit: 'ตร.ม.', materialPrice: 0, laborPrice: 500 },
  ],
  cat5: [
    { id: '1', name: 'ค่าแรงจ้างซ่อมท่อ PB ขนาด 20 มม.', category: 'cat5', unit: 'บาท', materialPrice: 0, laborPrice: 259 },
  ],
  cat6: [
    { id: '1', name: 'รายการอื่นๆ', category: 'cat6', unit: 'งาน', materialPrice: 0, laborPrice: 0 },
  ],
  cat7: [
    { id: '1', name: 'PC35', category: 'cat7', unit: 'ชั่วโมง', materialPrice: 0, laborPrice: 700 },
  ]
};

// 🛠️ ฟังก์ชันแปลงสถานะใบงาน
const normalizeStatus = (status) => {
  if (!status) return 'PENDING';
  const s = String(status).trim().toUpperCase();
  if (
    s === 'COMPLETED' || 
    s === 'CLOSED' ||
    s.includes('ซ่อมเสร็จ') ||
    s.includes('ปิดงาน') ||
    s.includes('COMPLETE') ||
    s.includes('เรียบร้อย')
  ) {
    return 'COMPLETED';
  }
  return s;
};

// 📅 ฟังก์ชันแปลงวันที่เป็นรูปแบบไทย
const formatThaiDate = (dateInput) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = d.getDate();
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const month = months[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
};

// 🕒 ฟังก์ชันแปลงวันเวลาแบบเต็ม
const formatThaiDateTime = (dateInput) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = d.getDate();
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const month = months[d.getMonth()];
  const year = d.getFullYear() + 543;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
};

// 🔍 ฟังก์ชันช่วยแยกชื่อ จำนวน และหน่วยจากข้อความอุปกรณ์ในฐานข้อมูล
const parseEquipmentString = (str) => {
  let trimmed = String(str || '').trim();
  let qty = 1;
  let unit = 'หน่วย';
  let cleanedName = trimmed;
  
  const matchNumUnit = trimmed.match(/\((\d+(?:\.\d+)?)\s*(เมตร|ตัว|ชิ้น|เส้น|อัน|ท่อน|ชุด|จุด|ม\.)\)/i) ||
                       trimmed.match(/[\s,\:]+(\d+(?:\.\d+)?)\s*(เมตร|ตัว|ชิ้น|เส้น|อัน|ท่อน|ชุด|จุด|ม\.)\b/i) ||
                       trimmed.match(/(\d+(?:\.\d+)?)\s*(เมตร|ตัว|ชิ้น|เส้น|อัน|ท่อน|ชุด|จุด|ม\.)\b/i);

  if (matchNumUnit) {
    qty = Number(matchNumUnit[1]) || 1;
    unit = matchNumUnit[2].replace('ม.', 'เมตร') || 'หน่วย';
    cleanedName = trimmed.replace(matchNumUnit[0], '').trim();
    cleanedName = cleanedName.replace(/[\(\)]/g, '').trim();
  } else {
    const matchNumOnly = trimmed.match(/[\s\(\,\:]+(\d+(?:\.\d+)?)$/);
    if (matchNumOnly) {
      qty = Number(matchNumOnly[1]) || 1;
      cleanedName = trimmed.replace(matchNumOnly[0], '').trim();
      cleanedName = cleanedName.replace(/[\(\)]/g, '').trim();
    }
  }
  return { name: cleanedName || trimmed, qty, unit };
};

export default function RepairCostForm({ jobs = [], onSubmitCost }) {
  const [completedJobsList, setCompletedJobsList] = useState(jobs);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchJobKeyword, setSearchJobKeyword] = useState('');
  const [rNumber, setRNumber] = useState('');

  const [savedRepairCosts, setSavedRepairCosts] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  const [workDetails, setWorkDetails] = useState({
    width: '',
    length: '',
    depth: '',
    surfaceType: 'พื้นดิน',
    repairHours: '1',
    repairMinutes: '0'
  });

  const [itemMaster, setItemMaster] = useState(DEFAULT_ITEMS_BY_CATEGORY);
  
  const [signers, setSigners] = useState({
    committeeCheck: [
      { name: 'นายใหม่ ผูกมิตร', position: 'ประธานกรรมการฯ' },
      { name: 'นายราเมศร์ สันวิลาศ', position: 'กรรมการฯ' },
      { name: 'นายสุขสันต์ พ่อไชยราช', position: 'กรรมการฯ' }
    ],
    committeeReceive: [
      { name: 'นายใหม่ ผูกมิตร', position: 'ประธานกรรมการฯ' },
      { name: 'นายณัฐพงศ์ ลองจำนงค์', position: 'กรรมการฯ' },
      { name: 'นายวรวุฒิ บุตะลา', position: 'กรรมการฯ' }
    ],
    managers: [
      { name: '', position: '' },
      { name: 'นายราเมศร์ สันวิลาศ', position: 'หัวหน้างานบริการและควบคุมน้ำสูญเสีย' },
      { name: 'นายเกรียงศักดิ์ วรสุทธิ์', position: 'ผู้จัดการการประปาส่วนภูมิภาคสาขานครพนม' }
    ]
  });

  const [selectedItems, setSelectedItems] = useState([]);

  const [activeCategory, setActiveCategory] = useState('cat1');
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [currentSelectedItem, setCurrentSelectedItem] = useState(null);
  const [itemQty, setItemQty] = useState(1);
  const [customMaterialPrice, setCustomMaterialPrice] = useState('');
  const [customLaborPrice, setCustomLaborPrice] = useState('');
  const [isFromStockInput, setIsFromStockInput] = useState(false);
  const [editingCartId, setEditingCartId] = useState(null);

  const [otherExpenses, setOtherExpenses] = useState([]);
  const [otherSearchTerm, setOtherSearchTerm] = useState('');
  const [otherSuggestions, setOtherSuggestions] = useState([]);
  const [currentSelectedOtherItem, setCurrentSelectedOtherItem] = useState(null);
  const [otherQty, setOtherQty] = useState(1);
  const [customOtherUnitPrice, setCustomOtherUnitPrice] = useState('');
  
  const [applyFactorF, setApplyFactorF] = useState(true);
  const [factorFValue, setFactorFValue] = useState(1.4018);

  const [returnStatusType, setReturnStatusType] = useState('ไม่มี');
  const [returnEquipmentList, setReturnEquipmentList] = useState([
    { id: 1, name: '', qty: 1, unit: 'ชิ้น', condition: 'usable' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const handlePrintSpecificElement = (elementId) => {
    const printContent = document.getElementById(elementId);
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      alert("กรุณาอนุญาตให้เว็บไซต์เปิดหน้าต่างป๊อปอัป (Popup) เพื่อใช้งานฟังก์ชันพิมพ์");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>พิมพ์เอกสาร - กปภ.สาขานครพนม</title>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
            @page { size: A4 portrait; margin: 5mm 0mm 0mm 0mm; }
            body { 
              background: white !important; 
              margin: 0 !important; 
              padding: 0 !important; 
              font-family: 'Sarabun', 'TH Sarabun PSK', sans-serif !important;
              -webkit-print-color-adjust: exact; 
            }
            .no-print { display: none !important; }
            .print-container { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; box-sizing: border-box; padding-top: 5mm; }
          </style>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-white text-black">
          <div class="print-container">${printContent.innerHTML}</div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const fetchRepairCostsHistory = async () => {
    try {
      const response = await fetch(`${WEB_APP_URL}?action=getRepairCosts`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setSavedRepairCosts(data);
      }
    } catch (err) {
      console.error("Error fetching repair costs history:", err);
    }
  };

  useEffect(() => {
    fetchRepairCostsHistory();
  }, []);

  useEffect(() => {
    const fetchSignersFromSheet = async () => {
      try {
        const response = await fetch(`${WEB_APP_URL}?action=document_signers`);
        const data = await response.json();
        if (data && !data.status) {
          const fetchedManagers = data.managers || [];
          const supervisor = fetchedManagers.find(m => String(m.position).includes('หัวหน้างาน') || String(m.position).includes('บริการ')) || fetchedManagers[1] || { name: 'นายราเมศร์ สันวิลาศ', position: 'หัวหน้างานบริการและควบคุมน้ำสูญเสีย' };
          const manager = fetchedManagers.find(m => String(m.position).includes('ผู้จัดการ')) || fetchedManagers[2] || { name: 'นายเกรียงศักดิ์ วรสุทธิ์', position: 'ผู้จัดการการประปาส่วนภูมิภาคสาขานครพนม' };

          setSigners({
            committeeCheck: data.committeeCheck?.length ? data.committeeCheck : signers.committeeCheck,
            committeeReceive: data.committeeReceive?.length ? data.committeeReceive : signers.committeeReceive,
            managers: [
              { name: '', position: '' },
              supervisor,
              manager
            ]
          });
        }
      } catch (err) {
        console.error("Error fetching document signers:", err);
      }
    };
    fetchSignersFromSheet();
  }, []);

  useEffect(() => {
    const fetchCompletedJobsFromSheet = async () => {
      try {
        const response = await fetch(`${WEB_APP_URL}?action=getCompletedJobs`);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setCompletedJobsList(data);
        } else if (Array.isArray(jobs) && jobs.length > 0) {
          setCompletedJobsList(jobs);
        }
      } catch (err) {
        console.error("Error fetching completed jobs:", err);
        if (Array.isArray(jobs)) setCompletedJobsList(jobs);
      }
    };
    fetchCompletedJobsFromSheet();
  }, [jobs]);

  const [masterDataLoaded, setMasterDataLoaded] = useState(false);

  useEffect(() => {
    const fetchAllMasterData = async () => {
      try {
        let cat1Data = [], equipmentData = [], cat4Data = [], cat5Data = [], cat6Data = [], cat7Data = [];

        try { const res = await fetch(`${WEB_APP_URL}?action=cat1`); const json = await res.json(); if (Array.isArray(json)) cat1Data = json; } catch (e) {}
        try { const res = await fetch(`${WEB_APP_URL}?action=equipment`); const json = await res.json(); if (Array.isArray(json)) equipmentData = json; } catch (e) {}
        try { const res = await fetch(`${WEB_APP_URL}?action=cat4`); const json = await res.json(); if (Array.isArray(json)) cat4Data = json; } catch (e) {}
        try { const res = await fetch(`${WEB_APP_URL}?action=cat5`); const json = await res.json(); if (Array.isArray(json)) cat5Data = json; } catch (e) {}
        try { const res = await fetch(`${WEB_APP_URL}?action=cat6`); const json = await res.json(); if (Array.isArray(json)) cat6Data = json; } catch (e) {}
        try { const res = await fetch(`${WEB_APP_URL}?action=cat7`); const json = await res.json(); if (Array.isArray(json)) cat7Data = json; } catch (e) {}

        const parseItem = (arr, prefix, defaultUnit) => {
          if (!Array.isArray(arr)) return [];
          return arr.map((item, idx) => {
            if (!item) return null;
            const id = String(item.id || item[`${prefix}_id`] || `${prefix}-${idx + 1}`);
            const name = String(item.name || item[`${prefix}_name`] || '').trim();
            const price = Number(item.materialPrice !== undefined ? item.materialPrice : (item[`${prefix}_price`] || item[`${prefix}_cost`] || item.price || 0));
            const labor = Number(item.laborPrice !== undefined ? item.laborPrice : (item[`${prefix}_laber`] || item[`${prefix}_labor`] || item.labor || item.laber || 0));
            const unit = String(item.unit || item[`${prefix}_unit`] || defaultUnit).trim();

            return { id, name, unit, materialPrice: price, laborPrice: labor };
          }).filter(i => i && i.name && !i.name.toLowerCase().includes('_name') && !i.name.toLowerCase().includes('name'));
        };

        const parsedCat1 = parseItem(cat1Data, 'c1', 'ตร.ม.');
        const parsedCat4 = parseItem(cat4Data, 'c4', 'ตร.ม.');
        const parsedCat5 = parseItem(cat5Data, 'c5', 'บาท');
        const parsedCat6 = parseItem(cat6Data, 'c6', 'งาน');
        const parsedCat7 = parseItem(cat7Data, 'c7', 'ชั่วโมง');

        const parsedEquipment = Array.isArray(equipmentData) ? equipmentData.map((item, idx) => ({
          id: String(item.id || item[0] || `EQ-${idx + 1}`),
          name: String(item.name || item[1] || '').trim(),
          unit: String(item.unit || item[2] || 'หน่วย').trim(),
          materialPrice: Number(item.materialPrice !== undefined ? item.materialPrice : (item.price || item[3] || 0)),
          laborPrice: Number(item.laborPrice !== undefined ? item.laborPrice : (item.laber || item.labor || item[4] || 0))
        })).filter(i => i.name && !i.name.toLowerCase().includes('name') && !i.name.toLowerCase().includes('ชื่อ')) : [];

        const newMaster = {
          cat1: parsedCat1.length > 0 ? parsedCat1 : DEFAULT_ITEMS_BY_CATEGORY.cat1,
          cat2: parsedEquipment.length > 0 ? parsedEquipment : DEFAULT_ITEMS_BY_CATEGORY.cat2,
          cat3: parsedEquipment.length > 0 ? parsedEquipment : DEFAULT_ITEMS_BY_CATEGORY.cat3,
          cat4: parsedCat4.length > 0 ? parsedCat4 : DEFAULT_ITEMS_BY_CATEGORY.cat4,
          cat5: parsedCat5.length > 0 ? parsedCat5 : DEFAULT_ITEMS_BY_CATEGORY.cat5,
          cat6: parsedCat6.length > 0 ? parsedCat6 : DEFAULT_ITEMS_BY_CATEGORY.cat6,
          cat7: parsedCat7.length > 0 ? parsedCat7 : DEFAULT_ITEMS_BY_CATEGORY.cat7,
        };

        setItemMaster(newMaster);
        setMasterDataLoaded(true);

      } catch (err) {
        console.error("Error fetching master data from sheet:", err);
        setMasterDataLoaded(true);
      }
    };
    fetchAllMasterData();
  }, []);

  const completedJobs = completedJobsList.filter(j => normalizeStatus(j.Status || j.status || j.JobStatus || j[10] || j[11]) === 'COMPLETED');
  const displayJobs = completedJobs.length > 0 ? completedJobs : completedJobsList;

  const billedJobIds = new Set(savedRepairCosts.map(item => String(item.Job_ID || item.jobId || '').trim()));

  const filteredJobsForSelect = displayJobs.filter(j => {
    const jobId = String(j.JobID || j.id || j.receivedNo || j[0] || '').trim();
    if (billedJobIds.has(jobId)) return false;

    const term = searchJobKeyword.toLowerCase().trim();
    if (!term) return true;

    const location = String(j.Location || j.location || j[4] || '').toLowerCase();
    const reporter = String(j.ReporterName || j.reporterName || j[2] || '').toLowerCase();
    const phone = String(j.Phone || j.phone || j[3] || '').toLowerCase();
    const rNo = String(j.rNumber || j.R_Number || '').toLowerCase();

    return jobId.toLowerCase().includes(term) || location.includes(term) || reporter.includes(term) || phone.includes(term) || rNo.includes(term);
  });

  const handleSelectJob = (job) => {
    setSelectedJob(job);

    const rawEquipment = job.Equipment || job.equipment || job[12] || job.EquipmentList || '';
    
    if (rawEquipment) {
      let parsedItems = [];
      if (typeof rawEquipment === 'string') {
        parsedItems = rawEquipment.split(/[\n,]+/).map(item => {
          const trimmed = item.trim();
          if (!trimmed) return null;
          return parseEquipmentString(trimmed);
        }).filter(Boolean);
      } else if (Array.isArray(rawEquipment)) {
        parsedItems = rawEquipment.map(eq => {
          const parsed = parseEquipmentString(eq.name || eq);
          return {
            name: parsed.name,
            qty: Number(eq.qty) || parsed.qty,
            unit: eq.unit || parsed.unit
          };
        });
      }

      const newSelectedItems = [];
      parsedItems.forEach((eq, idx) => {
        const itemName = String(eq.name || '').trim();
        const lowerName = itemName.toLowerCase();
        
        const category = (lowerName.includes('ท่อ') && !lowerName.includes('ข้อต่อ')) ? 'cat2' : 'cat3';
        
        const masterPool = itemMaster[category] || DEFAULT_ITEMS_BY_CATEGORY[category] || [];
        
        let foundMaster = masterPool.find(m => m.name.toLowerCase() === lowerName);
        if (!foundMaster) {
          foundMaster = masterPool.find(m => lowerName.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(lowerName));
        }

        const matPrice = foundMaster ? foundMaster.materialPrice : 85;
        const labPrice = foundMaster ? foundMaster.laborPrice : 35;
        const qty = Number(eq.qty) || 1;
        const unit = eq.unit && eq.unit !== 'หน่วย' ? eq.unit : (foundMaster ? foundMaster.unit : (category === 'cat2' ? 'เมตร' : 'ตัว'));

        newSelectedItems.push({
          cartId: Date.now() + idx,
          id: foundMaster ? foundMaster.id : 'AUTO-' + idx,
          name: itemName,
          category: category,
          unit: unit,
          quantity: qty,
          materialPrice: matPrice,
          laborPrice: labPrice,
          isFromStock: false,
          totalMaterialPrice: matPrice * qty,
          totalLaborPrice: labPrice * qty
        });
      });

      if (newSelectedItems.length > 0) {
        setSelectedItems(newSelectedItems);
      }
    }
  };

  // 📐 นำพื้นที่ที่คำนวณได้มาใส่รอไว้ในช่องจำนวน (itemQty) เมื่ออยู่ในหมวด 1 หรือ 4 และเลือกสภาพพื้นที่ไม่ใช่ "พื้นดิน"
  useEffect(() => {
    const w = Number(workDetails.width) || 0;
    const l = Number(workDetails.length) || 0;
    const area = Number((w * l).toFixed(2));

    if ((activeCategory === 'cat1' || activeCategory === 'cat4') && workDetails.surfaceType !== 'พื้นดิน' && area > 0) {
      setItemQty(area);
    }
  }, [workDetails.width, workDetails.length, workDetails.surfaceType, activeCategory]);

  const handleEditHistoryItem = (historyItem) => {
    const targetId = String(historyItem.Job_ID || historyItem.jobId || '').trim();
    const matchedJob = displayJobs.find(j => String(j.JobID || j.id || j.receivedNo || j[0] || '').trim() === targetId) || {
      JobID: targetId,
      Location: historyItem.Location || '-',
      ClosedAt: historyItem.Repair_Closed_At || new Date()
    };

    setSelectedJob(matchedJob);
    setRNumber(historyItem.R_Number || '');
    setIsEditingExisting(true);

    try {
      if (historyItem.Selected_Items_JSON) {
        setSelectedItems(typeof historyItem.Selected_Items_JSON === 'string' ? JSON.parse(historyItem.Selected_Items_JSON) : historyItem.Selected_Items_JSON);
      }
    } catch (e) { console.error(e); }

    try {
      if (historyItem.Other_Expenses_JSON) {
        const oth = typeof historyItem.Other_Expenses_JSON === 'string' ? JSON.parse(historyItem.Other_Expenses_JSON) : historyItem.Other_Expenses_JSON;
        setOtherExpenses(oth);
      }
    } catch (e) { console.error(e); }

    try {
      if (historyItem.Return_Equipment_JSON) {
        const ret = typeof historyItem.Return_Equipment_JSON === 'string' ? JSON.parse(historyItem.Return_Equipment_JSON) : historyItem.Return_Equipment_JSON;
        setReturnEquipmentList(ret);
        setReturnStatusType(ret && ret.length > 0 ? 'มีอุปกรณ์คืน' : 'ไม่มี');
      }
    } catch (e) { console.error(e); }

    if (historyItem.Work_Dimension) {
      const parts = String(historyItem.Work_Dimension).replace(/ม\./g, '').trim().split('x');
      if (parts.length === 3) {
        setWorkDetails(prev => ({
          ...prev,
          width: parts[0].trim(),
          length: parts[1].trim(),
          depth: parts[2].trim(),
          surfaceType: historyItem.Surface_Type || prev.surfaceType
        }));
      }
    }

    if (historyItem.Repair_Duration) {
      const durStr = String(historyItem.Repair_Duration);
      const hMatch = durStr.match(/(\d+)\s*ชม/);
      const mMatch = durStr.match(/(\d+)\s*นาที/);
      setWorkDetails(prev => ({
        ...prev,
        repairHours: hMatch ? hMatch[1] : prev.repairHours,
        repairMinutes: mMatch ? mMatch[1] : prev.repairMinutes
      }));
    }

    if (historyItem.Factor_F) {
      const fVal = Number(historyItem.Factor_F);
      setApplyFactorF(fVal > 1.0);
      setFactorFValue(fVal > 1.0 ? fVal : 1.4018);
    }

    setShowHistoryModal(false);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (!val.trim()) {
      setSuggestions([]);
    } else {
      const q = val.trim().toLowerCase();
      const pool = itemMaster[activeCategory] || [];
      const filtered = pool.filter(m => String(m?.name || '').toLowerCase().includes(q));
      setSuggestions(filtered);
    }
  };

  const handleSelectItemSuggestion = (item) => {
    setCurrentSelectedItem(item);
    setSearchTerm(String(item?.name || '').trim());
    setCustomMaterialPrice(item.materialPrice !== undefined ? item.materialPrice : '');
    setCustomLaborPrice(item.laborPrice !== undefined ? item.laborPrice : '');
    setSuggestions([]);
  };

  const handleStartEditItem = (item) => {
    setActiveCategory(item.category);
    
    // ดึงชื่อเดิมออกจากการติดวงเล็บขนาดพื้นที่ (ถ้ามี) เพื่อให้ช่องค้นหาแสดงชื่อปกติ
    const baseName = item.name.split(' (')[0];
    setSearchTerm(baseName);
    
    setItemQty(item.quantity);
    setCustomMaterialPrice(item.materialPrice);
    setCustomLaborPrice(item.laborPrice);
    setIsFromStockInput(item.isFromStock || false);
    setEditingCartId(item.cartId);
  };

  const handleAddItem = () => {
    if (!searchTerm.trim()) {
      alert("กรุณาเลือกหรือพิมพ์ชื่อรายการ");
      return;
    }
    
    const matPriceToUse = customMaterialPrice !== '' ? Number(customMaterialPrice) : (currentSelectedItem?.materialPrice || 0);
    const labPriceToUse = customLaborPrice !== '' ? Number(customLaborPrice) : (currentSelectedItem?.laborPrice || 0);
    const qty = Number(itemQty) || 1;
    const isStock = (activeCategory === 'cat2' || activeCategory === 'cat3') ? isFromStockInput : false;

    // ถ้าเป็นหมวด 1 หรือ 4 และไม่ใช่พื้นดิน ให้ต่อท้ายชื่อด้วย (กว้าง x ยาว = ตร.ม.)
    let finalItemName = searchTerm.trim();
    if ((activeCategory === 'cat1' || activeCategory === 'cat4') && workDetails.surfaceType !== 'พื้นดิน') {
      const w = Number(workDetails.width) || 0;
      const l = Number(workDetails.length) || 0;
      const area = Number((w * l).toFixed(2));
      if (w > 0 && l > 0) {
        finalItemName = `${searchTerm.trim()} (${w}x${l} = ${area} ตร.ม.)`;
      }
    }

    if (editingCartId) {
      setSelectedItems(selectedItems.map(item => {
        if (item.cartId === editingCartId) {
          return {
            ...item,
            name: finalItemName,
            category: activeCategory,
            unit: currentSelectedItem?.unit || item.unit,
            materialPrice: matPriceToUse,
            laborPrice: labPriceToUse,
            quantity: qty,
            isFromStock: isStock,
            totalMaterialPrice: isStock ? 0 : matPriceToUse * qty,
            totalLaborPrice: isStock ? 0 : labPriceToUse * qty
          };
        }
        return item;
      }));
      setEditingCartId(null);
    } else {
      const itemObj = currentSelectedItem || {
        id: 'CUSTOM-' + Date.now(),
        name: finalItemName,
        category: activeCategory,
        unit: (activeCategory === 'cat1' || activeCategory === 'cat4') ? 'ตร.ม.' : 'หน่วย',
        materialPrice: matPriceToUse,
        laborPrice: labPriceToUse
      };

      const newItem = {
        cartId: Date.now(),
        ...itemObj,
        name: finalItemName,
        materialPrice: matPriceToUse,
        laborPrice: labPriceToUse,
        category: activeCategory,
        quantity: qty,
        isFromStock: isStock,
        totalMaterialPrice: isStock ? 0 : matPriceToUse * qty,
        totalLaborPrice: isStock ? 0 : labPriceToUse * qty
      };

      setSelectedItems([...selectedItems, newItem]);
    }

    setSearchTerm('');
    setCurrentSelectedItem(null);
    setItemQty(1);
    setCustomMaterialPrice('');
    setCustomLaborPrice('');
    setIsFromStockInput(false);
  };

  const handleRemoveItem = (cartId) => {
    setSelectedItems(selectedItems.filter(m => m.cartId !== cartId));
    if (editingCartId === cartId) {
      setEditingCartId(null);
      setSearchTerm('');
      setItemQty(1);
    }
  };

  const handleToggleStockItem = (cartId) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.cartId === cartId) {
        const newStockStatus = !item.isFromStock;
        return {
          ...item,
          isFromStock: newStockStatus,
          totalMaterialPrice: newStockStatus ? 0 : (item.materialPrice * item.quantity),
          totalLaborPrice: newStockStatus ? 0 : (item.laborPrice * item.quantity)
        };
      }
      return item;
    }));
  };

  const handleOtherSearchChange = (e) => {
    const val = e.target.value;
    setOtherSearchTerm(val);
    if (!val.trim()) {
      setOtherSuggestions([]);
    } else {
      const q = val.trim().toLowerCase();
      const pool = itemMaster.cat7 || DEFAULT_ITEMS_BY_CATEGORY.cat7;
      const filtered = pool.filter(m => String(m?.name || '').toLowerCase().includes(q));
      setOtherSuggestions(filtered);
    }
  };

  const handleSelectOtherSuggestion = (item) => {
    setCurrentSelectedOtherItem(item);
    setOtherSearchTerm(String(item?.name || '').trim());
    const defaultVal = item.laborPrice > 0 ? item.laborPrice : (item.materialPrice > 0 ? item.materialPrice : 0);
    setCustomOtherUnitPrice(defaultVal);
    setOtherSuggestions([]);
  };

  const handleAddOtherExpenseFromCat7 = () => {
    if (!otherSearchTerm.trim()) {
      alert("กรุณาเลือกหรือพิมพ์ชื่อรายการค่าใช้จ่ายอื่นๆ");
      return;
    }
    const unitPrice = customOtherUnitPrice !== '' ? Number(customOtherUnitPrice) : (currentSelectedOtherItem ? (currentSelectedOtherItem.laborPrice > 0 ? currentSelectedOtherItem.laborPrice : currentSelectedOtherItem.materialPrice) : 0);
    const qty = Number(otherQty) || 1;
    const unit = currentSelectedOtherItem?.unit || 'ชั่วโมง';

    const newExpense = {
      id: Date.now(),
      name: otherSearchTerm.trim(),
      unit: unit,
      qty: qty,
      unitPrice: unitPrice,
      amount: unitPrice * qty
    };

    setOtherExpenses([...otherExpenses, newExpense]);
    setOtherSearchTerm('');
    setCurrentSelectedOtherItem(null);
    setOtherQty(1);
    setCustomOtherUnitPrice('');
  };

  const handleRemoveOtherExpense = (id) => {
    setOtherExpenses(otherExpenses.filter(item => item.id !== id));
  };

  const handleAddReturnEquipment = () => {
    setReturnEquipmentList([...returnEquipmentList, { id: Date.now(), name: '', qty: 1, unit: 'ชิ้น', condition: 'usable' }]);
  };

  const handleRemoveReturnEquipment = (id) => {
    setReturnEquipmentList(returnEquipmentList.filter(item => item.id !== id));
  };

  const handleReturnEquipmentChange = (id, field, value) => {
    setReturnEquipmentList(returnEquipmentList.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const getCategoryItems = (catKey) => selectedItems.filter(item => item.category === catKey);

  const totalDirectMaterial = selectedItems.filter(i => !i.isFromStock).reduce((acc, item) => acc + item.totalMaterialPrice, 0);
  const totalDirectLabor = selectedItems.filter(i => !i.isFromStock).reduce((acc, item) => acc + item.totalLaborPrice, 0);
  const totalDirectCost = totalDirectMaterial + totalDirectLabor;

  const activeFactorF = applyFactorF ? Number(factorFValue || 1) : 1.0;
  const totalCostWithFactorF = totalDirectCost * activeFactorF;

  const sumOtherExpenses = otherExpenses.reduce((acc, item) => acc + item.amount, 0);
  const vatAmount = sumOtherExpenses * 0.07;
  const totalOtherWithVat = sumOtherExpenses + vatAmount;
  
  const grandTotalWithVat = totalCostWithFactorF + totalOtherWithVat;
  
  const calcGrandTotalVal = applyFactorF ? (grandTotalWithVat / 1.07) : grandTotalWithVat;
  const roundedGrandTotalVal = Math.floor(calcGrandTotalVal);
  const formattedGrandTotalFormatted = `${roundedGrandTotalVal.toLocaleString()}.00`;

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!selectedJob) {
      alert("กรุณาเลือกใบงานที่ต้องการทำประมาณการก่อน");
      return;
    }
    setIsSubmitting(true);

    const costPayload = {
      jobId: selectedJob.JobID || selectedJob.id || selectedJob.receivedNo || selectedJob[0],
      rNumber: rNumber,
      jobData: selectedJob,
      workDetails: workDetails,
      selectedItems: selectedItems,
      otherExpenses: otherExpenses,
      returnEquipmentList: returnEquipmentList,
      totalDirectCost: totalDirectCost,
      factorF: activeFactorF,
      totalCostWithFactorF: totalCostWithFactorF,
      sumOtherExpenses: sumOtherExpenses,
      vatAmount: vatAmount,
      grandTotal: roundedGrandTotalVal,
      grandTotalFormatted: formattedGrandTotalFormatted,
      rawGrandTotal: calcGrandTotalVal,
      createdAt: new Date().toLocaleString("th-TH")
    };

    try {
      const response = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "saveRepairCost",
          payload: costPayload
        })
      });

      const result = await response.json();

      if (result.status === "success") {
        alert(`${isEditingExisting ? 'อัปเดตข้อมูลแก้ไข' : 'บันทึกข้อมูล'}ลงชีท RepairCosts สำเร็จ!\nยอดรวมดำเนินการซ่อมท่อทั้งสิ้น: ฿${formattedGrandTotalFormatted} บาท`);
        await fetchRepairCostsHistory();
        setIsEditingExisting(false);
        if (onSubmitCost) {
          await onSubmitCost(costPayload);
        }
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึก: " + result.message);
      }
    } catch (err) {
      console.error("Error saving cost:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reporterName = selectedJob ? (selectedJob.ReporterName || selectedJob.reporterName || selectedJob[2] || '-') : '-';
  const reporterPhone = selectedJob ? (selectedJob.Phone || selectedJob.phone || selectedJob[3] || '-') : '-';
  const jobLat = selectedJob ? (selectedJob.Latitude || selectedJob.latitude || selectedJob[17] || '17.4138') : '17.4138';
  const jobLng = selectedJob ? (selectedJob.Longitude || selectedJob.longitude || selectedJob[18] || '104.7944') : '104.7944';
  const jobIssueType = selectedJob ? (selectedJob.Description || selectedJob.issueType || selectedJob[5] || 'ท่อแตก/ท่อรั่ว') : 'ท่อแตก/ท่อรั่ว';
  const jobTime = selectedJob ? (selectedJob.Time || selectedJob.time || '09:00') : '09:00';
  const jobClosedAtVal = selectedJob ? (selectedJob.ClosedAt || selectedJob.closedAt || selectedJob[15] || new Date()) : new Date();

  const supervisorName = signers.managers[1]?.name || 'นายราเมศร์ สันวิลาศ';
  const supervisorPos = signers.managers[1]?.position || 'หัวหน้างานบริการและควบคุมน้ำสูญเสีย';
  const managerName = signers.managers[2]?.name || 'นายเกรียงศักดิ์ วรสุทธิ์';
  const managerPos = signers.managers[2]?.position || 'ผู้จัดการการประปาส่วนภูมิภาคสาขานครพนม';

  const hasExcavator = otherExpenses.some(o => String(o.name).toLowerCase().includes('pc') || String(o.name).toLowerCase().includes('รถขุด') || String(o.name).toLowerCase().includes('แมคโคร'));
  const procurementMethod = roundedGrandTotalVal <= 500000 ? 'วิธีเฉพาะเจาะจง' : 'วิธีเสนอราคา';
  const validReturnedEquipment = (returnStatusType === 'มีอุปกรณ์คืน' && returnEquipmentList.length > 0) ? returnEquipmentList.filter(eq => eq.name && eq.name.trim() !== '') : [];

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-3xl shadow-xl border border-slate-200 font-sans space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
            <Calculator className="w-6 h-6"/>
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-base">แบบฟอร์มควบคุมการซ่อมท่อ (การประปาส่วนภูมิภาคสาขานครพนม)</h2>
            <p className="text-xs text-slate-500">หมวดที่ 1 ถึง หมวดที่ 6 และค่าใช้จ่ายอื่นๆ (จาก Cat7) ตามมาตรฐานแบบฟอร์ม กปภ.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <History className="w-4 h-4 text-amber-600"/>
            <span>ประวัติเบิกซ่อม ({savedRepairCosts.length})</span>
          </button>

          {selectedJob && (
            <button
              type="button"
              onClick={() => setShowPrintPreview(true)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Eye className="w-4 h-4 text-indigo-600"/>
              <span>พรีวิวแบบฟอร์มเบิกซ่อม (PDF)</span>
            </button>
          )}
        </div>
      </div>

      {/* 🔍 เลือกใบงาน */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Search className="w-4 h-4 text-blue-600"/>
            ขั้นตอนที่ 1: ค้นหาและเลือกใบงาน (สถานะ: ซ่อมเสร็จแล้ว / COMPLETED)
          </span>
          <span className="text-[10px] text-slate-500 font-normal">
            (พร้อมเบิก: {filteredJobsForSelect.length} / เคยเบิกแล้ว: {billedJobIds.size} รายการ)
          </span>
        </h3>

        {selectedJob ? (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex justify-between items-center text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded font-bold text-[10px]">
                  {isEditingExisting ? 'กำลังแก้ไขข้อมูลเดิม' : 'เลือกแล้ว'}
                </span>
                <span className="font-bold text-slate-800">เลขที่รับแจ้ง: {selectedJob.JobID || selectedJob.id || selectedJob.receivedNo || selectedJob[0]}</span>
                {rNumber && <span className="bg-blue-600 text-white px-2 py-0.5 rounded font-bold text-[10px]">คำสั่งงานเลขที่: {rNumber}</span>}
              </div>
              <p className="text-slate-600"><b>สถานที่:</b> {selectedJob.Location || selectedJob.location || selectedJob[4] || '-'}</p>
              <p className="text-slate-500"><b>วันเวลาซ่อมเสร็จ:</b> {formatThaiDateTime(jobClosedAtVal)}</p>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedJob(null); setIsEditingExisting(false); }}
              className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer shadow-xs"
            >
              เปลี่ยนใบงาน
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={searchJobKeyword}
              onChange={(e) => setSearchJobKeyword(e.target.value)}
              placeholder="ค้นหาใบงานที่ยังไม่ได้เบิก ด้วยเลขที่งาน, สถานที่, ชื่อผู้แจ้ง หรือเบอร์โทร..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 shadow-xs"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={rNumber}
                onChange={(e) => setRNumber(e.target.value)}
                placeholder="คำสั่งงานเลขที่ (เช่น R202608036111)"
                className="w-full sm:w-1/2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none shadow-xs"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-white">
              {filteredJobsForSelect.length === 0 ? (
                <div className="text-center py-4 space-y-1">
                  <p className="text-xs text-slate-400">ไม่พบใบงานที่พร้อมทำการเบิกซ่อม</p>
                  <p className="text-[10px] text-slate-500">(ใบงานที่เคยเบิกแล้วถูกซ่อนไว้ หรือไม่พบคำที่ค้นหา)</p>
                </div>
              ) : (
                filteredJobsForSelect.map((j, jIdx) => (
                  <div 
                    key={`comp-job-${jIdx}`}
                    onClick={() => handleSelectJob(j)}
                    className="p-2.5 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition cursor-pointer flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">เลขที่รับแจ้ง: <span className="text-blue-600">{j.JobID || j.id || j[0]}</span></p>
                      <p className="text-slate-600 truncate max-w-md">📍 {j.Location || j.location || j[4] || '-'}</p>
                    </div>
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-lg font-bold text-xs shrink-0 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5"/> เลือก
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🏗️ 1. รายละเอียดหน้างาน */}
      {selectedJob && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 animate-fadeIn">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-blue-600"/>
            รายละเอียดหน้างาน
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">กว้าง (เมตร)</label>
              <input
                type="number"
                step="0.01"
                value={workDetails.width}
                onChange={(e) => setWorkDetails({ ...workDetails, width: e.target.value })}
                placeholder="0.00"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none shadow-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">ยาว (เมตร)</label>
              <input
                type="number"
                step="0.01"
                value={workDetails.length}
                onChange={(e) => setWorkDetails({ ...workDetails, length: e.target.value })}
                placeholder="0.00"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none shadow-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">ลึก (เมตร)</label>
              <input
                type="number"
                step="0.01"
                value={workDetails.depth}
                onChange={(e) => setWorkDetails({ ...workDetails, depth: e.target.value })}
                placeholder="0.00"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none shadow-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">สภาพพื้นที่</label>
              <select
                value={workDetails.surfaceType}
                onChange={(e) => setWorkDetails({ ...workDetails, surfaceType: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none shadow-xs"
              >
                <option value="พื้นดิน">พื้นดิน</option>
                <option value="พื้นคอนกรีตทางเท้า">พื้นคอนกรีตทางเท้า</option>
                <option value="พื้นคอนกรีตเสริมเหล็ก">พื้นคอนกรีตเสริมเหล็ก</option>
                <option value="พื้นลาดยาง">พื้นลาดยาง</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ⏱️ 2. ระยะเวลาซ่อม */}
      {selectedJob && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 animate-fadeIn">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600"/>
            ระยะเวลาซ่อม
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">ชั่วโมงซ่อม</label>
              <select
                value={workDetails.repairHours}
                onChange={(e) => setWorkDetails({ ...workDetails, repairHours: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none shadow-xs"
              >
                <option value="0">0 ชั่วโมง</option>
                {[...Array(24).keys()].map(h => (
                  <option key={h + 1} value={h + 1}>{h + 1} ชม.</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">นาทีซ่อม</label>
              <select
                value={workDetails.repairMinutes}
                onChange={(e) => setWorkDetails({ ...workDetails, repairMinutes: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none shadow-xs"
              >
                <option value="0">0 นาที</option>
                {[...Array(60).keys()].map(m => (
                  <option key={m + 1} value={m + 1}>{m + 1} นาที</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 📝 ส่วนกรอกข้อมูล 6 หมวด */}
      {selectedJob && (
        <form onSubmit={handleSubmitForm} className="space-y-6 animate-fadeIn">

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600"/>
                เลือกและเพิ่มรายการตามหมวดหมู่แบบฟอร์ม (💡 ดับเบิลคลิกรายการในตารางเพื่อแก้ไข)
              </h3>
              {editingCartId && (
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-1 rounded-lg font-bold">
                  ⚠️ กำลังแก้ไขรายการอยู่ (แก้ไขแล้วกดบันทึกการแก้ไข)
                </span>
              )}
            </div>

            {/* แถบเลือกหมวดหมู่ 1-6 */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
              {[
                { key: 'cat1', label: 'หมวดที่ 1: งานทุบสกัดสิ่งก่อสร้างตามชนิดพื้นผิว' },
                { key: 'cat2', label: 'หมวดที่ 2: งานวางท่อ' },
                { key: 'cat3', label: 'หมวดที่ 3: อุปกรณ์ประกอบท่อ' },
                { key: 'cat4', label: 'หมวดที่ 4: งานคืนสภาพผิวเดิม' },
                { key: 'cat5', label: 'หมวดที่ 5: ค่าแรงจ้างเหมาซ่อมท่อ (ต่อจุด)' },
                { key: 'cat6', label: 'หมวดที่ 6: อื่นๆ' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveCategory(tab.key);
                    setSearchTerm('');
                    setSuggestions([]);
                    setCurrentSelectedItem(null);
                    setCustomMaterialPrice('');
                    setCustomLaborPrice('');
                    setIsFromStockInput(false);
                    setEditingCartId(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeCategory === tab.key
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ค้นหา, กรอกราคาวัสดุ, ค่าแรง และเพิ่มรายการ */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-45">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder={`ค้นหารายการในหมวดนี้...`}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 shadow-xs"
                />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {suggestions.map((m, idx) => (
                      <button
                        key={`sug-${idx}`}
                        type="button"
                        onClick={() => handleSelectItemSuggestion(m)}
                        className="w-full text-left px-3.5 py-2 text-xs hover:bg-blue-50 transition font-medium text-slate-700 flex justify-between"
                      >
                        <span>{m.name}</span>
                        <span className="text-[10px] text-blue-600 font-mono font-bold">ว: {m.materialPrice} | ร: {m.laborPrice}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="number"
                value={customMaterialPrice}
                onChange={(e) => setCustomMaterialPrice(e.target.value)}
                placeholder="ค่าวัสดุ"
                className="w-24 bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none shadow-xs"
              />

              <input
                type="number"
                value={customLaborPrice}
                onChange={(e) => setCustomLaborPrice(e.target.value)}
                placeholder="ค่าแรง"
                className="w-24 bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none shadow-xs"
              />

              {/* ช่องจำนวน (ถ้าเลือกหมวด 1 หรือ 4 และไม่ใช่พื้นดิน จะแสดงสีน้ำเงินพร้อมใส่พื้นที่รอไว้) */}
              <input
                type="number"
                min="1"
                step="0.01"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                placeholder="จำนวน"
                className={`w-20 rounded-xl px-2 py-2.5 text-xs font-bold text-center outline-none shadow-xs ${
                  (activeCategory === 'cat1' || activeCategory === 'cat4') && workDetails.surfaceType !== 'พื้นดิน'
                    ? 'bg-blue-50 border-2 border-blue-400 text-blue-900 ring-2 ring-blue-100'
                    : 'bg-white border border-slate-200 text-slate-800'
                }`}
                title={(activeCategory === 'cat1' || activeCategory === 'cat4') && workDetails.surfaceType !== 'พื้นดิน' ? 'พื้นที่คำนวณจาก กว้าง x ยาว' : ''}
              />

              {(activeCategory === 'cat2' || activeCategory === 'cat3') && (
                <label className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isFromStockInput}
                    onChange={(e) => setIsFromStockInput(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span>เบิกคลัง (ไม่คิดราคา)</span>
                </label>
              )}

              <button
                type="button"
                onClick={handleAddItem}
                className={`${editingCartId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-md shrink-0 flex items-center gap-1`}
              >
                <Plus className="w-4 h-4"/> {editingCartId ? 'บันทึกการแก้ไข' : 'เพิ่ม'}
              </button>
            </div>

            {/* แสดงรายการที่เลือกแยกตามหมวด 1-6 */}
            <div className="space-y-3 pt-2">
              {[
                { key: 'cat1', title: 'หมวดที่ 1: งานทุบสกัดสิ่งก่อสร้างตามชนิดพื้นผิว' },
                { key: 'cat2', title: 'หมวดที่ 2: งานวางท่อ' },
                { key: 'cat3', title: 'หมวดที่ 3: อุปกรณ์ประกอบท่อ' },
                { key: 'cat4', title: 'หมวดที่ 4: งานคืนสภาพผิวเดิม' },
                { key: 'cat5', title: 'หมวดที่ 5: ค่าแรงจ้างเหมาซ่อมท่อ (ต่อจุด)' },
                { key: 'cat6', title: 'หมวดที่ 6: อื่นๆ' },
              ].map((cat) => {
                const catItemList = getCategoryItems(cat.key);

                return (
                  <div key={cat.key} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-700 border-b border-slate-100 pb-1 flex justify-between">
                      <span>{cat.title}</span>
                      <span className="text-slate-400 font-normal">({catItemList.length} รายการ)</span>
                    </h4>
                    {catItemList.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">ยังไม่มีรายการในหมวดนี้</p>
                    ) : (
                      <div className="space-y-1.5">
                        {catItemList.map((item) => {
                          const isCat2Or3 = (cat.key === 'cat2' || cat.key === 'cat3');
                          return (
                            <div 
                              key={item.cartId} 
                              onDoubleClick={() => handleStartEditItem(item)}
                              title="💡 ดับเบิลคลิกเพื่อแก้ไขรายการนี้"
                              className={`flex flex-wrap justify-between items-center text-xs p-2 rounded-lg border transition cursor-pointer hover:bg-blue-50/70 hover:border-blue-300 ${
                                editingCartId === item.cartId ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400' : 'bg-slate-50 border-slate-100'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800">{item.name}</span>
                                  {item.isFromStock && (
                                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                                      📦 เบิกคลัง (ไม่คิดราคา)
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  จำนวน: {item.quantity} {item.unit} | วัสดุ: ฿{item.materialPrice} | ค่าแรง: ฿{item.laborPrice}
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                {isCat2Or3 && (
                                  <label 
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-700 cursor-pointer shadow-2xs"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={item.isFromStock || false}
                                      onChange={() => handleToggleStockItem(item.cartId)}
                                      className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500"
                                    />
                                    <span>เบิกคลัง</span>
                                  </label>
                                )}

                                <span className={`font-mono font-bold ${item.isFromStock ? 'text-slate-400 line-through' : 'text-blue-600'}`}>
                                  ฿{(item.totalMaterialPrice + item.totalLaborPrice).toLocaleString()}
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.cartId); }}
                                  className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5"/>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ส่วนตั้งค่า Factor F และการคืนพัสดุ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-indigo-600"/>
                ตั้งค่า Factor F (งานก่อสร้างทาง)
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="factorFMode"
                      checked={applyFactorF}
                      onChange={() => setApplyFactorF(true)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    คิด Factor F (นิติบุคคล)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="factorFMode"
                      checked={!applyFactorF}
                      onChange={() => setApplyFactorF(false)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    ไม่คิด Factor F (บุคคลธรรมดา)
                  </label>
                </div>

                {applyFactorF && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">ระบุค่า Factor F (มาตรฐาน = 1.4018)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={factorFValue}
                      onChange={(e) => setFactorFValue(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ส่วนคืนพัสดุ / อุปกรณ์เดิม */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600"/>
                  การคืนพัสดุ / อุปกรณ์เดิม
                </h3>
                <select
                  value={returnStatusType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReturnStatusType(val);
                    if (val === 'ไม่มี') setReturnEquipmentList([]);
                    else if (returnEquipmentList.length === 0) setReturnEquipmentList([{ id: Date.now(), name: '', qty: 1, unit: 'ชิ้น', condition: 'usable' }]);
                  }}
                  className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none shadow-xs"
                >
                  <option value="ไม่มี">ไม่มีอุปกรณ์คืน</option>
                  <option value="มีอุปกรณ์คืน">มีอุปกรณ์คืน</option>
                </select>
              </div>

              {returnStatusType === 'มีอุปกรณ์คืน' && (
                <div className="space-y-2 pt-1">
                  {returnEquipmentList.map((eq, idx) => (
                    <div key={eq.id} className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                      <input
                        type="text"
                        value={eq.name}
                        onChange={(e) => handleReturnEquipmentChange(eq.id, 'name', e.target.value)}
                        placeholder={`รายการที่ ${idx+1} (เช่น ท่อ PB เดิม)`}
                        className="flex-1 min-w-30 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                      />
                      <input
                        type="number"
                        min="1"
                        value={eq.qty}
                        onChange={(e) => handleReturnEquipmentChange(eq.id, 'qty', e.target.value)}
                        placeholder="จำนวน"
                        className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-800 outline-none"
                      />
                      <input
                        type="text"
                        value={eq.unit}
                        onChange={(e) => handleReturnEquipmentChange(eq.id, 'unit', e.target.value)}
                        placeholder="หน่วย"
                        className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-800 outline-none"
                      />
                      <select
                        value={eq.condition}
                        onChange={(e) => handleReturnEquipmentChange(eq.id, 'condition', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="usable">✅ ใช้งานได้</option>
                        <option value="unusable">❌ ใช้งานไม่ได้</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveReturnEquipment(eq.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddReturnEquipment}
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5"/> เพิ่มรายการอุปกรณ์คืน
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* หมวดค่าใช้จ่ายอื่นๆ (จาก Cat7) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-600"/>
              ค่าใช้จ่ายอื่นๆ (ดึงจากตาราง Cat7 เช่น PC35 - ไม่คิด Factor F)
            </h3>

            <div className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="relative flex-1 min-w-50">
                <input
                  type="text"
                  value={otherSearchTerm}
                  onChange={handleOtherSearchChange}
                  placeholder="พิมพ์ค้นหารายการจาก Cat7 (เช่น PC35)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                />
                {otherSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {otherSuggestions.map((m, idx) => (
                      <button
                        key={`other-sug-${idx}`}
                        type="button"
                        onClick={() => handleSelectOtherSuggestion(m)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 transition font-medium text-slate-700 flex justify-between"
                      >
                        <span>{m.name}</span>
                        <span className="text-[10px] text-amber-600 font-mono font-bold">ราคา: {m.laborPrice > 0 ? m.laborPrice : m.materialPrice} บาท/{m.unit}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="number"
                value={customOtherUnitPrice}
                onChange={(e) => setCustomOtherUnitPrice(e.target.value)}
                placeholder="ราคาต่อหน่วย"
                className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-center text-slate-800 outline-none"
              />

              <input
                type="number"
                min="1"
                value={otherQty}
                onChange={(e) => setOtherQty(e.target.value)}
                placeholder="จำนวน"
                className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-center text-slate-800 outline-none"
              />

              <button
                type="button"
                onClick={handleAddOtherExpenseFromCat7}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-md shrink-0 flex items-center gap-1"
              >
                <Plus className="w-4 h-4"/> เพิ่ม
              </button>
            </div>

            <div className="space-y-2">
              {otherExpenses.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic text-center py-2">ยังไม่มีรายการค่าใช้จ่ายอื่นๆ</p>
              ) : (
                otherExpenses.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{item.name}</span>
                      <p className="text-[10px] text-slate-500 font-mono">จำนวน: {item.qty} {item.unit} | ราคา/หน่วย: ฿{item.unitPrice}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-amber-600">฿{item.amount.toLocaleString()}</span>
                      <button type="button" onClick={() => handleRemoveOtherExpense(item.id)} className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* สรุปยอดเงิน */}
          <div className="bg-linear-to-br from-slate-900 to-slate-950 text-white p-5 rounded-2xl shadow-lg space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>📊 สรุปยอดคำนวณตามแบบฟอร์มเบิกซ่อม กปภ. ({applyFactorF ? 'นิติบุคคล' : 'บุคคลธรรมดา'})</span>
              <span className="font-mono text-cyan-400">คำสั่งงาน: {rNumber || '-'}</span>
            </h3>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>- รวมต้นทุนตรง หมวด 1-6 (ไม่รวมรายการเบิกคลัง) (ข้อ a):</span>
                <span className="font-mono font-bold text-white">฿{totalDirectCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>- ต้นทุนตรง × Factor F ({activeFactorF}) (ข้อ c):</span>
                <span className="font-mono font-bold text-emerald-400">฿{totalCostWithFactorF.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>- รวมค่าใช้จ่ายอื่นๆ (จาก Cat7 - ไม่คิด Factor F) (ข้อ e):</span>
                <span className="font-mono font-bold text-amber-300">฿{sumOtherExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>- ภาษีมูลค่าเพิ่ม Vat 7% (ข้อ f):</span>
                <span className="font-mono font-bold text-cyan-300">฿{vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-wrap justify-between items-center gap-3">
              <div>
                <span className="text-xs text-slate-400 block">ค่าจ้างในการซ่อมท่อ เป็นเงินทั้งสิ้น ({applyFactorF ? 'นิติบุคคล - ถอดภาษีฯ ออก' : 'บุคคลธรรมดา - ราคาเดิม'}):</span>
                <span className="text-lg font-mono font-extrabold text-cyan-400">฿{formattedGrandTotalFormatted} บาท</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintPreview(true)}
                  className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="w-4 h-4"/> พรีวิวและสั่งพิมพ์
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold text-xs shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
            {isSubmitting ? 'กำลังบันทึกข้อมูล...' : (isEditingExisting ? 'บันทึกการแก้ไขแบบฟอร์มเบิกซ่อมท่อ' : 'บันทึกข้อมูลแบบฟอร์มเบิกซ่อมท่อ')}
          </button>

        </form>
      )}

      {/* 📜 Modal ประวัติการเบิกซ่อมย้อนหลัง */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 font-bold text-sm">
                <History className="w-5 h-5 text-amber-400"/>
                <span>ประวัติการเบิกซ่อมท่อทั้งหมด ({savedRepairCosts.length} รายการ)</span>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50">
              {savedRepairCosts.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-xs">ยังไม่มีประวัติการบันทึกเบิกซ่อม</p>
              ) : (
                savedRepairCosts.map((item, idx) => (
                  <div key={`hist-${idx}`} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600 font-mono">Job ID: {item.Job_ID || item.jobId || '-'}</span>
                        {item.R_Number && <span className="bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded text-[10px]">R: {item.R_Number}</span>}
                      </div>
                      <p className="text-slate-700 font-medium truncate max-w-md">📍 {item.Location || '-'}</p>
                      <p className="text-slate-500 text-[11px]">
                        ยอดรวมเบิกซ่อม: <span className="font-bold font-mono text-emerald-600">฿{Number(item.Grand_Total || 0).toLocaleString()}.00</span> | วันเวลาซ่อมเสร็จ: {formatThaiDateTime(item.Repair_Closed_At)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditHistoryItem(item)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5"/> แก้ไขข้อมูล
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📄 Modal พรีวิวและสั่งพิมพ์ */}
      {showPrintPreview && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-6 font-sans overflow-y-auto">
          <div className="bg-white w-full max-w-[98vw] h-[98vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            <div className="no-print bg-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-3 shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Printer className="w-6 h-6 text-cyan-400"/>
                <span className="font-bold text-base text-white">พรีวิวแบบฟอร์มควบคุมการซ่อมท่อ แผนที่ และใบรับแจ้งท่อแตก-รั่ว</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-4 h-4"/> ปิดหน้าต่าง
                </button>
              </div>
            </div>

            <div id="print-preview-modal-content" className="p-6 overflow-y-auto bg-slate-300 flex flex-col items-center gap-12 flex-1 w-full" style={{ fontFamily: "'Sarabun', 'TH Sarabun PSK', sans-serif" }}>
              
              {/* หน้าที่ 1: ตารางประมาณการ (ขยับลงมาจากขอบ 1.5 ซม. / pt-[15mm]) */}
              <div id="print-sheet-estimate" className="bg-white w-[210mm] min-h-[297mm] pt-[15mm] px-[8mm] pb-[8mm] shadow-2xl text-black text-[11px] leading-tight flex flex-col justify-between relative group box-border" style={{ fontFamily: "'Sarabun', 'TH Sarabun PSK', sans-serif" }}>
                <div className="no-print absolute top-3 right-3 z-30">
                  <button
                    type="button"
                    onClick={() => handlePrintSpecificElement('print-sheet-estimate')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Printer className="w-4 h-4"/> พิมพ์หน้าประมาณการ (แท็บใหม่)
                  </button>
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex justify-between items-center border border-black p-2">
                    <div className="flex items-center gap-2 w-1/4">
                      <img 
                        src="/pwa.webp" 
                        alt="PWA Logo" 
                        className="w-8 h-8 object-contain" 
                        onError={(e)=>{e.target.onerror=null; e.target.src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>';}} 
                      />
                    </div>
                    <div className="text-center w-2/4">
                      <h1 className="text-[13px] font-bold">การประปาส่วนภูมิภาคสาขานครพนม</h1>
                      <h2 className="text-[14px] font-extrabold underline mt-0.5">แบบฟอร์มควบคุมการซ่อมท่อ</h2>
                    </div>
                    <div className="text-right text-[11px] w-1/4 leading-tight">
                      <p><b>คำสั่งงานเลขที่ :</b> {rNumber || 'R202608036111'}</p>
                      <p><b>วันที่ :</b> {formatThaiDate(selectedJob.ClosedAt || selectedJob.closedAt || new Date())}</p>
                    </div>
                  </div>

                  <table className="w-full border-collapse border border-black text-[11px]">
                    <tbody>
                      <tr>
                        <td className="border border-black p-1 font-bold bg-slate-100" width="12%">วันที่แจ้ง</td>
                        <td className="border border-black p-1" width="21%">{formatThaiDate(selectedJob.Timestamp)}</td>
                        <td className="border border-black p-1 font-bold bg-slate-100" width="14%">วันที่ซ่อมเสร็จ</td>
                        <td className="border border-black p-1 font-bold text-blue-900" width="23%">{formatThaiDateTime(jobClosedAtVal)}</td>
                        <td className="border border-black p-1 font-bold bg-slate-100" width="12%">ขนาด (กxยxล)</td>
                        <td className="border border-black p-1">{workDetails.width || 0} x {workDetails.length || 0} x {workDetails.depth || 0} ม.</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-1 font-bold bg-slate-100">สถานที่</td>
                        <td className="border border-black p-1" colSpan="3">{selectedJob.Location || selectedJob.location || '-'}</td>
                        <td className="border border-black p-1 font-bold bg-slate-100">สภาพพื้นที่</td>
                        <td className="border border-black p-1 font-bold text-blue-900">{workDetails.surfaceType}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-1 font-bold bg-slate-100">ชนิดท่อ</td>
                        <td className="border border-black p-1">{selectedJob.PipeType || '-'}</td>
                        <td className="border border-black p-1 font-bold bg-slate-100">ขนาดท่อ</td>
                        <td className="border border-black p-1">{selectedJob.PipeSize || '-'} มม.</td>
                        <td className="border border-black p-1 font-bold bg-slate-100">ระยะเวลาซ่อม</td>
                        <td className="border border-black p-1 font-bold">{workDetails.repairHours} ชม. {workDetails.repairMinutes} นาที</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="flex gap-2 items-stretch">
                    <div className="w-[66.666%]">
                      <table className="w-full h-full border-collapse border border-black text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-center">
                            <th className="border border-black p-1" width="5%">ลำดับ</th>
                            <th className="border border-black p-1" width="37%">รายการ</th>
                            <th className="border border-black p-1" width="7%">จำนวน</th>
                            <th className="border border-black p-1" width="8%">หน่วย</th>
                            <th className="border border-black p-1" width="14%">ค่าวัสดุ (บ.)</th>
                            <th className="border border-black p-1" width="14%">ค่าแรง (บ.)</th>
                            <th className="border border-black p-1" width="15%">รวม (บ.)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: 'cat1', num: '1', title: 'หมวดที่ 1: งานสกัดพื้น' },
                            { key: 'cat2', num: '2', title: 'หมวดที่ 2: งานวางท่อ' },
                            { key: 'cat3', num: '3', title: 'หมวดที่ 3: อุปกรณ์ประกอบท่อ' },
                            { key: 'cat4', num: '4', title: 'หมวดที่ 4: งานคืนสภาพผิวเดิม' },
                            { key: 'cat5', num: '5', title: 'หมวดที่ 5: ค่าแรงจ้างเหมาซ่อมท่อ (ต่อจุด)' },
                            { key: 'cat6', num: '6', title: 'หมวดที่ 6: อื่นๆ' },
                          ].map((catHead) => {
                            const catItems = getCategoryItems(catHead.key);
                            return (
                              <React.Fragment key={`pdf-cat-${catHead.key}`}>
                                <tr className="bg-slate-50 font-bold">
                                  <td className="border border-black p-0.5 text-center">{catHead.num}</td>
                                  <td className="border border-black p-0.5" colSpan="6">{catHead.title}</td>
                                </tr>
                                {catItems.length === 0 ? (
                                  <tr>
                                    <td className="border border-black p-0.5 text-center">-</td>
                                    <td className="border border-black p-0.5 text-slate-400 italic" colSpan="6">ไม่มีรายการ</td>
                                  </tr>
                                ) : (
                                  catItems.map((item, itemIdx) => (
                                    <tr key={`pdf-item-${item.cartId}`}>
                                      <td className="border border-black p-0.5 text-center">{catHead.num}.{itemIdx + 1}</td>
                                      <td className="border border-black p-0.5">
                                        {item.name} {item.isFromStock && <span className="text-emerald-700 font-bold">[เบิกคลัง]</span>}
                                      </td>
                                      <td className="border border-black p-0.5 text-center">{item.quantity}</td>
                                      <td className="border border-black p-0.5 text-center">{item.unit}</td>
                                      {item.isFromStock ? (
                                        <>
                                          <td className="border border-black p-0.5 text-center text-slate-400" colSpan="3">เบิกคลัง (ไม่คิดราคา)</td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="border border-black p-0.5 text-right">{item.totalMaterialPrice.toLocaleString()}</td>
                                          <td className="border border-black p-0.5 text-right">{item.totalLaborPrice.toLocaleString()}</td>
                                          <td className="border border-black p-0.5 text-right font-bold">{(item.totalMaterialPrice + item.totalLaborPrice).toLocaleString()}</td>
                                        </>
                                      )}
                                    </tr>
                                  ))
                                )}
                              </React.Fragment>
                            );
                          })}

                          <tr className="font-bold bg-slate-50">
                            <td className="border border-black p-1 text-center">a</td>
                            <td className="border border-black p-1" colSpan="5">รวมราคาค่าวัสดุและค่าแรงงาน (ไม่รวมภาษีฯ)</td>
                            <td className="border border-black p-1 text-right font-mono">{totalDirectCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          </tr>
                          <tr className="font-bold bg-slate-50">
                            <td className="border border-black p-1 text-center">b</td>
                            <td className="border border-black p-1" colSpan="5">Factor F : งานก่อสร้างทาง (รวมภาษีฯ)</td>
                            <td className="border border-black p-1 text-right font-mono">{activeFactorF}</td>
                          </tr>
                          <tr className="font-bold bg-slate-100">
                            <td className="border border-black p-1 text-center">c</td>
                            <td className="border border-black p-1" colSpan="5">รวมราคาค่าวัสดุและค่าแรงงาน x Factor F (ข้อ a x ข้อ b)</td>
                            <td className="border border-black p-1 text-right font-mono">{totalCostWithFactorF.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          </tr>

                          <tr>
                            <td className="border border-black p-1 text-center">d</td>
                            <td className="border border-black p-1 font-bold" colSpan="6">ค่าใช้จ่ายอื่นๆ (จาก Cat7) : (ไม่คิด Factor F)</td>
                          </tr>
                          {otherExpenses.length === 0 ? (
                            <tr>
                              <td className="border border-black p-0.5 text-center">-</td>
                              <td className="border border-black p-0.5 text-slate-400 italic" colSpan="6">ไม่มีรายการค่าใช้จ่ายอื่นๆ</td>
                            </tr>
                          ) : (
                            otherExpenses.map((oth, oIdx) => (
                              <tr key={`pdf-oth-${oIdx}`}>
                                <td className="border border-black p-0.5 text-center">d.{oIdx+1}</td>
                                <td className="border border-black p-0.5" colSpan="5">{oth.name} ({oth.qty} {oth.unit} @ {oth.unitPrice})</td>
                                <td className="border border-black p-0.5 text-right font-mono">{oth.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                              </tr>
                            ))
                          )}

                          <tr className="font-bold bg-slate-50">
                            <td className="border border-black p-1 text-center">e</td>
                            <td className="border border-black p-1" colSpan="5">รวมราคาค่าใช้จ่ายอื่นๆ (ไม่รวมภาษีฯ) (รวมข้อ d)</td>
                            <td className="border border-black p-1 text-right font-mono">{sumOtherExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          </tr>
                          <tr className="font-bold bg-slate-50">
                            <td className="border border-black p-1 text-center">f</td>
                            <td className="border border-black p-1" colSpan="5">ภาษีมูลค่าเพิ่ม (Vat 7%)</td>
                            <td className="border border-black p-1 text-right font-mono">{vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          </tr>
                          <tr className="font-bold bg-slate-50">
                            <td className="border border-black p-1 text-center">g</td>
                            <td className="border border-black p-1" colSpan="5">รวมราคาค่าใช้จ่ายอื่นๆ (รวมภาษีฯ) (ข้อ e + ข้อ f)</td>
                            <td className="border border-black p-1 text-right font-mono">{totalOtherWithVat.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          </tr>
                          <tr className="font-bold bg-cyan-100 text-cyan-950">
                            <td className="border border-black p-1 text-center">h</td>
                            <td className="border border-black p-1" colSpan="5">รวมราคาค่าดำเนินการซ่อมท่อ (รวมภาษีฯ) (ข้อ c + ข้อ g)</td>
                            <td className="border border-black p-1 text-right font-mono text-[11px]">{grandTotalWithVat.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          </tr>

                          <tr className="font-bold bg-slate-100">
                            <td className="border border-black p-1 text-center">i</td>
                            <td className="border border-black p-1" colSpan="2">รูปแบบการจ้างเหมาซ่อมท่อฯ</td>
                            <td className="border border-black p-1 text-center text-red-700 underline" colSpan="4">{applyFactorF ? 'นิติบุคคล' : 'บุคคลธรรมดา'}</td>
                          </tr>
                          <tr className="font-bold bg-slate-50">
                            <td className="border border-black p-1 text-center"></td>
                            <td className="border border-black p-1" colSpan="5">{applyFactorF ? 'ค่าจ้างในการซ่อมท่อ เป็นเงินทั้งสิ้น (ถอดภาษีฯ ออก)' : 'ค่าจ้างในการซ่อมท่อ เป็นเงินทั้งสิ้น (ราคาเดิม)'}</td>
                            <td className="border border-black p-1 text-right font-mono">{calcGrandTotalVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          </tr>
                          <tr className="font-bold bg-emerald-100 text-emerald-950">
                            <td className="border border-black p-1 text-center">⭐</td>
                            <td className="border border-black p-1 underline" colSpan="5">ค่าจ้าง</td>
                            <td className="border border-black p-1 text-right font-mono text-[11px] font-bold">{formattedGrandTotalFormatted}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="w-[33.333%] border border-black p-2 flex flex-col justify-between bg-slate-50/30 text-[10px]">
                      <div className="space-y-2">
                        <div className="border-b border-black pb-1.5 space-y-0.5">
                          <p className="font-bold text-[10px]">รายละเอียดการตรวจสอบท่อ-อุปกรณ์เดิม</p>
                          {returnStatusType === 'ไม่มี' || returnEquipmentList.length === 0 ? (
                            <p>-</p>
                          ) : (
                            <ul className="list-disc pl-4 space-y-0.5">
                              {returnEquipmentList.map((eq, i) => (
                                <li key={i}>{eq.name} : {eq.qty} {eq.unit} ({eq.condition === 'usable' ? 'ใช้งานได้' : 'ใช้งานไม่ได้'})</li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="border-b border-black pb-1.5 space-y-0.5 text-center">
                          <p className="font-bold text-[10px]">คณะกรรมการตรวจสอบท่อ และอุปกรณ์เดิม</p>
                          <div className="space-y-0.5 pt-0.5 leading-tight">
                            {signers.committeeCheck.map((s, i) => (
                              <p key={i}>ลงชื่อ..................................................{s.position}<br/>({s.name})</p>
                            ))}
                          </div>
                        </div>

                        <div className="border-b border-black pb-1.5 space-y-0.5 text-center">
                          <p className="font-bold text-[10px]">คณะกรรมการตรวจรับพัสดุ</p>
                          <div className="space-y-0.5 pt-0.5 leading-tight">
                            {signers.committeeReceive.map((s, i) => (
                              <p key={i}>ลงชื่อ..................................................{s.position}<br/>({s.name})</p>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-0.5 text-center pt-0.5">
                        <p className="font-bold text-[10px]">ผู้ควบคุมงาน / ผู้ดำเนินการซ่อม</p>
                        <p>ลงชื่อ..................................................<br/>(..................................................)<br/><b>ผู้ควบคุมงาน / ทีมช่าง</b></p>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="border border-black p-2 mt-2 bg-slate-50/50 text-[11px] shrink-0">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="space-y-0.5">
                      <p>ลงชื่อ..................................................</p>
                      <p className="font-bold">(..................................................)</p>
                      <p><b>ตำแหน่ง:</b> ..................................................<br/>(ผู้ประมาณการ)</p>
                    </div>
                    <div className="space-y-0.5">
                      <p>ลงชื่อ..................................................</p>
                      <p className="font-bold">({supervisorName})</p>
                      <p><b>ตำแหน่ง:</b> {supervisorPos}<br/>(ผู้ตรวจ)</p>
                    </div>
                    <div className="space-y-0.5">
                      <p>ลงชื่อ..................................................</p>
                      <p className="font-bold">({managerName})</p>
                      <p><b>ตำแหน่ง:</b> {managerPos}<br/>(ผู้จัดการ)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* หน้าที่ 2: แผนที่ Google Maps (ขยับลงมาจากขอบ 1.5 ซม. / pt-[15mm]) */}
              <div 
                id="print-sheet-map" 
                className="bg-white shadow-2xl text-black text-[11px] leading-normal flex flex-col justify-between relative group box-border shrink-0 mx-auto" 
                style={{ 
                  width: '210mm', 
                  minHeight: '297mm', 
                  height: '297mm', 
                  maxHeight: '297mm', 
                  paddingTop: '15mm',
                  paddingLeft: '10mm',
                  paddingRight: '10mm',
                  paddingBottom: '10mm',
                  fontFamily: "'Sarabun', 'TH Sarabun PSK', sans-serif",
                  pageBreakAfter: 'always'
                }}
              >
                <div className="no-print absolute top-3 right-3 z-30">
                  <button
                    type="button"
                    onClick={() => handlePrintSpecificElement('print-sheet-map')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Printer className="w-4 h-4"/> พิมพ์หน้าแผนที่ (แท็บใหม่)
                  </button>
                </div>

                <div className="flex flex-col space-y-2 border border-black p-3 bg-slate-50 box-border" style={{ height: '48.5%' }}>
                  <div className="flex justify-between items-center border-b border-black pb-1.5">
                    <h3 className="font-bold text-[12px] flex items-center gap-1.5 text-blue-900">
                      <MapPin className="w-4 h-4 text-rose-600"/> แผนที่แสดงตำแหน่งพิกัดจุดท่อรั่ว และ Street View
                    </h3>
                    <span className="text-[10px] font-mono text-slate-600">พิกัด: {jobLat}, {jobLng}</span>
                  </div>

                  <div className="flex-1 w-full relative rounded border border-slate-300 overflow-hidden bg-slate-200 flex flex-col items-center justify-center" style={{ height: 'calc(100% - 30px)' }}>
                    <iframe
                      title="Google Map Location"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://maps.google.com/maps?q=${jobLat},${jobLng}&z=16&output=embed`}
                    ></iframe>
                  </div>
                  <p className="text-[10px] text-slate-600 truncate"><b>สถานที่ซ่อม:</b> {selectedJob.Location || selectedJob.location || '-'}</p>
                </div>

                <div className="flex flex-col space-y-1.5 border border-black p-3 bg-white box-border" style={{ height: '48.5%' }}>
                  <div className="border-b border-black pb-1">
                    <h3 className="font-bold text-[12px] text-slate-900 uppercase">แบบรายการซ่อมท่อ (ถ้ามี)</h3>
                  </div>

                  <div className="flex-1 border border-black rounded p-3 bg-white flex flex-col justify-between" style={{ height: 'calc(100% - 30px)' }}>
                    <div className="h-full"></div>
                    <div className="border-t border-slate-300 pt-2 flex justify-between text-[10px] text-slate-600">
                      <span>ผู้บันทึกข้อมูล: ..................................................</span>
                      <span>วันที่: ..................................................</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* หน้าที่ 3: ใบรับแจ้ง (ขยับลงมาจากขอบ 1.5 ซม. / pt-[15mm]) */}
              <div id="print-sheet-report" className="bg-white w-[210mm] min-h-[297mm] pt-[15mm] px-[8mm] pb-[8mm] shadow-2xl text-black text-[11px] leading-tight flex flex-col justify-between space-y-1.5 relative group box-border" style={{ fontFamily: "'Sarabun', 'TH Sarabun PSK', sans-serif" }}>
                <div className="no-print absolute top-3 right-3 z-30">
                  <button
                    type="button"
                    onClick={() => handlePrintSpecificElement('print-sheet-report')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Printer className="w-4 h-4"/> พิมพ์หน้าใบรับแจ้ง (แท็บใหม่)
                  </button>
                </div>

                <div className="flex justify-between items-center border border-black p-2 bg-slate-50 shrink-0">
                  <div className="flex items-center gap-2 w-1/4">
                    <img 
                      src="/pwa.webp" 
                      alt="PWA Logo" 
                      className="w-8 h-8 object-contain" 
                      onError={(e)=>{e.target.onerror=null; e.target.src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>';}} 
                    />
                  </div>
                  <div className="text-center w-2/4">
                    <h1 className="text-[13px] font-bold">การประปาส่วนภูมิภาคสาขานครพนม</h1>
                    <h2 className="text-[14px] font-extrabold underline mt-0.5">แบบฟอร์มใบรับแจ้งท่อแตก-ท่อรั่ว</h2>
                  </div>
                  <div className="text-right text-[11px] w-1/4 leading-tight">
                    <p><b>เลขที่รับแจ้ง :</b> {selectedJob.JobID || selectedJob.id || selectedJob[0] || '1/2569'}</p>
                    <p><b>วันที่ :</b> {formatThaiDate(selectedJob.Timestamp || new Date())}</p>
                    <p><b>คำสั่งงานเลขที่ :</b> {rNumber || 'R202608036111'}</p>
                  </div>
                </div>

                {/* ข้อ 1 */}
                <div className="border border-black p-1.5 space-y-0.5 bg-white shrink-0 text-[11px]">
                  <p className="font-bold text-[11.5px]">(1) เรียน ผู้จัดการการประปาส่วนภูมิภาคสาขานครพนม</p>
                  <div className="grid grid-cols-3 gap-2 pl-3">
                    <p><b>วันที่แจ้ง:</b> {formatThaiDate(selectedJob.Timestamp)}</p>
                    <p><b>ผู้แจ้ง:</b> {reporterName}</p>
                    <p><b>โทรศัพท์:</b> {reporterPhone}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2 pl-3">
                    <p><b>เลขที่ผู้ใช้น้ำ:</b> {selectedJob.MeterNo || '-'}</p>
                    <p><b>เวลา:</b> {jobTime} น.</p>
                    <p><b>ขนาดท่อ:</b> {selectedJob.PipeSize || '-'} มม.</p>
                    <p><b>ชนิดท่อ:</b> {selectedJob.PipeType || '-'}</p>
                  </div>
                  <div className="pl-3 flex flex-wrap gap-4">
                    <p><b>พบสาเหตุ:</b> <span className="text-blue-900 font-bold">{jobIssueType}</span></p>
                    <p><b>สถานที่เกิดเหตุ / จุดซ่อมท่อ:</b> {selectedJob.Location || selectedJob.location || '-'}</p>
                  </div>
                  <div className="pl-3">
                    <p>จึงเรียนมาเพื่อโปรดแจ้งผู้เกี่ยวข้องดำเนินการต่อไป จะขอบคุณยิ่ง</p>
                  </div>
                  <div className="pt-0.5 text-right pr-4 font-bold">
                    ลงชื่อ.............................................................. (ผู้รับแจ้ง)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 flex-1 items-stretch text-[10.5px]">
                  
                  {/* ฝั่งซ้าย */}
                  <div className="space-y-1.5 flex flex-col justify-between h-full">
                    
                    <div className="border border-black p-1.5 space-y-0.5 flex flex-col justify-between flex-1">
                      <div>
                        <p className="font-bold text-[10.5px]">(2) เรียน หน.งานบริการและควบคุมน้ำสูญเสีย</p>
                        <p className="pl-2 text-[10.5px] leading-normal">ดำเนินการในส่วนที่เกี่ยวข้อง และรายงานผลการดำเนินงานต่อไป</p>
                      </div>
                      <div className="text-center pt-0.5">
                        <p className="text-[10.5px]">ลงชื่อ..............................................................</p>
                        <p className="font-bold text-[10.5px]">({managerName})</p>
                        <p className="text-[9.5px] font-medium">{managerPos}</p>
                      </div>
                    </div>

                    <div className="border border-black p-1.5 space-y-0.5 flex flex-col justify-between flex-[1.4]">
                      <div>
                        <p className="font-bold text-[10.5px]">(3) เรียน หัวหน้าชุดควบคุมงานซ่อมท่อ/พนักงานบริการ</p>
                        <p className="pl-2 text-[10.5px] leading-normal">ตรวจสอบรายละเอียดงานซ่อมท่อแตกรั่ว ทำการประมาณการค่าใช้จ่าย และแจ้งระยะเวลาการปฏิบัติงาน</p>
                      </div>
                      <div className="text-center pt-0.5 border-t border-slate-300 mt-0.5">
                        <p className="text-[10.5px]">ลงชื่อ..............................................................</p>
                        <p className="font-bold text-[10.5px]">({supervisorName})</p>
                        <p className="text-[9.5px] font-medium">{supervisorPos}</p>
                      </div>
                    </div>

                    <div className="border border-black p-1.5 space-y-0.5 text-[10px] flex flex-col justify-between flex-[2.2]">
                      <div>
                        <p className="font-bold text-[10.5px]">(4) เรียน หน.บริการและควบคุมน้ำสูญเสีย</p>
                        <p className="pl-2 font-bold">ทำการตรวจสอบแล้ว สรุปรายละเอียดดังนี้:-</p>
                        
                        <div className="pl-2 space-y-0.5 pt-0.5">
                          <p className="font-bold">4.1 ประเภทการแก้ไขปัญหา</p>
                          <div className="flex gap-3 pl-2">
                            <label className="flex items-center gap-1"><input type="checkbox" defaultChecked readOnly /> ท่อแตก-รั่ว</label>
                            <span>ขนาด: {selectedJob.PipeSize || '-'} มม.</span>
                          </div>

                          <p className="font-bold">4.2 สภาพพื้นผิว และการใช้เครื่องจักรกล</p>
                          <div className="flex flex-col gap-0.2 pl-2">
                            <label className="flex items-center gap-1"><input type="checkbox" defaultChecked={workDetails.surfaceType === 'พื้นดิน'} readOnly /> พื้นดิน</label>
                            <label className="flex items-center gap-1"><input type="checkbox" defaultChecked={workDetails.surfaceType !== 'พื้นดิน'} readOnly /> คืนสภาพผิวตามสภาพเดิม</label>
                            <label className="flex items-center gap-1 font-bold text-blue-900">
                              <input type="checkbox" checked={hasExcavator} readOnly /> 
                              จำเป็นต้องใช้รถขุด
                            </label>
                          </div>

                          <p className="font-bold">4.3 รูปแบบการดำเนินงานซ่อมและวิธีการจัดซื้อ/จัดจ้าง</p>
                          <div className="flex flex-col gap-0.2 pl-2">
                            <label className="flex items-center gap-1 text-black font-normal">
                              <input type="checkbox" defaultChecked readOnly />
                              จ้างเหมาเอกชน/บุคคลภายนอกดำเนินการ
                            </label>
                            <label className="flex items-center gap-1 text-black font-normal">
                              <input type="checkbox" defaultChecked readOnly /> 
                              วิธีการจัดซื้อ/จัดจ้าง : <span className="text-red-700 underline font-bold">{procurementMethod}</span>
                            </label>
                            <div className="pt-0.5 space-y-0.5">
                              <label className="flex items-center gap-1 text-black font-normal">
                                <input type="checkbox" defaultChecked={roundedGrandTotalVal > 0} readOnly /> 
                                ค่าซ่อมท่อ : <span className="text-red-700 font-bold">฿{formattedGrandTotalFormatted} บาท</span>
                              </label>
                              <p className="pl-5 text-[9px] text-slate-600">(รายละเอียดตามแบบฟอร์มควบคุมการซ่อมท่อ)</p>
                            </div>
                          </div>

                          <p className="font-bold">4.4 ระยะเวลาการปฏิบัติงาน</p>
                          <p className="pl-2">ใช้เวลาในการซ่อมประมาณ {workDetails.repairHours} ชม. {workDetails.repairMinutes} นาที</p>
                        </div>
                      </div>

                      <div className="text-center pt-0.5">
                        <p>ลงชื่อ..............................................................</p>
                        <p className="font-bold">(..................................................)</p>
                        <p className="text-[9px] font-medium">ช่างผู้ปฏิบัติงาน / หัวหน้าชุด</p>
                      </div>
                    </div>

                  </div>

                  {/* ฝั่งขวา */}
                  <div className="space-y-1.5 flex flex-col justify-between h-full">
                    
                    <div className="border border-black p-1.5 space-y-0.5 text-[10.5px] flex flex-col justify-between flex-[1.6]">
                      <div>
                        <p className="font-bold text-[10.5px]">( 5 ) เรียน ผู้จัดการการประปาส่วนภูมิภาคสาขานครพนม</p>
                        <p className="pl-2 leading-normal">งานบริการและลดน้ำสูญเสีย ตรวจสอบเหตุขัดข้องตามคำสั่งงาน <b>{rNumber || 'R202608036111'}</b> ขออนุมัติและให้ความเห็นชอบเพื่อดำเนินการดังนี้</p>
                        <p className="pl-3 leading-normal">
                          <b>( 5.1 )</b> อนุมัติทำการซ่อมท่อประปากรณีเร่งด่วนโดยจ้างเหมาด้วย{procurementMethod} วงเงินไม่เกิน <span className="text-[11.5px] font-extrabold text-red-600 font-mono">{formattedGrandTotalFormatted}</span> บาท
                        </p>
                      </div>
                      <div className="text-center pt-0.5">
                        <p className="text-[10.5px]">ลงชื่อ..............................................................</p>
                        <p className="font-bold text-[10.5px]">({supervisorName})</p>
                        <p className="text-[9.5px] font-medium">{supervisorPos}</p>
                      </div>
                    </div>

                    <div className="border border-black p-1.5 space-y-0.5 text-[10.5px] flex flex-col justify-between flex-1">
                      <div>
                        <p className="font-bold text-[10.5px]">(6) ข้อพิจารณา และความเห็นของผู้จัดการ</p>
                        <div className="pl-2 space-y-0.5 my-0.2 text-[10.5px]">
                          <label className="flex items-center gap-1 font-bold"><input type="checkbox" defaultChecked readOnly /> เห็นชอบอนุมัติให้ดำเนินการซ่อมตามประมาณการ</label>
                        </div>
                      </div>
                      <div className="text-center pt-0.5">
                        <p className="text-[10.5px]">ลงชื่อ..............................................................</p>
                        <p className="font-bold text-[10.5px]">({managerName})</p>
                        <p className="text-[9.5px] font-medium">{managerPos}</p>
                      </div>
                    </div>

                    <div className="border border-black p-1.5 space-y-0.5 text-[10.5px] flex flex-col justify-between flex-[1.8]">
                      <div>
                        <p className="font-bold text-[10px]">({'\u00A0'}7{'\u00A0'}) เรียน ผู้จัดการ กปภ.สาขานครพนม</p>
                        <p className="pl-2 text-[9.5px] leading-tight">คณะกรรมการตรวจสอบท่อ และอุปกรณ์เดิม ได้ตรวจสอบรายละเอียดท่อ-อุปกรณ์แล้ว มีความเห็นดังนี้</p>
                        
                        <div className="pl-2 space-y-0.5 pt-0.2 text-[9.5px]">
                          <label className="flex items-center gap-1"><input type="checkbox" checked={validReturnedEquipment.length === 0} readOnly /> ไม่มีท่อ/อุปกรณ์เดิมที่ส่งคืน</label>
                          <label className="flex items-center gap-1"><input type="checkbox" checked={validReturnedEquipment.length > 0} readOnly /> มีรายละเอียดท่อ/อุปกรณ์เดิมที่ส่งคืนพัสดุ</label>

                          <div className="grid grid-cols-2 gap-1 px-1 pt-0.2 font-bold text-center underline">
                            <span>อุปกรณ์ที่ส่งคืน</span>
                            <span>สภาพ (ใช้งานได้/ไม่ได้)</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1 px-1 text-[9px]">
                            <div className="space-y-0.2">
                              {validReturnedEquipment.length > 0 ? (
                                validReturnedEquipment.map((eq, i) => (
                                  <p key={i} className="truncate">{i + 1}. {eq.name} ({eq.qty} {eq.unit})</p>
                                ))
                              ) : (
                                <>
                                  <p>1. ........................................</p>
                                  <p>2. ........................................</p>
                                </>
                              )}
                            </div>
                            <div className="space-y-0.2 flex flex-col justify-around text-[9px]">
                              {validReturnedEquipment.length > 0 ? (
                                validReturnedEquipment.map((eq, i) => (
                                  <div key={i} className="flex justify-around">
                                    <label><input type="checkbox" checked={eq.condition === 'usable'} readOnly /> ใช้งานได้</label>
                                    <label><input type="checkbox" checked={eq.condition === 'unusable'} readOnly /> ไม่ได้</label>
                                  </div>
                                ))
                              ) : (
                                <>
                                  <div className="flex justify-around"><label><input type="checkbox" /> ใช้งานได้</label><label><input type="checkbox" /> ไม่ได้</label></div>
                                  <div className="flex justify-around"><label><input type="checkbox" /> ใช้งานได้</label><label><input type="checkbox" /> ไม่ได้</label></div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-0.2 text-[9px] pt-0.5 border-t border-slate-200 mt-0.2">
                        {signers.committeeCheck.map((cm, idx) => (
                          <div key={idx} className="flex justify-between items-center px-1">
                            <span>(ลงชื่อ)........................................................ ({cm.name})</span>
                            <span className="font-bold">{cm.position}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border border-black p-1.5 flex flex-col justify-between flex-[0.9]">
                      <div>
                        <p className="font-bold text-[10.5px]">(8) เรียน ผู้จัดการ กปภ.สาขานครพนม</p>
                        <p className="pl-2 text-[10.5px] leading-normal">งานบริการฯ ได้ทำการปิดคำสั่งงาน เลขที่ <span className="font-bold text-blue-900">{rNumber || '-'}</span> เรียบร้อยแล้ว</p>
                      </div>
                      <div className="text-center pt-0.5">
                        <p className="text-[10.5px]">ลงชื่อ..............................................................</p>
                        <p className="font-bold text-[10.5px]">({supervisorName})</p>
                        <p className="text-[9.5px] font-medium">{supervisorPos}</p>
                      </div>
                    </div>

                    <div className="border border-black p-1.5 flex flex-col justify-between flex-[0.9]">
                      <div>
                        <p className="font-bold text-[10.5px]">(9) เรียน หน.งานบริการและควบคุมน้ำสูญเสีย</p>
                        <p className="pl-2 text-[10.5px] leading-normal">ทราบ / เก็บหลักฐานไว้สำหรับตรวจสอบต่อไป</p>
                      </div>
                      <div className="text-center pt-0.5">
                        <p className="text-[10.5px]">ลงชื่อ..............................................................</p>
                        <p className="font-bold text-[10.5px]">({managerName})</p>
                        <p className="text-[9.5px] font-medium">{managerPos}</p>
                      </div>
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
