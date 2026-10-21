// Measurement prelude: starts the clock and counts native ui.* mutation ops.
(function () {
  var g = globalThis;
  var now = g.performance && g.performance.now ? function () { return g.performance.now(); } : function () { return Date.now(); };
  g.__measure = { now: now, t0: now(), ops: 0, lines: [] };
  var ui = g.ui;
  if (!ui) return;
  Object.keys(ui).forEach(function (k) {
    var f = ui[k];
    if (typeof f === "function" && /^(createNode|destroyNode|insertBefore|removeChild|setStyle|setProp|setPropBatch|setText|replaceText|setFocus|setActive|loadStyles)$/.test(k)) {
      try { ui[k] = function () { g.__measure.ops++; return f.apply(this, arguments); }; } catch (e) {}
    }
  });
})();
