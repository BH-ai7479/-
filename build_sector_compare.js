// iShares Russell 2000 ETF 보유종목 파일 2개(이전 분기 / 이번 분기)를 읽어
// Sector별 Market Value 비중 비교 페이지(sector_compare.html)를 만듭니다.
//
const fs = require('fs');
const XLSX = require('./xlsx.full.min.js');

// ---- 인자 읽기 ----
// 방법 1) 보유종목 파일 2개:  node build_sector_compare.js <이전분기.xlsx> <이번분기.xlsx> [출력.html]
// 방법 2) 섹터 요약표가 있는 파일 1개:
//   node build_sector_compare.js --summary 파일.xlsx --sheet "Sector Comparison" \
//        --from-col "2026-01-01 MV ($B)" --to-col "2026-06-30 MV ($B)" \
//        --from-date 2026.01.01 --to-date 2026.06.30 --from-label 1Q --to-label 2Q \
//        [--note "화면 위에 표시할 주의 문구"] [--no-table] [--out 출력.html]
const argv = process.argv.slice(2);
const opt = {}, pos = [];
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) { pos.push(argv[i]); continue; }
  const k = argv[i].slice(2);
  opt[k] = (k === 'no-table') ? true : argv[++i];
}

// 보유종목 파일 1개를 읽어 Sector별 Market Value 합계를 구함
function load(file) {
  const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer' });
  const sheet = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: null });
  const date = (sheet.match(/\d{4}\.\d{2}\.\d{2}/) || file.match(/\d{4}\.\d{2}\.\d{2}/) || [''])[0];
  const bySector = {}, count = {};
  let total = 0;
  for (const r of rows) {
    const s = r['Sector'], mv = Number(r['Market Value']);
    if (!s || isNaN(mv)) continue;
    bySector[s] = (bySector[s] || 0) + mv;
    count[s] = (count[s] || 0) + 1;
    total += mv;
  }
  return { date, bySector, count, total };
}

function fromHoldings(fileA, fileB) {
  const a = load(fileA), b = load(fileB);
  const names = [...new Set([...Object.keys(a.bySector), ...Object.keys(b.bySector)])];
  const sectors = names.map(name => {
    const mvA = a.bySector[name] || 0, mvB = b.bySector[name] || 0;
    return { name, mvA, mvB, wA: mvA / a.total * 100, wB: mvB / b.total * 100, nA: a.count[name] || 0, nB: b.count[name] || 0 };
  });
  return { a: { date: a.date, total: a.total, label: opt['from-label'] || '4Q' }, b: { date: b.date, total: b.total, label: opt['to-label'] || '3Q' }, sectors };
}

// 섹터 요약표(Sector, MV($B) 열 2개)에서 읽음. 비중은 MV ÷ MV 합계로 다시 계산.
function fromSummary(file, sheetName, colA, colB) {
  const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer' });
  const ws = wb.Sheets[sheetName || wb.SheetNames[0]];
  if (!ws) throw new Error('시트를 찾을 수 없습니다: ' + sheetName);
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  for (const c of [colA, colB]) if (!(c in rows[0])) throw new Error(`열을 찾을 수 없습니다: "${c}" (있는 열: ${Object.keys(rows[0]).join(' | ')})`);
  const list = rows.filter(r => r['Sector'] && Number(r[colA]) >= 0 && Number(r[colB]) >= 0);
  const toUsd = v => Number(v) * 1e9;        // 열 제목이 ($B)이므로 달러로 환산
  const totA = list.reduce((s, r) => s + toUsd(r[colA]), 0), totB = list.reduce((s, r) => s + toUsd(r[colB]), 0);
  const sectors = list.map(r => ({
    name: r['Sector'], mvA: toUsd(r[colA]), mvB: toUsd(r[colB]),
    wA: toUsd(r[colA]) / totA * 100, wB: toUsd(r[colB]) / totB * 100, nA: 0, nB: 0,
  }));
  return { a: { date: opt['from-date'] || '', total: totA, label: opt['from-label'] || '' }, b: { date: opt['to-date'] || '', total: totB, label: opt['to-label'] || '' }, sectors };
}

let data, out;
if (opt.summary) {
  data = fromSummary(opt.summary, opt.sheet, opt['from-col'], opt['to-col']);
  data.basis = '주식(Equity) 기준 · 섹터별 Market Value 합계 ÷ 전체 합계 (합계 100%)';
  data.totalName = 'ETF(주식) 전체';
  out = opt.out || 'sector_compare.html';
} else {
  const [fileA, fileB, o = 'sector_compare.html'] = pos;
  if (!fileA || !fileB) {
    console.error('사용법: node build_sector_compare.js <이전분기.xlsx> <이번분기.xlsx> [출력.html]\n        또는 --summary 파일.xlsx --sheet ... --from-col ... --to-col ... (파일 위쪽 주석 참고)');
    process.exit(1);
  }
  data = fromHoldings(fileA, fileB);
  out = opt.out || o;
}
if (opt.note) data.note = opt.note;
if (opt['no-table']) data.showTable = false;

const template = fs.readFileSync(__dirname + '/sector_compare.template.html', 'utf8');
fs.writeFileSync(out, template.replace('/*__DATA__*/null', JSON.stringify(data)));
console.log(`${out} 생성: ${data.sectors.length}개 섹터, ${data.a.date} → ${data.b.date}`);
