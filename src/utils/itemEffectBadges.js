import { isSoyYYNItem } from './specialItemUtils';

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

export { CONDITION_LABELS, EV_LABELS };
