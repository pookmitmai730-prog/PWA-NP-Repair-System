export default async function handler(req, res) {
  // อนุญาตเฉพาะ Method POST เท่านั้น
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: 'ไม่พบข้อมูลรูปภาพ' });
    }

    const base64Data = image.split(',')[1] || image;
    const mimeType = image.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Vercel Environment Variables' });
    }

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
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const result = await geminiRes.json();

    if (!geminiRes.ok) {
      throw new Error(result.error?.message || 'Gemini API Error');
    }

    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error('AI ไม่สามารถอ่านข้อมูลจากภาพนี้ได้');
    }

    // ทำความสะอาดข้อความเผื่อกรณี AI ติด Markdown code blocks มาด้วย
    const cleanedText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanedText);

    return res.status(200).json({
      success: true,
      data: parsedData
    });

  } catch (error) {
    console.error('OCR Vision API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}