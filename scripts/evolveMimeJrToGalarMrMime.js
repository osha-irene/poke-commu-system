// scripts/evolveMimeJrToGalarMrMime.js
// 실행: node scripts/evolveMimeJrToGalarMrMime.js [--dry-run]
//
// 배경: 트레이너 ZsZ3IOSAbAOC1GjgA6HfiwpYkSy1("금루")의 흉내내(진안, uniqueId
// 1790862869236-ztqo450ft, caughtPokemon[18])를 가라르 마임맨(id/number 10168)으로
// 관리자 수동 진화시킨다. evolutions.json에는 439(흉내내) → 122(마임맨) 경로만 있고
// 439 → 10168(가라르 마임맨) 경로가 없어 인게임/관리자 패널의 "진화 루트" 버튼으로는
// 처리할 수 없다 (src/data/evolutions.json, src/components/views/admin/member/MemberPokemonTab.jsx
// getEvolutionCandidates 참고).
//
// src/hooks/pokemon/useEvolution.js의 performEvolution → evolvePokemonObject가 실제
// 진화 시 갱신하는 필드를 그대로 재현한다: number/originalNumber/pokemonId, name/nameEn,
// species/regionalForm/formVariant/isRegionalForm/baseSpecies/baseSpeciesEn, type/type2,
// abilitiesEn/hiddenAbilityEn + resolveEvolvedAbility(특성 재배정), getBaseStatPatch(종족값),
// image/icon/spriteUrl, evolutionCancelled=false. 닉네임("진안")은 종족명이 아니므로 유지.
// 특성: 기존 "filter"는 가라르 마임맨의 일반 특성(vital-spirit/screen-cleaner)도 숨겨진
// 특성(ice-body)도 아니라서 resolveEvolvedAbility 로직대로 일반 특성 중 하나로 재배정—
// "의기양양(vital-spirit)"으로 고정 배정한다.
//
// evolutionHistory / homeFeed/evolution 갱신도 performEvolution과 동일하게 반영해서
// 실제 플레이 중 진화한 것과 동일하게 보이도록 한다.
//
// fixRegionalTradeEvolution.js와 동일한 패턴: 전체가 아니라 이 멤버 하나만 읽어 patch/backup
// 오브젝트를 만들고 firebase database:update 한 방으로 반영한다. 되돌리려면 백업 JSON을
// 그대로 database:update 하면 된다.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'poke-commu-system';
const BASE = 'https://poke-commu-system-default-rtdb.firebaseio.com';
const MEMBER_ID = 'ZsZ3IOSAbAOC1GjgA6HfiwpYkSy1';
const TARGET_UNIQUE_ID = '1790862869236-ztqo450ft';

const BACKUP = path.join(__dirname, `_backup_evolve_mimejr_galarmrmime_${Date.now()}.json`);
const PATCH_FILE = path.join(__dirname, '_tmp_evolve_mimejr_galarmrmime_patch.json');

const allPokemon = require('../src/data/allPokemon.json');
const evolvedTemplate = allPokemon.find((t) => Number(t.number) === 10168);

if (!evolvedTemplate) {
  console.error('❌ allPokemon.json에서 가라르 마임맨(number 10168) 템플릿을 찾지 못했습니다.');
  process.exit(1);
}

function fetchJSON(url) {
  const raw = execSync(`curl -s "${url}"`, { maxBuffer: 1024 * 1024 * 50 }).toString();
  return JSON.parse(raw);
}

const member = fetchJSON(`${BASE}/members/${MEMBER_ID}.json`);
if (!member) {
  console.error(`❌ 멤버를 찾지 못했습니다: ${MEMBER_ID}`);
  process.exit(1);
}

const caughtPokemon = Array.isArray(member.caughtPokemon) ? member.caughtPokemon : [];
const idx = caughtPokemon.findIndex((p) => p && p.uniqueId === TARGET_UNIQUE_ID);

if (idx === -1) {
  console.error(`❌ caughtPokemon에서 uniqueId=${TARGET_UNIQUE_ID} 개체를 찾지 못했습니다. (인덱스가 바뀌었을 수 있음)`);
  process.exit(1);
}

const pokemon = caughtPokemon[idx];
if (Number(pokemon.number) !== 439 || pokemon.nameEn !== 'Mime Jr.') {
  console.error('❌ 대상 개체가 흉내내(number 439)가 아닙니다. 데이터가 바뀐 것 같아 중단합니다.', {
    number: pokemon.number,
    nameEn: pokemon.nameEn,
  });
  process.exit(1);
}

console.log(`대상: ${member.name || MEMBER_ID} / ${pokemon.name}(${pokemon.nickname || '-'}) Lv.${pokemon.level} → ${evolvedTemplate.name}`);

// --- resolveEvolvedAbility (useEvolution.js와 동일 로직) ---
function resolveEvolvedAbility(p, template) {
  const wasHidden = Boolean(p.isHiddenAbility);
  const abilitiesEn = template.abilitiesEn || [];
  const hiddenAbilityEn = template.hiddenAbilityEn || null;
  const currentAbilityEn = p.abilityEn;

  const stillHasAbility = wasHidden
    ? Boolean(currentAbilityEn) && currentAbilityEn === hiddenAbilityEn
    : Boolean(currentAbilityEn) && abilitiesEn.includes(currentAbilityEn);

  if (stillHasAbility) {
    return { ability: p.ability, abilityEn: currentAbilityEn, isHiddenAbility: wasHidden };
  }

  if (wasHidden && hiddenAbilityEn) {
    return { ability: '빙기운(얼음몸)', abilityEn: hiddenAbilityEn, isHiddenAbility: true };
  }

  if (abilitiesEn.length > 0) {
    // 결과를 재현 가능하게 고정 배정 (의기양양)
    return { ability: '의기양양', abilityEn: 'vital-spirit', isHiddenAbility: false };
  }

  return { ability: p.ability, abilityEn: currentAbilityEn, isHiddenAbility: wasHidden };
}

