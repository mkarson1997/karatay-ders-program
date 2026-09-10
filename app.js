const DAYS_ORDER = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
const { timeToMin, detectConflicts } = ScheduleCore;

let DATA = null;

async function loadData() {
  const res = await fetch("data/courses.json");
  if (!res.ok) throw new Error(`Ders verisi yüklenemedi (${res.status})`);
  DATA = await res.json();
}

function el(id) {
  return document.getElementById(id);
}

function getMode() {
  return document.querySelector('input[name="mode"]:checked')?.value || "y1";
}

function getProgramsByMode() {
  const mode = getMode();
  const p1 = DATA.programs.find((p) => p.id === "bp1");
  const p2 = DATA.programs.find((p) => p.id === "bp2");
  if (mode === "y1") return [p1].filter(Boolean);
  if (mode === "y2") return [p2].filter(Boolean);
  return [p1, p2].filter(Boolean);
}

function renderDatasetMeta() {
  const source = DATA.source || {};
  const parts = [DATA.term];
  if (source.generatedAt) parts.push(`Resmî çizelge: ${source.generatedAt}`);
  if (Array.isArray(source.pages) && source.pages.length) {
    parts.push(`Kaynak: PDF sayfa ${source.pages.join("-")}`);
  }
  el("datasetMeta").textContent = parts.filter(Boolean).join(" • ");
}

function clearOutputs() {
  el("warnings").textContent = "";
  el("preview").innerHTML = "<p>Henüz önizleme yok.</p>";
}

function courseId(programId, courseKey) {
  return `${programId}:${courseKey}`;
}

function buildCourseList() {
  const list = el("courseList");
  list.innerHTML = "";

  for (const program of getProgramsByMode()) {
    const header = document.createElement("div");
    header.className = "program-title";
    header.innerHTML = `<strong>${program.name}</strong><small>${program.totalHours ?? "-"} HDS • Kaynak sayfa ${program.sourcePage ?? "-"}</small>`;
    list.appendChild(header);

    for (const course of program.courses) {
      const id = courseId(program.id, course.key);
      const groups = [...new Set(course.sessions.map((s) => s.group))]
        .filter((group) => group !== 0)
        .sort((a, b) => a - b);
      const hasGroups = groups.length > 0;

      const item = document.createElement("div");
      item.className = "item";

      const left = document.createElement("div");
      const meta = [
        course.code,
        course.hds ? `${course.hds} HDS` : null,
        hasGroups ? "Grup seç" : "Tek seçenek",
      ].filter(Boolean).join(" • ");
      left.innerHTML = `<strong>${course.name}</strong><small>${meta}</small>`;

      const right = document.createElement("div");
      right.className = "item-right";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `chk_${id}`;
      checkbox.setAttribute("aria-label", `${course.name} dersini seç`);

      const select = document.createElement("select");
      select.id = `grp_${id}`;
      select.disabled = !hasGroups;
      select.setAttribute("aria-label", `${course.name} grup seçimi`);
      select.innerHTML = hasGroups
        ? groups.map((group) => `<option value="${group}">Grup ${group}</option>`).join("")
        : '<option value="0">Tek</option>';

      right.appendChild(checkbox);
      right.appendChild(select);
      item.appendChild(left);
      item.appendChild(right);
      list.appendChild(item);
    }
  }
}

function selectedSessions() {
  const out = [];

  for (const program of getProgramsByMode()) {
    for (const course of program.courses) {
      const id = courseId(program.id, course.key);
      const checkbox = document.getElementById(`chk_${id}`);
      if (!checkbox?.checked) continue;

      const select = document.getElementById(`grp_${id}`);
      const group = Number(select?.value ?? 0);
      const matchingSessions = course.sessions.filter((session) => session.group === group);
      const sessions = matchingSessions.length ? matchingSessions : course.sessions;

      for (const session of sessions) {
        out.push({
          program: program.name,
          programId: program.id,
          courseKey: course.key,
          course: session.group ? `${course.name} (${session.group})` : course.name,
          code: course.code || "",
          hds: course.hds || "",
          ...session,
        });
      }
    }
  }

  return out;
}

function getCourseDef(programId, courseKey) {
  const program = DATA.programs.find((p) => p.id === programId);
  return program?.courses.find((course) => course.key === courseKey);
}

