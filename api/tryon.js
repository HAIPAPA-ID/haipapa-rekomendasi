import { getOpenAI, sendJson, readJson, parseImageData, cleanError } from "./_openai.js";
import { toFile } from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Metode tidak diizinkan." });
  try {
    const body = await readJson(req);
    const { buffer, mime } = parseImageData(body.dataUrl);
    const styleName = String(body.styleName || "").slice(0, 100);
    const prompt = String(body.prompt || "").slice(0, 1800);
    if (!styleName) return sendJson(res, 400, { error: "Nama gaya rambut belum dipilih." });

    const client = getOpenAI();
    const imageFile = await toFile(buffer, mime === "image/jpeg" ? "customer.jpg" : mime === "image/webp" ? "customer.webp" : "customer.png", { type: mime });
    const result = await client.images.edit({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      image: imageFile,
      prompt: `Edit foto pelanggan ini untuk virtual haircut HAIPAPA. Gaya rambut yang diminta: ${styleName}. ${prompt}. WAJIB: pertahankan wajah dan identitas orang yang sama, bentuk wajah, mata, hidung, mulut, telinga, warna kulit, ekspresi, pose, sudut kamera, pakaian, latar belakang, dan pencahayaan. Ubah hanya rambut dan detail potongan rambut. Hasil harus fotorealistis seperti foto kamera profesional barbershop, helai rambut alami, garis rambut masuk akal, tekstur dan bayangan realistis. Jangan menambahkan teks, watermark, kolase, atau orang lain.`,
      size: "1024x1024",
      quality: "low",
      output_format: "jpeg"
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error("Model gambar tidak mengembalikan hasil.");
    return sendJson(res, 200, { image: `data:image/jpeg;base64,${b64}`, styleName });
  } catch (error) {
    console.error("tryon error:", error);
    return sendJson(res, error.status || 500, { error: cleanError(error) });
  }
}