// --- getBaseName (pokemonDisplayName.js의 getPokemonDisplayParts(template).name과 동일 결과) ---
// 가라르 마임맨 템플릿 name: "마임맨 (가라르의 모습)", regionalForm: "galar"
// → 괄호 앞부분 "마임맨"
function getBaseName(template) {
  const match = String(template.name || '').match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : (template.baseSpecies || template.name);
}

const abilityPatch = resolveEvolvedAbility(pokemon, evolvedTemplate);
const newBaseName = getBaseName(evolvedTemplate);

const evolvedFields = {
  number: evolvedTemplate.number,
  originalNumber: evolvedTemplate.originalNumber || evolvedTemplate.number,
  pokemonId: evolvedTemplate.number,
  name: newBaseName,
  nameEn: evolvedTemplate.nameEn,
  species: evolvedTemplate.species || evolvedTemplate.nameEn,
  regionalForm: evolvedTemplate.regionalForm || null,
  formVariant: evolvedTemplate.formVariant || null,
  isRegionalForm: Boolean(evolvedTemplate.isRegionalForm),
  baseSpecies: evolvedTemplate.baseSpecies || null,
  baseSpeciesEn: evolvedTemplate.baseSpeciesEn || null,
  type: evolvedTemplate.type,
  type2: evolvedTemplate.type2 || null,
  abilitiesEn: evolvedTemplate.abilitiesEn || pokemon.abilitiesEn,
  hiddenAbilityEn: evolvedTemplate.hiddenAbilityEn ?? pokemon.hiddenAbilityEn,
  ability: abilityPatch.ability,
  abilityEn: abilityPatch.abilityEn,
  isHiddenAbility: abilityPatch.isHiddenAbility,
  baseHp: evolvedTemplate.baseHp,
  baseAttack: evolvedTemplate.baseAttack,
  baseDefense: evolvedTemplate.baseDefense,
  baseSpAttack: evolvedTemplate.baseSpAttack,
  baseSpDefense: evolvedTemplate.baseSpDefense,
  baseSpeed: evolvedTemplate.baseSpeed,
  imageUrl: evolvedTemplate.imageUrl,
  iconUrl: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-viii/icons/${evolvedTemplate.number}.png`,
  spriteUrl: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${evolvedTemplate.number}.png`,
  nickname: (pokemon.nickname && pokemon.nickname !== pokemon.name && pokemon.nickname !== pokemon.nameEn) ? pokemon.nickname : null,
  evolutionCancelled: false,
};

const basePath = `members/${MEMBER_ID}/caughtPokemon/${idx}`;
const patch = {};
const backup = {};

for (const [key, value] of Object.entries(evolvedFields)) {
  const cur = pokemon[key] ?? null;
  const next = value ?? null;
  if (cur === next) continue;
  patch[`${basePath}/${key}`] = next;
  backup[`${basePath}/${key}`] = cur;
}

// --- evolutionHistory (performEvolution과 동일) ---
const evolvedAt = Date.now();
const historyEntry = {
  id: `evolution_${TARGET_UNIQUE_ID}_${evolvedAt}`,
  pokemonId: TARGET_UNIQUE_ID,
  fromName: pokemon.nickname || pokemon.name,
  toName: newBaseName,
  toNameEn: evolvedTemplate.nameEn,
  toNumber: evolvedTemplate.number,
  imageUrl: evolvedTemplate.imageUrl,
  evolvedAt,
};
const currentHistory = Array.isArray(member.evolutionHistory) ? member.evolutionHistory : [];
const newHistory = [historyEntry, ...currentHistory.filter(Boolean)].slice(0, 10);
patch[`members/${MEMBER_ID}/evolutionHistory`] = newHistory;
backup[`members/${MEMBER_ID}/evolutionHistory`] = currentHistory;

// --- homeFeed/evolution (performEvolution과 동일) ---
const homeFeedEntry = {
  id: historyEntry.id,
  trainerName: member.name || member.nickname || '누군가',
  toName: newBaseName,
  toNameEn: evolvedTemplate.nameEn,
  imageUrl: evolvedTemplate.imageUrl,
  eventTime: evolvedAt,
};
const currentHomeFeed = fetchJSON(`${BASE}/homeFeed/evolution.json`);
patch['homeFeed/evolution'] = homeFeedEntry;
backup['homeFeed/evolution'] = currentHomeFeed ?? null;

console.log(`\n패치 필드 ${Object.keys(patch).length}개:`);
console.log(JSON.stringify(patch, null, 2));

fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 2));
console.log(`\n백업 저장: ${BACKUP}`);
console.log('(되돌리려면: firebase database:update / "' + path.basename(BACKUP) + '" --project ' + PROJECT + ' --force)');

if (process.argv.includes('--dry-run')) {
  fs.writeFileSync(PATCH_FILE, JSON.stringify(patch, null, 2));
  console.log(`\n[dry-run] 패치 미리보기 저장: ${PATCH_FILE} (Firebase에 적용하지 않음)`);
  process.exit(0);
}

fs.writeFileSync(PATCH_FILE, JSON.stringify(patch, null, 2));
console.log('\nFirebase에 적용 중...');
execSync(`firebase database:update / "${PATCH_FILE}" --project ${PROJECT} --force`, { stdio: 'inherit' });
fs.unlinkSync(PATCH_FILE);

console.log('✅ 완료! 흉내내(진안) → 가라르 마임맨 진화 반영됨.');
