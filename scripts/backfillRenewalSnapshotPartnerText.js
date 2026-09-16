// scripts/backfillRenewalSnapshotPartnerText.js
// partnerText가 captureRenewalSnapshot.js의 SNAPSHOT_FIELDS에 뒤늦게 추가되어,
// 이미 찍혀있는 renewalSnapshot들에는 이 필드가 빠져있다. "예전" 값은 따로 보존된 게
// 없으므로, 지금 시점의 현재 member.partnerText를 각 멤버의 renewalSnapshot.partnerText에
// 그대로 채워넣는다 (다른 스냅샷 필드는 건드리지 않음).
// 실행: node scripts/backfillRenewalSnapshotPartnerText.js            (dry-run)
//      node scripts/backfillRenewalSnapshotPartnerText.js --apply

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'poke-commu-system';
const BASE = 'https://poke-commu-system-default-rtdb.firebaseio.com';
const PATCH_FILE = path.join(__dirname, '_tmp_backfill_partner_text_patch.json');

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');

function fetchJSON(url) {
  const raw = execSync(`curl -s "${url}"`, { maxBuffer: 1024 * 1024 * 200 }).toString();
  return JSON.parse(raw);
}

const members = fetchJSON(`${BASE}/members.json`) || {};

const patch = {};
const filled = [];
const skippedNoSnapshot = [];
const skippedNoText = [];
const skippedAlready = [];

for (const [memberId, member] of Object.entries(members)) {
  if (!member || typeof member !== 'object') continue;
  if (!member.renewalSnapshot) { skippedNoSnapshot.push(member.name || memberId); continue; }
  if (member.renewalSnapshot.partnerText !== undefined) { skippedAlready.push(member.name || memberId); continue; }
  if (!member.partnerText) { skippedNoText.push(member.name || memberId); continue; }

  patch[`members/${memberId}/renewalSnapshot/partnerText`] = member.partnerText;
  filled.push(member.name || memberId);
}

console.log(`채울 대상: ${filled.length}명`);
filled.forEach((name) => console.log(`  - ${name}`));
if (skippedAlready.length > 0) {
  console.log(`이미 partnerText 있어 건너뜀(${skippedAlready.length}명):`);
  skippedAlready.forEach((name) => console.log(`  - ${name}`));
}
if (skippedNoText.length > 0) {
  console.log(`현재 partnerText가 없어 건너뜀(${skippedNoText.length}명):`);
  skippedNoText.forEach((name) => console.log(`  - ${name}`));
}
console.log(`renewalSnapshot 자체가 없어 대상 아님: ${skippedNoSnapshot.length}명`);

if (filled.length === 0) {
  console.log('채울 대상이 없습니다.');
  process.exit(0);
}

if (!apply) {
  console.log('\nDry run만 수행했습니다. 실제로 저장하려면 --apply 를 붙여 재실행하세요.');
  process.exit(0);
}

fs.writeFileSync(PATCH_FILE, JSON.stringify(patch, null, 2));
console.log('\nFirebase에 적용 중...');
execSync(`firebase database:update / "${PATCH_FILE}" --project ${PROJECT} --force`, { stdio: 'inherit' });
fs.unlinkSync(PATCH_FILE);

console.log(`✅ ${filled.length}명의 renewalSnapshot.partnerText 채우기 완료.`);
