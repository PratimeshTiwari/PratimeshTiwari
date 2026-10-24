// Draws assets/github-card.svg: a GitHub card styled to sit beside the
// LeetCode card in the README (same size, same dark palette). Public data
// only, straight from GitHub's API. Run daily by .github/workflows/stats.yml;
// node 20+, no dependencies. Locally: GITHUB_TOKEN=$(gh auth token) node scripts/update-stats.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const USER = 'PratimeshTiwari';
const OUT = 'assets/github-card.svg';
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required (the GraphQL API needs one)');

async function graphql(query) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(`GitHub GraphQL: ${body.errors[0].message}`);
  return body.data;
}

async function rest(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GitHub ${path}: ${res.status}`);
  return res.json();
}

const { user } = await graphql(`query {
  user(login: "${USER}") {
    createdAt
    pullRequests { totalCount }
    repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false) {
      totalCount
      nodes { stargazerCount languages(first: 6, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name color } } } }
    }
    contributionsCollection {
      contributionCalendar { totalContributions weeks { contributionDays { contributionCount } } }
    }
  }
}`);
// Monthly contribution totals since the account was created, one aliased
// query (contributionsCollection takes at most a year per call; a month each).
const months = [];
for (let d = new Date(Date.UTC(new Date(user.createdAt).getUTCFullYear(), 0, 1)); d < new Date(); d.setUTCMonth(d.getUTCMonth() + 1)) {
  months.push(new Date(d));
}
const monthly = await graphql(`query { user(login: "${USER}") { ${months.map((m, i) => {
  const end = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1) - 1000);
  return `m${i}: contributionsCollection(from: "${m.toISOString()}", to: "${end.toISOString()}") { contributionCalendar { totalContributions } }`;
}).join(' ')} } }`);
// A running total: one busy month no longer flattens every other one, and the
// line reads the way the LeetCode card's rating line does.
let running = 0;
const series = months.map((m, i) => ({ when: m, n: (running += monthly.user[`m${i}`].contributionCalendar.totalContributions) }));

const commits = (await rest(`/search/commits?q=author:${USER}&per_page=1`)).total_count;

const repos = user.repositories.nodes;
const stars = repos.reduce((n, r) => n + r.stargazerCount, 0);
const bytes = new Map();
for (const r of repos) {
  for (const { size, node } of r.languages.edges) {
    const prev = bytes.get(node.name) || { size: 0, color: node.color || '#8b949e' };
    bytes.set(node.name, { size: prev.size + size, color: prev.color });
  }
}
const totalBytes = [...bytes.values()].reduce((n, l) => n + l.size, 0) || 1;
const languages = [...bytes.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 3)
  .map(([name, l]) => ({ name, color: l.color, pct: (l.size / totalBytes) * 100 }));

const cal = user.contributionsCollection.contributionCalendar;
const days = cal.weeks.flatMap((w) => w.contributionDays.map((d) => d.contributionCount));
const activeDays = days.filter((n) => n > 0).length;

// ── Drawing ──────────────────────────────────────────────────────────
const C = { bg: '#101010', border: '#404040', track: '#404040', text: '#f0f0f0', muted: '#9a9a9a', accent: '#39d353' };
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
const fmt = (n) => Number(n).toLocaleString('en-US');

// Ring: contributions in the middle, filled by the share of days with any.
const R = 40; const CIRC = 2 * Math.PI * R; const share = days.length ? activeDays / days.length : 0;
const ring = `
  <circle cx="100" cy="140" r="${R}" fill="none" stroke="${C.track}" stroke-width="6"/>
  <circle cx="100" cy="140" r="${R}" fill="none" stroke="${C.accent}" stroke-width="6" stroke-linecap="round"
    stroke-dasharray="${(CIRC * share).toFixed(1)} ${CIRC.toFixed(1)}" transform="rotate(-90 100 140)"/>
  <text x="100" y="149" text-anchor="middle" font-size="28" fill="${C.text}">${fmt(cal.totalContributions)}</text>
  <text x="100" y="205" text-anchor="middle" font-size="12" fill="${C.muted}">contributions · last year</text>`;

const bars = languages.map((l, i) => {
  const y = 95 + i * 38;
  return `
  <text x="170" y="${y}" font-size="16" fill="${C.text}">${esc(l.name)}</text>
  <text x="475" y="${y}" text-anchor="end" font-size="14" fill="${C.muted}">${l.pct.toFixed(1)}%</text>
  <rect x="170" y="${y + 8}" width="305" height="4" rx="2" fill="${C.track}"/>
  <rect x="170" y="${y + 8}" width="${Math.max(4, (305 * l.pct) / 100).toFixed(1)}" height="4" rx="2" fill="${l.color}"/>`;
}).join('');

const figures = [['Commits', fmt(commits)], ['Public repos', fmt(user.repositories.totalCount)],
  ['Stars', fmt(stars)], ['Pull requests', fmt(user.pullRequests.totalCount)]]
  .map(([label, value], i) => {
    const x = 25 + i * 118;
    return `
  <text x="${x}" y="245" font-size="12" fill="${C.muted}">${label}</text>
  <text x="${x}" y="275" font-size="26" fill="${C.text}">${value}</text>`;
  }).join('');

// Total contributions since the account began, drawn like the LeetCode
// card's rating graph: three gridlines, a line, a faint fill, year labels.
const X0 = 58; const X1 = 475; const Y0 = 318; const Y1 = 372;
const top = Math.max(10, ...series.map((p) => p.n));
const step = Math.pow(10, Math.floor(Math.log10(top)));
const ceil = Math.ceil(top / step) * step;
const px = (i) => X0 + ((X1 - X0) * i) / Math.max(1, series.length - 1);
const py = (n) => Y1 - ((Y1 - Y0) * n) / ceil;
const line = series.map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(p.n).toFixed(1)}`).join(' ');
const area = `${line} L${px(series.length - 1).toFixed(1)},${Y1} L${X0},${Y1} Z`;
const grid = [0, 0.5, 1].map((f) => {
  const y = Y1 - (Y1 - Y0) * f;
  return `<line x1="${X0}" y1="${y}" x2="${X1}" y2="${y}" stroke="#2a2a2a"/>
  <text x="${X0 - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="${C.muted}">${Math.round(ceil * f)}</text>`;
}).join('\n  ');
const years = series.map((p, i) => [p, i]).filter(([p]) => p.when.getUTCMonth() === 0)
  .map(([p, i]) => `<text x="${px(i).toFixed(1)}" y="390" text-anchor="middle" font-size="11" fill="${C.muted}">${p.when.getUTCFullYear()}</text>`).join('');
