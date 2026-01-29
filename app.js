const DAYS_ORDER = ["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi/Pazar"];

let DATA = null;

async function loadData(){
  const res = await fetch("data/courses.json");
  DATA = await res.json();
}

function el(id){return document.getElementById(id);}

function getMode(){
  return document.querySelector('input[name="mode"]:checked')?.value || "y1";
}

function timeToMin(t){
  if (!t || t === "Online") return null;
  const [h,m] = t.split(":").map(Number);
  return h*60 + m;
}
function overlap(a,b){
  const aS=timeToMin(a.start), aE=timeToMin(a.end);
  const bS=timeToMin(b.start), bE=timeToMin(b.end);
  if (aS===null || bS===null) return false;
  return Math.max(aS,bS) < Math.min(aE,bE);
}

function getProgramsByMode(){
  const m = getMode();
  const p1 = DATA.programs.find(p => p.id === "bp1");
  const p2 = DATA.programs.find(p => p.id === "bp2");
  if (m === "y1") return [p1].filter(Boolean);
  if (m === "y2") return [p2].filter(Boolean);
  return [p1,p2].filter(Boolean);
}

function clearOutputs(){
  el("warnings").textContent = "";
  el("preview").innerHTML = "<p>Henüz önizleme yok.</p>";
}

function courseId(progId, courseKey){
  return `${progId}:${courseKey}`;
}

function buildCourseList(){
  const list = el("courseList");
  list.innerHTML = "";

  const progs = getProgramsByMode();

  for (const prog of progs){
    const header = document.createElement("div");
    header.style.marginTop = "6px";
    header.innerHTML = `<strong style="display:block;padding:6px 2px;color:#0B3954">${prog.name}</strong>`;
    list.appendChild(header);

    prog.courses.forEach(c => {
      const id = courseId(prog.id, c.key);
      const groups = [...new Set(c.sessions.map(s => s.group))].filter(g => g !== 0).sort((a,b)=>a-b);
      const hasGroups = groups.length > 0;

      const div = document.createElement("div");
      div.className = "item";

      const left = document.createElement("div");
      left.innerHTML = `<strong>${c.name}</strong><small>${hasGroups ? "Grup seç (varsa)" : "Tek seçenek"}</small>`;

      const right = document.createElement("div");
      right.className = "item-right";

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.id = `chk_${id}`;

      const sel = document.createElement("select");
      sel.id = `grp_${id}`;
      sel.disabled = !hasGroups;
      sel.innerHTML = hasGroups
        ? groups.map(g => `<option value="${g}">Grup ${g}</option>`).join("")
        : `<option value="0">Tek</option>`;

      right.appendChild(chk);
      right.appendChild(sel);

      div.appendChild(left);
      div.appendChild(right);
      list.appendChild(div);
    });
  }
}

function selectedSessions(){
  const out = [];
  const progs = getProgramsByMode();

  for (const prog of progs){
    for (const c of prog.courses){
      const id = courseId(prog.id, c.key);
      const chk = document.getElementById(`chk_${id}`);
      if (!chk?.checked) continue;

      const sel = document.getElementById(`grp_${id}`);
      const grp = Number(sel?.value ?? 0);

      const sessions = c.sessions.filter(s => s.group === grp || (!sel.disabled && s.group===grp));
      const use = sessions.length ? sessions : c.sessions;
      use.forEach(s => out.push({program: prog.name, programId: prog.id, courseKey: c.key, course: c.name, ...s}));
    }
  }
  return out;
}

function detectConflicts(sessions){
  const byDay = {};
  sessions.forEach(s => {
    byDay[s.day] ??= [];
    byDay[s.day].push(s);
  });

  const conflicts = [];
  for (const day of Object.keys(byDay)){
    const items = byDay[day].filter(x => x.start !== "Online");
    for (let i=0;i<items.length;i++){
      for (let j=i+1;j<items.length;j++){
        if (overlap(items[i], items[j])){
          conflicts.push({day, a: items[i], b: items[j]});
        }
      }
    }
  }
  return conflicts;
}

function getCourseDef(programId, courseKey){
  const prog = DATA.programs.find(p => p.id === programId);
  return prog?.courses.find(c => c.key === courseKey);
}

