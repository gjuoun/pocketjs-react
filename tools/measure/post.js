// Measurement postlude: first render = parse + eval + mount + first frame (the bundle is
// evaluated inside the timed window), then guest frame time and native ops per pressed edge.
(function () {
  var g = globalThis, M = g.__measure, now = M.now;
  var mountMs = now() - M.t0, mountOps = M.ops;
  var NAMES = { 8: "start", 16: "up", 32: "right", 64: "down", 128: "left", 256: "ltrigger", 512: "rtrigger", 8192: "circle", 16384: "cross" };
  var frame = g.frame, n = 0, prev = 0, circles = [];
  function out(s) { M.lines.push("MEASURE " + s); console.log("MEASURE " + s); }
  g.frame = function (b) {
    var s = now(), o = M.ops;
    var r = frame.apply(this, arguments);
    var d = now() - s;
    n++;
    if (n === 1) out("first-render total_ms=" + (mountMs + d).toFixed(2) + " mountOps=" + mountOps);
    var edge = b & ~prev;
    prev = b;
    if (edge && NAMES[edge]) {
      out("press " + NAMES[edge] + " frame_ms=" + d.toFixed(2) + " ops=" + (M.ops - o));
      if (NAMES[edge] === "circle") {
        circles.push(d);
        if (circles.length === 5) {
          var sorted = circles.slice().sort(function (a, b) { return a - b; });
          out("summary circlePresses=5 median_ms=" + sorted[2].toFixed(2) + " max_ms=" + sorted[4].toFixed(2));
        }
      }
    }
    return r;
  };
})();
