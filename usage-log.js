(() => {
  const FORM_ENDPOINT = "https://docs.google.com/forms/d/e/1FAIpQLSczOEqI2XQU5HnlF4AOeH9ZcMyzlJ3NugWpuG0Pr5A8FXRVDQ/formResponse";
  const NAME_ENTRY = "entry.1401981382";
  const MODE_ENTRY = "entry.1538779879";

  function modeLabel() {
    const mode = document.querySelector('input[name="mode"]:checked')?.value;
    if (mode === "y1") return "1. Sınıf";
    if (mode === "y2") return "2. Sınıf";
    if (mode === "mix") return "1+2 (Karışık)";
    return "Bilinmiyor";
  }

  function submitUsage(name, mode) {
    const payload = new URLSearchParams({
      [NAME_ENTRY]: name || "İsim girilmedi",
      [MODE_ENTRY]: mode,
    }).toString();

    const body = new Blob([payload], {
      type: "application/x-www-form-urlencoded;charset=UTF-8",
    });

    try {
      if (navigator.sendBeacon?.(FORM_ENDPOINT, body)) return;
    } catch (error) {
      console.debug("Usage beacon unavailable:", error);
    }

    fetch(FORM_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: payload,
    }).catch((error) => console.debug("Usage log failed:", error));
  }

  function addConsentControl(nameInput) {
    const existing = document.getElementById("usageConsent");
    if (existing) return existing;

    const label = document.createElement("label");
    label.className = "usage-consent";
    label.innerHTML = `
      <input id="usageConsent" type="checkbox" />
      <span>
        <strong>Kullanım istatistiğine katkı sağla</strong>
        <small>Seçersen adın ve sınıf seçimin Google Form üzerinden kullanım tablosuna eklenir. Ders seçimlerin gönderilmez.</small>
      </span>
    `;

    nameInput.closest(".name-field-wrap")?.insertAdjacentElement("afterend", label);
    return label.querySelector("input");
  }

  function wire() {
    const button = document.getElementById("btnPdf");
    const nameInput = document.getElementById("studentName");
    const warnings = document.getElementById("warnings");
    if (!button || !nameInput || typeof button.onclick !== "function") {
      setTimeout(wire, 100);
      return;
    }

    const consent = addConsentControl(nameInput);
    const originalHandler = button.onclick;

    button.onclick = async function wrappedPdfHandler(event) {
      const shouldLog = Boolean(consent?.checked);
      const name = nameInput.value?.trim() || "İsim girilmedi";
      const mode = modeLabel();

      await originalHandler.call(this, event);

      if (!shouldLog) return;
      const status = warnings?.textContent || "";
      if (/PDF üretilmedi|PDF indirilemedi/i.test(status)) return;

      submitUsage(name, mode);
    };
  }

  window.addEventListener("load", () => setTimeout(wire, 0), { once: true });
})();