function tryAutoResolve(){
  const changes = [];
  let sessions = selectedSessions();
  let conflicts = detectConflicts(sessions);

  for (let pass=0; pass<8 && conflicts.length; pass++){
    let changedThisPass = false;

    for (const conf of conflicts){
      const candidates = [conf.a, conf.b];
      for (const item of candidates){
        const cdef = getCourseDef(item.programId, item.courseKey);
        if (!cdef) continue;
        const groups = [...new Set(cdef.sessions.map(s => s.group))].filter(g => g !== 0).sort((a,b)=>a-b);
        if (groups.length < 2) continue;

        const selId = `grp_${item.programId}:${item.courseKey}`;
        const sel = document.getElementById(selId);
        if (!sel || sel.disabled) continue;

        const current = Number(sel.value);
        const alt = groups.find(g => g !== current);
        if (!alt) continue;

        sel.value = String(alt);
        const testSessions = selectedSessions();
        const testConf = detectConflicts(testSessions);

        if (testConf.length < conflicts.length){
          changes.push(`Otomatik grup değişti: ${item.course} → Grup ${alt}`);
          sessions = testSessions;
          conflicts = testConf;
          changedThisPass = true;
          break;
        } else {
          sel.value = String(current);
        }
      }
      if (changedThisPass) break;
    }
    if (!changedThisPass) break;
  }

  sessions = selectedSessions();
  conflicts = detectConflicts(sessions);
  return {sessions, conflicts, changes};
}

function renderPreview(sessions){
  const preview = el("preview");
  const rows = [];
  for (const day of DAYS_ORDER){
    const dayItems = sessions.filter(s => s.day === day);
    dayItems.sort((a,b)=>(timeToMin(a.start)??99999)-(timeToMin(b.start)??99999));
    dayItems.forEach(s => rows.push([day, s.course, `${s.start} – ${s.end}`, s.room || "-", s.teacher || "-", s.program]));
  }

  if (!rows.length){
    preview.innerHTML = "<p>Hiç ders seçilmedi.</p>";
    return;
  }

  let html = `<table><thead><tr><th>Gün</th><th>Ders</th><th>Saat</th><th>Sınıf</th><th>Hoca</th><th>Kaynak</th></tr></thead><tbody>`;
  for (const r of rows){
    html += `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td></tr>`;
  }
  html += `</tbody></table>`;
  preview.innerHTML = html;
}

function notesForDay(day, sessions){
  const items = sessions.filter(s => s.day===day && s.start!=="Online");
  const totalMin = items.reduce((acc,s)=> acc + ((timeToMin(s.end)??0)-(timeToMin(s.start)??0)), 0);
  if (!items.length) return "Boş gün. Ödev/tekrar için kullan.";
  if (totalMin >= 6*60) return "Yoğun gün. Laptop + şarj + yemek planla.";
  if (items.length === 1) return "Hafif gün. Tek ders, tekrar için ideal.";
  return "Orta yoğunluk. Araları verimli kullan.";
}

async function generatePdf(sessions){
  const { PDFDocument, rgb } = PDFLib;

  const fontBytes = await fetch("assets/DejaVuSans.ttf").then(r => r.arrayBuffer());

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });

  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const mode = getMode();
  const modeTitle = (mode==="y1") ? "1. Sınıf" : (mode==="y2" ? "2. Sınıf" : "1+2 (Karışık)");
  const student = el("studentName").value?.trim();

  const title = `Haftalık Ders Programı – Bilgisayar Programcılığı (${modeTitle})`;
  page.drawText(title, { x: 40, y: height-60, size: 16, font, color: rgb(0.04,0.22,0.33) });
  page.drawText(`${DATA.term} • KTO Karatay Üniversitesi`, { x: 40, y: height-80, size: 11, font, color: rgb(0.4,0.4,0.4) });
  if (student){
    page.drawText(`Öğrenci: ${student}`, { x: 40, y: height-98, size: 11, font, color: rgb(0.2,0.2,0.2) });
  }

  let y = height - 130;
  const rowH = 22;
  const x0 = 40;
  const tableW = width - 80;
  const colX = [x0, x0+110, x0+340, x0+455];

  page.drawRectangle({ x: x0, y, width: tableW, height: rowH, color: rgb(0.04,0.22,0.33) });
  page.drawText("Gün", { x: colX[0]+6, y: y+6, size: 11, font, color: rgb(1,1,1) });
  page.drawText("Ders", { x: colX[1]+6, y: y+6, size: 11, font, color: rgb(1,1,1) });
  page.drawText("Saat", { x: colX[2]+6, y: y+6, size: 11, font, color: rgb(1,1,1) });
  page.drawText("Sınıf", { x: colX[3]+6, y: y+6, size: 11, font, color: rgb(1,1,1) });
  y -= rowH;

  const rows = [];
  for (const day of DAYS_ORDER){
    const dayItems = sessions.filter(s => s.day===day);
    dayItems.sort((a,b)=>(timeToMin(a.start)??99999)-(timeToMin(b.start)??99999));
    dayItems.forEach(s => rows.push([day, s.course, `${s.start} – ${s.end}`, s.room || "-"]));
  }
  if (!rows.length) rows.push(["-", "Hiç ders seçilmedi", "-", "-"]);

  rows.forEach((r, idx) => {
    const bg = idx%2===0 ? rgb(0.97,0.99,1) : rgb(0.92,0.96,0.99);
    page.drawRectangle({ x: x0, y, width: tableW, height: rowH, color: bg });
    page.drawText(r[0], { x: colX[0]+6, y: y+6, size: 10, font, color: rgb(0,0,0) });
    page.drawText(r[1], { x: colX[1]+6, y: y+6, size: 10, font, color: rgb(0,0,0) });
    page.drawText(r[2], { x: colX[2]+6, y: y+6, size: 10, font, color: rgb(0,0,0) });
    page.drawText(r[3], { x: colX[3]+6, y: y+6, size: 10, font, color: rgb(0,0,0) });
    y -= rowH;
  });

  y -= 10;
  page.drawText("Notlar:", { x: 40, y, size: 12, font, color: rgb(0.04,0.22,0.33) });
  y -= 18;
  for (const day of DAYS_ORDER){
    page.drawText(`${day}: ${notesForDay(day, sessions)}`, { x: 40, y, size: 10, font, color: rgb(0,0,0) });
    y -= 14;
    if (y < 60) break;
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "ders_programi.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showWarnings(lines){
  el("warnings").textContent = lines.length ? lines.join("\n") : "";
}

