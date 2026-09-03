// scripts/fixMegaTatsugiri.js
// 실행:
//   node scripts/fixMegaTatsugiri.js           (미리보기: 아무것도 안 씀)
//   node scripts/fixMegaTatsugiri.js --apply    (실제 반영)
//   node scripts/fixMegaTatsugiri.js --apply --with-stats   (능력치 기본값까지 정상 싸리용으로 되돌림)
//
// members/{id}/caughtPokemon 에 "메가 싸리용"(tatsugiri-*-mega, number 10322~10324 등)으로
// 저장된 개체를, 그 모습에 대응하는 일반 폼(말린/늘어진/펼친모습)으로 되돌린다.
// - 이미지/정체성 필드(number, nameEn, species, formVariant, pokemonId, imageUrl, spriteUrl,
//   iconUrl, shinySprite)를 정상 폼 값으로 교체
// - --with-stats 를 주면 base* 능력치도 일반 싸리용 값으로 교체
//
// 쓰기 직전에 해당 회원의 caughtPokemon 을 다시 읽어 uniqueId 로 인덱스를 재확인한다.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = process.env.PC_PROJECT || 'poke-commu-system';
const APPLY = process.argv.includes('--apply');
const WITH_STATS = process.argv.includes('--with-stats');

const CDN = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon';

const MEGA_TO_BASE = {
  10322: { number: 978,   nameEn: 'tatsugiri-curly',    formVariant: 'tatsugiri-curly',    id: 978,   label: '말린모습' },
  10323: { number: 10258, nameEn: 'tatsugiri-droopy',   formVariant: 'tatsugiri-droopy',   id: 10258, label: '늘어진모습' },
  10324: { number: 10259, nameEn: 'tatsugiri-stretchy', formVariant: 'tatsugiri-stretchy', id: 10259, label: '펼친모습' },
};

// 일반 싸리용 3폼 공통 base 능력치
const BASE_STATS = { baseHp: 68, baseAttack: 50, baseDefense: 60, baseSpAttack: 120, baseSpDefense: 95, baseSpeed: 82 };

function dbGet(dbPath) {
  const raw = execSync(
    `firebase database:get ${dbPath} --project ${PROJECT}`,
    { encoding: 'utf8', maxBuffer: 1024 * 1024 * 200, env: { ...process.env, MSYS_NO_PATHCONV: '1' } }
  );
  const start = raw.search(/[[{]/);
  return start === -1 ? null : JSON.parse(raw.slice(start));
}

let tmpCounter = 0;
function dbSet(dbPath, value) {
  const tmpFile = path.join(__dirname, `_tmp_megatatsu_${tmpCounter++}.json`);
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

function isMegaTatsugiri(p) {
  if (!p) return false;
  if ([10322, 10323, 10324].includes(Number(p.number))) return true;
  const idish = String(p.formVariant || p.nameEn || p.species || '').toLowerCase();
  const isMega = /-mega(-[xy])?$/.test(idish);
  const isTatsu = String(p.baseSpeciesEn || '').toLowerCase() === 'tatsugiri'
    || Number(p.originalNumber) === 978
    || idish.startsWith('tatsugiri');
  if (isMega && isTatsu) return true;
  const urls = `${p.imageUrl || ''} ${p.spriteUrl || ''} ${p.iconUrl || ''} ${p.shinySprite || ''}`;
  return /\b1032[234]\b/.test(urls);
}

function resolveBase(p) {
  if (MEGA_TO_BASE[Number(p.number)]) return MEGA_TO_BASE[Number(p.number)];
  const urls = `${p.imageUrl || ''} ${p.spriteUrl || ''} ${p.iconUrl || ''} ${p.shinySprite || ''}`;
  for (const megaNum of [10324, 10323, 10322]) if (urls.includes(String(megaNum))) return MEGA_TO_BASE[megaNum];
  const idish = String(p.formVariant || p.nameEn || p.species || '').toLowerCase();
  if (idish.includes('droopy')) return MEGA_TO_BASE[10323];
  if (idish.includes('stretchy')) return MEGA_TO_BASE[10324];
  return MEGA_TO_BASE[10322];
}

function buildFieldPatch(p) {
  const base = resolveBase(p);
  const patch = {
    number: base.number,
    nameEn: base.nameEn,
    species: base.nameEn,
    formVariant: base.formVariant,
    pokemonId: base.id,
    originalNumber: 978,
    imageUrl: `${CDN}/${base.number}.png`,
    spriteUrl: `${CDN}/${base.number}.png`,
    iconUrl: `${CDN}/versions/generation-viii/icons/${base.number}.png`,
    shinySprite: p.isShiny ? `${CDN}/shiny/${base.number}.png` : null,
  };
  if (WITH_STATS) Object.assign(patch, BASE_STATS);
  return { base, patch };
}

const members = dbGet('/members');
if (!members) { console.error('members 로드 실패'); process.exit(1); }

let fixed = 0;
let skipped = 0;

Object.entries(members).forEach(([memberId, member]) => {
  const caught = member && member.caughtPokemon;
  if (!Array.isArray(caught)) return;

  caught.forEach((p) => {
    if (!isMegaTatsugiri(p)) return;
    const memberName = member.name || memberId;
    const uniqueId = p.uniqueId;
    const { base, patch } = buildFieldPatch(p);

    if (!APPLY) {
      console.log(`[미리보기] ${memberName}(${memberId}) uniqueId=${uniqueId} -> ${base.label}(${base.number})`);
      Object.entries(patch).forEach(([k, v]) => console.log(`    ${k}: ${JSON.stringify(p[k])}  ->  ${JSON.stringify(v)}`));
      fixed += 1;
      return;
    }

    const fresh = dbGet(`/members/${memberId}/caughtPokemon`);
    const freshIndex = Array.isArray(fresh)
      ? fresh.findIndex((fp) => fp && uniqueId && fp.uniqueId === uniqueId)
      : -1;
    if (freshIndex === -1) {
      console.log(`[건너뜀] ${memberName}(${memberId}): uniqueId=${uniqueId} 재확인 시점에 없음`);
      skipped += 1;
      return;
    }

    Object.entries(patch).forEach(([field, value]) => {
      dbSet(`/members/${memberId}/caughtPokemon/${freshIndex}/${field}`, value);
    });
    console.log(`[완료] ${memberName}(${memberId}): caughtPokemon[${freshIndex}] -> ${base.label}(${base.number})`);
    fixed += 1;
  });
});

console.log(`\n${APPLY ? '반영' : '미리보기'} 완료: ${fixed}마리${skipped ? `, 건너뜀 ${skipped}마리` : ''}.`);
if (!APPLY) console.log('실제로 반영하려면 --apply 를 붙여 다시 실행하세요.');