function tryAutoResolve() {
  const changes = [];
  let sessions = selectedSessions();
  let conflicts = detectConflicts(sessions);

  for (let pass = 0; pass < 8 && conflicts.length; pass += 1) {
    let changedThisPass = false;

    for (const conflict of conflicts) {
      for (const item of [conflict.a, conflict.b]) {
        const courseDef = getCourseDef(item.programId, item.courseKey);
        if (!courseDef) continue;

        const groups = [...new Set(courseDef.sessions.map((s) => s.group))]
          .filter((group) => group !== 0)
          .sort((a, b) => a - b);
        if (groups.length < 2) continue;

        const select = document.getElementById(`grp_${item.programId}:${item.courseKey}`);
        if (!select || select.disabled) continue;

        const current = Number(select.value);
        const alternate = groups.find((group) => group !== current);
        if (!alternate) continue;

        select.value = String(alternate);
        const testSessions = selectedSessions();
        const testConflicts = detectConflicts(testSessions);

        if (testConflicts.length < conflicts.length) {
          changes.push(`Otomatik grup değişti: ${courseDef.name} → Grup ${alternate}`);
          sessions = testSessions;
          conflicts = testConflicts;
          changedThisPass = true;
          break;
        }

        select.value = String(current);
      }

      if (changedThisPass) break;
    }

    if (!changedThisPass) break;
  }

  sessions = selectedSessions();
  conflicts = detectConflicts(sessions);
  return { sessions, conflicts, changes };
}

function renderPreview(sessions) {
  const preview = el("preview");
  const rows = [];

  for (const day of DAYS_ORDER) {
    const dayItems = sessions
      .filter((session) => session.day === day)
      .sort((a, b) => (timeToMin(a.start) ?? 99999) - (timeToMin(b.start) ?? 99999));

    for (const session of dayItems) {
      rows.push([
        day,
        session.code || "-",
        session.course,
        session.hds || "-",
        `${session.start} - ${session.end}`,
        session.room || "-",
        session.teacher || "-",
        session.program,
      ]);
    }
  }

  if (!rows.length) {
    preview.innerHTML = "<p>Hiç ders seçilmedi.</p>";
    return;
  }

  let html = "<table><thead><tr><th>Gün</th><th>Kod</th><th>Ders</th><th>HDS</th><th>Saat</th><th>Sınıf</th><th>Hoca</th><th>Kaynak</th></tr></thead><tbody>";
  for (const row of rows) {
    html += `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td><td>${row[4]}</td><td>${row[5]}</td><td>${row[6]}</td><td>${row[7]}</td></tr>`;
  }
  html += "</tbody></table>";
  preview.innerHTML = html;
}

function notesForDay(day, sessions) {
  const items = sessions.filter((session) => session.day === day && session.start !== "Online");
  const totalMin = items.reduce(
    (sum, session) => sum + ((timeToMin(session.end) ?? 0) - (timeToMin(session.start) ?? 0)),
    0,
  );

  if (!items.length) return "Boş gün. Ödev/tekrar için kullan.";
  if (totalMin >= 6 * 60) return "Yoğun gün. Laptop + şarj + yemek planla.";
  if (items.length === 1) return "Hafif gün. Tek ders, tekrar için ideal.";
  return "Orta yoğunluk. Araları verimli kullan.";
}

function fitTextSize(font, text, maxWidth, preferred = 8.5, min = 5.5) {
  let size = preferred;
  while (size > min && font.widthOfTextAtSize(String(text), size) > maxWidth) {
    size -= 0.25;
  }
  return size;
}