function wireMode(){
  document.querySelectorAll('input[name="mode"]').forEach(r => {
    r.onchange = () => { buildCourseList(); clearOutputs(); };
  });
}

async function init(){
  await loadData();
  wireMode();
  buildCourseList();
  clearOutputs();

  el("btnPreview").onclick = () => {
    const {sessions, conflicts, changes} = tryAutoResolve();
    const msgs = [];
    if (changes.length){
      msgs.push("✅ Otomatik düzeltme:");
      changes.forEach(c => msgs.push(" - " + c));
    }
    if (conflicts.length){
      msgs.push("⚠️ Çakışma var (hala):");
      conflicts.forEach(c => msgs.push(` - ${c.day}: "${c.a.course}" ↔ "${c.b.course}"`));
      msgs.push("Çözüm: İlgili dersin grubunu manuel değiştir veya dersi kaldır.");
    }
    showWarnings(msgs);
    renderPreview(sessions);
  };

  el("btnPdf").onclick = async () => {
    try{
      const {sessions, conflicts, changes} = tryAutoResolve();
      const msgs = [];
      if (changes.length){
        msgs.push("✅ Otomatik düzeltme:");
        changes.forEach(c => msgs.push(" - " + c));
      }
      if (conflicts.length){
        msgs.push("⚠️ Çakışma var: PDF üretilmedi.");
        conflicts.forEach(c => msgs.push(` - ${c.day}: "${c.a.course}" ↔ "${c.b.course}"`));
        showWarnings(msgs);
        renderPreview(sessions);
        return;
      }
      showWarnings(msgs);
         // ===== Usage log to Google Form (reliable) =====
const name = el("studentName").value?.trim() || "İsim girilmedi";

let modeText = "Bilinmiyor";
const mode = getMode();
if (mode === "y1") modeText = "1. Sınıf";
if (mode === "y2") modeText = "2. Sınıf";
if (mode === "mix") modeText = "1+2 (Karışık)";

const url = "https://docs.google.com/forms/d/e/1tID-TvJhubKJMz-8SkgUhADqOZ6yKeldWSLLDrHmCY/formResponse";
const payload = new URLSearchParams({
  "entry.1401981382": name,
  "entry.1538779879": modeText
}).toString();

try {
  navigator.sendBeacon(url, new Blob([payload], { type: "application/x-www-form-urlencoded" }));
} catch (e) {
  console.log("sendBeacon failed:", e);
}

      await generatePdf(sessions);
    } catch (e){
      console.error(e);
      showWarnings([
        "❌ PDF indirilemedi.",
        "Chrome/Edge kullan ve popup engelini kapat.",
        "Hata: " + (e?.message || String(e))
      ]);
    }
  };
}
init();
