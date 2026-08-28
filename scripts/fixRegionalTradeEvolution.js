// scripts/fixRegionalTradeEvolution.js
// 실행: node scripts/fixRegionalTradeEvolution.js
//
// 배경: functions/tradeBot.js의 applyTradeEvolution이 교환진화 시 number/nameEn/종족값은
// 갱신하면서 폼 정체성 필드(species / baseSpecies / baseSpeciesEn / formVariant /
// regionalForm / isRegionalForm)는 안 건드렸다. 그래서 "알로라 데구리 → 알로라 딱구리"
// 처럼 지역폼 교환진화를 하면 number는 10111(딱구리)인데 baseSpecies는 "데구리",
// formVariant는 "graveler-alola"로 남았고, getPokemonDisplayParts가 지역폼일 때
// rawName보다 pokemon.baseSpecies를 우선 채택하기 때문에 화면엔 계속 "데구리 (알로라의
// 모습)"로 표시됐다.
//
// 이 스크립트는 evolutions.json의 "교환 + 진화형이 지역폼"인 진화 경로를 훑어서,
// 이미 number는 진화형(evo.to)으로 바뀌었지만 정체성 필드가 진화 전 값으로 남아 있는
// 개체를 찾아 allPokemon.json 템플릿 값으로 맞춘다. caughtPokemon / partnerPokemon 모두.
//
// fixSaltyFlavor.js와 동일하게: 전체를 한 번 읽어 patch/backup 오브젝트를 만들고
// firebase database:update 한 방으로 반영한다. 되돌리려면 백업 JSON을 그대로
// database:update 하면 된다.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'poke-commu-system';
const BASE = 'https://poke-commu-system-default-rtdb.firebaseio.com';
const BACKUP = path.join(__dirname, `_backup_regional_trade_evo_${Date.now()}.json`);
const PATCH_FILE = path.join(__dirname, '_tmp_regional_trade_evo_patch.json');

const evolutions = require('../functions/data/evolutions.json').evolutions || [];
const allPokemon = require('../functions/data/allPokemon.json');

const templateByNumber = new Map();
for (const t of allPokemon) {
  const n = Number(t.number);
  if (Number.isFinite(n) && !templateByNumber.has(n)) templateByNumber.set(n, t);
}

const stripFormSuffix = (name = '') =>
  name.replace(/\s*\([^)]*(?:의\s*모습|모드)[^)]*\)\s*$/, '').trim();

// 교환진화이면서 진화형이 지역폼인 경로 → { [toNumber]: template }
const targetTemplates = new Map();
for (const e of evolutions) {
  if (!e.condition || e.condition.type !== 'trade') continue;
  const t = templateByNumber.get(Number(e.to));
  if (!t) continue;
  if (t.isRegionalForm || t.regionalForm) targetTemplates.set(Number(e.to), t);
}

console.log('대상 진화형:', [...targetTemplates.values()].map((t) => `${t.name}(${t.number})`).join(', ') || '(없음)');
if (targetTemplates.size === 0) process.exit(0);

const IDENTITY_KEYS = ['species', 'baseSpecies', 'baseSpeciesEn', 'formVariant', 'regionalForm', 'isRegionalForm'];

function expectedIdentity(template) {
  return {
    species: template.species || template.nameEn || null,
    baseSpecies: template.baseSpecies ?? null,
    baseSpeciesEn: template.baseSpeciesEn ?? null,
    formVariant: template.formVariant || null,
    regionalForm: template.regionalForm || null,
    isRegionalForm: Boolean(template.isRegionalForm),
  };
}

function fetchJSON(url) {
  const raw = execSync(`curl -s "${url}"`, { maxBuffer: 1024 * 1024 * 200 }).toString();
  return JSON.parse(raw);
}

const members = fetchJSON(`${BASE}/members.json`) || {};

const patch = {};
const backup = {};
let memberCount = 0;
let pokemonCount = 0;

function inspect(basePath, poke) {
  if (!poke || typeof poke !== 'object') return false;
  const num = Number(poke.number);
  if (!targetTemplates.has(num)) return false;

  const template = targetTemplates.get(num);
  const want = expectedIdentity(template);

  // 정체성 필드 중 하나라도 어긋나 있으면 버그 피해 개체로 본다
  const mismatched = IDENTITY_KEYS.some((k) => (poke[k] ?? null) !== (want[k] ?? null));
  if (!mismatched) return false;

  for (const k of IDENTITY_KEYS) {
    const cur = poke[k] ?? null;
    if (cur === (want[k] ?? null)) continue;
    patch[`${basePath}/${k}`] = want[k];
    backup[`${basePath}/${k}`] = cur;
  }

  // name / displayName 이 진화 전 종족명("데구리" 등)으로 남아 있으면 진화형 base 이름으로 교정.
  // (닉네임을 쓰는 개체는 name 이 이미 닉네임일 수 있으니, 진화 전 baseSpecies 와 정확히
  //  같을 때만 건드린다.)
  const evolvedBaseName = stripFormSuffix(template.name || '');
  const oldBaseName = poke.baseSpecies || null;
  for (const key of ['name', 'displayName']) {
    if (oldBaseName && poke[key] === oldBaseName && evolvedBaseName && evolvedBaseName !== oldBaseName) {
      patch[`${basePath}/${key}`] = evolvedBaseName;
      backup[`${basePath}/${key}`] = poke[key];
    }
  }

  pokemonCount++;
  return true;
}

for (const [memberId, member] of Object.entries(members)) {
  if (!member || typeof member !== 'object') continue;
  let touched = false;

  if (member.caughtPokemon && typeof member.caughtPokemon === 'object') {
    for (const [idx, poke] of Object.entries(member.caughtPokemon)) {
      if (inspect(`members/${memberId}/caughtPokemon/${idx}`, poke)) touched = true;
    }
  }

  if (member.partnerPokemon && inspect(`members/${memberId}/partnerPokemon`, member.partnerPokemon)) {
    touched = true;
  }

  if (touched) {
    memberCount++;
    const label = member.name || memberId;
    console.log(`  - ${label} (${memberId})`);
  }
}

console.log(`\n영향받는 멤버 ${memberCount}명, 포켓몬(파트너 포함) ${pokemonCount}마리`);
console.log(`패치 필드 ${Object.keys(patch).length}개`);

if (pokemonCount === 0) {
  console.log('변경할 데이터가 없습니다.');
  process.exit(0);
}

fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 2));
console.log(`백업 저장: ${BACKUP}`);
console.log('(되돌리려면: firebase database:update / "' + path.basename(BACKUP) + '" --project ' + PROJECT + ' --force)');

if (process.argv.includes('--dry-run')) {
  fs.writeFileSync(PATCH_FILE, JSON.stringify(patch, null, 2));
  console.log(`\n[dry-run] 패치 미리보기 저장: ${PATCH_FILE} (Firebase에 적용하지 않음)`);
  process.exit(0);
}

fs.writeFileSync(PATCH_FILE, JSON.stringify(patch, null, 2));
console.log('\nFirebase에 적용 중...');
execSync(`firebase database:update / "${PATCH_FILE}" --project ${PROJECT} --force`, { stdio: 'inherit' });
fs.unlinkSync(PATCH_FILE);

console.log('✅ 완료!');
