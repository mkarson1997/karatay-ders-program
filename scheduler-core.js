(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.ScheduleCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function timeToMin(t) {
    if (!t || t === "Online") return null;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  function overlap(a, b) {
    const aS = timeToMin(a.start);
    const aE = timeToMin(a.end);
    const bS = timeToMin(b.start);
    const bE = timeToMin(b.end);
    if (aS === null || bS === null) return false;
    return Math.max(aS, bS) < Math.min(aE, bE);
  }

  function detectConflicts(sessions) {
    const byDay = {};
    sessions.forEach((session) => {
      byDay[session.day] ??= [];
      byDay[session.day].push(session);
    });

    const conflicts = [];
    for (const day of Object.keys(byDay)) {
      const items = byDay[day].filter((session) => session.start !== "Online");
      for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
          if (overlap(items[i], items[j])) {
            conflicts.push({ day, a: items[i], b: items[j] });
          }
        }
      }
    }
    return conflicts;
  }

  return { timeToMin, overlap, detectConflicts };
});
