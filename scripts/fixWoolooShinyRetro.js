// scripts/fixWoolooShinyRetro.js
// 실행: node scripts/fixWoolooShinyRetro.js
//
// 우르(#831) 이로치의 shinySprite를 고정 Firebase Storage 이미지로 픽스했지만
// (src/data/allPokemon.json), 이미 잡아서 members/{id}/caughtPokemon에 저장된 개체는
// 캐치 시점 스냅샷을 그대로 들고 있어 자동으로 반영되지 않는다.
// 상세 화면(getOwnedPokemonSpriteUrl)은 이로치일 때 pokemon.shinySprite 필드를
// 최우선으로 읽는데, 기존 개체는 그 필드가 비어 있어(spriteUrl은 이미 맞더라도)
// 화면에 반영되지 않았다. shinySprite/iconUrl을 새 URL로 맞춘다.
//
// uniqueId로 대상을 식별하고, write 직전에 해당 회원의 caughtPokemon을 다시 읽어
// 그 사이 인덱스가 바뀌지 않았는지 재확인한다(동시에 다른 곳에서 잡거나 거래해
// 배열이 바뀔 수 있으므로).

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'poke-commu-system';
const TARGET_NUMBER = 831;
const NEW_URL = 'https://firebasestorage.googleapis.com/v0/b/poke-commu-system.firebasestorage.app/o/pokemon%2F831.png?alt=media&token=1f58f98c-22bd-40fc-a48d-5ec526a7b552';

function dbGet(dbPath) {
  const raw = execSync(
    `firebase database:get ${dbPath} --project ${PROJECT}`,
    { encoding: 'utf8', maxBuffer: 1024 * 1024 * 50, env: { ...process.env, MSYS_NO_PATHCONV: '1' } }
  );
  const jsonLine = raw.split('\n').find((line) => line.trim().startsWith('{') || line.trim().startsWith('['));
  return jsonLine ? JSON.parse(jsonLine) : null;
}

let tmpCounter = 0;
function dbSet(dbPath, value) {
  const tmpFile = path.join(__dirname, `_tmp_wooloo_${tmpCounter++}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify(value), 'utf8');
  try {
    execSync(
      `firebase database:set ${dbPath} ${tmpFile} --project ${PROJECT} --force`,
      { encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' } }
    );
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

const members = dbGet('/members');
if (!members) {
  console.error('members 데이터를 불러오지 못했습니다.');
  process.exit(1);
}

let fixedCount = 0;
let skippedCount = 0;

Object.entries(members).forEach(([memberId, member]) => {
  const caught = member?.caughtPokemon;
  if (!Array.isArray(caught)) return;

  const targets = caught.filter((p) => p && p.number === TARGET_NUMBER && p.isShiny === true);
  if (targets.length === 0) return;

  const memberName = member.name || memberId;

  targets.forEach((p) => {
    const uniqueId = p.uniqueId;

    const freshCaught = dbGet(`/members/${memberId}/caughtPokemon`);
    const freshIndex = Array.isArray(freshCaught)
      ? freshCaught.findIndex((fp) => fp && uniqueId && fp.uniqueId === uniqueId)
      : -1;

    if (freshIndex === -1) {
      console.log(`[건너뜀] ${memberName}(${memberId}): uniqueId=${uniqueId} 재확인 시점에 없음`);
      skippedCount += 1;
      return;
    }

    dbSet(`/members/${memberId}/caughtPokemon/${freshIndex}/shinySprite`, NEW_URL);
    dbSet(`/members/${memberId}/caughtPokemon/${freshIndex}/spriteUrl`, NEW_URL);
    dbSet(`/members/${memberId}/caughtPokemon/${freshIndex}/iconUrl`, NEW_URL);

    console.log(`[완료] ${memberName}(${memberId}): caughtPokemon[${freshIndex}] (uniqueId=${uniqueId}) shinySprite/spriteUrl/iconUrl 갱신`);
    fixedCount += 1;
  });
});

console.log(`\n총 ${fixedCount}마리 수정, ${skippedCount}마리 건너뜀.`);
