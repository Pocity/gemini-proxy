// Vercel Serverless Function для связи Roblox и Gemini
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // Настройка CORS для доступа извне
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Пожалуйста, используйте метод POST" });
  }

  const { message } = req.body;
  const apiKey = process.env.GEMINI_API_KEY; // Ключ должен быть в Environment Variables в Vercel

  if (!apiKey) {
    return res.status(500).json({ error: "API ключ не настроен в Vercel" });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ reply: text });
  } catch (error) {
    console.error("Ошибка Gemini:", error);
    res.status(500).json({ error: "Ошибка при обработке запроса", details: error.message });
  }
}
