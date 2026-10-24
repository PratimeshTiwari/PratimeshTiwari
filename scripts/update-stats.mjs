// Draws the README's two stat sections — LeetCode and GitHub — each in a
// light and a dark version (the README picks one with <picture>). Data comes
// straight from LeetCode's and GitHub's own APIs. Run daily by
// .github/workflows/stats.yml; node 20+, no dependencies.
//   GITHUB_TOKEN=$(gh auth token) node scripts/update-stats.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'assets';
mkdirSync(OUT, { recursive: true });
const GH = 'PratimeshTiwari'; const LC = 'pratimeshtiwari';
const token = process.env.GITHUB_TOKEN;

const post = async (url, body, headers = {}) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })).json();
const gql = async (query) => (await post('https://api.github.com/graphql', { query }, { Authorization: `Bearer ${token}` })).data;

// ── data ──
const lc = (await post('https://leetcode.com/graphql', { query: `query {
  matchedUser(username: "${LC}") { submitStatsGlobal { acSubmissionNum { difficulty count } } }
  userContestRanking(username: "${LC}") { rating topPercentage attendedContestsCount }
  userContestRankingHistory(username: "${LC}") { attended rating contest { startTime } }
}` }, { Referer: 'https://leetcode.com' })).data;
const solved = Object.fromEntries(lc.matchedUser.submitStatsGlobal.acSubmissionNum.map((d) => [d.difficulty, d.count]));
const totals = Object.fromEntries((await post('https://leetcode.com/graphql', { query: 'query { allQuestionsCount { difficulty count } }' },
  { Referer: 'https://leetcode.com' })).data.allQuestionsCount.map((d) => [d.difficulty, d.count]));
// Submissions per day, every active year. LeetCode does not publish when each
// problem was first solved, so the graph is submissions — exact, and labelled so.
const years = (await post('https://leetcode.com/graphql', { query: `query { matchedUser(username: "${LC}") { userCalendar { activeYears } } }` },
  { Referer: 'https://leetcode.com' })).data.matchedUser.userCalendar.activeYears;
const daily = {};
for (const y of years) {
  const cal = (await post('https://leetcode.com/graphql', { query: `query { matchedUser(username: "${LC}") { userCalendar(year: ${y}) { submissionCalendar } } }` },
    { Referer: 'https://leetcode.com' })).data.matchedUser.userCalendar.submissionCalendar;
  Object.assign(daily, JSON.parse(cal));
}
const subMonths = new Map();
for (const [ts, n] of Object.entries(daily)) {
  const d = new Date(Number(ts) * 1000); const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth()).padStart(2, '0')}`;
  subMonths.set(k, (subMonths.get(k) || 0) + n);
}
const subSeries = [];
let subRun = 0;
for (let d = new Date(Date.UTC(Math.min(...years), 0, 1)); d < new Date(); d.setUTCMonth(d.getUTCMonth() + 1)) {
  subRun += subMonths.get(`${d.getUTCFullYear()}-${String(d.getUTCMonth()).padStart(2, '0')}`) || 0;
  subSeries.push(subRun);
}
const attended = lc.userContestRankingHistory.filter((h) => h.attended);
const ratings = attended.map((h) => h.rating);
const ratingYears = [attended[0], attended.at(-1)].map((h) => new Date(h.contest.startTime * 1000).getUTCFullYear());

const { user } = await gql(`query { user(login: "${GH}") {
  createdAt pullRequests { totalCount }
  repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false) {
    totalCount nodes { languages(first: 6, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name color } } } } }
  contributionsCollection { contributionCalendar { totalContributions } } } }`);
const commits = (await (await fetch(`https://api.github.com/search/commits?q=author:${GH}&per_page=1`, { headers: { Authorization: `Bearer ${token}` } })).json()).total_count;
const bytes = new Map();
for (const r of user.repositories.nodes) for (const { size, node } of r.languages.edges) {
  const p = bytes.get(node.name) || { size: 0, color: node.color || '#8b949e' }; bytes.set(node.name, { size: p.size + size, color: p.color });
}
const total = [...bytes.values()].reduce((n, l) => n + l.size, 0) || 1;
const langs = [...bytes.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 3).map(([name, l]) => ({ name, color: l.color, pct: (l.size / total) * 100 }));
const start = new Date(user.createdAt).getUTCFullYear();
const months = [];
for (let d = new Date(Date.UTC(start, 0, 1)); d < new Date(); d.setUTCMonth(d.getUTCMonth() + 1)) months.push(new Date(d));
const monthly = await gql(`query { user(login: "${GH}") { ${months.map((m, i) => `m${i}: contributionsCollection(from: "${m.toISOString()}", to: "${new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1) - 1000).toISOString()}") { contributionCalendar { totalContributions } }`).join(' ')} } }`);
let run = 0; const cumulative = months.map((_, i) => (run += monthly.user[`m${i}`].contributionCalendar.totalContributions));

