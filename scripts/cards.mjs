// Draws the README's static sections — experience, certifications, projects,
// the special mention and the toolbox — as cards in the same style as the
// stats sections. Edit the lists below and run: node scripts/cards.mjs
// (reads assets/src, writes assets/*.svg).
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'assets/src'; const OUT = 'assets';
const THEMES = {
  light: { bg: '#ffffff', text: '#1f2328', muted: '#656d76', border: '#d0d7de', track: '#eaeef2', accent: '#0969da', pill: '#f6f8fa', tile: '#ffffff' },
  dark: { bg: '#0d1117', text: '#e6edf3', muted: '#8d96a0', border: '#30363d', track: '#21262d', accent: '#4493f8', pill: '#161b22', tile: '#ffffff' },
};
const FONT = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
const mime = (f) => (f.endsWith('.svg') ? 'image/svg+xml' : f.endsWith('.jpg') ? 'image/jpeg' : 'image/png');
const data = (f) => `data:${mime(f)};base64,${readFileSync(`${SRC}/${f}`).toString('base64')}`;
const svg = (w, h, t, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}">
  <title>${esc(title)}</title>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" fill="${t.bg}" stroke="${t.border}"/>
${body}
</svg>
`;
// Word wrap by an average glyph width — good enough for one font at one size.
const wrap = (text, size, width) => {
  const per = Math.floor(width / (size * 0.53)); const out = []; let line = '';
  for (const w of text.split(' ')) { if ((line + ' ' + w).trim().length > per) { out.push(line.trim()); line = w; } else line += ` ${w}`; }
  if (line.trim()) out.push(line.trim()); return out;
};
const lines = (x, y, arr, size, fill, lh = size * 1.45, extra = '') =>
  arr.map((l, i) => `<text x="${x}" y="${y + i * lh}" font-size="${size}" fill="${fill}" ${extra}>${esc(l)}</text>`).join('\n  ');
// An image cropped to a rounded box.
let clipId = 0;
const picture = (file, x, y, w, h, r = 8) => {
  const id = `c${clipId++}`;
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>
  <image href="${data(file)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMin slice" clip-path="url(#${id})"/>`;
};
const logo = (file, x, y, s, t) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="8" fill="${t.tile}" stroke="${t.border}"/>
  <image href="${data(file)}" x="${x + 5}" y="${y + 5}" width="${s - 10}" height="${s - 10}" preserveAspectRatio="xMidYMid meet"/>`;
const pills = (x, y, tags, t) => {
  let cx = x; return tags.map((tag) => {
    const w = tag.length * 6.4 + 18; const s = `<rect x="${cx}" y="${y - 14}" width="${w}" height="22" rx="11" fill="${t.pill}" stroke="${t.border}"/>
  <text x="${cx + w / 2}" y="${y + 1}" text-anchor="middle" font-size="11.5" fill="${t.muted}">${esc(tag)}</text>`; cx += w + 8; return s;
  }).join('\n  ');
};
const label = (x, y, text, t) => `<text x="${x}" y="${y}" font-size="12" font-weight="600" letter-spacing="1.2" fill="${t.muted}">${text.toUpperCase()}</text>`;

const EXPERIENCE = [
  ['coindcx.png', 'Software Engineer', 'CoinDCX', 'Full-time · Hybrid', 'Jul 2026 – Present', 'Bengaluru'],
  ['eightfold.png', 'Engineering Intern', 'Eightfold AI', 'Internship · Hybrid', 'Jan – Jul 2026 · 7 mos', 'Noida'],
  ['machaxi.png', 'Backend Developer Intern', 'Machaxi', 'Internship · On-site', 'Sep – Dec 2025 · 4 mos', 'Bengaluru'],
  ['iitjobs.png', 'Summer Intern', 'iitjobs, Inc.', 'Internship · Hybrid', 'May – Jul 2024 · 3 mos', 'Nagpur'],
];
const CERTS = [
  ['mongodb', 'mongodb.png', 'MongoDB Associate', 'Data Modeler', 'MongoDB · Jul 2025'],
  ['agentforce', 'salesforce.svg', 'Agentforce', 'Specialist', 'Salesforce · Jan 2025'],
  ['ai-associate', 'salesforce.svg', 'AI Associate', '', 'Salesforce · Jan 2025'],
];
const PROJECTS = [
  ['agent-cli', 'agent-cli.svg', 'Agent CLI', 'A Claude Code-style coding agent for the terminal with no API key. It drives a Gemini tab in your own Chrome, then reads, searches, edits as diffs you approve and runs commands.', ['Node.js', 'React/Ink', 'Chrome MV3', 'VS Code']],
  ['interview-mate', 'interview-mate.jpg', 'Agentic Interview Mate', 'An AI interviewer that runs mock interviews by voice or chat, scores each answer as you speak, flags answers that look read out or AI-written, and remembers you between sessions.', ['TypeScript', 'Workers', 'Durable Objects', 'Workers AI']],
];
const ICONS = ['ts', 'js', 'nodejs', 'react', 'go', 'java', 'spring', 'py', 'cpp', 'postgres', 'mysql', 'mongodb', 'docker', 'cloudflare', 'git'];

for (const [name, t] of Object.entries(THEMES).filter(([n]) => n === 'dark')) {
  clipId = 0;
  // Experience: one card, a row per role, dates on the right.
  const rowH = 62; const eh = 58 + EXPERIENCE.length * rowH;
  const rows = EXPERIENCE.map(([img, title, co, kind, when, where], i) => {
    const y = 50 + i * rowH;
    return `${i ? `<line x1="28" y1="${y - 6}" x2="972" y2="${y - 6}" stroke="${t.track}"/>` : ''}
  ${logo(img, 28, y + 4, 42, t)}
  <text x="86" y="${y + 22}" font-size="15" font-weight="600" fill="${t.text}">${esc(title)} <tspan font-weight="400" fill="${t.muted}">· ${esc(co)}</tspan></text>
  <text x="86" y="${y + 42}" font-size="12.5" fill="${t.muted}">${esc(kind)}</text>
  <text x="972" y="${y + 22}" text-anchor="end" font-size="13" fill="${t.text}">${esc(when)}</text>
  <text x="972" y="${y + 42}" text-anchor="end" font-size="12.5" fill="${t.muted}">${esc(where)}</text>`;
  }).join('\n  ');
  writeFileSync(`${OUT}/experience-${name}.svg`, svg(1000, eh, t, `  ${label(28, 32, 'Experience', t)}\n  ${rows}`, 'Experience'));

  // Certifications: one small card each, so each keeps its own link.
  for (const [id, img, l1, l2, meta] of CERTS) {
    writeFileSync(`${OUT}/cert-${id}-${name}.svg`, svg(326, 118, t, `
  ${logo(img, 22, 22, 44, t)}
  <text x="80" y="40" font-size="14.5" font-weight="600" fill="${t.text}">${esc(l1)}</text>
  ${l2 ? `<text x="80" y="60" font-size="14.5" font-weight="600" fill="${t.text}">${esc(l2)}</text>` : ''}
  <text x="80" y="${l2 ? 82 : 62}" font-size="12.5" fill="${t.muted}">Certified · ${esc(meta)}</text>
  <text x="304" y="100" text-anchor="end" font-size="12" fill="${t.accent}">Verify credential ↗</text>`, `${l1} ${l2}`));
  }

  // Projects: screenshot on top, title, description, stack as pills.
  for (const [id, img, title, desc, tags] of PROJECTS) {
    const d = wrap(desc, 13.5, 440);
    writeFileSync(`${OUT}/project-${id}-${name}.svg`, svg(494, 430, t, `
  ${picture(img, 16, 16, 462, 236)}
  <text x="24" y="286" font-size="19" font-weight="700" fill="${t.text}">${esc(title)}</text>
  ${lines(24, 312, d, 13.5, t.muted)}
  ${pills(24, 404, tags, t)}`, title));
  }

  // Hackathons: the win first, then SIH with the advisor chat on the right.
  const gold = name === 'dark' ? '#e3b341' : '#9a6700';
  const sm = wrap('Built Skill-Pilot, a career counselling portal for school students. It uses the Gemini API to choose each next question from what the student has told it so far, evaluates their answers, and suggests career paths with a roadmap, in their own language.', 13.5, 560);
  writeFileSync(`${OUT}/special-${name}.svg`, svg(1000, 318, t, `
  ${label(28, 40, 'Hackathons', t)}
  <rect x="28" y="58" width="70" height="22" rx="11" fill="none" stroke="${gold}"/>
  <text x="63" y="73" text-anchor="middle" font-size="11" font-weight="700" letter-spacing="1" fill="${gold}">WINNER</text>
  <text x="110" y="75" font-size="19" font-weight="700" fill="${t.text}">Eightfold.ai Internal T2 Hackathon</text>
  <text x="28" y="104" font-size="13.5" fill="${t.muted}">Built a user onboarding demo.</text>
  <text x="972" y="75" text-anchor="end" font-size="13" fill="${t.text}">May 2026</text>
  <line x1="28" y1="126" x2="972" y2="126" stroke="${t.track}"/>
  <rect x="28" y="146" width="96" height="22" rx="11" fill="none" stroke="${t.border}"/>
  <text x="76" y="161" text-anchor="middle" font-size="11" font-weight="700" letter-spacing="1" fill="${t.muted}">PARTICIPANT</text>
  <text x="136" y="163" font-size="19" font-weight="700" fill="${t.text}">Smart India Hackathon 2024</text>
  ${lines(28, 192, sm, 13.5, t.muted)}
  ${pills(28, 286, ['JavaScript', 'React', 'Node.js', 'Gemini API'], t)}
  <rect x="640" y="140" width="344" height="162" rx="9" fill="${t.track}" stroke="${t.border}"/>
  <circle cx="656" cy="154" r="4" fill="#ff5f56"/><circle cx="670" cy="154" r="4" fill="#ffbd2e"/><circle cx="684" cy="154" r="4" fill="#27c93f"/>
  ${picture('sih2024.jpg', 646, 166, 332, 130, 5)}`, 'Hackathons: winner, Eightfold.ai Internal T2 Hackathon, May 2026; participant, Smart India Hackathon 2024'));

  // Toolbox: the icon row inside a matching card.
  const step = (972 - 28) / ICONS.length;
  writeFileSync(`${OUT}/toolbox-${name}.svg`, svg(1000, 112, t, `
  ${label(28, 32, 'Toolbox', t)}
  ${ICONS.map((i, n) => `<image href="${data(`icon-${i}.svg`)}" x="${(28 + n * step + (step - 48) / 2).toFixed(1)}" y="46" width="48" height="48"/>`).join('\n  ')}`,
  'TypeScript, JavaScript, Node.js, React, Go, Java, Spring, Python, C++, PostgreSQL, MySQL, MongoDB, Docker, Cloudflare, Git'));
}
console.log('cards written');
