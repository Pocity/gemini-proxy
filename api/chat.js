// Vercel Serverless Function для взаимодействия с Gemini API
export default async function handler(req, res) {
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // В этой среде ключ вставляется автоматически при пустой строке
  const apiKey = ""; 
  const model = "gemini-2.5-flash-preview-09-2025";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Реализация экспоненциальной задержки (Retry logic)
    const fetchWithRetry = async (retries = 5, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            }),
          });

          if (response.ok) return response;
          
          // Если 401 или 403 - это проблема ключа, ретрай не поможет
          if (response.status === 401 || response.status === 403) {
             const errData = await response.json();
             throw new Error(`Google API Auth Error: ${response.status} - ${JSON.stringify(errData)}`);
          }

          // Для остальных ошибок (например 429) ждем
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; 
        } catch (err) {
          if (i === retries - 1) throw err;
        }
      }
    };

    const apiResponse = await fetchWithRetry();
    const data = await apiResponse.json();

    // Извлекаем текст из ответа Gemini
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI";

    return res.status(200).json({ response: aiText });

  } catch (error) {
    console.error("Server Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
