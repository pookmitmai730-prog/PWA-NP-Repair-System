// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, remove } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBltJf8g9-YKwG98Yfu1WdoWNuP_AJqd8M",
  authDomain: "dbsensor-eb39d.firebaseapp.com",
  databaseURL: "https://dbsensor-eb39d-default-rtdb.firebaseio.com/", 
  projectId: "dbsensor-eb39d",
  storageBucket: "dbsensor-eb39d.firebasestorage.app",
  messagingSenderId: "484180057195",
  appId: "1:484180057195:web:19443fcde28e38bba5e52e",
  measurementId: "G-ST2Y0E4RG0"
};

const isConfigured = !firebaseConfig.apiKey.includes("YOUR_FIREBASE");

let db = null;
if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
}

/**
 * บันทึกใบแจ้งซ่อมใหม่ลง Firebase Realtime DB
 */
export async function saveJobToFirebase(job) {
  if (!db) return console.warn("Firebase ยังไม่ได้ตั้งค่า กำลังใช้ Mock State แทน");
  const jobRef = ref(db, 'repairs/' + job.id);
  await set(jobRef, job);
}

/**
 * อัปเดตสถานะและข้อมูลเสริมทั้งหมด (รับ jobId และ Object ข้อมูลที่ต้องการอัปเดตทั้งหมด)
 */
export async function updateJobStatusInFirebase(jobId, updatedData) {
  if (!db) return console.warn("Firebase ยังไม่ได้ตั้งค่า");
  const jobRef = ref(db, 'repairs/' + jobId);
  
  // อัปเดตข้อมูลทั้งหมดลง Firebase ทันที
  await update(jobRef, {
    ...updatedData,
    updatedAt: new Date().toLocaleString("th-TH")
  });
}

/**
 * ดึงข้อมูลรายการงานแบบ Real-time Listener
 */
export function subscribeToJobs(callback) {
  if (!db) return () => {};
  const jobsRef = ref(db, 'repairs/');
  return onValue(jobsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const jobList = Object.values(data);
      callback(jobList);
    } else {
      callback([]);
    }
  });
}