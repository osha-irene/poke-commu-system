// scripts/captureRenewalSnapshot.js
// 멤버디테일 메인/설명 탭 리뉴얼 전에, 캐릭터 이미지와 메인/설명 탭 콘텐츠를
// members/{id}/renewalSnapshot 에 얼려서 저장해둔다 (나중에 "리뉴얼 전 보기" 버튼으로 다시 봄).
// NPC(isNPC)는 이번 범위(멤버디테일) 밖이라 제외. 이미 renewalSnapshot이 있는 멤버는 --force 없이는 건너뜀.
// 실행: node scripts/captureRenewalSnapshot.js       (dry-run)
//      node scripts/captureRenewalSnapshot.js --apply [--force]

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'poke-commu-system';
const BASE = 'https://poke-commu-system-default-rtdb.firebaseio.com';
const PATCH_FILE = path.join(__dirname, '_tmp_renewal_snapshot_patch.json');

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const force = args.has('--force');

// MembersView.jsx의 tab === 'main' / tab === 'text' 블록에서 실제로 표시되는 필드만 고른다.
const SNAPSHOT_FIELDS = [
  'profileImage', 'profileImageFull', 'profileImageThumb', 'profileImageUrl',
  'charImageLeft', 'charImageTop', 'charImageWidth', 'charImageScrollEnabled',
  'bio', 'note', 'catchphrase',
  'age', 'height', 'weight', 'hometown',
  'keywords', 'keywordTexts', 'etcText',
  'accentColor',
];

function fetchJSON(url) {
  const raw = execSync(`curl -s "${url}"`, { maxBuffer: 1024 * 1024 * 200 }).toString();
  return JSON.parse(raw);
}

const members = fetchJSON(`${BASE}/members.json`) || {};

const patch = {};
const captured = [];
const skipped = [];

for (const [memberId, member] of Object.entries(members)) {
  if (!member || typeof member !== 'object') continue;
  if (member.isNPC) continue;

  if (member.renewalSnapshot && !force) {
    skipped.push(member.name || memberId);
    continue;
  }

  const snapshot = { capturedAt: Date.now() };
  for (const field of SNAPSHOT_FIELDS) {
    const value = member[field];
    if (value !== undefined) snapshot[field] = value;
  }

  patch[`members/${memberId}/renewalSnapshot`] = snapshot;
  captured.push(member.name || memberId);
}

console.log(`캡처 대상: ${captured.length}명`);
captured.forEach((name) => console.log(`  - ${name}`));
if (skipped.length > 0) {
  console.log(`이미 renewalSnapshot 있어 건너뜀(${skipped.length}명, --force로 재캡처 가능):`);
  skipped.forEach((name) => console.log(`  - ${name}`));
}

if (captured.length === 0) {
  console.log('캡처할 대상이 없습니다.');
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

console.log(`✅ ${captured.length}명의 renewalSnapshot 저장 완료.`);
