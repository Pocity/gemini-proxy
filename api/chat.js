const axios = require('axios');

module.exports = async (req, res) => {
    // Настройка заголовков для работы с запросами из Roblox
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Проверяем наличие ключа в переменных окружения
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("ОШИБКА: Переменная GEMINI_API_KEY не найдена в настройках Vercel!");
        return res.status(401).json({ 
            error: "Ключ API не настроен на сервере (Vercel Environment Variable missing)",
            code: "MISSING_KEY"
        });
    }

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: "Пустой промпт" });
    }

    try {
        // Используем актуальную модель gemini-1.5-flash (она быстрее и стабильнее для тестов)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const response = await axios.post(url, {
            contents: [{
                parts: [{ text: prompt }]
            }]
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.candidates) {
            const aiResponse = response.data.candidates[0].content.parts[0].text;
            return res.status(200).json({ response: aiResponse });
        } else {
            throw new Error("Некорректный ответ от Google API");
        }

    } catch (error) {
        const statusCode = error.response ? error.response.status : 500;
        const errorData = error.response ? error.response.data : error.message;
        
        console.error("Ошибка при вызове Gemini API:", JSON.stringify(errorData));
        
        return res.status(statusCode).json({ 
            error: "Ошибка на стороне Google API", 
            details: errorData 
        });
    }
};
