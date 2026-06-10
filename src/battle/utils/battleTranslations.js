import movesData from '../../data/moves.json';
import abilitiesData from '../../data/abilities.json';
import itemsData from '../../data/items.json';

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
  addTranslation(moveNames, [move.id, move.nameEn, move.name], move.name);
});

(abilitiesData.abilities || []).forEach((ability) => {
  addTranslation(abilityNames, [ability.id, ability.nameEn, ability.name], ability.name);
});

const items = Array.isArray(itemsData) ? itemsData : (itemsData.items || []);

items.forEach((item) => {
  addTranslation(itemNames, [item.id, item.nameEn, item.name], item.name);
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
  raindance: '비',
  sunnyday: '쾌청',
  sandstorm: '모래바람',
  hail: '싸라기눈',
  snow: '눈',
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
  return translateMoveName(text);
};