function truncatePdfText(font, text, maxWidth, size) {
  const value = String(text ?? "");
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;

  const suffix = "…";
  let output = value;
  while (output.length && font.widthOfTextAtSize(`${output}${suffix}`, size) > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output.trimEnd()}${suffix}`;
}

function pdfSummary(sessions) {
  const courseMap = new Map();
  for (const session of sessions) {
    const key = `${session.programId}:${session.courseKey}`;
    if (!courseMap.has(key)) courseMap.set(key, Number(session.hds) || 0);
  }

  const activeDays = DAYS_ORDER.filter((day) => sessions.some((session) => session.day === day)).length;
  const timed = sessions
    .filter((session) => session.start !== "Online")
    .sort((a, b) => (timeToMin(a.start) ?? 99999) - (timeToMin(b.start) ?? 99999));

  return {
    courses: courseMap.size,
    hds: [...courseMap.values()].reduce((sum, value) => sum + value, 0),
    activeDays,
    first: timed[0]?.start || "-",
    last: timed.length ? timed.reduce((latest, item) => (
      (timeToMin(item.end) ?? 0) > (timeToMin(latest) ?? 0) ? item.end : latest
    ), timed[0].end) : "-",
  };
}

async function generatePdf(sessions) {
  const { PDFDocument, rgb } = PDFLib;

  const [regularBytes, boldBytes] = await Promise.all([
    fetch("assets/Roboto-Regular.ttf").then((response) => response.arrayBuffer()),
    fetch("assets/Roboto-Bold.ttf").then((response) => response.arrayBuffer()),
  ]);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const regular = await pdfDoc.embedFont(regularBytes, { subset: true });
  const bold = await pdfDoc.embedFont(boldBytes, { subset: true });

  pdfDoc.setTitle("Karatay Bilgisayar Programcılığı Haftalık Ders Programı");
  pdfDoc.setAuthor("Mahmoud Karzoun");
  pdfDoc.setSubject(`${DATA.term} ders programı`);
  pdfDoc.setCreator("Karatay Course Schedule Builder");

  const page = pdfDoc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const C = {
    ink: rgb(0.055, 0.075, 0.11),
    navy: rgb(0.035, 0.13, 0.23),
    blue: rgb(0.055, 0.29, 0.50),
    cyan: rgb(0.10, 0.56, 0.66),
    pale: rgb(0.94, 0.97, 0.985),
    paper: rgb(0.985, 0.99, 0.995),
    line: rgb(0.82, 0.86, 0.90),
    white: rgb(1, 1, 1),
    muted: rgb(0.39, 0.45, 0.52),
    soft: rgb(0.91, 0.94, 0.97),
  };

  const mode = getMode();
  const modeTitle = mode === "y1" ? "1. Sınıf" : mode === "y2" ? "2. Sınıf" : "1+2 Karışık";
  const student = el("studentName").value?.trim();
  const summary = pdfSummary(sessions);

  page.drawRectangle({ x: 0, y: 0, width, height, color: C.paper });

  page.drawRectangle({ x: 0, y: height - 104, width, height: 104, color: C.navy });
  page.drawRectangle({ x: 0, y: height - 108, width, height: 4, color: C.cyan });

  page.drawText("KARATAY COURSE SCHEDULE", {
    x: 34, y: height - 31, size: 8.5, font: bold, color: rgb(0.56, 0.80, 0.86),
  });
  page.drawText("Haftalık Ders Programı", {
    x: 34, y: height - 58, size: 23, font: bold, color: C.white,
  });
  page.drawText("Bilgisayar Programcılığı", {
    x: 34, y: height - 78, size: 11.5, font: regular, color: rgb(0.82, 0.90, 0.94),
  });

  const semesterLabel = `${DATA.term}`;
  const semesterW = Math.max(146, bold.widthOfTextAtSize(semesterLabel, 9.5) + 24);
  page.drawRectangle({
    x: width - 34 - semesterW, y: height - 57, width: semesterW, height: 28,
    color: C.blue, borderColor: rgb(0.16, 0.46, 0.66), borderWidth: 0.8,
  });
  page.drawText(semesterLabel, {
    x: width - 34 - semesterW + 12, y: height - 47.5, size: 9.5, font: bold, color: C.white,
  });
  page.drawText(`${DATA.school}  •  ${modeTitle}`, {
    x: width - 34 - Math.min(300, regular.widthOfTextAtSize(`${DATA.school}  •  ${modeTitle}`, 8.5)),
    y: height - 78, size: 8.5, font: regular, color: rgb(0.80, 0.88, 0.93),
  });

  const stripY = height - 142;
  page.drawRectangle({
    x: 34, y: stripY, width: width - 68, height: 26,
    color: C.white, borderColor: C.line, borderWidth: 0.7,
  });

  const identity = student ? `Öğrenci  ${student}` : "Kişisel haftalık program";
  page.drawText(truncatePdfText(bold, identity, 270, 8.8), {
    x: 45, y: stripY + 9, size: 8.8, font: bold, color: C.ink,
  });

  const sourceText = `Resmî çizelge ${DATA.source?.generatedAt || "-"}`;
  const sourceWidth = regular.widthOfTextAtSize(sourceText, 7.7);
  page.drawText(sourceText, {
    x: width - 45 - sourceWidth, y: stripY + 9.2, size: 7.7, font: regular, color: C.muted,
  });

  const statsY = height - 184;
  const statGap = 8;
  const statW = (width - 68 - statGap * 3) / 4;
  const statData = [
    ["SEÇİLİ DERS", String(summary.courses)],
    ["SINIF", modeTitle],
    ["AKTİF GÜN", `${summary.activeDays}/5`],
    ["GÜN ARALIĞI", `${summary.first} - ${summary.last}`],
  ];

  statData.forEach(([label, value], index) => {
    const x = 34 + index * (statW + statGap);
    page.drawRectangle({
      x, y: statsY, width: statW, height: 32,
      color: index === 0 ? C.pale : C.white,
      borderColor: C.line, borderWidth: 0.65,
    });
    page.drawText(label, { x: x + 10, y: statsY + 19, size: 6.7, font: bold, color: C.muted });
    page.drawText(truncatePdfText(bold, value, statW - 20, 10.5), {
      x: x + 10, y: statsY + 6.5, size: 10.5, font: bold, color: index === 0 ? C.blue : C.ink,
    });
  });

  const boardX = 34;
  const boardY = 54;
  const boardTop = statsY - 14;
  const boardH = boardTop - boardY;
  const dayGap = 7;
  const dayW = (width - 68 - dayGap * 4) / 5;
  const dayHeaderH = 30;

  const dayAccent = [
    rgb(0.055, 0.29, 0.50),
    rgb(0.11, 0.39, 0.57),
    rgb(0.10, 0.48, 0.59),
    rgb(0.10, 0.56, 0.66),
    rgb(0.17, 0.42, 0.50),
  ];

  DAYS_ORDER.forEach((day, dayIndex) => {
    const x = boardX + dayIndex * (dayW + dayGap);
    const items = sessions
      .filter((session) => session.day === day)
      .sort((a, b) => (timeToMin(a.start) ?? 99999) - (timeToMin(b.start) ?? 99999));

    page.drawRectangle({
      x, y: boardY, width: dayW, height: boardH,
      color: C.white, borderColor: C.line, borderWidth: 0.7,
    });
    page.drawRectangle({
      x, y: boardTop - dayHeaderH, width: dayW, height: dayHeaderH,
      color: dayAccent[dayIndex],
    });

    page.drawText(day.toLocaleUpperCase("tr-TR"), {
      x: x + 10, y: boardTop - 18.5, size: 9.7, font: bold, color: C.white,
    });
    page.drawText(`${items.length} ders`, {
      x: x + dayW - 10 - regular.widthOfTextAtSize(`${items.length} ders`, 6.8),
      y: boardTop - 18, size: 6.8, font: regular, color: rgb(0.83, 0.94, 0.96),
    });

    const contentTop = boardTop - dayHeaderH - 8;
    const contentBottom = boardY + 8;

    if (!items.length) {
      page.drawText("Ders yok", {
        x: x + 10, y: contentTop - 20, size: 8.5, font: bold, color: C.muted,
      });
      page.drawText("Boş gün", {
        x: x + 10, y: contentTop - 34, size: 7.2, font: regular, color: C.muted,
      });
      return;
    }

    const cardGap = 6;
    const available = contentTop - contentBottom;
    const cardH = Math.max(42, Math.min(64, (available - cardGap * (items.length - 1)) / items.length));
    let cardY = contentTop - cardH;

    items.forEach((session, itemIndex) => {
      const cardBg = itemIndex % 2 === 0 ? C.pale : rgb(0.97, 0.985, 0.995);

      page.drawRectangle({
        x: x + 7, y: cardY, width: dayW - 14, height: cardH,
        color: cardBg, borderColor: C.soft, borderWidth: 0.55,
      });
      page.drawRectangle({
        x: x + 7, y: cardY, width: 3.5, height: cardH,
        color: dayAccent[dayIndex],
      });

      const innerX = x + 16;
      const innerW = dayW - 28;
      const compact = cardH < 50;
      const titleSize = compact ? 7.2 : 7.8;
      const metaSize = compact ? 6.1 : 6.5;
      const codeSize = compact ? 5.8 : 6.1;

      const timeText = `${session.start} - ${session.end}`;
      page.drawText(timeText, {
        x: innerX, y: cardY + cardH - 13, size: metaSize, font: bold, color: C.blue,
      });

      const room = session.room || "-";
      const roomW = bold.widthOfTextAtSize(room, metaSize);
      page.drawText(room, {
        x: innerX + innerW - roomW, y: cardY + cardH - 13, size: metaSize, font: bold, color: C.muted,
      });

      const title = truncatePdfText(bold, session.course, innerW, titleSize);
      page.drawText(title, {
        x: innerX, y: cardY + cardH - (compact ? 27 : 29), size: titleSize, font: bold, color: C.ink,
      });

      if (cardH >= 50) {
        const teacher = truncatePdfText(regular, session.teacher || "-", innerW, metaSize);
        page.drawText(teacher, {
          x: innerX, y: cardY + 12.5, size: metaSize, font: regular, color: C.muted,
        });
      }

      const codeLabel = `${session.code || "-"}`;
      page.drawText(truncatePdfText(regular, codeLabel, innerW, codeSize), {
        x: innerX, y: cardY + (compact ? 8.5 : 24), size: codeSize, font: regular, color: C.muted,
      });

      cardY -= cardGap + cardH;
    });
  });

  page.drawLine({
    start: { x: 34, y: 38 },
    end: { x: width - 34, y: 38 },
    thickness: 0.6,
    color: C.line,
  });
  page.drawText("Kişisel planlayıcı çıktısı • Veriler resmî ders çizelgesinden alınmıştır.", {
    x: 34, y: 24, size: 6.8, font: regular, color: C.muted,
  });
  const footerRight = "karatay-ders-program • mkarson1997";
  page.drawText(footerRight, {
    x: width - 34 - regular.widthOfTextAtSize(footerRight, 6.8),
    y: 24, size: 6.8, font: regular, color: C.muted,
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "karatay_2026_2027_guz_ders_programi.pdf";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showWarnings(lines) {
  el("warnings").textContent = lines.length ? lines.join("\n") : "";
}

function wireMode() {
  document.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.onchange = () => {
      buildCourseList();
      clearOutputs();
    };
  });
}

async function init() {
  try {
    await loadData();
    renderDatasetMeta();
    wireMode();
    buildCourseList();
    clearOutputs();
  } catch (error) {
    console.error(error);
    el("datasetMeta").textContent = "Ders verisi yüklenemedi.";
    showWarnings(["❌ Ders verisi yüklenemedi.", error?.message || String(error)]);
    return;
  }

  el("btnPreview").onclick = () => {
    const { sessions, conflicts, changes } = tryAutoResolve();
    const messages = [];

    if (changes.length) {
      messages.push("✅ Otomatik düzeltme:");
      changes.forEach((change) => messages.push(` - ${change}`));
    }

    if (conflicts.length) {
      messages.push("⚠️ Çakışma var (hala):");
      conflicts.forEach((conflict) => {
        messages.push(` - ${conflict.day}: "${conflict.a.course}" ↔ "${conflict.b.course}"`);
      });
      messages.push("Çözüm: İlgili dersin grubunu manuel değiştir veya dersi kaldır.");
    }

    showWarnings(messages);
    renderPreview(sessions);
  };

  el("btnPdf").onclick = async () => {
    try {
      const { sessions, conflicts, changes } = tryAutoResolve();
      const messages = [];

      if (changes.length) {
        messages.push("✅ Otomatik düzeltme:");
        changes.forEach((change) => messages.push(` - ${change}`));
      }

      if (conflicts.length) {
        messages.push("⚠️ Çakışma var: PDF üretilmedi.");
        conflicts.forEach((conflict) => {
          messages.push(` - ${conflict.day}: "${conflict.a.course}" ↔ "${conflict.b.course}"`);
        });
        showWarnings(messages);
        renderPreview(sessions);
        return;
      }

      showWarnings(messages);
      await generatePdf(sessions);
    } catch (error) {
      console.error(error);
      showWarnings([
        "❌ PDF indirilemedi.",
        "Chrome/Edge kullan ve popup engelini kapat.",
        `Hata: ${error?.message || String(error)}`,
      ]);
    }
  };
}

init();
