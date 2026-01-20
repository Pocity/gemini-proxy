// Vercel Serverless Function для взаимодействия с Gemini API
export default async function handler(req, res) {
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Порядок получения ключа: 
  // - Сначала проверяем переменную окружения (для реального Vercel)
  // - Если её нет, используем пустую строку (для автоматической вставки ключа в этой среде)
  const apiKey = process.env.GEMINI_API_KEY || ""; 
  
  const model = "gemini-2.5-flash-preview-09-2025";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Поле prompt обязательно' });
    }

    // Логика повторных попыток (Exponential Backoff)
    const fetchWithRetry = async (retries = 5, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          }),
        });

        if (response.ok) return response;

        // Если ошибка 401 (Unauthorized) - значит ключ неверный или не передан
        if (response.status === 401) {
          throw new Error("Ошибка API: Неверный ключ (401). Проверьте GEMINI_API_KEY в настройках Vercel.");
        }

        // Если лимит запросов (429) или ошибка сервера (5xx), ждем и пробуем снова
        if (response.status === 429 || response.status >= 500) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          const errorDetail = await response.text();
          throw new Error(`Google API Error ${response.status}: ${errorDetail}`);
        }
      }
      throw new Error("Превышено количество попыток запроса.");
    };

    const apiResponse = await fetchWithRetry();
    const data = await apiResponse.json();

    // Извлекаем текст ответа
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI не вернул текст.";

    return res.status(200).json({ response: aiText });

  } catch (error) {
    console.error("Server Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
