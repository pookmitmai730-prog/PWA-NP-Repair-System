import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลรูปภาพ' }, { status: 400 });
    }

    // แยก Base64 string และ Mime Type ออกจาก Data URI
    const base64Data = image.split(',')[1] || image;
    const mimeType = image.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Environment Variables' }, { status: 500 });
    }

    // ส่งภาพไปให้ Google Gemini Vision API ประมวลผล
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `คุณคือ AI ผู้ช่วยอัจฉริยะสำหรับอ่านและสกัดข้อมูลจากใบรับแจ้งซ่อมของ กปภ. (การประปาส่วนภูมิภาค) จงวิเคราะห์รูปภาพเอกสารนี้ แล้วดึงข้อมูลออกมาเป็น JSON Object ล้วนๆ (ไม่ต้องมีข้อความอธิบายใดๆ ห่อหุ้ม) โดยใช้คีย์ภาษาอังกฤษตามโครงสร้างนี้:
                {
                  "phone": "เบอร์โทรศัพท์",
                  "channel": "ช่องทางการรับแจ้ง",
                  "receivedNo": "เลขที่รับแจ้ง (ขึ้นต้นด้วย S ตามด้วยตัวเลข)",
                  "receivedAt": "วันที่รับแจ้ง",
                  "complaintType": "ประเภทการร้องเรียน",
                  "complainantInfo": "ข้อมูลผู้ร้องเรียน",
                  "complaintTopic": "หัวข้อการร้องเรียน",
                  "details": "รายละเอียดการรับแจ้ง",
                  "location": "บริเวณที่เกิดเหตุ",
                  "receiverName": "ผู้รับแจ้ง",
                  "reporterName": "ชื่อผู้แจ้ง / ผู้ร้องเรียน"
                }`
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    const result = await geminiRes.json();
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error('AI ไม่สามารถอ่านข้อมูลจากภาพนี้ได้');
    }

    const parsedData = JSON.parse(textResponse);

    return NextResponse.json({
      success: true,
      data: parsedData
    });

  } catch (error) {
    console.error('OCR Vision API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}