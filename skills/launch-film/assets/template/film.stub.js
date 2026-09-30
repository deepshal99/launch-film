'use strict';
/*
  <FILM TITLE> — <duration> s, <w>x<h> @ <fps> fps (f0–f<last>). <bpm> BPM, beat k at f = <beat0> + <framesPerBeat>·k.
  Written from brief.md. One shot() per section of <structure>. Keep frame numbers identical to the brief.
*/
const CFG = {
  // every piece of on-screen copy and brand input lives here so edits never touch motion code
};
const C = {
  // palette roles from the brief
};

Film({ w: 1080, h: 1920, fps: 60, frames: 900, bpm: 124, beat0: 0, bg: '#FFFFFF' }, () => {
  // ════════ S1 f0–… · <what happens> ════════
  shot(0, 89, (root, F0) => {
    div(root, { ...full(), background: '#FFFFFF' });
    return lf => {
      const f = lf + F0;
    };
  });
});
