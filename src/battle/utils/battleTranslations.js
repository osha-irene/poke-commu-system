import movesData from '../../data/moves.json';
import abilitiesData from '../../data/abilities.json';
import itemsData from '../../data/items.json';
import customBattleData from '../../data/customBattleData.json';

export const normalizeBattleKey = (value) => String(value || '')
  .toLowerCase()
  .replace(/[\s_\-'.:]/g, '')
  .replace(/[^\p{L}\p{N}]/gu, '');

const addTranslation = (map, keys, value) => {
  if (!value) return;
  keys.forEach((key) => {
    const normalized = normalizeBattleKey(key);
    if (normalized) map[normalized] = value;
  });
};

const moveNames = {};
const abilityNames = {};
const itemNames = {};
const showdownItemNames = {};

(movesData.moves || []).forEach((move) => {
  addTranslation(moveNames, [move.id, move.nameEn, move.name], move.name || move.nameEn || move.id);
});

(abilitiesData.abilities || []).forEach((ability) => {
  addTranslation(abilityNames, [ability.id, ability.nameEn, ability.name], ability.name || ability.nameEn || ability.id);
});

// customBattleData.json의 커스텀 메가진화 특성(쾌속 등)은 abilities.json(PokeAPI 기반
// 공식 특성 목록)에 없어서, 위 루프만으로는 번역되지 않고 영문 이름이 그대로 노출된다.
// customMegaEvolutions의 ability/abilityKo 쌍과 aliases.abilityLabels를 추가로 병합한다.
(customBattleData.customMegaEvolutions || []).forEach((mega) => {
  addTranslation(abilityNames, [mega.ability], mega.abilityKo || mega.ability);
});
Object.entries(customBattleData.aliases?.abilityLabels || {}).forEach(([key, label]) => {
  addTranslation(abilityNames, [key], label);
});

const items = Array.isArray(itemsData) ? itemsData : (itemsData.items || []);

items.forEach((item) => {
  addTranslation(itemNames, [item.id, item.nameEn, item.name], item.name || item.nameEn || item.id);
  [item.id, item.nameEn, item.name].forEach((key) => {
    const normalized = normalizeBattleKey(key);
    if (normalized && item.nameEn) showdownItemNames[normalized] = item.nameEn;
  });
});

export const translateMoveName = (value) => {
  const normalized = normalizeBattleKey(value);
  return moveNames[normalized] || value || '기술';
};

export const translateAbilityName = (value) => {
  const normalized = normalizeBattleKey(value);
  return abilityNames[normalized] || value || '특성';
};

export const translateItemName = (value) => {
  const normalized = normalizeBattleKey(value);
  return itemNames[normalized] || value || '도구';
};

export const toShowdownItemName = (value) => {
  const normalized = normalizeBattleKey(value);
  return showdownItemNames[normalized] || value || '';
};

// PokeAPI 폼 이름과 Pokemon Showdown 종족 이름이 다른 경우를 위한 예외 매핑.
// 예: 팔데아 켄타로스는 PokeAPI에서 "tauros-paldea-aqua-breed"처럼 끝에 "-breed"가
// 붙지만, Showdown 시뮬레이터/데미지 계산기에서는 "Tauros-Paldea-Aqua"로 존재해서
// "-breed"가 붙은 이름을 그대로 넘기면 종을 찾지 못해 배틀이 즉시 크래시했다.
// 2026-08-18: Tauros 외에도 같은 유형(PokeAPI식 이름 ≠ Showdown 종족명)의 불일치가
// 도감 데이터 전체에서 @pkmn/sim의 Dex.species.get()과 대조해 21건 더 확인됐다 —
// 갈라르 다르만이탄, 바스쿨레긴/꿀꿀오크 암컷, 말이슈머, 꽥꽥초리 4색, 코라이돈/
// 미라이돈의 코스메틱 폼(스탯 차이 없어 원종으로 매핑), 지가르데. 그대로 두면
// 전부 "Unidentified species" 크래시로 이어진다.
const SPECIES_NAME_OVERRIDES = {
  taurospaldeaaquabreed: 'Tauros-Paldea-Aqua',
  taurospaldeablazebreed: 'Tauros-Paldea-Blaze',
  taurospaldeacombatbreed: 'Tauros-Paldea-Combat',
  darmanitangalarstandard: 'Darmanitan-Galar',
  basculegionfemale: 'Basculegion-F',
  basculegionmale: 'Basculegion',
  oinkolognefemale: 'Oinkologne-F',
  oinkolognemale: 'Oinkologne',
  mausholdfamilyoffour: 'Maushold-Four',
  mausholdfamilyofthree: 'Maushold',
  squawkabillyblueplumage: 'Squawkabilly-Blue',
  squawkabillyyellowplumage: 'Squawkabilly-Yellow',
  squawkabillywhiteplumage: 'Squawkabilly-White',
  squawkabillygreenplumage: 'Squawkabilly',
  koraidonlimitedbuild: 'Koraidon',
  koraidonsprintingbuild: 'Koraidon',
  koraidonswimmingbuild: 'Koraidon',
  koraidonglidingbuild: 'Koraidon',
  miraidonlowpowermode: 'Miraidon',
  miraidondrivemode: 'Miraidon',
  miraidonaquaticmode: 'Miraidon',
  miraidonglidemode: 'Miraidon',
  zygarde10powerconstruct: 'Zygarde-10%',
  zygarde50powerconstruct: 'Zygarde',
};

export const toShowdownSpeciesName = (value) => {
  const normalized = normalizeBattleKey(value);
  return SPECIES_NAME_OVERRIDES[normalized] || value || '';
};

export const translateTypeName = (type) => ({
  Normal: '노말',
  Fire: '불꽃',
  Water: '물',
  Electric: '전기',
  Grass: '풀',
  Ice: '얼음',
  Fighting: '격투',
  Poison: '독',
  Ground: '땅',
  Flying: '비행',
  Psychic: '에스퍼',
  Bug: '벌레',
  Rock: '바위',
  Ghost: '고스트',
  Dragon: '드래곤',
  Dark: '악',
  Steel: '강철',
  Fairy: '페어리',
}[type] || type || '노말');

export const translateCategoryName = (category) => ({
  Physical: '물리',
  Special: '특수',
  Status: '변화',
  physical: '물리',
  special: '특수',
  status: '변화',
}[category] || category || '변화');

export const translateStatusName = (status) => ({
  brn: '화상',
  par: '마비',
  slp: '잠듦',
  frz: '얼음',
  psn: '독',
  tox: '맹독',
}[status] || status);

export const translateVolatileName = (status) => ({
  confusion: '혼란',
  flinch: '풀죽음',
  attract: '헤롱헤롱',
  leechseed: '씨뿌리기',
  curse: '저주',
  nightmare: '악몽',
  encore: '앵콜',
  taunt: '도발',
  torment: '트집',
  disable: '사슬묶기',
  yawn: '하품',
  substitute: '대타출동',
  protect: '방어',
  perishsong: '멸망의노래',
  foresight: '꿰뚫어보기',
  focusenergy: '기충전',
}[normalizeBattleKey(status)] || translateMoveName(status));

export const translateWeatherName = (weather) => ({
  raindance: '비바라기',
  sunnyday: '쾌청',
  sandstorm: '모래바람',
  hail: '싸라기눈',
  snow: '설경',
  snowscape: '설경',
  none: '맑음',
}[normalizeBattleKey(weather)] || weather);

export const translateTerrainName = (terrain) => ({
  electricterrain: '일렉트릭필드',
  grassyterrain: '그래스필드',
  mistyterrain: '미스트필드',
  psychicterrain: '사이코필드',
}[normalizeBattleKey(terrain)] || terrain);

export const translateEffectName = (effect) => {
  const text = String(effect || '').replace(/^\[from\]\s*/, '').trim();
  if (text.startsWith('ability:')) {
    return translateAbilityName(text.replace('ability:', '').trim());
  }
  if (text.startsWith('move:')) {
    return translateMoveName(text.replace('move:', '').trim());
  }
  const effectMap = {
    choicelock: '기술 변경 불가',
    typechange: '타입 변화',
  };
  if (effectMap[text.toLowerCase()]) return effectMap[text.toLowerCase()];
  return translateMoveName(text);
};
