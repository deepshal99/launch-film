'use strict';
/*
  DEMO — a 4 s square sting that exercises the engine (replace this file with the real film).
  Frame grid 60 fps, f0–f239. 128 BPM, beat 0 at f6 → one beat = 28.125 frames.
  S1 f0–119: brand tile pops out of a dot ripple, then stretches into a pill → whip.
  S2 f120–239: headline lands word by word, a 3D card tumbles through, end on the wordmark.
*/
const CFG = { brand: 'Nova', line: 'Ship it today', accent: '#2F6BFF', accent2: '#3CC8F0', ink: '#111318', page: '#FBFBF9' };

Film({ w: 1080, h: 1080, fps: 60, frames: 240, bpm: 128, beat0: 6, bg: CFG.page }, () => {
  // ════════ S1 f0–119 · tile + ripple + pill ════════
  shot(0, 119, (root, F0) => {
    div(root, { ...full(), background: CFG.page });
    const glow = Glow(root, CFG.accent, CFG.accent2, 0.6);
    const dots = Dots(root);
    const cam = div(root, { ...full(), transformOrigin: '540px 500px' }); const camB = DB();
    const tile = div(cam, { left: '0px', top: '0px', width: '180px', height: '180px', borderRadius: '30%', background: `linear-gradient(155deg, ${CFG.accent2}, ${CFG.accent})`, boxShadow: '0 24px 60px rgba(47,107,255,.3), inset 0 2px 0 rgba(255,255,255,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '84px', fontWeight: 700, letterSpacing: '-0.04em', overflow: 'hidden', whiteSpace: 'nowrap' }, CFG.brand[0]);
    const W = L([[0, 180], [70, 180], [80, 250], [88, 400], [94, 452], [100, 430], [106, 440], [119, 440]]);
    const H = L([[0, 180], [70, 180], [80, 160], [88, 124], [94, 112], [100, 122], [106, 120], [119, 120]]);
    return lf => {
      const f = lf + F0;
      glow(f);
      dots([ring(f, 10, 90, 100, 900, CFG.ink, 0.22, 540, 500)]);
      const pop = spring(f - 2, 0.3, 0.45);
      const w = W(f), h = H(f);
      Object.assign(tile.style, { width: px(w), height: px(h), borderRadius: px(Math.min(h / 2, lerp(w * 0.3, h / 2, E.o3(inv(70, 90, f))))) });
      tile.textContent = f < 84 ? CFG.brand[0] : CFG.brand;
      place(tile, 540, 500, clamp(pop, 0, 1.2) * (1 + 0.02 * Math.sin(f / 9)));
      setF(tile, CB(8 * clamp(1 - pop)));
      const out = E.i3(inv(104, 119, f));
      T(cam, `translateX(${(-900 * out).toFixed(2)}px)`);
      setF(cam, camB(40 * out, 0));
    };
  });

  // ════════ S2 f120–239 · headline + 3D card + wordmark ════════
  shot(120, 239, (root, F0) => {
    div(root, { ...full(), background: CFG.page });
    const glow = Glow(root, CFG.accent, CFG.accent2, 0.6);
    const all = div(root, { ...full(), transformOrigin: '540px 500px' }); const allB = DB();
    const words = Words(all, CFG.line, { fontSize: '120px', fontWeight: 700, color: CFG.ink, letterSpacing: '-0.04em' }, 540, 480);
    const face = `<div style="width:260px;height:340px;border-radius:32px;background:linear-gradient(160deg,${CFG.accent2},${CFG.accent});box-shadow:inset 0 2px 0 rgba(255,255,255,.4)"></div>`;
    const card = Slab(all, 260, 340, face, `<div style="width:260px;height:340px;border-radius:32px;background:linear-gradient(160deg,#DCE7FF,#B9CCF7)"></div>`, 10, '#9FB6EA', 32);
    const cx = f => lerp(1500, -420, inv(150, 200, f));
    return lf => {
      const f = lf + F0;
      glow(f);
      [beat(5), beat(5.5), beat(6)].forEach((b, i) => words.show(i, b - 4, f));
      const x = cx(f), v = Math.abs(vel(cx, f));
      card(x, 560 - 180 * Math.sin(Math.PI * inv(150, 200, f)), 1.6, 20, (f - 150) * 7, -20 + (f - 150) * 1.5, 6, v * 0.25, 0, f < 150 || f > 200 ? 0 : 1);
      T(all, `translateX(${(260 * (1 - EX(12, 0.19)(inv(120, 132, f)))).toFixed(2)}px) scale(${(1 + 0.0004 * (f - 120)).toFixed(5)})`);
      setF(all, allB(kf(f, [[120, 36], [130, 0, E.o3]]), 0), CB(kf(f, [[226, 0], [239, 10, E.i2]])));
    };
  });
});
