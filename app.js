const $ = (id) => document.getElementById(id);
const state = { dataUrl: null, analysis: null, simulations: {}, fileName: "" };
const photoInput = $("photoInput"), analyzeBtn = $("analyzeBtn"), statusBox = $("status");

function notify(message, duration = 5500) {
  statusBox.textContent = message; statusBox.classList.add("show");
  clearTimeout(notify.timer); notify.timer = setTimeout(() => statusBox.classList.remove("show"), duration);
}
function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
async function handleFile(file) {
  if (!file) return;
  if (!["image/jpeg","image/png","image/webp"].includes(file.type)) return notify("Pilih foto JPG, PNG, atau WEBP.");
  if (file.size > 8 * 1024 * 1024) return notify("Ukuran foto maksimal 8 MB.");
  state.dataUrl = await fileToDataUrl(file); state.fileName = file.name; state.analysis = null; state.simulations = {};
  $("photoPreview").src = state.dataUrl; $("photoPreview").hidden = false;
  $("uploadTitle").textContent = file.name; $("uploadSub").textContent = "Foto siap dianalisis. Pilih Analisis wajah.";
  analyzeBtn.disabled = false;
}
photoInput.addEventListener("change", e => handleFile(e.target.files[0]));
const dropzone = $("dropzone");
["dragenter","dragover"].forEach(evt => dropzone.addEventListener(evt, e => {e.preventDefault();dropzone.classList.add("dragover")}));
["dragleave","drop"].forEach(evt => dropzone.addEventListener(evt, e => {e.preventDefault();dropzone.classList.remove("dragover")}));
dropzone.addEventListener("drop", e => handleFile(e.dataTransfer.files[0]));

