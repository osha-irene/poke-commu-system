// scripts/fixAbilityMismatches.js
// 실행: node scripts/fixAbilityMismatches.js         (dry-run, 콘솔에 변경 예정 내역만 출력)
//       node scripts/fixAbilityMismatches.js --apply (실제 Firebase에 반영)
//
// 대상: 종족(allPokemon.json)이 가질 수 있는 특성 목록(abilitiesEn + hiddenAbilityEn)에
// 아예 없는 특성을 들고 있는 개체들만. (히든 특성 플래그 건은 사용자 확인 결과 오류가 아니어서 제외.
// allPokemon.json의 fletchinder/talonflame/pawmo/pawmot 등 진화형 특성 값도 사용자 확인 결과
// 정상 데이터라, big-pecks/static을 들고 있는 개체 쪽이 종족 목록과 안 맞는 진짜 오류.)
//
// 각 대상은 memberId + uniqueId로 특정하고, write 직전에 해당 회원의 caughtPokemon(또는
// partnerPokemon)을 다시 읽어 인덱스/값이 여전히 유효한지 재확인한 뒤 leaf 경로만 write한다
// (scripts/renameLuckysEgg.js와 동일한 안전 패턴 - 그 사이 다른 곳에서 생긴 변경을 덮어쓰지 않기 위함).

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'poke-commu-system';
const apply = process.argv.includes('--apply');

function dbGet(dbPath) {
  const raw = execSync(
    `firebase database:get "${dbPath}" --project ${PROJECT}`,
    { encoding: 'utf8', maxBuffer: 1024 * 1024 * 50, env: { ...process.env, MSYS_NO_PATHCONV: '1' } }
  );
  const jsonLine = raw.split('\n').find((line) => line.trim().startsWith('{') || line.trim().startsWith('['));
  return jsonLine ? JSON.parse(jsonLine) : null;
}

