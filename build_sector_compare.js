// iShares Russell 2000 ETF 보유종목 파일 2개(이전 분기 / 이번 분기)를 읽어
// Sector별 Market Value 비중 비교 페이지(sector_compare.html)를 만듭니다.
//
// 사용법:  node build_sector_compare.js <이전분기.xlsx> <이번분기.xlsx> [출력.html]
// 예:      node build_sector_compare.js q4.xlsx q3.xlsx sector_compare.html
const fs = require('fs');
const XLSX = require('./xlsx.full.min.js');

const [fileA, fileB, out = 'sector_compare.html'] = process.argv.slice(2);
if (!fileA || !fileB) {
  console.error('사용법: node build_sector_compare.js <이전분기.xlsx> <이번분기.xlsx> [출력.html]');
  process.exit(1);
}

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

const a = load(fileA), b = load(fileB);
const names = [...new Set([...Object.keys(a.bySector), ...Object.keys(b.bySector)])];
const sectors = names.map(name => {
  const mvA = a.bySector[name] || 0, mvB = b.bySector[name] || 0;
  return {
    name,
    mvA, mvB,
    wA: mvA / a.total * 100, wB: mvB / b.total * 100,
    nA: a.count[name] || 0, nB: b.count[name] || 0,
  };
});
const data = { a: { date: a.date, total: a.total }, b: { date: b.date, total: b.total }, sectors };

const template = fs.readFileSync(__dirname + '/sector_compare.template.html', 'utf8');
fs.writeFileSync(out, template.replace('/*__DATA__*/null', JSON.stringify(data)));
console.log(`${out} 생성: ${sectors.length}개 섹터, ${a.date} → ${b.date}`);
