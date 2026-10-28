import { ago, STATUS_LABEL, type Row, type TeamLine } from './logic';

// How the boards look: a dark screen, a header in the team's color, a row for each worker with a dot for its
// state, what it's on, what it's doing and how long, who it reports to.

const DOT: Record<string, string> = { working: '#38d68a', needs_input: '#ffb547', done: '#5ab0ff', idle: '#8a94a6', starting: '#8a94a6', offline: '#d65a5a', exited: '#d65a5a', absent: '#4a5260' };
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

type G = CanvasRenderingContext2D;

function clipText(g: G, text: string, width: number): string {
  if (g.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 1 && g.measureText(t + '…').width > width) t = t.slice(0, -1);
  return t + '…';
}

function frame(g: G, w: number, h: number, title: string, color: string, right = '') {
  g.fillStyle = '#10161e';
  g.fillRect(0, 0, w, h);
  g.fillStyle = color;
  g.fillRect(0, 0, w, 78);
  g.fillStyle = '#0b0f14';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.font = `700 44px ${FONT}`;
  g.fillText(title, 28, 40);
  if (right) {
    g.textAlign = 'right';
    g.font = `600 30px ${FONT}`;
    g.fillText(right, w - 28, 40);
  }
  g.textAlign = 'left';
}

export function drawTeam(g: G, w: number, h: number, name: string, color: string, rows: Row[]) {
  const live = rows.filter((r) => r.status === 'working').length;
  frame(g, w, h, `${name}`, color, `${live} çalışıyor · ${rows.filter((r) => r.status === 'needs_input' || r.status === 'done').length} bekliyor`);
  const rh = Math.min(170, (h - 96) / Math.max(1, rows.length));
  rows.forEach((r, i) => {
    const y = 92 + i * rh;
    g.fillStyle = i % 2 ? '#141b24' : '#17202b';
    g.fillRect(12, y, w - 24, rh - 8);
    g.fillStyle = DOT[r.status];
    g.beginPath();
    g.arc(46, y + 34, 14, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f2f5f8';
    g.font = `700 36px ${FONT}`;
    g.fillText(r.who, 76, y + 34);
    g.font = `600 28px ${FONT}`;
    g.fillStyle = DOT[r.status];
    g.textAlign = 'right';
    g.fillText(r.since === null ? r.label : `${r.label} · ${ago(r.since)}`, w - 30, y + 34);
    g.textAlign = 'left';
    g.fillStyle = '#dfe6ee';
    g.font = `500 29px ${FONT}`;
    g.fillText(clipText(g, `Görev: ${r.task}`, w - 90), 76, y + 74);
    g.fillStyle = '#8fa3b8';
    g.font = `400 25px ${FONT}`;
    const tail = [r.doing && r.status !== 'absent' ? r.doing : '', `→ ${r.reportsTo}`, r.helpers ? `${r.helpers} yardımcı` : '', r.pr ? `PR #${r.pr}` : ''].filter(Boolean).join('  ·  ');
    g.fillText(clipText(g, tail, w - 90), 76, y + 108 + (rh > 150 ? 6 : 0));
  });
}

export function drawLead(g: G, w: number, h: number, lines: TeamLine[], lead: Row | null) {
  frame(g, w, h, 'Tüm ekipler', '#e8b931', lead ? `Aslan: ${STATUS_LABEL[lead.status as keyof typeof STATUS_LABEL] ?? ''}` : '');
  const rh = (h - 96) / Math.max(1, lines.length);
  lines.forEach((l, i) => {
    const y = 90 + i * rh;
    g.fillStyle = i % 2 ? '#141b24' : '#17202b';
    g.fillRect(12, y, w - 24, rh - 6);
    g.fillStyle = l.color;
    g.fillRect(12, y, 12, rh - 6);
    g.fillStyle = '#f2f5f8';
    g.font = `700 ${Math.min(34, rh * 0.5)}px ${FONT}`;
    g.fillText(l.name, 44, y + rh / 2 - 3);
    g.font = `500 ${Math.min(28, rh * 0.42)}px ${FONT}`;
    g.fillStyle = '#8fa3b8';
    g.textAlign = 'right';
    const wait = l.longestWait === null ? '' : `  ·  en uzun bekleyen ${ago(l.longestWait)}`;
    g.fillText(`${l.hired}/${l.roles} işte · ${l.working} çalışıyor · ${l.waiting} bekliyor${wait}`, w - 28, y + rh / 2 - 3);
    g.textAlign = 'left';
  });
}

export function drawWaiting(g: G, w: number, h: number, list: { who: string; status: string; since: number; task: string }[]) {
  frame(g, w, h, 'Seni bekleyenler', '#5ab0ff', `${list.length} ajan`);
  if (!list.length) {
    g.fillStyle = '#8fa3b8';
    g.font = `500 34px ${FONT}`;
    g.textAlign = 'center';
    g.fillText('Şu an seni bekleyen yok.', w / 2, h / 2 + 30);
    g.textAlign = 'left';
    return;
  }
  const rh = Math.min(90, (h - 96) / list.length);
  list.slice(0, 8).forEach((r, i) => {
    const y = 92 + i * rh;
    g.fillStyle = i % 2 ? '#141b24' : '#17202b';
    g.fillRect(12, y, w - 24, rh - 6);
    g.fillStyle = DOT[r.status];
    g.beginPath();
    g.arc(42, y + rh / 2 - 3, 12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f2f5f8';
    g.font = `700 ${Math.min(32, rh * 0.45)}px ${FONT}`;
    g.fillText(r.who, 66, y + rh / 2 - 3);
    g.font = `500 ${Math.min(26, rh * 0.36)}px ${FONT}`;
    g.fillStyle = '#8fa3b8';
    g.textAlign = 'right';
    g.fillText(`${ago(r.since)} · ${clipText(g, r.task, w * 0.45)}`, w - 28, y + rh / 2 - 3);
    g.textAlign = 'left';
  });
}

export function drawEveryone(g: G, w: number, h: number, rows: Row[]) {
  frame(g, w, h, 'Canlı akış: herkes', '#e8e1d2', `${rows.length} ajan`);
  if (!rows.length) {
    g.fillStyle = '#8fa3b8';
    g.font = `500 34px ${FONT}`;
    g.textAlign = 'center';
    g.fillText('Henüz kimse işe alınmadı.', w / 2, h / 2 + 30);
    g.textAlign = 'left';
    return;
  }
  const shown = rows.slice(0, 7);
  const rh = Math.min(110, (h - 96) / shown.length);
  shown.forEach((r, i) => {
    const y = 90 + i * rh;
    g.fillStyle = i % 2 ? '#141b24' : '#17202b';
    g.fillRect(12, y, w - 24, rh - 6);
    g.fillStyle = DOT[r.status];
    g.beginPath();
    g.arc(40, y + rh / 2 - 3, 12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f2f5f8';
    g.font = `700 ${Math.min(32, rh * 0.36)}px ${FONT}`;
    g.fillText(r.who, 64, y + rh * 0.3);
    g.font = `500 ${Math.min(26, rh * 0.3)}px ${FONT}`;
    g.fillStyle = DOT[r.status];
    g.textAlign = 'right';
    g.fillText(`${r.label}${r.since === null ? '' : ` · ${ago(r.since)}`}`, w - 28, y + rh * 0.3);
    g.textAlign = 'left';
    g.fillStyle = '#c9d3de';
    g.font = `400 ${Math.min(26, rh * 0.28)}px ${FONT}`;
    g.fillText(clipText(g, `${r.task}${r.doing ? '  ·  ' + r.doing : ''}${r.reportsTo ? '  →  ' + r.reportsTo : ''}`, w - 90), 64, y + rh * 0.68);
  });
}
