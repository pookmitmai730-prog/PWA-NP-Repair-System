module.exports = async (req, res) => {
  // ตั้งค่า Header ป้องกัน CORS และบังคับตอบกลับเป็น JSON เสมอ
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // ignore
      }
    }

    const image = body?.image;
    if (!image) {
      return res.status(400).json({ success: false, error: 'ไม่พบข้อมูลรูปภาพ' });
    }

    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const mimeType = image.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Vercel' });
    }

    // เรียก Gemini API ผ่าน Native fetch
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `คุณคือ AI ผู้ช่วยอัจฉริยะสำหรับอ่านและสกัดข้อมูลจากใบรับแจ้งซ่อมของ กปภ. จงวิเคราะห์รูปภาพนี้ แล้วส่งผลลัพธ์กลับมาเป็น JSON Object ล้วนๆ ห้ามมีข้อความอื่นห่อหุ้ม โดยใช้คีย์ภาษาอังกฤษตามโครงสร้างนี้:
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

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ success: false, error: data.error?.message || 'Gemini API Error' });
    }

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      return res.status(500).json({ success: false, error: 'AI ไม่สามารถอ่านข้อมูลจากภาพนี้ได้' });
    }

    const cleanedText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanedText);

    return res.status(200).json({
      success: true,
      data: parsedData
    });

  } catch (error) {
    console.error('OCR Serverless Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Server Error' });
  }
};
