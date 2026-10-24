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
// White single-colour marks on dark tiles, like the toolbox chips. A raster
// logo is recoloured through a filter that keeps only its alpha.
// One colour per mark — the company's own, toned for a dark tile.
const BRAND = { 'eightfold.png': '#a78bfa', 'machaxi.png': '#60a5fa', 'iitjobs.png': '#94a3b8' };
const rgb = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3));
const monoLogo = (file, x, y, s, t) => `<filter id="w${x}${y}"><feColorMatrix type="matrix" values="${(([r, g, b]) => `0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 1 0`)(rgb(BRAND[file] || '#e6edf3'))}"/></filter>
  <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="8" fill="${t.pill}" stroke="${t.border}"/>
  <image href="${data(file)}" x="${x + 8}" y="${y + 8}" width="${s - 16}" height="${s - 16}" preserveAspectRatio="xMidYMid meet" filter="url(#w${x}${y})"/>`;
const monoIcon = (slug, x, y, s, t) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="8" fill="${t.pill}" stroke="${t.border}"/>
  <g transform="translate(${x + (s - 24) / 2} ${y + (s - 24) / 2})"><path d="${readFileSync(`${SRC}/mono-${slug}.svg`, 'utf8').match(/<path d="([^"]+)"/)[1]}" fill="${t.text}"/></g>`;
// Dark tiles with the same border as the link buttons, not white squares.
const logo = (file, x, y, s, t) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="8" fill="${t.pill}" stroke="${t.border}"/>
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
const TOOLS = [['javascript', 'JavaScript'], ['typescript', 'TypeScript'], ['python', 'Python'], ['openjdk', 'Java'], ['cplusplus', 'C++'],
  ['sql', 'SQL'], ['mongodb', 'MongoDB'], ['git', 'Git'], ['github', 'GitHub']];

