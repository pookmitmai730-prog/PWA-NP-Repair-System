export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: 'ไม่พบข้อมูลรูปภาพ' });
    }

    // จัดเตรียม Base64 และ MimeType
    const base64Data = image.split(',')[1] || image;
    const mimeType = image.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY บน Vercel Environment Variables' });
    }

    // เรียกใช้งาน Gemini API (ใช้โมเดล gemini-1.5-flash ที่เสถียรที่สุดสำหรับการทำ OCR)
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `คุณคือ AI ผู้ช่วยอัจฉริยะสำหรับอ่านและสกัดข้อมูลจากใบรับแจ้งซ่อมของ กปภ. (การประปาส่วนภูมิภาค) จงวิเคราะห์รูปภาพนี้ แล้วส่งผลลัพธ์กลับมาเป็น JSON Object ล้วนๆ ห้ามมีข้อความอื่นห่อหุ้มเด็ดขาด โดยใช้คีย์ภาษาอังกฤษตามโครงสร้างนี้ (หากข้อมูลส่วนไหนไม่มีให้ใส่ค่าเป็น string ว่าง ""):
                {
                  "phone": "",
                  "channel": "",
                  "receivedNo": "",
                  "receivedAt": "",
                  "complaintType": "",
                  "complainantInfo": "",
                  "complaintTopic": "",
                  "details": "",
                  "location": "",
                  "receiverName": "",
                  "reporterName": ""
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
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    });

    const result = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini API Error Detail:', JSON.stringify(result));
      const errorMsg = result.error?.message || 'เกิดข้อผิดพลาดจาก Google Gemini API';
      return res.status(500).json({ success: false, error: errorMsg });
    }

    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error('AI ไม่สามารถอ่านข้อมูลหรือแปลงภาพนี้ได้');
    }

    // ทำความสะอาดข้อความ JSON
    let parsedData;
    try {
      const cleanedText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error('JSON Parse Error. Raw text:', textResponse);
      throw new Error('รูปแบบข้อมูลที่ AI ตอบกลับมาไม่ถูกต้อง');
    }

    return res.status(200).json({
      success: true,
      data: parsedData
    });

  } catch (error) {
    console.error('Serverless Function Catch Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}