async function postJson(url, body) {
  const response = await fetch(url, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Server error (${response.status})`);
  return data;
}
function renderAnalysis(a) {
  $("resultPortrait").src = state.dataUrl;
  $("faceBars").innerHTML = a.faceShape.map(item => `
    <div class="face-row"><span>${escapeHtml(item.name)}</span><div class="bar"><span style="width:${item.percentage}%"></span></div><b>${item.percentage}%</b></div>`).join("");
  $("faceAnalysis").textContent = a.faceAnalysis;
  $("haircutAdvice").textContent = a.haircutAdvice;
  $("hairline").textContent = a.hairline;
  $("hairType").textContent = a.hairType;
  $("photoQuality").textContent = a.photoQuality + " " + a.confidenceNote;
  $("recommendations").innerHTML = a.recommendations.map((r,i) => `
    <article class="rec-card" id="rec-card-${i}">
      <div class="rec-images">
        <div class="rec-image-frame simulation-frame" id="rec-image-${i}"><div class="image-placeholder"><span class="loading-ring"></span><span>Menyiapkan hasil rekomendasi…</span></div><span class="image-label">HASIL REKOMENDASI</span></div>
      </div>
      <div class="rec-card-body">
        <div class="rec-head"><h3>${i+1}. ${escapeHtml(r.name)}</h3><span class="score">${r.score}/100</span></div>
        <div class="rec-meta"><span>PERSONALIZED</span><span>AI STYLE MATCH</span></div>
        <p>${escapeHtml(r.reason)}</p>
        <p class="barber-note"><strong>Catatan capster:</strong> ${escapeHtml(r.barberNote)}</p>
        <div class="rec-actions"><button class="secondary-btn" data-tryon="${i}">Buat ulang gambar ↻</button><a class="download-link" id="download-${i}" hidden>Simpan gambar ↓</a></div>
      </div>
    </article>`).join("");
  $("recommendations").querySelectorAll("[data-tryon]").forEach(btn => btn.addEventListener("click", () => generateTryOn(Number(btn.dataset.tryon), true)));
  $("results").hidden = false;
  $("results").scrollIntoView({behavior:"smooth",block:"start"});
}

analyzeBtn.addEventListener("click", async () => {
  if (!state.dataUrl) return;
  analyzeBtn.disabled = true; analyzeBtn.textContent = "Menganalisis foto…";
  notify("AI sedang menganalisis bentuk wajah dan karakter rambut. Mohon tunggu.", 20000);
  try {
    const result = await postJson("/api/analyze", {dataUrl:state.dataUrl});
    state.analysis = result.analysis; renderAnalysis(state.analysis);
    notify("Analisis selesai. Sedang membuat gambar untuk empat rekomendasi…", 12000);
    generateAllTryOns();
  } catch (error) { notify(error.message, 9000); }
  finally { analyzeBtn.disabled = false; analyzeBtn.innerHTML = 'Analisis wajah <span>→</span>'; }
});

async function generateAllTryOns() {
  // Generate sequentially to reduce the chance of API rate-limit errors.
  for (let i = 0; i < (state.analysis?.recommendations?.length || 0); i++) {
    if (state.analysis) await generateTryOn(i);
  }
  if (state.analysis) notify("Semua gambar rekomendasi selesai dibuat.", 7000);
}

async function generateTryOn(index, force = false) {
  const rec = state.analysis?.recommendations?.[index]; if (!rec) return;
  const imageBox = document.getElementById(`rec-image-${index}`);
  const retryButton = document.querySelector(`[data-tryon="${index}"]`);
  const downloadLink = document.getElementById(`download-${index}`);
  if (!imageBox) return;
  if (state.simulations[index] && !force) return;
  imageBox.innerHTML = `<div class="image-placeholder"><span class="loading-ring"></span><span>Memproses ${escapeHtml(rec.name)}…</span></div><span class="image-label">HASIL REKOMENDASI</span>`;
  if (retryButton) { retryButton.disabled = true; retryButton.textContent = "Sedang membuat…"; }
  if (downloadLink) downloadLink.hidden = true;
  notify(`Membuat simulasi ${rec.name}. Setiap gambar menggunakan kredit API gambar.`, 30000);
  try {
    const result = await postJson("/api/tryon", {dataUrl:state.dataUrl, styleName:rec.name, prompt:rec.prompt});
    state.simulations[index] = result.image;
    imageBox.innerHTML = `<img class="generated-style-image" src="${result.image}" alt="Simulasi haircut ${escapeHtml(rec.name)}"><span class="image-label">HASIL REKOMENDASI</span>`;
    if (downloadLink) {
      downloadLink.href = result.image;
      downloadLink.download = `haipapa-${rec.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.jpg`;
      downloadLink.hidden = false;
    }
    if (retryButton) { retryButton.disabled = false; retryButton.textContent = "Buat ulang gambar ↻"; }
    notify(`Simulasi ${rec.name} selesai.`);
  } catch (error) {
    imageBox.innerHTML = `<div class="image-placeholder image-error"><strong>Gambar belum berhasil dibuat</strong><span>${escapeHtml(error.message)}</span></div><span class="image-label">HASIL REKOMENDASI</span>`;
    if (retryButton) { retryButton.disabled = false; retryButton.textContent = "Coba lagi ↻"; }
    notify(`Simulasi ${rec.name}: ${error.message}`, 9000);
  }
}

$("saveBtn").addEventListener("click", () => {
  if (!state.analysis) return notify("Belum ada hasil analisis untuk disimpan.");
  const record = { savedAt:new Date().toISOString(), fileName:state.fileName, analysis:state.analysis, simulations:state.simulations };
  try {
    const old = JSON.parse(localStorage.getItem("haipapa-consultations") || "[]");
    old.unshift(record); localStorage.setItem("haipapa-consultations", JSON.stringify(old.slice(0,10)));
    notify("Hasil konsultasi tersimpan di browser perangkat ini.");
  } catch { notify("Penyimpanan browser penuh. Gunakan Cetak / PDF untuk menyimpan hasil."); }
});
$("printBtn").addEventListener("click", () => window.print());
$("newBtn").addEventListener("click", () => {
  state.dataUrl=null;state.analysis=null;state.simulations={};state.fileName="";
  photoInput.value="";$("photoPreview").hidden=true;$("uploadTitle").textContent="Pilih atau jatuhkan foto di sini";
  $("uploadSub").textContent="Gunakan foto wajah dari depan, pencahayaan jelas.";
  $("results").hidden=true;analyzeBtn.disabled=true;analyzeBtn.innerHTML='Analisis wajah <span>→</span>';
  window.scrollTo({top:0,behavior:"smooth"});
});
