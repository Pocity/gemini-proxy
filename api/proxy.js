// api/proxy.js

/**
 * Этот скрипт является прослойкой (прокси) между Roblox и Google Gemini API.
 * Он необходим, так как Roblox блокирует прямые запросы к доменам Google,
 * а Vercel позволяет обойти это ограничение.
 */

export default async function handler(req, res) {
    // Настройка CORS (разрешаем доступ для Roblox)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-goog-api-key, x-goog-api-client');

    // Ответ на предварительный запрос браузера/сервера
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Формируем URL для оригинального API Gemini
    // Мы берем путь из запроса к прокси и добавляем его к адресу Google
    const targetUrl = `https://generativelanguage.googleapis.com${req.url}`;

    try {
        // Подготавливаем заголовки. 
        // Мы копируем все заголовки из Roblox, но принудительно ставим правильный хост.
        const headers = { ...req.headers };
        delete headers.host; 
        headers['host'] = 'generativelanguage.googleapis.com';

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            // Если это POST запрос, передаем тело (json с вопросом)
            body: req.method === 'POST' ? JSON.stringify(req.body) : null
        });

        // Получаем данные от Google
        const data = await response.json();
        
        // Отправляем их обратно в Roblox
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Ошибка проксирования:", error);
        res.status(500).json({ 
            error: "Proxy server error", 
            details: error.message 
        });
    }
}