let tmpCounter = 0;
function dbSet(dbPath, value) {
  const tmpFile = path.join(__dirname, `_tmp_ability_fix_${tmpCounter++}.json`);
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

// patch: { ability?, abilityEn? } - 바뀌는 필드만 적는다
const targets = [
  { memberId: '80Xb03Cxw2a1DebHbYiLxWR0GpC2', memberName: '바키타', location: 'caughtPokemon', uniqueId: '1783535374109-kv651o3il', species: 'butterfree', patch: { ability: '복안', abilityEn: 'compound-eyes' } },
  { memberId: '80Xb03Cxw2a1DebHbYiLxWR0GpC2', memberName: '바키타', location: 'caughtPokemon', uniqueId: '1783535397369-19l94v7wm', species: 'dustox', patch: { ability: '인분', abilityEn: 'shield-dust' } },
  { memberId: 'pmkypKrfsOPFOOwOHxdYFqYlbYd2', memberName: '올리', location: 'caughtPokemon', uniqueId: '1784127836532-poasai6th', species: 'gyarados', patch: { ability: '위협', abilityEn: 'intimidate' } },
  { memberId: 'pmkypKrfsOPFOOwOHxdYFqYlbYd2', memberName: '올리', location: 'caughtPokemon', uniqueId: '1783526234467-ed8u3yi2l', species: 'beautifly', patch: { ability: '벌레의알림', abilityEn: 'swarm' } },
  { memberId: 'tCiwS0ZPDeaG5VCTjorr3bcP4Hx2', memberName: '히나타', location: 'caughtPokemon', uniqueId: '1783526362247-vv5zrnft4', species: 'beautifly', patch: { ability: '벌레의알림', abilityEn: 'swarm' } },
  { memberId: 'tCiwS0ZPDeaG5VCTjorr3bcP4Hx2', memberName: '히나타', location: 'caughtPokemon', uniqueId: '1783526343918-0rz0tan4q', species: 'vivillon', patch: { ability: '인분', abilityEn: 'shield-dust' } },
  { memberId: 'tCiwS0ZPDeaG5VCTjorr3bcP4Hx2', memberName: '히나타', location: 'caughtPokemon', uniqueId: '1783526446960-isuikwwfw', species: 'dustox', patch: { ability: '인분', abilityEn: 'shield-dust' } },
  { memberId: 'ujAc1QZcxzMVzj6tcmXzZOpUwHj1', memberName: '주목', location: 'caughtPokemon', uniqueId: '1783696180213-5dvnhs4am', species: 'silcoon', patch: { ability: '탈피', abilityEn: 'shed-skin' } },
  { memberId: 'jfw9wJ4ApiYWQWYIIU6SV731Qf62', memberName: '배틀테스트2', location: 'caughtPokemon', uniqueId: '1781932067349-3rgeebmk3', species: 'palafin-zero', patch: { ability: '마이티체인지', abilityEn: 'zero-to-hero' } },

  // 마스터 데이터(fletchinder=flame-body, pawmo=volt-absorb)가 정상으로 확인되어,
  // big-pecks/static을 들고 있는 개체 쪽이 종족 목록과 안 맞는 진짜 오류
  { memberId: '0RNFSW68miWy9iTRd7fPVjGZ7gi1', memberName: '강투', location: 'caughtPokemon', uniqueId: '1783525654155-z6auu93kw', species: 'fletchinder', patch: { ability: '불꽃몸', abilityEn: 'flame-body' } },
  { memberId: 'VQy62Glq11fOMcARMJ81kf8XtEI2', memberName: '하영', location: 'caughtPokemon', uniqueId: '1783650558732-ehwbbzg1m', species: 'fletchinder', patch: { ability: '불꽃몸', abilityEn: 'flame-body' } },
  { memberId: 'pmkypKrfsOPFOOwOHxdYFqYlbYd2', memberName: '올리', location: 'caughtPokemon', uniqueId: '1783525842771-i6lmkws0y', species: 'fletchinder', patch: { ability: '불꽃몸', abilityEn: 'flame-body' } },
  { memberId: '8NtbBcFQQYYSWt6kp9lnRWC2kQk1', memberName: '선', location: 'caughtPokemon', uniqueId: '1783526016267-q27pq466c', species: 'pawmo', patch: { ability: '축전', abilityEn: 'volt-absorb' } },
  { memberId: 'BjE44tNcrchBOlWOSzW6fWgf7rg2', memberName: '현호', location: 'caughtPokemon', uniqueId: '1783525609734-vqv4obtzr', species: 'pawmo', patch: { ability: '축전', abilityEn: 'volt-absorb' } },
  { memberId: 'KkBErCkZmdXYqJXyuKyBzsXozC73', memberName: '나몬', location: 'caughtPokemon', uniqueId: '1783538174094-vs3gtyvvt', species: 'pawmo', patch: { ability: '축전', abilityEn: 'volt-absorb' } },
  { memberId: 'gnZ4lYx7VoM8i9YoupFnmWSyrmG2', memberName: '비비', location: 'caughtPokemon', uniqueId: '1783526011921-ly9gynv6h', species: 'pawmo', patch: { ability: '축전', abilityEn: 'volt-absorb' } },
  { memberId: 'pmkypKrfsOPFOOwOHxdYFqYlbYd2', memberName: '올리', location: 'caughtPokemon', uniqueId: '1783695811772-8qjneo6m2', species: 'pawmo', patch: { ability: '축전', abilityEn: 'volt-absorb' } },
  { memberId: 'tCiwS0ZPDeaG5VCTjorr3bcP4Hx2', memberName: '히나타', location: 'caughtPokemon', uniqueId: '1783609656016-1stxpups6', species: 'pawmo', patch: { ability: '축전', abilityEn: 'volt-absorb' } },
];

let fixedCount = 0;
let skippedCount = 0;

for (const target of targets) {
  const { memberId, memberName, uniqueId, species, patch } = target;

  // Firebase는 caughtPokemon이 sparse array일 경우 배열이 아니라 숫자 키 객체로 반환하기도
  // 하므로 Array.isArray로 단정하지 않고 Object.entries로 순회한다.
  const freshList = dbGet(`/members/${memberId}/caughtPokemon`);
  const entries = freshList && typeof freshList === 'object' ? Object.entries(freshList) : [];
  const match = entries.find(([, p]) => p && p.uniqueId === uniqueId);

  if (!match) {
    console.log(`[건너뜀] ${memberName}(${memberId}) / ${species} (${uniqueId}): 재확인 시점에 이미 없음`);
    skippedCount += 1;
    continue;
  }

  const [freshIndex, current] = match;
  console.log(`[대상] ${memberName} / ${species} #${freshIndex} (${uniqueId})`);
  console.log(`  현재: ability=${current.ability}, abilityEn=${current.abilityEn}, isHiddenAbility=${current.isHiddenAbility}`);
  console.log(`  변경: ${JSON.stringify(patch)}`);

  if (apply) {
    for (const [field, value] of Object.entries(patch)) {
      dbSet(`/members/${memberId}/caughtPokemon/${freshIndex}/${field}`, value);
    }
    console.log('  -> 적용 완료');
  }
  fixedCount += 1;
}

console.log(`\n총 ${fixedCount}건 ${apply ? '적용' : '적용 예정 (dry-run)'}, ${skippedCount}건 건너뜀.`);
if (!apply) {
  console.log('실제 반영하려면 --apply 옵션을 붙여 다시 실행하세요.');
}
