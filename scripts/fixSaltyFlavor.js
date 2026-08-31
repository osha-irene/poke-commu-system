// scripts/fixSaltyFlavor.js
// 이미 저장된 포켓몬 데이터에서 favoriteFlavor === '짠맛'을 '떫은맛'으로 마이그레이션
// 실행: node scripts/fixSaltyFlavor.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'poke-commu-system';
const BASE = 'https://poke-commu-system-default-rtdb.firebaseio.com';
const BACKUP = path.join(__dirname, `_backup_saltyflavor_${Date.now()}.json`);
const PATCH_FILE = path.join(__dirname, '_tmp_saltyflavor_patch.json');

function fetchJSON(url) {
  const raw = execSync(`curl -s "${url}"`, { maxBuffer: 1024 * 1024 * 200 }).toString();
  return JSON.parse(raw);
}

const members = fetchJSON(`${BASE}/members.json`) || {};

const patch = {};
const backup = {};
let memberCount = 0;
let pokemonCount = 0;

for (const [memberId, member] of Object.entries(members)) {
  if (!member || typeof member !== 'object') continue;
  let touchedThisMember = false;

  // caughtPokemon: 배열 또는 객체(RTDB에서 구멍난 배열은 object로 옴) 둘 다 처리
  if (member.caughtPokemon && typeof member.caughtPokemon === 'object') {
    for (const [idx, poke] of Object.entries(member.caughtPokemon)) {
      if (poke && poke.favoriteFlavor === '짠맛') {
        const p = `members/${memberId}/caughtPokemon/${idx}/favoriteFlavor`;
        patch[p] = '떫은맛';
        backup[p] = '짠맛';
        pokemonCount++;
        touchedThisMember = true;
      }
    }
  }

  // partnerPokemon: 단일 객체
  if (member.partnerPokemon && member.partnerPokemon.favoriteFlavor === '짠맛') {
    const p = `members/${memberId}/partnerPokemon/favoriteFlavor`;
    patch[p] = '떫은맛';
    backup[p] = '짠맛';
    pokemonCount++;
    touchedThisMember = true;
  }

  if (touchedThisMember) memberCount++;
}

console.log(`영향받는 멤버 ${memberCount}명, 포켓몬(파트너 포함) ${pokemonCount}마리`);

if (pokemonCount === 0) {
  console.log('변경할 데이터가 없습니다.');
  process.exit(0);
}

fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 2));
console.log(`백업 저장: ${BACKUP}`);

fs.writeFileSync(PATCH_FILE, JSON.stringify(patch, null, 2));

console.log('Firebase에 적용 중...');
execSync(`firebase database:update / "${PATCH_FILE}" --project ${PROJECT} --force`, { stdio: 'inherit' });

fs.unlinkSync(PATCH_FILE);

console.log('✅ 완료!');
