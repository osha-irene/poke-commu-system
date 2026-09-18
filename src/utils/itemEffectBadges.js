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

// 노력치 스탯 이름을 (special-attack 같은 evItems.json 표기든, specialAttack 같은
// evBoost 표기든) EV_LABELS에서 바로 찾을 수 있게 정규화한다.
const normalizeEvStatKey = (stat) => stat.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

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
    const evEntries = positiveEntries(item.evBoost);
    // 가방 목록에서 그냥 "노력치 +10"만 보면 어떤 스탯인지 구분이 안 되므로, 스탯마다
    // 별도 배지로 "OO 노력치 +N"을 붙인다.
    evEntries.forEach(([stat, value]) => {
      const label = `${EV_LABELS[normalizeEvStatKey(stat)] || stat} 노력치 +${Number(value)}`;
      badges.push({ label, title: label, tone: 'effort', cls: 'bg-purple-50 text-purple-700' });
    });

    // 타우린/브로멕신처럼 evBoost 필드 없이 이름으로만 노력치 효과가 판별되는 공식
    // 영양제/깃털/나무열매도 같은 형식의 배지를 붙인다(evItemUtils의 evItems.json 매칭).
    if (evEntries.length === 0) {
      const nameEn = item.itemData?.nameEn || item.nameEn;
      const effect = nameEn && isEVItem(nameEn) ? getEVItemEffect(nameEn) : null;
      if (effect?.stat) {
        const statLabel = EV_LABELS[normalizeEvStatKey(effect.stat)] || effect.stat;
        const label = `${statLabel} 노력치 ${effect.change > 0 ? '+' : ''}${effect.change}`;
        badges.push({ label, title: label, tone: 'effort', cls: 'bg-purple-50 text-purple-700' });
      }
    }
  }

  return badges;
};

export { CONDITION_LABELS, EV_LABELS };
