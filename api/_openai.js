import OpenAI from "openai";

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const error = new Error("OPENAI_API_KEY belum diatur di Vercel Environment Variables.");
    error.status = 500;
    throw error;
  }
  return new OpenAI({ apiKey: key });
}

export function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(payload));
}

export function readJson(req) {
  // Vercel may parse JSON bodies before invoking the function.
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) {
        reject(Object.assign(new Error("Ukuran permintaan terlalu besar. Gunakan foto di bawah 8 MB."), { status: 413 }));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); }
      catch { reject(Object.assign(new Error("Format data tidak valid."), { status: 400 })); }
    });
    req.on("error", reject);
  });
}

export function parseImageData(dataUrl) {
  if (typeof dataUrl !== "string") throw Object.assign(new Error("Foto belum dipilih."), { status: 400 });
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw Object.assign(new Error("Format foto harus JPG, PNG, atau WEBP."), { status: 400 });
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 3 * 1024 * 1024) throw Object.assign(new Error("Ukuran foto maksimal 3 MB agar aman untuk batas request serverless."), { status: 413 });
  return { buffer, mime: match[1], dataUrl };
}

export function cleanError(error) {
  if (error?.status === 429) return "Kredit API OpenAI tidak mencukupi atau batas penggunaan tercapai. Periksa Billing dan Usage akun API.";
  if (error?.status === 401) return "API Key OpenAI tidak valid. Periksa OPENAI_API_KEY di Vercel.";
  if (error?.status === 403) return "Akun API belum memiliki izin untuk model yang dipilih.";
  return error?.message || "Terjadi kesalahan pada server.";
}
