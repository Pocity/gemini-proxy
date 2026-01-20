// Этот файл должен лежать в папке api/ вашего репозитория на GitHub
// Vercel автоматически подхватит его как Serverless функцию

export default async function handler(req, res) {
    // Разрешаем запросы только методом POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Используйте POST запрос. Сервер прокси активен." });
    }

    try {
        const { prompt, apiKey } = req.body;

        if (!prompt || !apiKey) {
            return res.status(400).json({ error: "Ошибка: prompt или apiKey не переданы в теле запроса." });
        }

        // Прямой запрос к Google API от лица серверов Vercel (у них нет проблем с SSL для Google)
        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0].content) {
            const replyText = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ text: replyText });
        } else {
            console.error("Gemini Error:", data);
            return res.status(500).json({ error: "API Gemini вернул ошибку", details: data });
        }

    } catch (error) {
        console.error("Proxy Error:", error);
        return res.status(500).json({ error: "Внутренняя ошибка прокси-сервера", message: error.message });
    }
}