const chart = `
  <text x="25" y="303" font-size="12" fill="${C.muted}">Contributions since ${series[0].when.getUTCFullYear()}</text>
  <text x="475" y="303" text-anchor="end" font-size="12" fill="${C.text}">${fmt(running)}</text>
  ${grid}
  <path d="${area}" fill="${C.accent}" fill-opacity="0.12"/>
  <path d="${line}" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linejoin="round"/>
  ${years}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="400" viewBox="0 0 500 400" font-family="Inter, 'Segoe UI', Helvetica, Arial, sans-serif">
  <title>${USER} | GitHub</title>
  <rect x="0.5" y="0.5" width="499" height="399" rx="4" fill="${C.bg}" stroke="${C.border}"/>
  <g transform="translate(22 18) scale(1.75)" fill="${C.text}">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </g>
  <text x="62" y="41" font-size="24" fill="${C.text}">${USER}</text>
  <text x="475" y="41" text-anchor="end" font-size="14" fill="${C.muted}">since ${new Date(user.createdAt).getFullYear()}</text>
  ${ring}
  ${bars}
  <line x1="12" y1="220" x2="488" y2="220" stroke="${C.border}"/>
  ${figures}
  ${chart}
</svg>
`;

let before = '';
try { before = readFileSync(OUT, 'utf8'); } catch { /* first run */ }
if (before === svg) console.log('card unchanged');
else { writeFileSync(OUT, svg); console.log(`card updated: ${cal.totalContributions} contributions, ${commits} commits, ${languages.map((l) => l.name).join('/')}`); }