for (const [name, t] of Object.entries(THEMES).filter(([n]) => n === 'dark')) {
  clipId = 0;
  // Header: name, a short accent rule, headline and intro.
  writeFileSync(`${OUT}/header-${name}.svg`, svg(1000, 168, t, `
  <text x="500" y="66" text-anchor="middle" font-size="40" font-weight="700" fill="${t.text}">Pratimesh Tiwari</text>
  <rect x="470" y="84" width="60" height="3" rx="1.5" fill="${t.accent}"/>
  <text x="500" y="116" text-anchor="middle" font-size="17" font-weight="600" fill="${t.text}">Agentic AI &amp; Backend Engineer <tspan font-weight="400" fill="${t.muted}">· Bengaluru, India</tspan></text>
  <text x="500" y="142" text-anchor="middle" font-size="14.5" fill="${t.muted}">I build AI agents, developer tools and the backends they run on.</text>`,
  'Pratimesh Tiwari — Agentic AI & Backend Engineer'));

  // Experience: one card, a row per role, dates on the right.
  const rowH = 62; const eh = 58 + EXPERIENCE.length * rowH;
  const rows = EXPERIENCE.map(([img, title, co, kind, when, where], i) => {
    const y = 50 + i * rowH;
    return `${i ? `<line x1="28" y1="${y - 6}" x2="972" y2="${y - 6}" stroke="${t.track}"/>` : ''}
  ${img === 'coindcx.png'
    // CoinDCX's own badge: a blue square, "Coin" in white, "DCX" in orange.
    ? `<rect x="28" y="${y + 4}" width="42" height="42" rx="8" fill="#1d2b8f"/>
  <text x="49" y="${y + 28.5}" text-anchor="middle" font-size="8.8" font-weight="700" letter-spacing="-0.1" fill="#ffffff">Coin<tspan fill="#ff6a1a">DCX</tspan></text>`
    // The real logo, on a white rounded tile with no border — as LinkedIn shows it.
    : `<rect x="28" y="${y + 4}" width="42" height="42" rx="8" fill="#ffffff"/>
  <image href="${data(img)}" x="34" y="${y + 10}" width="30" height="30" preserveAspectRatio="xMidYMid meet"/>`}
  <text x="86" y="${y + 22}" font-size="15" font-weight="600" fill="${t.text}">${esc(title)} <tspan font-weight="400" fill="${t.muted}">· ${esc(co)}</tspan></text>
  <text x="86" y="${y + 42}" font-size="12.5" fill="${t.muted}">${esc(kind)}</text>
  <text x="972" y="${y + 22}" text-anchor="end" font-size="13" fill="${t.text}">${esc(when)}</text>
  <text x="972" y="${y + 42}" text-anchor="end" font-size="12.5" fill="${t.muted}">${esc(where)}</text>`;
  }).join('\n  ');
  writeFileSync(`${OUT}/experience-${name}.svg`, svg(1000, eh, t, `  ${label(28, 32, 'Experience', t)}\n  ${rows}`, 'Experience'));

  // Certifications: one small card each, so each keeps its own link.
  for (const [id, img, l1, l2, meta] of CERTS) {
    writeFileSync(`${OUT}/cert-${id}-${name}.svg`, svg(326, 118, t, `
  <g transform="translate(26 30) scale(1.5)"><path d="${readFileSync(`${SRC}/mono-${img.startsWith('mongodb') ? 'mongodb' : 'salesforce'}.svg`, 'utf8').match(/<path d="([^"]+)"/)[1]}" fill="${img.startsWith('mongodb') ? '#47a248' : '#00a1e0'}"/></g>
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

  // Hackathons, as two cards: the win (no link — there is no repo for it),
  // then SIH with the advisor chat, which links to its repo.
  const gold = name === 'dark' ? '#e3b341' : '#9a6700';
  // Centered — there is no screenshot to balance it — and plain: the only
  // colour is the pill.
  writeFileSync(`${OUT}/hackathon-win-${name}.svg`, svg(1000, 126, t, `
  ${label(28, 36, 'Hackathons', t)}
  <g transform="translate(500 0)">
    <rect x="-262" y="54" width="70" height="22" rx="11" fill="none" stroke="${gold}"/>
    <text x="-227" y="69" text-anchor="middle" font-size="11" font-weight="700" letter-spacing="1" fill="${gold}">WINNER</text>
    <text x="-180" y="71" font-size="19" font-weight="700" fill="${t.text}">Eightfold.ai Internal T2 Hackathon <tspan font-weight="400" fill="${t.muted}">· May 2026</tspan></text>
    <text x="0" y="100" text-anchor="middle" font-size="13.5" fill="${t.muted}">Built a user onboarding demo.</text>
  </g>`, 'Winner, Eightfold.ai Internal T2 Hackathon, May 2026'));

  const sm = wrap('Built Skill-Pilot, a career counselling portal for school students. It uses the Gemini API to choose each next question from what the student has told it so far, evaluates their answers, and suggests career paths with a roadmap, in their own language.', 13.5, 560);
  writeFileSync(`${OUT}/hackathon-sih-${name}.svg`, svg(1000, 200, t, `
  <rect x="28" y="24" width="96" height="22" rx="11" fill="none" stroke="${t.border}"/>
  <text x="76" y="39" text-anchor="middle" font-size="11" font-weight="700" letter-spacing="1" fill="${t.muted}">PARTICIPANT</text>
  <text x="136" y="41" font-size="19" font-weight="700" fill="${t.text}">Smart India Hackathon 2024</text>
  ${lines(28, 72, sm, 13.5, t.muted)}
  ${pills(28, 172, ['JavaScript', 'React', 'Node.js', 'Gemini API'], t)}
  <rect x="640" y="18" width="344" height="164" rx="9" fill="${t.track}" stroke="${t.border}"/>
  <circle cx="656" cy="32" r="4" fill="#ff5f56"/><circle cx="670" cy="32" r="4" fill="#ffbd2e"/><circle cx="684" cy="32" r="4" fill="#27c93f"/>
  ${picture('sih2024.jpg', 646, 44, 332, 132, 5)}`, 'Participant, Smart India Hackathon 2024 — Skill-Pilot'));

  // Link buttons in the card style: each its own image, so each keeps its link.
  const ICON = {
    website: (c) => `<circle cx="10" cy="10" r="8" fill="none" stroke="${c}" stroke-width="1.6"/><ellipse cx="10" cy="10" rx="3.6" ry="8" fill="none" stroke="${c}" stroke-width="1.4"/><line x1="2" y1="10" x2="18" y2="10" stroke="${c}" stroke-width="1.4"/>`,
    linkedin: (c) => `<rect x="1" y="1" width="18" height="18" rx="3.5" fill="${c}"/><text x="10" y="15" text-anchor="middle" font-size="12" font-weight="800" fill="${t.bg}">in</text>`,
    email: (c) => `<rect x="1" y="3.5" width="18" height="13" rx="2.5" fill="none" stroke="${c}" stroke-width="1.6"/><polyline points="2,5 10,11 18,5" fill="none" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"/>`,
    leetcode: () => `<g transform="scale(0.84)"><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" fill="#ffa116"/></g>`,
  };
  for (const [id, text] of [['website', 'pratimeshtiwari.com'], ['linkedin', 'LinkedIn'], ['email', 'Email'], ['leetcode', 'LeetCode']]) {
    const w = Math.round(text.length * 8.2 + 62);
    writeFileSync(`${OUT}/link-${id}-${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="40" viewBox="0 0 ${w} 40" font-family="${FONT}">
  <title>${esc(text)}</title>
  <rect x="0.5" y="0.5" width="${w - 1}" height="39" rx="8" fill="${t.bg}" stroke="${t.border}"/>
  <g transform="translate(16 10)">${ICON[id](t.text)}</g>
  <text x="46" y="25" font-size="14" font-weight="600" fill="${t.text}">${esc(text)}</text>
</svg>
`);
  }

  // Toolbox: a short list, each as a chip like the link buttons — a white
  // single-colour icon (Simple Icons, CC0) and its name. SQL has no logo, so
  // it gets a drawn database.
  const monoPath = (slug) => readFileSync(`${SRC}/mono-${slug}.svg`, 'utf8').match(/<path d="([^"]+)"/)[1];
  const DB = '<ellipse cx="12" cy="5" rx="8" ry="3" fill="none" stroke="CLR" stroke-width="2"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" fill="none" stroke="CLR" stroke-width="2"/>';
  const chips = TOOLS.map(([slug, text]) => ({ slug, text, w: Math.round(text.length * 7.6 + 50) }));
  const rowsOf = []; let cur = []; let used = 0;
  for (const c of chips) { if (used + c.w > 944 && cur.length) { rowsOf.push(cur); cur = []; used = 0; } cur.push(c); used += c.w + 10; }
  if (cur.length) rowsOf.push(cur);
  const th = 58 + rowsOf.length * 50;
  const chipSvg = rowsOf.map((row, ri) => { let x = 28; return row.map((c) => {
    const y = 48 + ri * 50;
    const icon = c.slug === 'sql' ? DB.replaceAll('CLR', t.text) : `<path d="${monoPath(c.slug)}" fill="${t.text}"/>`;
    const out = `<rect x="${x}" y="${y}" width="${c.w}" height="38" rx="8" fill="${t.bg}" stroke="${t.border}"/>
  <g transform="translate(${x + 14} ${y + 10}) scale(0.75)">${icon}</g>
  <text x="${x + 42}" y="${y + 24}" font-size="13.5" font-weight="600" fill="${t.text}">${esc(c.text)}</text>`;
    x += c.w + 10; return out; }).join('\n  '); }).join('\n  ');
  writeFileSync(`${OUT}/toolbox-${name}.svg`, svg(1000, th, t, `
  ${label(28, 32, 'Toolbox', t)}
  ${chipSvg}`, TOOLS.map(([, n]) => n).join(', ')));
}
console.log('cards written');
