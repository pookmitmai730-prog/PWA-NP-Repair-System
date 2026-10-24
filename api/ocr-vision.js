module.exports = async function handler(req, res) {
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
      return res.status(500).json({ success: false, error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY บน Vercel' });
    }

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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

    const result = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini API Error:', JSON.stringify(result));
      return res.status(500).json({ success: false, error: result.error?.message || 'Gemini API Error' });
    }

    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
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
    console.error('Serverless Function Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};