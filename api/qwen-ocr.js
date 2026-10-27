// api/qwen-ocr.js (Vercel Serverless Function)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, prompt } = req.body;
  const apiKey = process.env.QWEN_API_KEY; // Pobierane bezpiecznie ze zmiennych Vercel

  try {
    // Przykład dla standardowego endpointu kompatybilnego z OpenAI (np. DashScope / DeepInfra dla Qwen)
    const response = await fetch("https://api.deepinfra.com/v1/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "Qwen/Qwen3.8-27B", // lub odpowiednik wspierający wizję/OCR
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt || "Przeanalizuj ten paragon/etykietę i zwróć produkty w formacie JSON zawierającym tablicę obiektów z polami: name, quantity, expiryDate." },
              { type: "image_url", image_url: { url: imageBase64 } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Błąd komunikacji z Qwen API' });
  }
}