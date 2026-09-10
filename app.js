const DAYS_ORDER = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
const { timeToMin, detectConflicts } = ScheduleCore;

let DATA = null;

async function loadData(){
  const res = await fetch("data/courses.json");
  if (!res.ok) throw new Error(`Ders verisi yüklenemedi (${res.status})`);
  DATA = await res.json();
}

function el(id){return document.getElementById(id);}

function getMode(){
  return document.querySelector('input[name="mode"]:checked')?.value || "y1";
}

function getProgramsByMode(){
  const m = getMode();
  const p1 = DATA.programs.find(p => p.id === "bp1");
  const p2 = DATA.programs.find(p => p.id === "bp2");
  if (m === "y1") return [p1].filter(Boolean);
  if (m === "y2") return [p2].filter(Boolean);
  return [p1, p2].filter(Boolean);
}

function renderDatasetMeta(){
  const source = DATA.source || {};
  const parts = [DATA.term];
  if (source.generatedAt) parts.push(`Resmî çizelge: ${source.generatedAt}`);
  if (Array.isArray(source.pages) && source.pages.length){
    parts.push(`Kaynak: PDF sayfa ${source.pages.join("-")}`);
  }
  el("datasetMeta").textContent = parts.filter(Boolean).join(" • ");
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
    header.className = "program-title";
    header.innerHTML = `<strong>${prog.name}</strong><small>${prog.totalHours ?? "-"} HDS • Kaynak sayfa ${prog.sourcePage ?? "-"}</small>`;
    list.appendChild(header);

    prog.courses.forEach(c => {
      const id = courseId(prog.id, c.key);
      const groups = [...new Set(c.sessions.map(s => s.group))].filter(g => g !== 0).sort((a,b)=>a-b);
      const hasGroups = groups.length > 0;

      const div = document.createElement("div");
      div.className = "item";

      const left = document.createElement("div");
      const meta = [c.code, c.hds ? `${c.hds} HDS` : null, hasGroups ? "Grup seç" : "Tek seçenek"].filter(Boolean).join(" • ");
      left.innerHTML = `<strong>${c.name}</strong><small>${meta}</small>`;

      const right = document.createElement("div");
      right.className = "item-right";

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.id = `chk_${id}`;
      chk.setAttribute("aria-label", `${c.name} dersini seç`);

      const sel = document.createElement("select");
      sel.id = `grp_${id}`;
      sel.disabled = !hasGroups;
      sel.setAttribute("aria-label", `${c.name} grup seçimi`);
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
      const sessions = c.sessions.filter(s => s.group === grp);
      const use = sessions.length ? sessions : c.sessions;

      use.forEach(s => out.push({
        program: prog.name,
        programId: prog.id,
        courseKey: c.key,
        course: s.group ? `${c.name} (${s.group})` : c.name,
        code: c.code || "",
        hds: c.hds || "",
        ...s
      }));
    }
  }
  return out;
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
          changes.push(`Otomatik grup değişti: ${cdef.name} → Grup ${alt}`);
          sessions = testSessions;
          conflicts = testConf;
          changedThisPass = true;
          break;
        }

        sel.value = String(current);
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
    dayItems.forEach(s => rows.push([
      day,
      s.code || "-",
      s.course,
      s.hds || "-",
      `${s.start} - ${s.end}`,
      s.room || "-",
      s.teacher || "-",
      s.program
    ]));
  }

  if (!rows.length){
    preview.innerHTML = "<p>Hiç ders seçilmedi.</p>";
    return;
  }

  let html = `<table><thead><tr><th>Gün</th><th>Kod</th><th>Ders</th><th>HDS</th><th>Saat</th><th>Sınıf</th><th>Hoca</th><th>Kaynak</th></tr></thead><tbody>`;
  for (const r of rows){
    html += `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6]}</td><td>${r[7]}</td></tr>`;
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

function fitTextSize(font, text, maxWidth, preferred=8.5, min=5.5){
  let size = preferred;
  while (size > min && font.widthOfTextAtSize(String(text), size) > maxWidth){
    size -= 0.25;
  }
  return size;
}

async function generatePdf(sessions){
  const { PDFDocument, rgb } = PDFLib;
  const fontBytes = await fetch("assets/DejaVuSans.ttf").then(r => r.arrayBuffer());

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });

  const page = pdfDoc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const mode = getMode();
  const modeTitle = (mode==="y1") ? "1. Sınıf" : (mode==="y2" ? "2. Sınıf" : "1+2 (Karışık)");
  const student = el("studentName").value?.trim();

  const title = `Haftalık Ders Programı - Bilgisayar Programcılığı (${modeTitle})`;
  page.drawText(title, { x: 30, y: height-42, size: 15, font, color: rgb(0.04,0.22,0.33) });
  page.drawText(`${DATA.term} • ${DATA.school}`, { x: 30, y: height-60, size: 10, font, color: rgb(0.38,0.38,0.38) });
  const source = DATA.source?.generatedAt ? `Resmî çizelge: ${DATA.source.generatedAt} • Kaynak PDF: sayfa 1-2` : "";
  if (source) page.drawText(source, { x: 30, y: height-75, size: 8.5, font, color: rgb(0.45,0.45,0.45) });
  if (student){
    page.drawText(`Öğrenci: ${student}`, { x: 30, y: height-91, size: 9.5, font, color: rgb(0.2,0.2,0.2) });
  }

  let y = height - (student ? 122 : 106);
  const rowH = 20;
  const x0 = 30;
  const widths = [65, 110, 205, 42, 92, 65, 202];
  const headers = ["Gün", "Kod", "Ders", "HDS", "Saat", "Sınıf", "Hoca"];
  const colX = [x0];
  for (let i=0; i<widths.length-1; i++) colX.push(colX[i] + widths[i]);
  const tableW = widths.reduce((a,b)=>a+b,0);

  page.drawRectangle({ x: x0, y, width: tableW, height: rowH, color: rgb(0.04,0.22,0.33) });
  headers.forEach((h, i) => {
    page.drawText(h, { x: colX[i]+4, y: y+6, size: 8.5, font, color: rgb(1,1,1) });
  });
  y -= rowH;

  const rows = [];
  for (const day of DAYS_ORDER){
    const dayItems = sessions.filter(s => s.day===day);
    dayItems.sort((a,b)=>(timeToMin(a.start)??99999)-(timeToMin(b.start)??99999));
    dayItems.forEach(s => rows.push([
      day,
      s.code || "-",
      s.course,
      String(s.hds || "-"),
      `${s.start} - ${s.end}`,
      s.room || "-",
      s.teacher || "-"
    ]));
  }
  if (!rows.length) rows.push(["-", "-", "Hiç ders seçilmedi", "-", "-", "-", "-"]);

  rows.forEach((r, idx) => {
    const bg = idx%2===0 ? rgb(0.97,0.99,1) : rgb(0.92,0.96,0.99);
    page.drawRectangle({ x: x0, y, width: tableW, height: rowH, color: bg });
    r.forEach((text, i) => {
      const value = String(text);
      const size = fitTextSize(font, value, widths[i]-8, i===6 ? 7.5 : 8.2, 5.2);
      page.drawText(value, { x: colX[i]+4, y: y+6, size, font, color: rgb(0,0,0) });
    });
    y -= rowH;
  });

  y -= 8;
  page.drawText("Notlar:", { x: 30, y, size: 10.5, font, color: rgb(0.04,0.22,0.33) });
  y -= 15;
  for (const day of DAYS_ORDER){
    page.drawText(`${day}: ${notesForDay(day, sessions)}`, { x: 30, y, size: 8.2, font, color: rgb(0,0,0) });
    y -= 12;
    if (y < 25) break;
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "karatay_2026_2027_guz_ders_programi.pdf";
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
  try{
    await loadData();
    renderDatasetMeta();
    wireMode();
    buildCourseList();
    clearOutputs();
  } catch (e){
    console.error(e);
    el("datasetMeta").textContent = "Ders verisi yüklenemedi.";
    showWarnings(["❌ Ders verisi yüklenemedi.", e?.message || String(e)]);
    return;
  }

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

      // Student name is used only to render the local PDF. No telemetry is sent.
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
