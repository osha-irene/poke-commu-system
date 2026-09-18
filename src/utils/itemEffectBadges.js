import { isSoyYYNItem } from './specialItemUtils';
import { isEVItem, getEVItemEffect } from './evItemUtils';

const CONDITION_LABELS = {
  elegance: '우아함',
  beauty: '아름다움',
  cuteness: '귀여움',
  intelligence: '영리함',
  strength: '강인함'
};

const EV_LABELS = {
  hp: 'HP',
  attack: '공격',
  defense: '방어',
  specialAttack: '특수공격',
  specialDefense: '특수방어',
  speed: '스피드'
};

const positiveEntries = (boost = {}) => (
  Object.entries(boost || {}).filter(([, value]) => Number(value) > 0)
);

const summarizeBoost = (entries, categoryLabel, statLabels, suffix = '') => {
  if (entries.length === 0) return null;

  const values = entries.map(([, value]) => Number(value));
  const allSame = values.every((value) => value === values[0]);
  const shortLabel = allSame
    ? `${categoryLabel} +${values[0]}${suffix}`
    : `${categoryLabel} +${values.join('/')}${suffix}`;
  const detail = entries
    .map(([key, value]) => `${statLabels[key] || key} +${Number(value)}`)
    .join(', ');

  return { shortLabel, detail };
};

export const getItemEffectBadges = (item = {}) => {
  const badges = [];

  if (isSoyYYNItem(item)) {
    badges.push({
      label: '노력치 자유 배분',
      title: '노력치 자유 배분',
      tone: 'effort',
      cls: 'bg-purple-50 text-purple-700'
    });
  }

  const friendshipBoost = Number(item.friendshipBoost) || 0;
  if (friendshipBoost > 0) {
    badges.push({
      label: `친밀도 +${friendshipBoost}`,
      title: `친밀도 +${friendshipBoost}`,
      tone: 'friendship',
      cls: 'bg-pink-50 text-pink-700'
    });
  }

  if (item.specialEffect === 'trainerExp') {
    const trainerExpBoost = Number(item.boostAmount) || 0;
    if (trainerExpBoost > 0) {
      badges.push({
        label: `멤버 경험치 +${trainerExpBoost}`,
        title: `사용한 멤버 본인의 경험치 +${trainerExpBoost}`,
        tone: 'trainerExp',
        cls: 'bg-blue-50 text-blue-700'
      });
    }
  }

  if (item.specialEffect === 'conditionSelect') {
    const amount = Number(item.boostAmount) || positiveEntries(item.conditionBoost)[0]?.[1] || 0;
    if (Number(amount) > 0) {
      badges.push({
        label: `컨디션 +${Number(amount)} (선택)`,
        title: `컨디션 항목 선택 +${Number(amount)}`,
        tone: 'condition',
        cls: 'bg-green-50 text-green-700'
      });
    }
  } else {
    const conditionSummary = summarizeBoost(
      positiveEntries(item.conditionBoost),
      '컨디션',
      CONDITION_LABELS
    );
    if (conditionSummary) {
      badges.push({
        label: conditionSummary.shortLabel,
        title: conditionSummary.detail,
        tone: 'condition',
        cls: 'bg-green-50 text-green-700'
      });
    }
  }

  if (item.specialEffect === 'evSelect') {
    const amount = Number(item.boostAmount) || positiveEntries(item.evBoost)[0]?.[1] || 0;
    if (Number(amount) > 0) {
      badges.push({
        label: `노력치 +${Number(amount)} (선택)`,
        title: `노력치 항목 선택 +${Number(amount)}`,
        tone: 'effort',
        cls: 'bg-purple-50 text-purple-700'
      });
    }
  } else {
    const evSummary = summarizeBoost(
      positiveEntries(item.evBoost),
      '노력치',
      EV_LABELS
    );
    if (evSummary) {
      badges.push({
        label: evSummary.shortLabel,
        title: evSummary.detail,
        tone: 'effort',
        cls: 'bg-purple-50 text-purple-700'
      });
    }
  }

  return badges;
};

// 노력치 스탯 이름을 (special-attack 같은 evItems.json 표기든, specialAttack 같은
// evBoost 표기든) EV_LABELS에서 바로 찾을 수 있게 정규화한다.
const normalizeEvStatKey = (stat) => stat.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// 가방 목록에서 이름만 보고는 어떤 스탯을 올리는 아이템인지 구분이 안 되는 문제(타우린,
// 브로멕신처럼 이름에 스탯이 드러나지 않는 공식 영양제/깃털/열매 포함) 때문에, 아이템 이름
// 앞에 붙일 "OO 노력치" 접두 라벨을 계산한다. custom evBoost/evSelect 아이템과, evBoost
// 필드 없이 이름으로만 판별되는 공식 노력치 아이템(evItemUtils의 evItems.json 매칭) 둘 다 다룬다.
export const getEvNamePrefix = (details = {}) => {
  if (details.specialEffect === 'evSelect') return '노력치(선택)';

  const evEntries = positiveEntries(details.evBoost);
  if (evEntries.length === 1) {
    const [stat] = evEntries[0];
    return `${EV_LABELS[normalizeEvStatKey(stat)] || stat} 노력치`;
  }
  if (evEntries.length > 1) return '노력치';

  const nameEn = details.itemData?.nameEn || details.nameEn;
  if (nameEn && isEVItem(nameEn)) {
    const effect = getEVItemEffect(nameEn);
    if (effect?.stat) {
      const label = EV_LABELS[normalizeEvStatKey(effect.stat)] || effect.stat;
      return effect.change > 0 ? `${label} 노력치` : `${label} 노력치 감소`;
    }
  }

  return null;
};

export { CONDITION_LABELS, EV_LABELS };
