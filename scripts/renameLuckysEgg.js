// scripts/renameLuckysEgg.js
// 실행: node scripts/renameLuckysEgg.js
//
// 커스텀 아이템 "럭키의알"(gameData/customItems)의 name/nameEn은 이미 "럭키의알"/"luckys-egg"로
// 고쳐져 있지만, 그 전에 이미 회원들에게 지급된 인벤토리 스냅샷은 예전 값("럭키의 알"(공백 포함)
// / "lucky-egg")을 그대로 들고 있다 - 인벤토리는 지급 시점 스냅샷이라 카탈로그를 고쳐도 자동으로
// 갱신되지 않기 때문. 그 스냅샷들을 최신 이름으로 맞춘다.
//
// 각 회원의 inventory 배열 전체를 읽어서 통째로 덮어쓰지 않고, 대상 항목의 name/nameEn
// leaf 경로(members/{id}/inventory/{index}/name 등)만 직접 write한다 - 그래야 그 사이 다른 곳에서
// 같은 회원의 인벤토리에 생긴 변경(구매/지급 등)을 덮어쓸 위험이 없다.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'poke-commu-system';
const OLD_NAME = '럭키의 알';
const OLD_NAME_EN = 'lucky-egg';
const NEW_NAME = '럭키의알';
const NEW_NAME_EN = 'luckys-egg';
const CURRENT_CATALOG_ID = 'custom_1784302700765';

function dbGet(dbPath) {
  const raw = execSync(
    `firebase database:get "${dbPath}" --project ${PROJECT}`,
    { encoding: 'utf8', maxBuffer: 1024 * 1024 * 50, env: { ...process.env, MSYS_NO_PATHCONV: '1' } }
  );
  const jsonLine = raw.split('\n').find((line) => line.trim().startsWith('{') || line.trim().startsWith('['));
  return jsonLine ? JSON.parse(jsonLine) : null;
}

// Windows cmd.exe는 작은따옴표를 인용부호로 취급하지 않아 -d로 인라인 JSON을 넘기면 깨진다
// (기존 scripts/updateOrandaCategory.js와 동일하게 임시 파일을 경유해서 인코딩/인용 문제를 피한다).
let tmpCounter = 0;
function dbSet(dbPath, value) {
  const tmpFile = path.join(__dirname, `_tmp_lucky_egg_${tmpCounter++}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify(value), 'utf8');
  try {
    execSync(
      `firebase database:set "${dbPath}" "${tmpFile}" --project ${PROJECT} --force`,
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
  const inventory = member?.inventory;
  if (!Array.isArray(inventory)) return;

  const index = inventory.findIndex((item) => item && item.name === OLD_NAME);
  if (index === -1) return;

  const memberName = member.name || memberId;

  // write 직전에 해당 회원의 인벤토리를 다시 읽어, 그 사이 인덱스가 바뀌지 않았는지 재확인한다.
  const freshInventory = dbGet(`/members/${memberId}/inventory`);
  const freshIndex = Array.isArray(freshInventory)
    ? freshInventory.findIndex((item) => item && item.name === OLD_NAME)
    : -1;

  if (freshIndex === -1) {
    console.log(`[건너뜀] ${memberName}(${memberId}): 재확인 시점에 이미 없음`);
    skippedCount += 1;
    return;
  }

  dbSet(`/members/${memberId}/inventory/${freshIndex}/name`, NEW_NAME);
  dbSet(`/members/${memberId}/inventory/${freshIndex}/nameEn`, NEW_NAME_EN);
  // 예전에 삭제된 커스텀 아이템의 id를 그대로 물고 있던 itemId도 현재 카탈로그 id로 갱신
  dbSet(`/members/${memberId}/inventory/${freshIndex}/itemId`, CURRENT_CATALOG_ID);

  console.log(`[완료] ${memberName}(${memberId}): inventory[${freshIndex}] name/nameEn/itemId 수정`);
  fixedCount += 1;
});

console.log(`\n총 ${fixedCount}명 수정, ${skippedCount}명 건너뜀.`);
