import { getOpenAI, sendJson, readJson, parseImageData, cleanError } from "./_openai.js";

const schema = {
  name: "haipapa_hair_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      faceShape: { type: "array", minItems: 3, maxItems: 3, items: {
        type: "object", additionalProperties: false,
        properties: { name: { type: "string", enum: ["Oval", "Triangle", "Square", "Round", "Oblong", "Heart", "Diamond"] }, percentage: { type: "integer", minimum: 0, maximum: 100 } },
        required: ["name", "percentage"]
      }},
      faceAnalysis: { type: "string" },
      haircutAdvice: { type: "string" },
      hairline: { type: "string" },
      hairType: { type: "string" },
      recommendations: { type: "array", minItems: 4, maxItems: 4, items: {
        type: "object", additionalProperties: false,
        properties: {
          name: { type: "string" },
          score: { type: "integer", minimum: 50, maximum: 100 },
          reason: { type: "string" },
          barberNote: { type: "string" },
          prompt: { type: "string" }
        },
        required: ["name", "score", "reason", "barberNote", "prompt"]
      }},
      photoQuality: { type: "string" },
      confidenceNote: { type: "string" }
    },
    required: ["faceShape", "faceAnalysis", "haircutAdvice", "hairline", "hairType", "recommendations", "photoQuality", "confidenceNote"]
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Metode tidak diizinkan." });
  try {
    const body = await readJson(req);
    const { dataUrl } = parseImageData(body.dataUrl);
    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_ANALYSIS_MODEL || "gpt-4o-mini",
      response_format: { type: "json_schema", json_schema: schema },
      messages: [
        { role: "system", content: "Anda adalah konsultan barber profesional. Analisis hanya ciri visual yang tampak pada foto, bukan identitas, kepribadian, kesehatan, etnis, atau karakter orang. Persentase adalah estimasi visual dan tiga nilai harus berjumlah tepat 100. Gunakan bahasa Indonesia yang jelas. Rekomendasi harus realistis untuk barber Indonesia dan mempertimbangkan bentuk wajah, hairline, tekstur, serta ketebalan rambut. Skor adalah estimasi kecocokan, bukan ukuran ilmiah. Berikan empat gaya berbeda. Dalam prompt setiap rekomendasi, instruksikan pengeditan foto referensi: pertahankan identitas wajah, ekspresi, warna kulit, sudut kamera, pakaian, latar, pencahayaan; ubah hanya rambut sesuai nama potongan." },
        { role: "user", content: [
          { type: "text", text: "Analisis foto pelanggan untuk konsultasi haircut HAIPAPA. Berikan tiga bentuk wajah teratas dengan persentase total 100, deskripsi proporsi, rekomendasi, hairline, tipe rambut termasuk pola 1A–4C bila dapat diperkirakan, serta empat haircut dengan skor 0–100, alasan, instruksi capster, dan prompt edit foto." },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } }
        ]}
      ],
      max_tokens: 1800
    });
    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI tidak mengembalikan hasil analisis.");
    const result = JSON.parse(content);
    const total = result.faceShape.reduce((sum, item) => sum + item.percentage, 0);
    if (total !== 100) {
      const largest = result.faceShape.reduce((a, b) => a.percentage > b.percentage ? a : b);
      largest.percentage += (100 - total);
    }
    return sendJson(res, 200, { analysis: result });
  } catch (error) {
    console.error("analyze error:", error);
    return sendJson(res, error.status || 500, { error: cleanError(error) });
  }
}
