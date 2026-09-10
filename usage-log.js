(() => {
  const FORM_ENDPOINT = "https://docs.google.com/forms/d/e/1FAIpQLSczOEqI2XQU5HnlF4AOeH9ZcMyzlJ3NugWpuG0Pr5A8FXRVDQ/formResponse";
  const NAME_ENTRY = "entry.1401981382";
  const MODE_ENTRY = "entry.1538779879";
  const ANONYMOUS_LABEL = "Anonim kullanım";

  function modeLabel() {
    const mode = document.querySelector('input[name="mode"]:checked')?.value;
    if (mode === "y1") return "1. Sınıf";
    if (mode === "y2") return "2. Sınıf";
    if (mode === "mix") return "1+2 (Karışık)";
    return "Bilinmiyor";
  }

  function submitUsage(mode) {
    const payload = new URLSearchParams({
      [NAME_ENTRY]: ANONYMOUS_LABEL,
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

  function normalizeUiCopy() {
    document.getElementById("usageConsent")?.closest(".usage-consent")?.remove();

    const nameInput = document.getElementById("studentName");
    const helper = nameInput
      ?.closest(".control-panel")
      ?.querySelector(".control-head small");

    if (helper) {
      helper.textContent = "İsteğe bağlı. Yalnızca oluşturduğun PDF üzerinde görünür.";
    }
  }

  function wire() {
    const button = document.getElementById("btnPdf");
    const warnings = document.getElementById("warnings");

    normalizeUiCopy();

    if (!button || typeof button.onclick !== "function") {
      setTimeout(wire, 100);
      return;
    }

    const originalHandler = button.onclick;

    button.onclick = async function wrappedPdfHandler(event) {
      const mode = modeLabel();

      await originalHandler.call(this, event);

      const status = warnings?.textContent || "";
      if (/PDF üretilmedi|PDF indirilemedi/i.test(status)) return;

      submitUsage(mode);
    };
  }

  window.addEventListener("load", () => setTimeout(wire, 0), { once: true });
})();