// ── drawing ──
const THEMES = {
  light: { text: '#1f2328', muted: '#656d76', border: '#d0d7de', track: '#eaeef2', green: '#1a7f37', orange: '#e8890c' },
  dark: { text: '#e6edf3', muted: '#8d96a0', border: '#30363d', track: '#21262d', green: '#3fb950', orange: '#ffa116' },
};
const W = 1000; const H = 150;
const fmt = (n) => Number(n).toLocaleString('en-US');
const spark = (values, x0, x1, y0, y1, color) => {
  const lo = Math.min(...values); const hi = Math.max(...values); const span = hi - lo || 1;
  const pts = values.map((v, i) => [x0 + ((x1 - x0) * i) / Math.max(1, values.length - 1), y1 - ((y1 - y0) * (v - lo)) / span]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return `<path d="${d} L${x1},${y1} L${x0},${y1} Z" fill="${color}" fill-opacity="0.1"/>
  <path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="${pts.at(-1)[0].toFixed(1)}" cy="${pts.at(-1)[1].toFixed(1)}" r="3.5" fill="${color}"/>`;
};
const frame = (t, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif">
  <title>${title}</title>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="none" stroke="${t.border}"/>
${body}
</svg>
`;
const stat = (t, x, value, label, sub) => `
  <text x="${x}" y="70" font-size="30" font-weight="600" fill="${t.text}">${value}</text>
  <text x="${x}" y="94" font-size="13" fill="${t.muted}">${label}</text>
  ${sub ? `<text x="${x}" y="114" font-size="12" fill="${t.muted}">${sub}</text>` : ''}`;
const LC_ICON = 'M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z';
const GH_ICON = 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z';

for (const [name, t] of Object.entries(THEMES)) {
  // Shared columns, so the two strips line up: numbers | rows | graph(s).
  const D1 = 455; const RX = 475; const RW = 140; const D2 = 630;
  const big = (x, value, label, sub) => `
  <text x="${x}" y="78" font-size="28" font-weight="600" fill="${t.text}">${value}</text>
  <text x="${x}" y="100" font-size="12" fill="${t.muted}">${label}</text>${sub ? `
  <text x="${x}" y="118" font-size="12" fill="${t.muted}">${sub}</text>` : ''}`;
  const rows = (items) => items.map((r, i) => {
    const y = 48 + i * 34;
    return `
  <text x="${RX}" y="${y}" font-size="13" fill="${t.text}">${r.name}</text>
  <text x="${RX + RW}" y="${y}" text-anchor="end" font-size="12" fill="${t.muted}">${r.value}</text>
  <rect x="${RX}" y="${y + 7}" width="${RW}" height="4" rx="2" fill="${t.track}"/>
  <rect x="${RX}" y="${y + 7}" width="${Math.max(4, RW * r.share).toFixed(1)}" height="4" rx="2" fill="${r.color}"/>`;
  }).join('');
  const head = (icon, label, sub) => `
  ${icon}
  <text x="28" y="80" font-size="15" font-weight="600" fill="${t.text}">${label}</text>
  <text x="28" y="100" font-size="12" fill="${t.muted}">${sub}</text>
  <line x1="125" y1="24" x2="125" y2="126" stroke="${t.border}"/>
  <line x1="${D1}" y1="24" x2="${D1}" y2="126" stroke="${t.border}"/>
  <line x1="${D2}" y1="24" x2="${D2}" y2="126" stroke="${t.border}"/>`;
  // A chart with its numbers: low and high on the y axis, first and last year
  // on the x axis. The plot starts after a gutter wide enough for the labels.
  const compact = (n) => (n >= 10000 ? `${Math.round(n / 1000)}k` : Math.round(n).toLocaleString('en-US'));
  const graph = (x0, x1, title, value, valueColor, series, color, { from, to, zero = false, ticks = [] }) => {
    const px0 = x0 + 34; const y0 = 50; const y1 = 118;
    const lo = zero ? 0 : Math.min(...series); const hi = Math.max(...series);
    const pts = series.map((v, i) => [px0 + ((x1 - px0) * i) / Math.max(1, series.length - 1),
      y1 - ((y1 - y0) * (v - lo)) / (hi - lo || 1)]);
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    return `
  <text x="${x0}" y="36" font-size="12" fill="${t.muted}">${title}</text>
  <text x="${x1}" y="36" text-anchor="end" font-size="12" fill="${valueColor}">${value}</text>
  <line x1="${px0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="${t.track}"/>
  <line x1="${px0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="${t.border}"/>
  <text x="${px0 - 5}" y="${y0 + 4}" text-anchor="end" font-size="10" fill="${t.muted}">${compact(hi)}</text>
  <text x="${px0 - 5}" y="${y1 + 3}" text-anchor="end" font-size="10" fill="${t.muted}">${compact(lo)}</text>
  <path d="${d} L${x1},${y1} L${px0},${y1} Z" fill="${color}" fill-opacity="0.1"/>
  <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="${pts.at(-1)[0].toFixed(1)}" cy="${pts.at(-1)[1].toFixed(1)}" r="3" fill="${color}"/>
  <text x="${px0}" y="${y1 + 15}" font-size="10" fill="${t.muted}">${from}</text>
  <text x="${x1}" y="${y1 + 15}" text-anchor="end" font-size="10" fill="${t.muted}">${to}</text>
  ${ticks.map(({ i, label }) => `<text x="${(px0 + ((x1 - px0) * i) / Math.max(1, series.length - 1)).toFixed(1)}" y="${y1 + 15}" text-anchor="middle" font-size="10" fill="${t.muted}">${label}</text>`).join('')}`;
  };
  const thisYear = new Date().getUTCFullYear();

  // LeetCode: solved · rating · top% | difficulty rows | rating line · submissions line
  const lcBody = `${head(`<g transform="translate(28 24) scale(1.1)" fill="${t.orange}"><path d="${LC_ICON}"/></g>`, 'LeetCode', LC)}
  ${big(160, fmt(solved.All), 'solved')}
  ${big(280, Math.round(lc.userContestRanking.rating), 'rating', `top ${lc.userContestRanking.topPercentage}%`)}
  ${big(392, lc.userContestRanking.attendedContestsCount, 'contests')}
  ${rows([['Easy', '#00b8a3'], ['Medium', '#ffc01e'], ['Hard', '#ef4743']].map(([k, c]) => ({
    name: k, value: `${solved[k]} / ${fmt(totals[k])}`, share: solved[k] / totals[k], color: c })))}
  ${graph(645, 800, 'Rating', Math.round(lc.userContestRanking.rating), t.text, ratings, t.orange, { from: ratingYears[0], to: ratingYears[1] })}
  <line x1="812" y1="24" x2="812" y2="126" stroke="${t.border}"/>
  ${graph(818, 972, 'Submissions', fmt(subRun), t.text, subSeries, t.orange, { from: Math.min(...years), to: thisYear, zero: true })}`;
  writeFileSync(`${OUT}/leetcode-${name}.svg`, frame(t, lcBody, 'LeetCode'));

  // GitHub: contributions · commits · repos · PRs | languages | contributions line
  const ghBody = `${head(`<g transform="translate(28 24) scale(1.6)" fill="${t.text}"><path d="${GH_ICON}"/></g>`, 'GitHub', GH)}
  ${big(160, fmt(run), 'contributions')}
  ${big(280, fmt(user.repositories.totalCount), 'repos', `${fmt(commits)} commits`)}
  ${big(392, fmt(user.pullRequests.totalCount), 'PRs')}
  ${rows(langs.map((l) => ({ name: l.name, value: `${l.pct < 1 ? '<1' : l.pct.toFixed(1)}%`, share: l.pct / 100, color: l.color })))}
  ${graph(645, 972, 'Contributions', `+${fmt(user.contributionsCollection.contributionCalendar.totalContributions)} last year`, t.green, cumulative, t.green, { from: start, to: thisYear, zero: true,
    ticks: months.map((m, i) => ({ i, label: m.getUTCFullYear() })).filter(({ i, label }) => i > 0 && months[i].getUTCMonth() === 0 && label !== thisYear) })}`;
  writeFileSync(`${OUT}/github-${name}.svg`, frame(t, ghBody, 'GitHub'));
}
console.log(`ok: ${solved.All} solved, rating ${Math.round(lc.userContestRanking.rating)}, ${run} contributions`);
