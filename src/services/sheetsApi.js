// src/services/sheetsApi.js

const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbywoc-W-hGbo4AbCJm78g4lic5pz0bsqoAqBxtDnbb7Q7_xV5J3u12W3oK7lGzRkVrRww/exec";

/**
 * ส่งข้อมูลเคสที่ปิดงานแล้วไปบันทึกถาวรลง Google Sheets ผ่าน Web App API
 * @param {Object} jobData ข้อมูลงานซ่อมที่เสร็จแล้ว
 */
export async function archiveCompletedJobToSheets(jobData) {
  try {
    const payload = {
      action: "archive_job",
      jobData: {
        id: jobData.id,
        timestamp: jobData.createdAt || new Date().toLocaleString("th-TH"),
        reporterName: jobData.reporterName || "",
        phone: jobData.phone || "",
        location: jobData.location || "",
        issueType: jobData.issueType || "",
        pipeSize: jobData.pipeSize || "",
        description: jobData.description || "",
        technician: jobData.technician || "ทีมช่าง กปภ.",
        status: jobData.status || "COMPLETED",
        beforeImgBase64: jobData.beforeImgBase64 || jobData.beforeImg || "",
        inProgImgBase64: jobData.inProgImgBase64 || jobData.inProgImg || "",
        afterImgBase64: jobData.afterImgBase64 || jobData.afterImg || "",
        notes: jobData.notes || "",
        closedAt: new Date().toLocaleString("th-TH")
      }
    };

    // ใช้ text/plain เพื่อป้องกัน CORS Preflight บล็อก
    await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors", 
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload)
    });

    return { 
      status: "success", 
      message: "บันทึกข้อมูลและส่งไปยัง Google Sheets เรียบร้อยแล้ว" 
    };
  } catch (error) {
    console.error("Failed to archive job to Google Sheets:", error);
    return { 
      status: "error", 
      message: error.toString() 
    };
  }
}

/**
 * ดึงประวัติงานซ่อมย้อนหลังทั้งหมดจาก Google Sheets มาแสดงผล
 */
export async function fetchJobsFromSheets() {
  try {
    const response = await fetch(GAS_WEB_APP_URL);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch jobs from Google Sheets:", error);
    return [];
  }
}