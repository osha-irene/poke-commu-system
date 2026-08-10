// 사파리볼 지급 버그(itemId 누락)로 인해 볼 목록에 안 보이던 사용자들의
// lastSafariBallRewardDate를 오늘 날짜에서 지워서, 다음 사파리 탐험 시
// (수정된 로직으로) 오늘 몫을 다시 지급받게 한다.
let admin;
try {
  admin = require('firebase-admin');
} catch (_) {
  admin = require('../functions/node_modules/firebase-admin');
}

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const getArgValue = (name) => {
  const prefix = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
};
const onlyMemberId = getArgValue('--member');
const databaseURL =
  process.env.FIREBASE_DATABASE_URL ||
  process.env.REACT_APP_FIREBASE_DATABASE_URL ||
  'https://poke-commu-system-default-rtdb.firebaseio.com';

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

if (!admin.apps.length) {
  admin.initializeApp({ databaseURL });
}

const db = admin.database();

(async () => {
  const todayKey = getLocalDateKey();
  const members = (await db.ref('members').once('value')).val() || {};
  const updates = {};
  const changes = [];

  for (const [memberId, member] of Object.entries(members)) {
    if (onlyMemberId && memberId !== onlyMemberId) continue;
    if (member?.lastSafariBallRewardDate !== todayKey) continue;

    // itemId 누락된 깨진 사파리볼 인벤토리 항목이 있는 경우만 대상으로 한다.
    const inventory = Array.isArray(member?.inventory) ? member.inventory : [];
    const brokenEntry = inventory.find((item) =>
      (item?.nameEn === 'safari-ball' || item?.name === '사파리볼') && item?.itemId == null
    );
    if (!brokenEntry) continue;

    updates[`members/${memberId}/lastSafariBallRewardDate`] = null;
    changes.push({ memberId, memberName: member?.name || memberId });
  }

  console.log(`Found ${changes.length} member(s) with today's safari ball reward flag + broken inventory entry.`);
  changes.forEach((c) => console.log(`- ${c.memberName} (${c.memberId})`));

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to update Firebase.');
    return;
  }

  if (changes.length === 0) return;
  await db.ref().update(updates);
  console.log(`Reset lastSafariBallRewardDate for ${changes.length} member(s).`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
