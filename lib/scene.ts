const SW = 60;
const SH = 15;

export interface SceneResult {
  html: string;
  cap: string;
  q: number;
}

export function sceneFrame(t: number): SceneResult {
  const g: string[][] = [];
  const c: string[][] = [];
  for (let y = 0; y < SH; y++) {
    g.push(Array(SW).fill(' '));
    c.push(Array(SW).fill('d'));
  }

  const put = (y: number, x: number, str: string, cl: string) => {
    for (let i = 0; i < str.length; i++) {
      const xx = x + i;
      if (y >= 0 && y < SH && xx >= 0 && xx < SW && str[i] !== ' ') {
        g[y][xx] = str[i];
        c[y][xx] = cl;
      }
    }
  };

  const tt = t % 13;
  const run = tt < 11;
  const s = run ? Math.min(4, Math.floor(tt / 2.2)) : 4;
  const f = run ? (tt % 2.2) / 2.2 : 1;
  const ease = (x: number) => x * x * (3 - 2 * x);
  const mv = f < 0.36 ? ease(f / 0.36) : 1;
  const cen = (i: number) => i * 12 + 5;
  const from = s === 0 ? -6 : cen(s - 1);
  const cx = from + (cen(s) - from) * mv;
  const k = s < 4 ? s + (f > (s === 2 ? 0.72 : 0.55) ? 1 : 0) : 4 + (f > 0.7 ? 1 : 0);
  const bl = (t % 3.2) < 0.15;
  const pr = s === 4 && run && f > 0.5 && f <= 0.7;
  const ct = run && s === 2 && f > 0.5 && f <= 0.72;

  const names = ['READ', 'WRITE', 'CHECK', 'SCORE', 'YOU'];
  const who = ['AI', 'AI', 'tool', 'AI', 'YOU'];
  const faces = [
    [bl ? '[-_-]' : '[o_o]', '[*_*]'],
    [bl ? '[-_-]' : '[o_o]', '[*_*]'],
    ['[=_=]', '[#:#]'],
    [bl ? '[-_-]' : '[o_o]', '[*_*]'],
    ['(^_^)', '(^o^)'],
  ];

  for (let i = 0; i < 5; i++) {
    const x = i * 12;
    const on = run && s === i && f > 0.36;
    const b = on ? '=' : '-';
    const cl = on ? (ct && i === 2 ? 'x' : 'l') : 'd';
    const fc = ct && i === 2 ? '[!_!]' : faces[i][on ? 1 : 0];
    const nm = names[i].padStart(Math.floor((8 + names[i].length) / 2)).padEnd(8);
    put(0, x, '.' + b.repeat(8) + '.', cl);
    put(1, x, '|', cl);
    put(1, x + 1, ' ' + fc + '  ', on ? (ct && i === 2 ? 'x' : 'l') : 'a');
    put(1, x + 9, '|', cl);
    put(2, x, '|', cl);
    put(2, x + 1, nm, 'w');
    put(2, x + 9, '|', cl);
    put(3, x, "'" + b.repeat(3) + '||' + b.repeat(3) + "'", cl);
    put(4, x + 4, '||', 'd');
    put(11, x + 4, '/\\', 'd');
    put(12, x + 5 - Math.floor(who[i].length / 2), who[i], i === 4 ? 'l' : 'a');
  }

  const x0 = Math.round(cx) - 3;
  let body = [
    ['~~~~', '~~~~'],
    ['[x] ', '[x] '],
    ['====', '===='],
    ['==v=', '==v='],
    ['78  ', '/100'],
    ['APPR', 'OVED'],
  ][k];
  if (ct) body = ['=!==', '=!=='];
  put(6, x0, '.----.', 'w');
  put(7, x0, '|', 'w');
  put(7, x0 + 1, body[0], ct ? 'x' : k === 5 ? 'l' : 'a');
  put(7, x0 + 5, '|', 'w');
  put(8, x0, '|', 'w');
  put(8, x0 + 1, body[1], ct ? 'x' : k === 5 ? 'l' : 'a');
  put(8, x0 + 5, '|', 'w');
  put(9, x0, "'----'", 'w');

  const fl = Math.floor(t * 12);
  if (run && f > 0.36 && s < 4) {
    for (let j = 0; j < 6; j++) {
      put(5, x0 + j, (ct ? [' ', '!', '.'] : [' ', ':', '.'])[(j * 7 + fl) % 3], ct ? 'x' : 'l');
    }
  }
  if (pr) {
    put(5, x0, '[####]', 'l');
    put(5, x0 - 1, '\\', 'l');
    put(5, x0 + 6, '/', 'l');
  }
  if (s === 4 && k === 5) {
    put(5, x0 - 1, fl % 2 ? '*' : '+', 'l');
    put(5, x0 + 6, fl % 2 ? '+' : '*', 'l');
  }

  const off = Math.round(cx);
  for (let x = 0; x < SW; x++) {
    put(10, x, ((x - off) % 6 + 6) % 6 === 0 ? 'o' : '=', 'd');
  }

  const n = Math.round((k / 5) * 20);
  put(13, 11, 'progress [', 'd');
  put(13, 21, '#'.repeat(n), 'l');
  put(13, 21 + n, '.'.repeat(20 - n), 'd');
  put(13, 41, '] ' + k + ' of 5', 'd');

  let cap: string;
  if (!run) {
    cap = 'Approved. The room saves who decided what.';
  } else if (f < 0.36) {
    cap = s === 0 ? 'A new document arrives.' : 'Moving to the next step…';
  } else {
    cap = [
      'Analyst agent reads the rules and makes a checklist.',
      'Drafter agent writes the answers and adds sources.',
      f < 0.5
        ? 'The automatic checker looks for missing sources and files.'
        : f < 0.72
          ? 'Problem found: one claim has no source. It goes back to the drafter.'
          : 'Fixed. The checker passes it.',
      'Reviewer agent scores the draft out of 100.',
      f < 0.7 ? 'You check it and press the stamp.' : 'Approved. The room saves who decided what.',
    ][s];
  }

  const esc = (ch: string) =>
    ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch;

  const html = g
    .map((row, y) => {
      let o = '';
      let cur = '';
      let buf = '';
      for (let x = 0; x < SW; x++) {
        if (c[y][x] !== cur && buf) {
          o += `<span class="${cur}">${buf}</span>`;
          buf = '';
        }
        cur = c[y][x];
        buf += esc(row[x]);
      }
      return o + `<span class="${cur}">${buf}</span>`;
    })
    .join('\n');

  return { html, cap, q: run ? s + f : 5 };
}
