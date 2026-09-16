// scripts/setRenewalSnapshotImage.js
// members/{id}/renewalSnapshot 안의 이미지 필드 하나만 지정한 URL로 갱신한다.
// 예전 이미지가 같은 Storage 경로에 덮어써져 사라진 멤버들 중, 어딘가(로컬 백업 등)에서
// 원본 이미지를 되찾아 Storage에 새로 업로드했다면, 그 URL을 이 스크립트로 renewalSnapshot에
// 다시 꽂아넣는다. captureRenewalSnapshot.js와 달리 스냅샷 전체를 새로 찍지 않고
// 지정한 필드 하나만 patch한다 — 다른 스냅샷 필드(bio, keywords 등)는 그대로 둔다.
// 실행: node scripts/setRenewalSnapshotImage.js <memberId> <profileImage|profileImageFull|profileImageThumb> <url>            (dry-run)
//      node scripts/setRenewalSnapshotImage.js <memberId> <profileImage|profileImageFull|profileImageThumb> <url> --apply

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'poke-commu-system';
const BASE = 'https://poke-commu-system-default-rtdb.firebaseio.com';
const PATCH_FILE = path.join(__dirname, '_tmp_renewal_snapshot_image_patch.json');

const VALID_FIELDS = ['profileImage', 'profileImageFull', 'profileImageThumb'];

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const positional = args.filter(a => a !== '--apply');
const [memberId, field, url] = positional;

if (!memberId || !field || !url) {
  console.log('사용법: node scripts/setRenewalSnapshotImage.js <memberId> <profileImage|profileImageFull|profileImageThumb> <url> [--apply]');
  process.exit(1);
}

if (!VALID_FIELDS.includes(field)) {
  console.log(`field는 다음 중 하나여야 합니다: ${VALID_FIELDS.join(', ')}`);
  process.exit(1);
}

function fetchJSON(url) {
  const raw = execSync(`curl -s "${url}"`, { maxBuffer: 1024 * 1024 * 200 }).toString();
  return JSON.parse(raw);
}

const member = fetchJSON(`${BASE}/members/${memberId}.json`);
if (!member) {
  console.log(`멤버를 찾을 수 없습니다: ${memberId}`);
  process.exit(1);
}
if (!member.renewalSnapshot) {
  console.log(`이 멤버에는 renewalSnapshot이 없습니다: ${member.name || memberId}`);
  process.exit(1);
}

const before = member.renewalSnapshot[field];
console.log(`대상: ${member.name || memberId} (${memberId})`);
console.log(`필드: renewalSnapshot.${field}`);
console.log(`  기존: ${before || '(없음)'}`);
console.log(`  변경: ${url}`);

if (!apply) {
  console.log('\nDry run만 수행했습니다. 실제로 저장하려면 --apply 를 붙여 재실행하세요.');
  process.exit(0);
}

const patch = {
  [`members/${memberId}/renewalSnapshot/${field}`]: url,
};

fs.writeFileSync(PATCH_FILE, JSON.stringify(patch, null, 2));
console.log('\nFirebase에 적용 중...');
execSync(`firebase database:update / "${PATCH_FILE}" --project ${PROJECT} --force`, { stdio: 'inherit' });
fs.unlinkSync(PATCH_FILE);

console.log('✅ 저장 완료.');
