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
  $("faceBars").innerHTML = a.faceShape.map(item => `
    <div class="face-row"><span>${escapeHtml(item.name)}</span><div class="bar"><span style="width:${item.percentage}%"></span></div><b>${item.percentage}%</b></div>`).join("");
  $("faceAnalysis").textContent = a.faceAnalysis;
  $("haircutAdvice").textContent = a.haircutAdvice;
  $("hairline").textContent = a.hairline;
  $("hairType").textContent = a.hairType;
  $("photoQuality").textContent = a.photoQuality + " " + a.confidenceNote;
  $("recommendations").innerHTML = a.recommendations.map((r,i) => `
    <article class="rec-card">
      <div class="rec-head"><h3>${i+1}. ${escapeHtml(r.name)}</h3><span class="score">${r.score}/100</span></div>
      <p>${escapeHtml(r.reason)}</p>
      <p class="barber-note"><strong>Catatan capster:</strong> ${escapeHtml(r.barberNote)}</p>
      <button class="secondary-btn" data-tryon="${i}">Coba gaya ini →</button>
    </article>`).join("");
  $("recommendations").querySelectorAll("[data-tryon]").forEach(btn => btn.addEventListener("click", () => generateTryOn(Number(btn.dataset.tryon))));
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
    notify("Analisis selesai. Pilih salah satu haircut untuk membuat simulasi.");
  } catch (error) { notify(error.message, 9000); }
  finally { analyzeBtn.disabled = false; analyzeBtn.innerHTML = 'Analisis wajah <span>→</span>'; }
});

async function generateTryOn(index) {
  const rec = state.analysis?.recommendations?.[index]; if (!rec) return;
  const grid = $("tryonGrid");
  let card = document.getElementById(`tryon-${index}`);
  if (!card) {
    card = document.createElement("article"); card.className = "tryon-card"; card.id = `tryon-${index}`;
    card.innerHTML = `<div class="empty-state">Sedang membuat ${escapeHtml(rec.name)}…</div><div><strong>${escapeHtml(rec.name)}</strong></div>`;
    grid.querySelector(".empty-state")?.remove(); grid.appendChild(card);
  } else if (state.simulations[index]) { return; }
  else card.querySelector(".empty-state").textContent = `Sedang membuat ${rec.name}…`;
  notify(`Membuat simulasi ${rec.name}. Proses ini menggunakan kredit API gambar.`, 30000);
  try {
    const result = await postJson("/api/tryon", {dataUrl:state.dataUrl, styleName:rec.name, prompt:rec.prompt});
    state.simulations[index] = result.image;
    card.innerHTML = `<img src="${result.image}" alt="Simulasi ${escapeHtml(rec.name)}"><div><strong>${escapeHtml(rec.name)}</strong><a href="${result.image}" download="haipapa-${rec.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.jpg">Simpan gambar ↓</a></div>`;
    notify(`Simulasi ${rec.name} selesai.`);
  } catch (error) {
    card.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}<br><button class="secondary-btn retry-btn">Coba lagi</button></div><div><strong>${escapeHtml(rec.name)}</strong></div>`;
    card.querySelector(".retry-btn").addEventListener("click", () => generateTryOn(index));
    notify(error.message, 9000);
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
