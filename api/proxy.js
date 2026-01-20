export default async function handler(req, res) {
  // 1. Проверка метода
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Используйте POST запрос' });
  }

  const { key } = req.query;
  if (!key) {
    return res.status(400).json({ error: 'Ключ API (key) не найден в URL' });
  }

  // 2. Настройка модели (используем стабильную flash версию)
  const MODEL = "gemini-2.0-flash";
  const GOOGLE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

  // Функция для запроса с экспоненциальной задержкой (retry)
  const fetchWithRetry = async (url, options, retries = 5, backoff = 1000) => {
    try {
      const response = await fetch(url, options);
      if (response.status === 429 && retries > 0) { // Ошибка Too Many Requests
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      return response;
    } catch (err) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw err;
    }
  };

  try {
    const response = await fetchWithRetry(GOOGLE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      // Если пришел не JSON, значит Google отдал ошибку в формате HTML/Text
      const errorText = await response.text();
      return res.status(response.status).json({
        error: "Google API вернул ошибку",
        status: response.status,
        details: errorText.substring(0, 200) // Берем начало текста ошибки
      });
    }

  } catch (err) {
    return res.status(500).json({
      error: "Ошибка прокси-сервера",
      message: err.message
    });
  }
}
