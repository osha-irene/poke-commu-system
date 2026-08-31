// scripts/reassignBibiPokedex.js
// 실행(미리보기): node scripts/reassignBibiPokedex.js --dry-run
// 실행(적용):     node scripts/reassignBibiPokedex.js
//
// gameData/sharedPokedex/{번호} 항목 중 '비비'가 남긴 기록을 다른 트레이너에게 재배정한다.
//   - firstCatcher / caughtBy 가 '비비' 인 항목: 이름을 [서리해, 주목, 강찬] 중 하나로 교체하고
//     그 항목의 memo(첫 포획자가 남긴 메모)는 null 로 지운다.
//   - firstEncounter 가 '비비' 인 항목: 같은 방식으로 이름만 교체 (memo 는 건드리지 않음
//     — 발견자와 포획자가 다를 수 있고, memo 는 포획자 것이므로).
//   - encounteredAt / caughtAt / regions 등 나머지 필드는 그대로 둔다.
//
// 배분 방식: 대상 항목 전체를 섞은 뒤 [서리해, 주목, 강찬] 을 순환 배정 → 세 명의 개수 차이가
// 최대 1 이 되도록 "균등분배". (항목별 완전 랜덤이 아니라 균등하게 나눔.)
//
// fixSaltyFlavor.js 와 동일하게 전체를 한 번 읽어 patch/backup 을 만들고
// firebase database:update 한 번으로 반영한다. 되돌리려면 백업 JSON 을 그대로
// database:update 하면 된다.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'poke-commu-system';
const BASE = 'https://poke-commu-system-default-rtdb.firebaseio.com';
const SOURCE_NAME = '비비';
const TARGET_NAMES = ['서리해', '주목', '강찬'];

const BACKUP = path.join(__dirname, `_backup_bibi_pokedex_${Date.now()}.json`);
const PATCH_FILE = path.join(__dirname, '_tmp_bibi_pokedex_patch.json');
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

const pokedex = fetchJSON(`${BASE}/gameData/sharedPokedex.json`) || {};

// 손댈 항목 수집: firstCatcher / caughtBy / firstEncounter 중 하나라도 '비비'
const targetKeys = [];
for (const [key, entry] of Object.entries(pokedex)) {
  if (!entry || typeof entry !== 'object') continue;
  if (
    entry.firstCatcher === SOURCE_NAME ||
    entry.caughtBy === SOURCE_NAME ||
    entry.firstEncounter === SOURCE_NAME
  ) {
    targetKeys.push(key);
  }
}

// 도감 번호 순 정렬 후 시드 셔플 → 균등 순환 배정
targetKeys.sort((a, b) => Number(a) - Number(b));
const shuffled = seededShuffle(targetKeys, 20260828);
const assignment = {};
shuffled.forEach((key, i) => {
  assignment[key] = TARGET_NAMES[i % TARGET_NAMES.length];
});

const patch = {};
const backup = {};
const counts = { 서리해: 0, 주목: 0, 강찬: 0 };
let catcherChanged = 0;
let encounterChanged = 0;
let memoCleared = 0;

for (const key of targetKeys) {
  const entry = pokedex[key];
  const newName = assignment[key];
  const p = `gameData/sharedPokedex/${key}`;
  counts[newName]++;

  if (entry.firstCatcher === SOURCE_NAME) {
    patch[`${p}/firstCatcher`] = newName;
    backup[`${p}/firstCatcher`] = entry.firstCatcher;
    catcherChanged++;

    // 첫 포획자가 비비였던 항목의 메모(비비가 쓴 것)는 지운다
    if (entry.memo != null) {
      patch[`${p}/memo`] = null;
      backup[`${p}/memo`] = entry.memo;
      memoCleared++;
    }
  }

  if (entry.caughtBy === SOURCE_NAME) {
    patch[`${p}/caughtBy`] = newName;
    backup[`${p}/caughtBy`] = entry.caughtBy;
  }

  if (entry.firstEncounter === SOURCE_NAME) {
    patch[`${p}/firstEncounter`] = newName;
    backup[`${p}/firstEncounter`] = entry.firstEncounter;
    encounterChanged++;
  }
}

console.log(`'비비' 관련 도감 항목: ${targetKeys.length}개`);
console.log(`  firstCatcher 교체: ${catcherChanged}, firstEncounter 교체: ${encounterChanged}, memo 삭제: ${memoCleared}`);
console.log(`  배분: 서리해 ${counts.서리해} / 주목 ${counts.주목} / 강찬 ${counts.강찬}`);
console.log(`  패치 필드 ${Object.keys(patch).length}개`);
console.log('  대상 도감번호:', targetKeys.join(', '));

if (targetKeys.length === 0) {
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
