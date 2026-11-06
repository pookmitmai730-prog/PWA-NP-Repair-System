import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Trash2, Calculator, DollarSign, FileText, CheckCircle2, Loader2, Printer, Eye, X, Search, Check, Layers, Clock, MapPin } from 'lucide-react';

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
    { id: 'C2-01', name: 'ท่อ PB SDR 13.5', category: 'cat2', unit: 'เมตร', materialPrice: 49, laborPrice: 19 },
    { id: 'C2-02', name: 'ข้อต่อตรง PB', category: 'cat2', unit: 'ตัว', materialPrice: 100, laborPrice: 0 },
  ],
  cat3: [
    { id: 'C3-01', name: 'ข้อต่อตรง PB / อุปกรณ์ประกอบ', category: 'cat3', unit: 'ตัว', materialPrice: 150, laborPrice: 50 },
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

export default function RepairCostForm({ jobs = [], onSubmitCost }) {
  // 🔍 State เลือกใบงาน
  const [completedJobsList, setCompletedJobsList] = useState(jobs);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchJobKeyword, setSearchJobKeyword] = useState('');
  const [rNumber, setRNumber] = useState('');

  // 🏗️ State รายละเอียดหน้างานและระยะเวลาซ่อม
  const [workDetails, setWorkDetails] = useState({
    width: '',
    length: '',
    depth: '',
    surfaceType: 'พื้นดิน',
    repairHours: '1',
    repairMinutes: '0'
  });

  // 🛠️ State คลังรายการทั้งหมดจาก Google Sheets
  const [itemMaster, setItemMaster] = useState(DEFAULT_ITEMS_BY_CATEGORY);
  
  // 📋 State เก็บข้อมูลรายชื่อผู้ลงนาม
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

  // 🛒 State รายการที่ถูกเลือกในแต่ละหมวด
  const [selectedItems, setSelectedItems] = useState([]);

  // State สำหรับฟอร์มเพิ่มรายการ
  const [activeCategory, setActiveCategory] = useState('cat1');
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [currentSelectedItem, setCurrentSelectedItem] = useState(null);
  const [itemQty, setItemQty] = useState(1);
  const [customMaterialPrice, setCustomMaterialPrice] = useState('');
  const [customLaborPrice, setCustomLaborPrice] = useState('');

  // ค่าใช้จ่ายอื่นๆ (ดึงมาจาก Cat7 ทุกรายการ)
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [newOtherName, setNewOtherName] = useState('');
  const [newOtherAmount, setNewOtherAmount] = useState('');
  
  // 📌 ตั้งค่า Factor F
  const [applyFactorF, setApplyFactorF] = useState(true);
  const [factorFValue, setFactorFValue] = useState(1.4018);

  // 📦 การคืนพัสดุ / อุปกรณ์เดิม (รองรับหลายรายการ)
  const [returnStatusType, setReturnStatusType] = useState('ไม่มี');
  const [returnEquipmentList, setReturnEquipmentList] = useState([
    { id: 1, name: '', qty: 1, unit: 'ชิ้น' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // 📥 1. ดึงข้อมูลรายชื่อผู้ลงนามจาก Google Sheets
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

  // 📥 2. ดึงข้อมูลใบงานที่ปิดงานแล้วจาก Google Sheets
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

  // 📥 3. ดึงข้อมูลรายการ Master Data (Cat1-Cat7 & Equipment)
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

            return {
              id,
              name,
              unit,
              materialPrice: price,
              laborPrice: labor
            };
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

        setItemMaster({
          cat1: parsedCat1.length > 0 ? parsedCat1 : DEFAULT_ITEMS_BY_CATEGORY.cat1,
          cat2: parsedEquipment.length > 0 ? parsedEquipment : DEFAULT_ITEMS_BY_CATEGORY.cat2,
          cat3: parsedEquipment.length > 0 ? parsedEquipment : DEFAULT_ITEMS_BY_CATEGORY.cat3,
          cat4: parsedCat4.length > 0 ? parsedCat4 : DEFAULT_ITEMS_BY_CATEGORY.cat4,
          cat5: parsedCat5.length > 0 ? parsedCat5 : DEFAULT_ITEMS_BY_CATEGORY.cat5,
          cat6: parsedCat6.length > 0 ? parsedCat6 : DEFAULT_ITEMS_BY_CATEGORY.cat6,
          cat7: parsedCat7.length > 0 ? parsedCat7 : DEFAULT_ITEMS_BY_CATEGORY.cat7,
        });

        const cat7List = parsedCat7.length > 0 ? parsedCat7 : DEFAULT_ITEMS_BY_CATEGORY.cat7;
        setOtherExpenses(cat7List.map((p, idx) => {
          const val = p.laborPrice > 0 ? p.laborPrice : p.materialPrice;
          return {
            id: p.id || idx + 1,
            name: p.name,
            unit: p.unit,
            qty: 1,
            unitPrice: val,
            amount: val
          };
        }));

      } catch (err) {
        console.error("Error fetching master data from sheet:", err);
      }
    };
    fetchAllMasterData();
  }, []);

  const completedJobs = completedJobsList.filter(j => normalizeStatus(j.Status || j.status || j.JobStatus || j[10] || j[11]) === 'COMPLETED');
  const displayJobs = completedJobs.length > 0 ? completedJobs : completedJobsList;

  const filteredJobsForSelect = displayJobs.filter(j => {
    const term = searchJobKeyword.toLowerCase().trim();
    if (!term) return true;
    const jobId = String(j.JobID || j.id || j.receivedNo || j[0] || '').toLowerCase();
    const location = String(j.Location || j.location || j[4] || '').toLowerCase();
    const reporter = String(j.ReporterName || j.reporterName || j[2] || '').toLowerCase();
    return jobId.includes(term) || location.includes(term) || reporter.includes(term);
  });

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (!val.trim()) {
      setSuggestions([]);
    } else {
      const q = val.trim().toLowerCase();
      const pool = itemMaster[activeCategory] || [];
      const filtered = pool.filter(m => {
        const itemName = String(m?.name || '').toLowerCase();
        return itemName.includes(q);
      });
      setSuggestions(filtered);
    }
  };

  const handleSelectItemSuggestion = (item) => {
    setCurrentSelectedItem(item);
    const itemName = String(item?.name || '').trim();
    setSearchTerm(itemName);
    setCustomMaterialPrice(item.materialPrice !== undefined ? item.materialPrice : '');
    setCustomLaborPrice(item.laborPrice !== undefined ? item.laborPrice : '');
    setSuggestions([]);
  };

  const handleAddItem = () => {
    if (!searchTerm.trim()) {
      alert("กรุณาเลือกหรือพิมพ์ชื่อรายการ");
      return;
    }
    
    const matPriceToUse = customMaterialPrice !== '' ? Number(customMaterialPrice) : (currentSelectedItem?.materialPrice || 0);
    const labPriceToUse = customLaborPrice !== '' ? Number(customLaborPrice) : (currentSelectedItem?.laborPrice || 0);

    const itemObj = currentSelectedItem || {
      id: 'CUSTOM-' + Date.now(),
      name: searchTerm.trim(),
      category: activeCategory,
      unit: 'หน่วย',
      materialPrice: matPriceToUse,
      laborPrice: labPriceToUse
    };

    const qty = Number(itemQty) || 1;
    const newItem = {
      cartId: Date.now(),
      ...itemObj,
      materialPrice: matPriceToUse,
      laborPrice: labPriceToUse,
      category: activeCategory,
      quantity: qty,
      totalMaterialPrice: matPriceToUse * qty,
      totalLaborPrice: labPriceToUse * qty
    };

    setSelectedItems([...selectedItems, newItem]);
    setSearchTerm('');
    setCurrentSelectedItem(null);
    setItemQty(1);
    setCustomMaterialPrice('');
    setCustomLaborPrice('');
  };

  const handleRemoveItem = (cartId) => {
    setSelectedItems(selectedItems.filter(m => m.cartId !== cartId));
  };

  const handleAddOtherExpense = () => {
    if (!newOtherName.trim()) {
      alert("กรุณาระบุชื่อรายการค่าใช้จ่ายอื่นๆ");
      return;
    }
    const amount = Number(newOtherAmount) || 0;
    setOtherExpenses([...otherExpenses, { id: Date.now(), name: newOtherName.trim(), unit: 'งาน', qty: 1, unitPrice: amount, amount }]);
    setNewOtherName('');
    setNewOtherAmount('');
  };

  const handleRemoveOtherExpense = (id) => {
    setOtherExpenses(otherExpenses.filter(item => item.id !== id));
  };

  const handleAddReturnEquipment = () => {
    setReturnEquipmentList([...returnEquipmentList, { id: Date.now(), name: '', qty: 1, unit: 'ชิ้น' }]);
  };

  const handleRemoveReturnEquipment = (id) => {
    setReturnEquipmentList(returnEquipmentList.filter(item => item.id !== id));
  };

  const handleReturnEquipmentChange = (id, field, value) => {
    setReturnEquipmentList(returnEquipmentList.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const getCategoryItems = (catKey) => selectedItems.filter(item => item.category === catKey);

  const totalDirectMaterial = selectedItems.reduce((acc, item) => acc + item.totalMaterialPrice, 0);
  const totalDirectLabor = selectedItems.reduce((acc, item) => acc + item.totalLaborPrice, 0);
  const totalDirectCost = totalDirectMaterial + totalDirectLabor;

  const activeFactorF = applyFactorF ? Number(factorFValue || 1) : 1.0;
  const totalCostWithFactorF = totalDirectCost * activeFactorF;

  const sumOtherExpenses = otherExpenses.reduce((acc, item) => acc + item.amount, 0);
  const vatAmount = sumOtherExpenses * 0.07;
  const totalOtherWithVat = sumOtherExpenses + vatAmount;
  
  const grandTotalWithVat = totalCostWithFactorF + totalOtherWithVat;

  const roundedGrandTotalVal = Math.floor(grandTotalWithVat);
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
      returnEquipmentList: returnEquipmentList,
      totalDirectCost: totalDirectCost,
      factorF: activeFactorF,
      totalCostWithFactorF: totalCostWithFactorF,
      otherExpenses: otherExpenses,
      sumOtherExpenses: sumOtherExpenses,
      vatAmount: vatAmount,
      grandTotal: roundedGrandTotalVal,
      grandTotalFormatted: formattedGrandTotalFormatted,
      rawGrandTotal: grandTotalWithVat,
      createdAt: new Date().toLocaleString("th-TH")
    };

    try {
      if (onSubmitCost) {
        await onSubmitCost(costPayload);
      } else {
        alert(`บันทึกข้อมูลสำเร็จ!\nยอดรวมดำเนินการซ่อมท่อทั้งสิ้น: ฿${formattedGrandTotalFormatted} บาท`);
      }
    } catch (err) {
      console.error("Error saving cost:", err);
      alert("เกิดข้อผิดพลาดในการบันทึก");
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
  const jobClosedDate = selectedJob ? (selectedJob.ClosedAt || selectedJob.closedAt || new Date()) : new Date();

  const supervisorName = signers.managers[1]?.name || 'นายราเมศร์ สันวิลาศ';
  const supervisorPos = signers.managers[1]?.position || 'หัวหน้างานบริการและควบคุมน้ำสูญเสีย';

  const managerName = signers.managers[2]?.name || 'นายเกรียงศักดิ์ วรสุทธิ์';
  const managerPos = signers.managers[2]?.position || 'ผู้จัดการการประปาส่วนภูมิภาคสาขานครพนม';

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-3xl shadow-xl border border-slate-200 font-sans space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-base">แบบฟอร์มควบคุมการซ่อมท่อ (การประปาส่วนภูมิภาคสาขานครพนม)</h2>
            <p className="text-xs text-slate-500">หมวดที่ 1 ถึง หมวดที่ 6 ตามมาตรฐานแบบฟอร์ม กปภ.</p>
          </div>
        </div>

        {selectedJob && (
          <button
            type="button"
            onClick={() => setShowPrintPreview(true)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>พรีวิวแบบฟอร์มเบิกซ่อม (PDF)</span>
          </button>
        )}
      </div>

      {/* 🔍 เลือกใบงานที่ซ่อมเสร็จแล้ว */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Search className="w-4 h-4 text-blue-600" />
            ขั้นตอนที่ 1: ค้นหาและเลือกใบงาน (สถานะ: ซ่อมเสร็จแล้ว / COMPLETED)
          </span>
          <span className="text-[10px] text-slate-500 font-normal">(พบ {displayJobs.length} รายการใบงาน)</span>
        </h3>

        {selectedJob ? (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex justify-between items-center text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded font-bold text-[10px]">เลือกแล้ว</span>
                <span className="font-bold text-slate-800">เลขที่รับแจ้ง: {selectedJob.JobID || selectedJob.id || selectedJob.receivedNo || selectedJob[0]}</span>
                {rNumber && <span className="bg-blue-600 text-white px-2 py-0.5 rounded font-bold text-[10px]">คำสั่งงานเลขที่: {rNumber}</span>}
              </div>
              <p className="text-slate-600"><b>สถานที่:</b> {selectedJob.Location || selectedJob.location || selectedJob[4] || '-'}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedJob(null)}
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
              placeholder="ค้นหาด้วยเลขที่งาน, สถานที่ หรือชื่อผู้แจ้ง..."
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
                <p className="text-xs text-slate-400 text-center py-4">ไม่พบใบงานที่ค้นหา</p>
              ) : (
                filteredJobsForSelect.map((j, jIdx) => (
                  <div 
                    key={`comp-job-${jIdx}`}
                    onClick={() => setSelectedJob(j)}
                    className="p-2.5 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition cursor-pointer flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">เลขที่รับแจ้ง: <span className="text-blue-600">{j.JobID || j.id || j[0]}</span></p>
                      <p className="text-slate-600 truncate max-w-md">📍 {j.Location || j.location || j[4] || '-'}</p>
                    </div>
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-lg font-bold text-xs shrink-0 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> เลือก
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🏗️ 1. กรอบรายละเอียดหน้างาน */}
      {selectedJob && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 animate-fadeIn">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-blue-600" />
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

      {/* ⏱️ 2. กรอบระยะเวลาซ่อม (นาที 1-60) */}
      {selectedJob && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 animate-fadeIn">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
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
                {[...Array(25).keys()].map(h => (
                  <option key={h} value={h}>{h} ชม.</option>
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
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              เลือกและเพิ่มรายการตามหมวดหมู่แบบฟอร์ม
            </h3>

            {/* แถบเลือกหมวดหมู่ 1-6 */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
              {[
                { key: 'cat1', label: 'หมวดที่ 1: งานสกัดพื้น' },
                { key: 'cat2', label: 'หมวดที่ 2: งานวางท่อ' },
                { key: 'cat3', label: 'หมวดที่ 3: อุปกรณ์ประกอบท่อ' },
                { key: 'cat4', label: 'หมวดที่ 4: งานคืนสภาพผิวเดิม' },
                { key: 'cat5', label: 'หมวดที่ 5: ค่าแรงจ้างซ่อมท่อ (ต่อจุด)' },
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
              <div className="relative flex-1 min-w-[180px]">
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

              <input
                type="number"
                min="1"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                placeholder="จำนวน"
                className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 text-slate-800 outline-none shadow-xs"
              />

              <button
                type="button"
                onClick={handleAddItem}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-md shrink-0 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> เพิ่ม
              </button>
            </div>

            {/* แสดงรายการที่เลือกแยกตามหมวด 1-6 */}
            <div className="space-y-3 pt-2">
              {[
                { key: 'cat1', title: 'หมวดที่ 1: งานสกัดพื้น' },
                { key: 'cat2', title: 'หมวดที่ 2: งานวางท่อ' },
                { key: 'cat3', title: 'หมวดที่ 3: อุปกรณ์ประกอบท่อ' },
                { key: 'cat4', title: 'หมวดที่ 4: งานคืนสภาพผิวเดิม' },
                { key: 'cat5', title: 'หมวดที่ 5: ค่าแรงจ้างซ่อมท่อ (ต่อจุด)' },
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
                        {catItemList.map((item) => (
                          <div key={item.cartId} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <div>
                              <span className="font-bold text-slate-800">{item.name}</span>
                              <p className="text-[10px] text-slate-500 font-mono">
                                จำนวน: {item.quantity} {item.unit} | วัสดุ: ฿{item.materialPrice} | ค่าแรง: ฿{item.laborPrice}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-blue-600">฿{(item.totalMaterialPrice + item.totalLaborPrice).toLocaleString()}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.cartId)}
                                className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
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
                <Calculator className="w-4 h-4 text-indigo-600" />
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
                    คิด Factor F
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="factorFMode"
                      checked={!applyFactorF}
                      onChange={() => setApplyFactorF(false)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    ไม่คิด Factor F (1.0000)
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
                  <FileText className="w-4 h-4 text-emerald-600" />
                  การคืนพัสดุ / อุปกรณ์เดิม
                </h3>
                <select
                  value={returnStatusType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReturnStatusType(val);
                    if (val === 'ไม่มี') setReturnEquipmentList([]);
                    else if (returnEquipmentList.length === 0) setReturnEquipmentList([{ id: Date.now(), name: '', qty: 1, unit: 'ชิ้น' }]);
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
                    <div key={eq.id} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                      <input
                        type="text"
                        value={eq.name}
                        onChange={(e) => handleReturnEquipmentChange(eq.id, 'name', e.target.value)}
                        placeholder={`รายการที่ ${idx+1} (เช่น ท่อ PB เดิม)`}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
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
                      <button
                        type="button"
                        onClick={() => handleRemoveReturnEquipment(eq.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddReturnEquipment}
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มรายการอุปกรณ์คืน
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* หมวดค่าใช้จ่ายอื่นๆ */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-600" />
              ค่าใช้จ่ายอื่นๆ (ดึงจากตาราง Cat7 เช่น PC35 - ไม่คิด Factor F)
            </h3>

            <div className="space-y-2">
              {otherExpenses.map((item) => (
                <div key={item.id} className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs text-xs">
                  <span className="font-semibold text-slate-700 flex-1 truncate">{item.name}</span>
                  <span className="font-mono font-bold text-slate-800">฿{item.amount.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOtherExpense(item.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newOtherName}
                onChange={(e) => setNewOtherName(e.target.value)}
                placeholder="ชื่อค่าใช้จ่าย (เช่น ค่ารถขุดเพิ่มเติม)"
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 shadow-xs"
              />
              <input
                type="number"
                min="0"
                value={newOtherAmount}
                onChange={(e) => setNewOtherAmount(e.target.value)}
                placeholder="จำนวนเงิน"
                className="w-28 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none shadow-xs"
              />
              <button
                type="button"
                onClick={handleAddOtherExpense}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-md shrink-0 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> เพิ่ม
              </button>
            </div>
          </div>

          {/* สรุปยอดเงิน */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 rounded-2xl shadow-lg space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>📊 สรุปยอดคำนวณตามแบบฟอร์มเบิกซ่อม กปภ.</span>
              <span className="font-mono text-cyan-400">คำสั่งงาน: {rNumber || '-'}</span>
            </h3>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>- รวมต้นทุนตรง หมวด 1-6 (ข้อ a):</span>
                <span className="font-mono font-bold text-white">฿{totalDirectCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>- ต้นทุนตรง × Factor F ({activeFactorF}) (ข้อ c):</span>
                <span className="font-mono font-bold text-emerald-400">฿{totalCostWithFactorF.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>- รวมค่าใช้จ่ายอื่นๆ (จาก Cat7) (ข้อ e):</span>
                <span className="font-mono font-bold text-amber-300">฿{sumOtherExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>- ภาษีมูลค่าเพิ่ม Vat 7% (ข้อ f):</span>
                <span className="font-mono font-bold text-cyan-300">฿{vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-400 block">ค่าจ้างในการซ่อมท่อ เป็นเงินทั้งสิ้น ({applyFactorF ? 'รวมภาษีฯ' : 'ไม่รวมภาษีฯ'}):</span>
                <span className="text-lg font-mono font-extrabold text-cyan-400">฿{formattedGrandTotalFormatted} บาท</span>
              </div>

              <button
                type="button"
                onClick={() => setShowPrintPreview(true)}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" /> พรีวิวและสั่งพิมพ์
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold text-xs shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลแบบฟอร์มเบิกซ่อมท่อ'}
          </button>

        </form>
      )}

      {/* 📄 Modal พรีวิวแบบฟอร์มเบิกซ่อมท่อ (เต็มหน้าจอ) */}
      {showPrintPreview && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-6 font-sans overflow-y-auto">
          <div className="bg-white w-full max-w-[98vw] h-[98vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Nav Preview */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Printer className="w-6 h-6 text-cyan-400" />
                <span className="font-bold text-base text-white">พรีวิวแบบฟอร์มควบคุมการซ่อมท่อ แผนที่ และใบรับแจ้งท่อแตก-รั่ว (กปภ.สาขานครพนม)</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" /> สั่งพิมพ์ / บันทึก PDF
                </button>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>
            </div>

            {/* Print Preview Canvas Container */}
            <div className="p-6 overflow-y-auto bg-slate-200 flex flex-col items-center gap-8">
              
              {/* หน้าที่ 1: ตารางประมาณการค่าใช้จ่าย */}
              <div className="bg-white w-[210mm] min-h-[297mm] p-[10mm] shadow-2xl text-black font-sans text-[11px] leading-snug space-y-3">
                
                {/* 🏛️ ส่วนหัวแบบฟอร์ม */}
                <div className="flex justify-between items-center border border-black p-3">
                  <div className="flex items-center gap-3 w-1/4">
                    <img src="/pwa.webp" alt="PWA Logo" className="w-10 h-10 object-contain shrink-0" />
                    <div className="text-[8px] leading-tight font-bold text-slate-800">
                      การประปาส่วนภูมิภาค
                    </div>
                  </div>

                  <div className="text-center w-2/4">
                    <h1 className="text-[14px] font-bold">การประปาส่วนภูมิภาคสาขานครพนม</h1>
                    <h2 className="text-[15px] font-extrabold underline mt-0.5">แบบฟอร์มควบคุมการซ่อมท่อ</h2>
                  </div>

                  <div className="text-right text-[11px] w-1/4 leading-tight">
                    <p><b>คำสั่งงานเลขที่ :</b> {rNumber || 'R202608036111'}</p>
                    <p><b>วันที่ :</b> {formatThaiDate(selectedJob.ClosedAt || selectedJob.closedAt || new Date())}</p>
                  </div>
                </div>

                {/* ข้อมูลการรับแจ้ง / สถานที่ / รายละเอียดหน้างาน / ระยะเวลาซ่อม */}
                <table className="w-full border-collapse border border-black text-[11px]">
                  <tbody>
                    <tr>
                      <td className="border border-black p-1.5 font-bold bg-slate-100" width="12%">วันที่แจ้ง</td>
                      <td className="border border-black p-1.5" width="21%">{formatThaiDate(selectedJob.Timestamp)}</td>
                      <td className="border border-black p-1.5 font-bold bg-slate-100" width="10%">วันที่ซ่อม</td>
                      <td className="border border-black p-1.5" width="21%">{formatThaiDate(selectedJob.ClosedAt)}</td>
                      <td className="border border-black p-1.5 font-bold bg-slate-100" width="14%">ขนาด (กxยxล)</td>
                      <td className="border border-black p-1.5">{workDetails.width || 0} x {workDetails.length || 0} x {workDetails.depth || 0} ม.</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5 font-bold bg-slate-100">สถานที่</td>
                      <td className="border border-black p-1.5" colSpan="3">{selectedJob.Location || selectedJob.location || '-'}</td>
                      <td className="border border-black p-1.5 font-bold bg-slate-100">สภาพพื้นที่</td>
                      <td className="border border-black p-1.5 font-bold text-blue-900">{workDetails.surfaceType}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5 font-bold bg-slate-100">ชนิดท่อ</td>
                      <td className="border border-black p-1.5">{selectedJob.PipeType || '-'}</td>
                      <td className="border border-black p-1.5 font-bold bg-slate-100">ขนาดท่อ</td>
                      <td className="border border-black p-1.5">{selectedJob.PipeSize || '-'} มม.</td>
                      <td className="border border-black p-1.5 font-bold bg-slate-100">ระยะเวลาซ่อม</td>
                      <td className="border border-black p-1.5 font-bold">{workDetails.repairHours} ชม. {workDetails.repairMinutes} นาที</td>
                    </tr>
                  </tbody>
                </table>

                {/* 📊 Main Layout */}
                <div className="flex gap-2 items-stretch">
                  
                  {/* ตารางคำนวณด้านซ้าย */}
                  <div className="w-[66.666%]">
                    <table className="w-full h-full border-collapse border border-black text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-center">
                          <th className="border border-black p-1.5" width="5%">ลำดับ</th>
                          <th className="border border-black p-1.5" width="37%">รายการ</th>
                          <th className="border border-black p-1.5" width="7%">จำนวน</th>
                          <th className="border border-black p-1.5" width="8%">หน่วย</th>
                          <th className="border border-black p-1.5" width="14%">ค่าวัสดุ (บ.)</th>
                          <th className="border border-black p-1.5" width="14%">ค่าแรง (บ.)</th>
                          <th className="border border-black p-1.5" width="15%">รวม (บ.)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'cat1', num: '1', title: 'หมวดที่ 1: งานสกัดพื้น' },
                          { key: 'cat2', num: '2', title: 'หมวดที่ 2: งานวางท่อ' },
                          { key: 'cat3', num: '3', title: 'หมวดที่ 3: อุปกรณ์ประกอบท่อ' },
                          { key: 'cat4', num: '4', title: 'หมวดที่ 4: งานคืนสภาพผิวเดิม' },
                          { key: 'cat5', num: '5', title: 'หมวดที่ 5: ค่าแรงจ้างซ่อมท่อ (ต่อจุด)' },
                          { key: 'cat6', num: '6', title: 'หมวดที่ 6: อื่นๆ' },
                        ].map((catHead) => {
                          const catItems = getCategoryItems(catHead.key);
                          return (
                            <React.Fragment key={`pdf-cat-${catHead.key}`}>
                              <tr className="bg-slate-50 font-bold">
                                <td className="border border-black p-1 text-center">{catHead.num}</td>
                                <td className="border border-black p-1" colSpan="6">{catHead.title}</td>
                              </tr>
                              {catItems.length === 0 ? (
                                <tr>
                                  <td className="border border-black p-1 text-center">-</td>
                                  <td className="border border-black p-1 text-slate-400 italic" colSpan="6">ไม่มีรายการ</td>
                                </tr>
                              ) : (
                                catItems.map((item, itemIdx) => (
                                  <tr key={`pdf-item-${item.cartId}`}>
                                    <td className="border border-black p-1 text-center">{catHead.num}.{itemIdx + 1}</td>
                                    <td className="border border-black p-1">{item.name}</td>
                                    <td className="border border-black p-1 text-center">{item.quantity}</td>
                                    <td className="border border-black p-1 text-center">{item.unit}</td>
                                    <td className="border border-black p-1 text-right">{item.totalMaterialPrice.toLocaleString()}</td>
                                    <td className="border border-black p-1 text-right">{item.totalLaborPrice.toLocaleString()}</td>
                                    <td className="border border-black p-1 text-right font-bold">{(item.totalMaterialPrice + item.totalLaborPrice).toLocaleString()}</td>
                                  </tr>
                                ))
                              )}
                            </React.Fragment>
                          );
                        })}

                        {/* สรุปตามข้อ a ถึง h */}
                        <tr className="font-bold bg-slate-50">
                          <td className="border border-black p-1.5 text-center">a</td>
                          <td className="border border-black p-1.5" colSpan="5">รวมราคาค่าวัสดุและค่าแรงงาน (ไม่รวมภาษีฯ)</td>
                          <td className="border border-black p-1.5 text-right font-mono">{totalDirectCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                        <tr className="font-bold bg-slate-50">
                          <td className="border border-black p-1.5 text-center">b</td>
                          <td className="border border-black p-1.5" colSpan="5">Factor F : งานก่อสร้างทาง (รวมภาษีฯ)</td>
                          <td className="border border-black p-1.5 text-right font-mono">{activeFactorF}</td>
                        </tr>
                        <tr className="font-bold bg-slate-100">
                          <td className="border border-black p-1.5 text-center">c</td>
                          <td className="border border-black p-1.5" colSpan="5">รวมราคาค่าวัสดุและค่าแรงงาน x Factor F (ข้อ a x ข้อ b)</td>
                          <td className="border border-black p-1.5 text-right font-mono">{totalCostWithFactorF.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>

                        <tr>
                          <td className="border border-black p-1.5 text-center">d</td>
                          <td className="border border-black p-1.5 font-bold" colSpan="6">ค่าใช้จ่ายอื่นๆ : (ไม่คิด Factor F)</td>
                        </tr>
                        {otherExpenses.map((oth, oIdx) => (
                          <tr key={`pdf-oth-${oIdx}`}>
                            <td className="border border-black p-1 text-center">d.{oIdx+1}</td>
                            <td className="border border-black p-1" colSpan="5">{oth.name}</td>
                            <td className="border border-black p-1 text-right font-mono">{oth.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          </tr>
                        ))}

                        <tr className="font-bold bg-slate-50">
                          <td className="border border-black p-1.5 text-center">e</td>
                          <td className="border border-black p-1.5" colSpan="5">รวมราคาค่าใช้จ่ายอื่นๆ (ไม่รวมภาษีฯ) (รวมข้อ d)</td>
                          <td className="border border-black p-1.5 text-right font-mono">{sumOtherExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                        <tr className="font-bold bg-slate-50">
                          <td className="border border-black p-1.5 text-center">f</td>
                          <td className="border border-black p-1.5" colSpan="5">ภาษีมูลค่าเพิ่ม (Vat 7%)</td>
                          <td className="border border-black p-1.5 text-right font-mono">{vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                        <tr className="font-bold bg-slate-50">
                          <td className="border border-black p-1.5 text-center">g</td>
                          <td className="border border-black p-1.5" colSpan="5">รวมราคาค่าใช้จ่ายอื่นๆ (รวมภาษีฯ) (ข้อ e + ข้อ f)</td>
                          <td className="border border-black p-1.5 text-right font-mono">{totalOtherWithVat.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                        <tr className="font-bold bg-cyan-100 text-cyan-950">
                          <td className="border border-black p-1.5 text-center">h</td>
                          <td className="border border-black p-1.5" colSpan="5">รวมราคาค่าดำเนินการซ่อมท่อ (รวมภาษีฯ) (ข้อ c + ข้อ g)</td>
                          <td className="border border-black p-1.5 text-right font-mono text-[11px]">{grandTotalWithVat.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                        <tr className="font-bold bg-emerald-100 text-emerald-950">
                          <td className="border border-black p-1.5 text-center">⭐</td>
                          <td className="border border-black p-1.5" colSpan="5">ค่าจ้างในการซ่อมท่อ เป็นเงินทั้งสิ้น ({applyFactorF ? 'รวมภาษีฯ' : 'ไม่รวมภาษีฯ'})</td>
                          <td className="border border-black p-1.5 text-right font-mono text-[11px] font-bold">{formattedGrandTotalFormatted}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 🏛️ คอลัมน์ขวาสุด: คณะกรรมการ */}
                  <div className="w-[33.333%] border border-black p-2.5 flex flex-col justify-between bg-slate-50/30 text-[10px]">
                    <div className="space-y-2.5">
                      <div className="border-b border-black pb-2 space-y-1">
                        <p className="font-bold text-[10px]">รายละเอียดการตรวจสอบท่อ-อุปกรณ์เดิม</p>
                        {returnStatusType === 'ไม่มี' || returnEquipmentList.length === 0 ? (
                          <p>-</p>
                        ) : (
                          <ul className="list-disc pl-4 space-y-0.5">
                            {returnEquipmentList.map((eq, i) => (
                              <li key={i}>{eq.name} : {eq.qty} {eq.unit}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="border-b border-black pb-2 space-y-1 text-center">
                        <p className="font-bold text-[10px]">คณะกรรมการตรวจสอบท่อ และอุปกรณ์เดิม</p>
                        <div className="space-y-1 pt-1 leading-tight">
                          {signers.committeeCheck.map((s, i) => (
                            <p key={i}>ลงชื่อ..................................................{s.position}<br/>({s.name})</p>
                          ))}
                        </div>
                      </div>

                      <div className="border-b border-black pb-2 space-y-1 text-center">
                        <p className="font-bold text-[10px]">คณะกรรมการตรวจรับพัสดุ</p>
                        <div className="space-y-1 pt-1 leading-tight">
                          {signers.committeeReceive.map((s, i) => (
                            <p key={i}>ลงชื่อ..................................................{s.position}<br/>({s.name})</p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-center pt-1">
                      <p className="font-bold text-[10px]">ผู้ควบคุมงาน / ผู้ดำเนินการซ่อม</p>
                      <p>ลงชื่อ..................................................<br/>(..................................................)<br/><b>ผู้ควบคุมงาน / ทีมช่าง</b></p>
                    </div>
                  </div>

                </div>

                {/* ✍️ ส่วนลงชื่อ 3 ตำแหน่งด้านล่างสุด */}
                <div className="border border-black p-3 mt-2 bg-slate-50/50 text-[11px]">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    
                    <div className="space-y-1">
                      <p>ลงชื่อ..................................................</p>
                      <p className="font-bold">(..................................................)</p>
                      <p><b>ตำแหน่ง:</b> ..................................................<br/>(ผู้ประมาณการ)</p>
                    </div>

                    <div className="space-y-1">
                      <p>ลงชื่อ..................................................</p>
                      <p className="font-bold">({supervisorName})</p>
                      <p><b>ตำแหน่ง:</b> {supervisorPos}<br/>(ผู้ตรวจ)</p>
                    </div>

                    <div className="space-y-1">
                      <p>ลงชื่อ..................................................</p>
                      <p className="font-bold">({managerName})</p>
                      <p><b>ตำแหน่ง:</b> {managerPos}<br/>(ผู้จัดการ)</p>
                    </div>

                  </div>
                </div>

              </div>

              {/* หน้าที่ 2: แผนที่ Google Maps / Street View และกรอบ แบบรายการซ่อมท่อ */}
              <div className="bg-white w-[210mm] min-h-[297mm] p-[10mm] shadow-2xl text-black font-sans text-[11px] leading-snug flex flex-col justify-between page-break-before">
                
                {/* ครึ่งหน้ากระดาษส่วนบน: แผนที่ Google Maps ตำแหน่งจุดท่อรั่ว */}
                <div className="h-[48%] flex flex-col space-y-2 border border-black p-3 bg-slate-50">
                  <div className="flex justify-between items-center border-b border-black pb-1.5">
                    <h3 className="font-bold text-xs flex items-center gap-1.5 text-blue-900">
                      <MapPin className="w-4 h-4 text-rose-600" /> แผนที่แสดงตำแหน่งพิกัดจุดท่อรั่ว และ Street View
                    </h3>
                    <span className="text-[10px] font-mono text-slate-600">พิกัด: {jobLat}, {jobLng}</span>
                  </div>

                  <div className="flex-1 w-full relative rounded border border-slate-300 overflow-hidden bg-slate-200 flex flex-col items-center justify-center">
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

                {/* ครึ่งหน้ากระดาษส่วนล่าง: กรอบสี่เหลี่ยม หัวข้อ แบบรายการซ่อมท่อ (ถ้ามี) */}
                <div className="h-[48%] flex flex-col space-y-2 border border-black p-3 bg-white">
                  <div className="border-b border-black pb-1.5">
                    <h3 className="font-bold text-xs text-slate-900 uppercase">แบบรายการซ่อมท่อ (ถ้ามี)</h3>
                  </div>

                  <div className="flex-1 border border-dashed border-slate-400 rounded p-3 flex flex-col justify-between bg-slate-50/50">
                    <div className="space-y-1 text-slate-500 text-[10px]">
                      <p>• รายละเอียดเพิ่มเติม / แผนผังการเดินท่อ / บันทึกหน้างานเพิ่มเติม:</p>
                      <p>- ขนาดท่อจริง: {selectedJob.PipeSize || '-'} มม. ชนิด: {selectedJob.PipeType || '-'}</p>
                      <p>- อาการชำรุด: {jobIssueType}</p>
                    </div>

                    <div className="border-t border-slate-300 pt-2 flex justify-between text-[10px] text-slate-600">
                      <span>ผู้บันทึกข้อมูล: ..................................................</span>
                      <span>วันที่: {formatThaiDate(selectedJob.ClosedAt || new Date())}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* 📑 หน้าที่ 3: แบบฟอร์มใบรับแจ้งท่อแตก-ท่อรั่ว (ปรับปรุงข้อ 7, 8, 9 ตามที่คุณต้องการ) */}
              <div className="bg-white w-[210mm] min-h-[297mm] p-[8mm] shadow-2xl text-black font-sans text-[10px] leading-tight flex flex-col justify-between space-y-2 page-break-before">
                
                {/* Header หน้า 3 */}
                <div className="flex justify-between items-center border border-black p-2 bg-slate-50 shrink-0">
                  <div className="flex items-center gap-2 w-1/4">
                    <img src="/pwa.webp" alt="PWA Logo" className="w-9 h-9 object-contain shrink-0" />
                  </div>

                  <div className="text-center w-2/4">
                    <h1 className="text-[12px] font-bold">การประปาส่วนภูมิภาคสาขานครพนม</h1>
                    <h2 className="text-[13px] font-extrabold underline mt-0.5">แบบฟอร์มใบรับแจ้งท่อแตก-ท่อรั่ว</h2>
                  </div>

                  <div className="text-right text-[10px] w-1/4 leading-tight">
                    <p><b>เลขที่รับแจ้ง :</b> {selectedJob.JobID || selectedJob.id || selectedJob[0] || '1/2569'}</p>
                    <p><b>วันที่ :</b> {formatThaiDate(selectedJob.Timestamp || new Date())}</p>
                    <p><b>คำสั่งงานเลขที่ :</b> {rNumber || 'R202608036111'}</p>
                  </div>
                </div>

                {/* ข้อ 1) เรียน ผู้จัดการการประปาส่วนภูมิภาคสาขานครพนม */}
                <div className="border border-black p-2.5 space-y-1.5 bg-white shrink-0">
                  <p className="font-bold text-[10.5px]">1.0 เรียน ผู้จัดการการประปาส่วนภูมิภาคสาขานครพนม</p>
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
                  <div className="pl-3">
                    <p><b>พบสาเหตุ:</b> <span className="text-blue-900 font-bold">{jobIssueType}</span></p>
                  </div>
                  <div className="pl-3">
                    <p><b>สถานที่เกิดเหตุ / จุดซ่อมท่อ:</b> {selectedJob.Location || selectedJob.location || '-'}</p>
                  </div>
                  <div className="pl-3 pt-0.5">
                    <p className="italic">จึงเรียนมาเพื่อโปรดแจ้งผู้เกี่ยวข้องดำเนินการต่อไป จะขอบคุณยิ่ง</p>
                  </div>

                  <div className="border-t border-slate-300 pt-1 mt-1 text-right pr-4 font-bold">
                    ลงชื่อ.............................................................. (ผู้รับแจ้ง)
                  </div>
                </div>

                {/* ข้อ 2 - ข้อ 9 Layout สองคอลัมน์ */}
                <div className="grid grid-cols-2 gap-2 flex-1 items-stretch">
                  
                  {/* 🟢 ฝั่งซ้าย: ข้อ (2), ข้อ (3), ข้อ 6, ข้อ 8 (ลงนามโดยหัวหน้างานบริการฯ) */}
                  <div className="space-y-2 flex flex-col justify-between h-full">
                    
                    {/* ข้อ (2) */}
                    <div className="border border-black p-2.5 space-y-1 flex flex-col justify-between flex-1">
                      <div>
                        <p className="font-bold">(2) เรียน หน.งานบริการและควบคุมน้ำสูญเสีย</p>
                        <p className="pl-2">ดำเนินการในส่วนที่เกี่ยวข้อง และรายงานผลการดำเนินงานต่อไป</p>
                      </div>
                      <div className="text-center pt-2">
                        <p>ลงชื่อ..............................................................</p>
                        <p className="font-bold">({managerName})</p>
                        <p className="text-[8.5px] font-medium">{managerPos}</p>
                      </div>
                    </div>

                    {/* ข้อ (3) */}
                    <div className="border border-black p-2.5 space-y-1 flex flex-col justify-between flex-1">
                      <div className="space-y-0.5">
                        <p className="font-bold">(3) เรียน หัวหน้าชุดควบคุมงานซ่อมท่อ/พนักงานบริการ</p>
                        <p className="pl-2 leading-snug">ตรวจสอบรายละเอียดงานซ่อมท่อแตกรั่ว ทำการประมาณการค่าใช้จ่าย และแจ้งระยะเวลาการปฏิบัติงาน เพื่อนำเรียนผู้จัดการ กปภ.สาขา ในการพิจารณาอนุมัติ และดำเนินการตามระเบียบของ กปภ.ต่อไป</p>
                      </div>

                      <div className="text-center pt-2 border-t border-slate-300 mt-1">
                        <p>ลงชื่อ..............................................................</p>
                        <p className="font-bold">({supervisorName})</p>
                        <p className="text-[8.5px] font-medium">{supervisorPos}</p>
                      </div>
                    </div>

                    {/* ข้อ 6 */}
                    <div className="border border-black p-2.5 space-y-1.5 flex flex-col justify-between flex-[1.4]">
                      <div>
                        <p className="font-bold">(6) ข้อพิจารณา และความเห็นของผู้จัดการ</p>
                        <div className="pl-2 space-y-1 my-1">
                          <label className="flex items-center gap-1 font-bold"><input type="checkbox" defaultChecked readOnly /> เห็นชอบอนุมัติให้ดำเนินการซ่อมตามประมาณการค่าใช้จ่ายที่เสนอ</label>
                          <label className="flex items-center gap-1"><input type="checkbox" defaultChecked readOnly /> อนุมัติจัดจ้างเหมาซ่อมท่อ และแต่งตั้งผู้ควบคุมงาน คณะกรรมการตรวจรับพัสดุและตรวจสอบพัสดุคืนตามเสนอ</label>
                        </div>
                        <p className="text-[8.5px] text-slate-600 pl-2 leading-tight">คณะกรรมการฯ ที่แต่งตั้งขึ้น ให้ดำเนินการไปตามคำสั่งแต่งตั้งของ กปภ. สาขานครพนม และปฏิบัติตามขั้นตอนตามระเบียบต่อไป</p>
                      </div>
                      <div className="text-center pt-2">
                        <p>ลงชื่อ..............................................................</p>
                        <p className="font-bold">({managerName})</p>
                        <p className="text-[8.5px] font-medium">{managerPos}</p>
                      </div>
                    </div>

                    {/* ข้อ 8 (แก้ไขข้อความและลงชื่อโดยหัวหน้างานบริการฯ ตามที่คุณต้องการ) */}
                    <div className="border border-black p-2.5 flex flex-col justify-between flex-1">
                      <div>
                        <p className="font-bold">8.0 เรียน ผู้จัดการการประปาส่วนภูมิภาคสาขานครพนม</p>
                        <p className="pl-2 leading-snug">งานบริการและควบคุมน้ำสูญเสีย ได้ทำการปิดคำสั่งงาน เลขที่ <span className="font-bold text-blue-900">{rNumber || 'R202608036111'}</span> ลงวันที่ <span className="font-bold">{formatThaiDate(jobClosedDate)}</span> เรียบร้อยแล้ว</p>
                      </div>
                      <div className="text-center pt-2">
                        <p>ลงชื่อ..............................................................</p>
                        <p className="font-bold">({supervisorName})</p>
                        <p className="text-[8.5px] font-medium">{supervisorPos}</p>
                      </div>
                    </div>

                  </div>

                  {/* 🟢 ฝั่งขวา: ข้อ (4), ข้อ 5, ข้อ 7 (ดึงอุปกรณ์ส่งคืน), ข้อ 9 (ลงนามโดยผู้จัดการ) */}
                  <div className="space-y-2 flex flex-col justify-between h-full">
                    
                    {/* ข้อ (4) */}
                    <div className="border border-black p-2.5 space-y-1 flex flex-col justify-between flex-[1.3]">
                      <div>
                        <p className="font-bold">(4) เรียน หน.บริการและควบคุมน้ำสูญเสีย</p>
                        <p className="pl-2 font-bold">ทำการตรวจสอบแล้ว สรุปรายละเอียดดังนี้:-</p>
                        
                        <div className="pl-2 space-y-0.5 pt-1 my-0.5">
                          <p className="font-bold">4.1 ประเภทการแก้ไขปัญหา</p>
                          <div className="flex gap-4 pl-2">
                            <label className="flex items-center gap-1"><input type="checkbox" defaultChecked readOnly /> ท่อแตก-รั่ว</label>
                            <span>ขนาดท่อ: {selectedJob.PipeSize || '-'} มม.</span>
                            <span>ชนิด: {selectedJob.PipeType || 'PE'}</span>
                          </div>

                          <p className="font-bold">4.2 สภาพพื้นที่และการใช้เครื่องมือช่าง</p>
                          <div className="flex flex-col gap-0.5 pl-2">
                            <label className="flex items-center gap-1"><input type="checkbox" defaultChecked={workDetails.surfaceType === 'พื้นดิน'} readOnly /> พื้นดิน</label>
                            <label className="flex items-center gap-1"><input type="checkbox" defaultChecked={workDetails.surfaceType !== 'พื้นดิน'} readOnly /> พื้นคอนกรีต/ลาดยาง (ใช้เครื่องตัดคอนกรีต)</label>
                          </div>

                          <p className="font-bold">4.3 รูปแบบการดำเนินงานซ่อม และการใช้เครื่องจักรรถขุด</p>
                          <div className="flex flex-col gap-0.5 pl-2">
                            <label className="flex items-center gap-1"><input type="checkbox" defaultChecked readOnly /> ดำเนินการซ่อมเองโดย กปภ.</label>
                            <label className="flex items-center gap-1"><input type="checkbox" defaultChecked={applyFactorF} readOnly /> จ้างเหมาซ่อมท่อ (คิด Factor F)</label>
                            <label className="flex items-center gap-1"><input type="checkbox" defaultChecked={otherExpenses.length > 0} readOnly /> ค่าใช้จ่ายอื่นๆ (รถขุด PC35 / ซ่อมผิวจราจร)</label>
                          </div>

                          <p className="font-bold">4.4 ระยะเวลาการปฏิบัติงาน</p>
                          <p className="pl-2">ใช้เวลาในการซ่อมประมาณ {workDetails.repairHours} ชม. {workDetails.repairMinutes} นาที</p>
                        </div>
                      </div>

                      <div className="text-center pt-2">
                        <p>ลงชื่อ..............................................................</p>
                        <p className="font-bold">(..................................................)</p>
                        <p className="text-[8.5px] font-medium">ช่างผู้ปฏิบัติงาน / หัวหน้าชุด</p>
                      </div>
                    </div>

                    {/* ข้อ 5 */}
                    <div className="border border-black p-2.5 space-y-1 text-[9.5px] flex flex-col justify-between flex-[1.5]">
                      <div className="space-y-1">
                        <p className="font-bold">( 5 ) เรียน ผู้จัดการการประปาส่วนภูมิภาคสาขานครพนม</p>
                        <p className="pl-2 leading-snug">งานบริการและลดน้ำสูญเสีย ตรวจสอบเหตุขัดข้องการใช้น้ำ/การรับแจ้งท่อแตก-รั่ว ตามคำสั่งงาน <b>{rNumber || 'R202608036111'}</b></p>
                        <p className="pl-2 leading-snug">ดังนั้น เพื่อให้การดำเนินงานเป็นไปด้วยความเรียบร้อย โดยมิให้เกิดผลกระทบต่อระบบจำหน่ายและการให้บริการผู้ใช้น้ำ จึงขออนุมัติและให้ความเห็นชอบเพื่อดำเนินการดังนี้</p>
                        
                        <p className="pl-3"><b>( 5.1 )</b> อนุมัติทำการซ่อมท่อประปากรณีเร่งด่วนโดยจ้างเหมาเอกชน/บุคคลภายนอกดำเนินการด้วยวิธีเฉพาะเจาะจง วงเงินไม่เกิน <b>{formattedGrandTotalFormatted}</b> บาท</p>
                        
                        <p className="pl-3"><b>( 5.2 )</b> เห็นชอบแต่งตั้งคณะกรรมการตรวจรับพัสดุ ผู้ควบคุมงาน และคณะกรรมการตรวจสอบท่อและอุปกรณ์เดิม ดังนี้</p>
                        
                        <div className="grid grid-cols-2 gap-2 pl-4 pt-0.5">
                          <div>
                            <p className="font-bold underline">คณะกรรมการตรวจรับพัสดุ</p>
                            {signers.committeeReceive.slice(0, 3).map((sr, i) => (
                              <p key={`sr-db-${i}`}>{i+1}. {sr.name} ({sr.position})</p>
                            ))}
                          </div>
                          <div>
                            <p className="font-bold underline">คณะกรรมการตรวจสอบท่อและอุปกรณ์เดิม</p>
                            {signers.committeeCheck.slice(0, 3).map((sc, i) => (
                              <p key={`sc-db-${i}`}>{i+1}. {sc.name} ({sc.position})</p>
                            ))}
                          </div>
                        </div>

                        <div className="pl-3 pt-0.5">
                          <p className="font-bold underline">ผู้ควบคุมงาน</p>
                          <p>1. .................................................... (ผู้ควบคุมงาน / ทีมช่าง)</p>
                        </div>
                      </div>

                      <div className="text-center pt-2">
                        <p>ลงชื่อ..............................................................</p>
                        <p className="font-bold">({supervisorName})</p>
                        <p className="text-[8.5px] font-medium">{supervisorPos}</p>
                      </div>
                    </div>

                    {/* ข้อ 7 (ปรับหัวข้อฝั่งซ้ายเป็น "อุปกรณ์ที่ส่งคืน" ดึงข้อมูลจากฟอร์ม และฝั่งขวาเป็นช่องติ๊ก "ใช้งานได้" / "ใช้งานไม่ได้") */}
                    <div className="border border-black p-2.5 space-y-1 flex flex-col justify-between flex-[1.4]">
                      <div>
                        <p className="font-bold text-[9.5px]">({'\u00A0'}7{'\u00A0'}) เรียน ผู้จัดการการประปาส่วนภูมิภาคสาขานครพนม</p>
                        <p className="pl-2 text-[9px] leading-tight">คณะกรรมการตรวจสอบท่อ และอุปกรณ์เดิม ได้ดำเนินการตามคำสั่งฯ และได้ตรวจสอบรายละเอียดท่อ-อุปกรณ์แล้ว มีความเห็นดังนี้</p>
                        
                        <div className="pl-3 space-y-1 pt-1 text-[9px]">
                          <div className="flex items-center gap-1.5">
                            <input type="checkbox" checked={returnStatusType === 'ไม่มี' || returnEquipmentList.length === 0} readOnly className="w-3 h-3" />
                            <span>ไม่มีท่อ/อุปกรณ์เดิมที่ส่งคืน</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input type="checkbox" checked={returnStatusType === 'มีอุปกรณ์คืน' && returnEquipmentList.length > 0} readOnly className="w-3 h-3" />
                            <span>รายละเอียดท่อ/อุปกรณ์เดิมที่ส่งคืนพัสดุ</span>
                          </div>

                          {/* ตารางหัวข้อ อุปกรณ์ที่ส่งคืน (ดึงจากฟอร์ม) / สภาพ (ช่องว่างให้ติก ใช้งานได้ / ใช้งานไม่ได้) */}
                          <div className="grid grid-cols-2 gap-2 px-2 pt-0.5 font-bold text-center underline text-[8.5px]">
                            <span>อุปกรณ์ที่ส่งคืน</span>
                            <span>สภาพ (ใช้งานได้ / ไม่ได้)</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 px-1 text-[8.5px]">
                            <div className="space-y-1">
                              {returnStatusType === 'มีอุปกรณ์คืน' && returnEquipmentList.length > 0 ? (
                                returnEquipmentList.map((eq, eqIdx) => (
                                  <p key={`ret-item-${eqIdx}`} className="truncate">
                                    {eqIdx + 1}. {eq.name || '........................'} ({eq.qty} {eq.unit})
                                  </p>
                                ))
                              ) : (
                                <>
                                  <p>1. ........................................</p>
                                  <p>2. ........................................</p>
                                  <p>3. ........................................</p>
                                </>
                              )}
                            </div>
                            <div className="space-y-1 flex flex-col justify-around">
                              <div className="flex items-center justify-around text-[8px]">
                                <label className="flex items-center gap-0.5"><input type="checkbox" /> ใช้งานได้</label>
                                <label className="flex items-center gap-0.5"><input type="checkbox" /> ไม่ได้</label>
                              </div>
                              <div className="flex items-center justify-around text-[8px]">
                                <label className="flex items-center gap-0.5"><input type="checkbox" /> ใช้งานได้</label>
                                <label className="flex items-center gap-0.5"><input type="checkbox" /> ไม่ได้</label>
                              </div>
                              <div className="flex items-center justify-around text-[8px]">
                                <label className="flex items-center gap-0.5"><input type="checkbox" /> ใช้งานได้</label>
                                <label className="flex items-center gap-0.5"><input type="checkbox" /> ไม่ได้</label>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1">
                            <input type="checkbox" className="w-3 h-3" />
                            <span>ท่อ/อุปกรณ์ที่ไม่สามารถนำส่งคืนได้เนื่องจากไม่มีท่อ/อุปกรณ์ที่อยู่ใต้ดิน</span>
                          </div>
                        </div>

                        <p className="pl-2 pt-1 text-[9px] italic">จึงเรียนมาเพื่อโปรดทราบ และพิจารณาดำเนินการต่อไป จะขอบคุณยิ่ง</p>
                      </div>

                      {/* ส่วนลงชื่อคณะกรรมการตรวจสอบท่อและอุปกรณ์เดิม */}
                      <div className="space-y-0.5 text-[8.5px] pt-1">
                        <div className="flex justify-between items-center px-2">
                          <span>(ลงชื่อ).....................................................................</span>
                          <span className="font-bold">{signers.committeeCheck[0]?.position || 'ประธานกรรมการฯ'}</span>
                        </div>
                        <div className="flex justify-between items-center px-2">
                          <span>(ลงชื่อ).....................................................................</span>
                          <span className="font-bold">{signers.committeeCheck[1]?.position || 'กรรมการฯ'}</span>
                        </div>
                        <div className="flex justify-between items-center px-2">
                          <span>(ลงชื่อ).....................................................................</span>
                          <span className="font-bold">{signers.committeeCheck[2]?.position || 'กรรมการฯ'}</span>
                        </div>
                      </div>
                    </div>

                    {/* ข้อ 9 (แก้ไขข้อความและลงชื่อโดยผู้จัดการ ตามที่คุณต้องการ) */}
                    <div className="border border-black p-2.5 flex flex-col justify-between flex-1">
                      <div>
                        <p className="font-bold">9.0 เรียน หน.งานบริการและควบคุมน้ำสูญเสีย</p>
                        <p className="pl-2">ทราบ / เก็บหลักฐานไว้สำหรับตรวจสอบต่อไป</p>
                      </div>
                      <div className="text-center pt-2">
                        <p>ลงชื่อ..............................................................</p>
                        <p className="font-bold">({managerName})</p>
                        <p className="text-[8.5px] font-medium">{managerPos}</p>
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
