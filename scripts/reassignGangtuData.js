// scripts/reassignGangtuData.js
// 실행(미리보기): node scripts/reassignGangtuData.js --dry-run
// 실행(적용):     node scripts/reassignGangtuData.js
//
// reassignBibiPokedex.js와 동일한 방식으로, '강투'가 남긴 기록을 다른 트레이너에게 재배정한다.
// 이번엔 두 컬렉션 모두 대상:
//   - gameData/sharedPokedex/{번호}: firstCatcher / caughtBy / firstEncounter 가 '강투'인 항목
//       -> [서리해, 주목, 강찬] 중 하나로 이름 교체. firstCatcher가 '강투'였던 항목은 memo도 null로 삭제.
//   - gameData/recipeMemos/{레시피id}: firstDiscoverer 가 '강투'인 항목
//       -> 마찬가지로 이름 교체하고, memo도 null로 삭제.
//
// 배분 방식: 각 컬렉션별로 대상 항목을 시드 고정 셔플 후 [서리해, 주목, 강찬]을 순환 배정
// (컬렉션별 균등분배, 완전 랜덤이 아님 — 재실행해도 같은 결과).
//
// 전체를 한 번 읽어 patch/backup을 만들고 firebase database:update 한 번으로 반영한다.
// 되돌리려면 백업 JSON을 그대로 database:update 하면 된다.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'poke-commu-system';
const BASE = 'https://poke-commu-system-default-rtdb.firebaseio.com';
const SOURCE_NAME = '강투';
const TARGET_NAMES = ['서리해', '주목', '강찬'];

const BACKUP = path.join(__dirname, `_backup_gangtu_data_${Date.now()}.json`);
const PATCH_FILE = path.join(__dirname, '_tmp_gangtu_data_patch.json');
const DRY_RUN = process.argv.includes('--dry-run');

function fetchJSON(url) {
  const raw = execSync(`curl -s "${url}"`, { maxBuffer: 1024 * 1024 * 200 }).toString();
  return JSON.parse(raw);
}

// 결정적 셔플 (시드 고정) — 재실행해도 같은 배분이 나오도록
function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildAssignment(keys, seed) {
  const sorted = keys.slice().sort();
  const shuffled = seededShuffle(sorted, seed);
  const assignment = {};
  shuffled.forEach((key, i) => {
    assignment[key] = TARGET_NAMES[i % TARGET_NAMES.length];
  });
  return assignment;
}

const patch = {};
const backup = {};
const counts = { 서리해: 0, 주목: 0, 강찬: 0 };

// ── 1. 도감 (gameData/sharedPokedex) ──
const pokedex = fetchJSON(`${BASE}/gameData/sharedPokedex.json`) || {};

const pokedexKeys = [];
for (const [key, entry] of Object.entries(pokedex)) {
  if (!entry || typeof entry !== 'object') continue;
  if (
    entry.firstCatcher === SOURCE_NAME ||
    entry.caughtBy === SOURCE_NAME ||
    entry.firstEncounter === SOURCE_NAME
  ) {
    pokedexKeys.push(key);
  }
}

const pokedexAssignment = buildAssignment(pokedexKeys, 20260917);

let dexCatcherChanged = 0;
let dexEncounterChanged = 0;
let dexMemoCleared = 0;

for (const key of pokedexKeys) {
  const entry = pokedex[key];
  const newName = pokedexAssignment[key];
  const p = `gameData/sharedPokedex/${key}`;
  counts[newName]++;

  if (entry.firstCatcher === SOURCE_NAME) {
    patch[`${p}/firstCatcher`] = newName;
    backup[`${p}/firstCatcher`] = entry.firstCatcher;
    dexCatcherChanged++;

    if (entry.memo != null) {
      patch[`${p}/memo`] = null;
      backup[`${p}/memo`] = entry.memo;
      dexMemoCleared++;
    }
  }

  if (entry.caughtBy === SOURCE_NAME) {
    patch[`${p}/caughtBy`] = newName;
    backup[`${p}/caughtBy`] = entry.caughtBy;
  }

  if (entry.firstEncounter === SOURCE_NAME) {
    patch[`${p}/firstEncounter`] = newName;
    backup[`${p}/firstEncounter`] = entry.firstEncounter;
    dexEncounterChanged++;
  }
}

// ── 2. 레시피 (gameData/recipeMemos) ──
const recipeMemos = fetchJSON(`${BASE}/gameData/recipeMemos.json`) || {};

const recipeKeys = [];
for (const [key, entry] of Object.entries(recipeMemos)) {
  if (!entry || typeof entry !== 'object') continue;
  if (entry.firstDiscoverer === SOURCE_NAME) {
    recipeKeys.push(key);
  }
}

const recipeAssignment = buildAssignment(recipeKeys, 20260917);

let recipeChanged = 0;
let recipeMemoCleared = 0;

for (const key of recipeKeys) {
  const entry = recipeMemos[key];
  const newName = recipeAssignment[key];
  const p = `gameData/recipeMemos/${key}`;
  counts[newName]++;

  patch[`${p}/firstDiscoverer`] = newName;
  backup[`${p}/firstDiscoverer`] = entry.firstDiscoverer;
  recipeChanged++;

  if (entry.memo != null) {
    patch[`${p}/memo`] = null;
    backup[`${p}/memo`] = entry.memo;
    recipeMemoCleared++;
  }
}

console.log(`'${SOURCE_NAME}' 관련 도감 항목: ${pokedexKeys.length}개`);
console.log(`  firstCatcher 교체: ${dexCatcherChanged}, firstEncounter 교체: ${dexEncounterChanged}, memo 삭제: ${dexMemoCleared}`);
console.log(`'${SOURCE_NAME}' 관련 레시피 항목: ${recipeKeys.length}개`);
console.log(`  firstDiscoverer 교체: ${recipeChanged}, memo 삭제: ${recipeMemoCleared}`);
console.log(`  전체 배분: 서리해 ${counts.서리해} / 주목 ${counts.주목} / 강찬 ${counts.강찬}`);
console.log(`  패치 필드 ${Object.keys(patch).length}개`);
console.log('  대상 도감번호:', pokedexKeys.join(', ') || '(없음)');
console.log('  대상 레시피id:', recipeKeys.join(', ') || '(없음)');

if (Object.keys(patch).length === 0) {
  console.log('변경할 데이터가 없습니다.');
  process.exit(0);
}

fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 2));
console.log(`\n백업 저장: ${BACKUP}`);
console.log(`(되돌리기: firebase database:update / "${path.basename(BACKUP)}" --project ${PROJECT} --force)`);

fs.writeFileSync(PATCH_FILE, JSON.stringify(patch, null, 2));

if (DRY_RUN) {
  console.log(`\n[dry-run] 패치 미리보기: ${PATCH_FILE} (Firebase 에 적용하지 않음)`);
  process.exit(0);
}

console.log('\nFirebase 에 적용 중...');
execSync(`firebase database:update / "${PATCH_FILE}" --project ${PROJECT} --force`, { stdio: 'inherit' });
fs.unlinkSync(PATCH_FILE);
console.log('✅ 완료!');
