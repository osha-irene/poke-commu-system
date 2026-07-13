// 커뮤니티 자체 콘테스트 규칙표 "포켓몬 콘테스트 기술 및 콤보" 시트의 콤보표 기준
// (선행 기술 id -> [{ moveId: 연계 기술 id, bonusAppeal: 추가 획득 하트, bonusJam: 추가 방해 수치 }])
// bonusAppeal은 콤보 성공 시 연계 기술 사용자의 어필에 추가되고,
// bonusJam은 콤보 성공 시 GM이 지정한 대상(targetId)에게 추가로 적용되는 방해 수치다.
export const COMBO_CHART = {
  'belly-drum': [
    { moveId: 'rest', bonusAppeal: 2, bonusJam: 0 },
  ],
  'charm': [
    { moveId: 'captivate', bonusAppeal: 2, bonusJam: 0 },
    { moveId: 'growl', bonusAppeal: 2, bonusJam: 0 },
    { moveId: 'rest', bonusAppeal: 2, bonusJam: 0 },
    { moveId: 'tail-whip', bonusAppeal: 2, bonusJam: 0 },
  ],
  'defense-curl': [
    { moveId: 'rollout', bonusAppeal: 3, bonusJam: 0 },
    { moveId: 'tackle', bonusAppeal: 4, bonusJam: 0 },
  ],
  'dive': [
    { moveId: 'surf', bonusAppeal: 3, bonusJam: 0 },
  ],
  'double-team': [
    { moveId: 'agility', bonusAppeal: 3, bonusJam: 0 },
    { moveId: 'quick-attack', bonusAppeal: 3, bonusJam: 0 },
    { moveId: 'teleport', bonusAppeal: 1, bonusJam: 0 },
  ],
  'dragon-breath': [
    { moveId: 'dragon-claw', bonusAppeal: 2, bonusJam: 1 },
    { moveId: 'dragon-dance', bonusAppeal: 1, bonusJam: 0 },
  ],
  'dragon-dance': [
    { moveId: 'dragon-claw', bonusAppeal: 2, bonusJam: 1 },
    { moveId: 'dragon-breath', bonusAppeal: 1, bonusJam: 3 },
  ],
  'fake-out': [
    { moveId: 'arm-thrust', bonusAppeal: 2, bonusJam: 1 },
    { moveId: 'feint-attack', bonusAppeal: 2, bonusJam: 0 },
    { moveId: 'knock-off', bonusAppeal: 1, bonusJam: 4 },
    { moveId: 'seismic-toss', bonusAppeal: 2, bonusJam: 1 },
  ],
  'fire-punch': [
    { moveId: 'ice-punch', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'thunder-punch', bonusAppeal: 4, bonusJam: 0 },
  ],
  'focus-energy': [
    { moveId: 'bone-rush', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'brick-break', bonusAppeal: 1, bonusJam: 4 },
    { moveId: 'cross-chop', bonusAppeal: 3, bonusJam: 0 },
    { moveId: 'double-edge', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'dynamic-punch', bonusAppeal: 2, bonusJam: 1 },
    { moveId: 'focus-punch', bonusAppeal: 3, bonusJam: 0 },
    { moveId: 'headbutt', bonusAppeal: 2, bonusJam: 3 },
    { moveId: 'mega-kick', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'mega-punch', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'sky-uppercut', bonusAppeal: 2, bonusJam: 1 },
    { moveId: 'take-down', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'triple-kick', bonusAppeal: 4, bonusJam: 0 },
  ],
  'growth': [
    { moveId: 'absorb', bonusAppeal: 2, bonusJam: 3 },
    { moveId: 'bullet-seed', bonusAppeal: 2, bonusJam: 1 },
    { moveId: 'frenzy-plant', bonusAppeal: 4, bonusJam: 4 },
    { moveId: 'giga-drain', bonusAppeal: 2, bonusJam: 1 },
    { moveId: 'magical-leaf', bonusAppeal: 2, bonusJam: 0 },
    { moveId: 'mega-drain', bonusAppeal: 1, bonusJam: 4 },
    { moveId: 'petal-dance', bonusAppeal: 4, bonusJam: 4 },
    { moveId: 'razor-leaf', bonusAppeal: 3, bonusJam: 0 },
    { moveId: 'solar-beam', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'vine-whip', bonusAppeal: 4, bonusJam: 0 },
  ],
  'horn-attack': [
    { moveId: 'fury-cutter', bonusAppeal: 2, bonusJam: 1 },
    { moveId: 'horn-drill', bonusAppeal: 2, bonusJam: 1 },
  ],
  'ice-punch': [
    { moveId: 'fire-punch', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'thunder-punch', bonusAppeal: 4, bonusJam: 0 },
  ],
  'leer': [
    { moveId: 'bite', bonusAppeal: 1, bonusJam: 3 },
    { moveId: 'feint-attack', bonusAppeal: 2, bonusJam: 0 },
    { moveId: 'glare', bonusAppeal: 1, bonusJam: 3 },
    { moveId: 'horn-attack', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'scary-face', bonusAppeal: 2, bonusJam: 1 },
    { moveId: 'scratch', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'stomp', bonusAppeal: 1, bonusJam: 4 },
    { moveId: 'tackle', bonusAppeal: 4, bonusJam: 0 },
  ],
  'mud-slap': [
    { moveId: 'mud-sport', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'sand-attack', bonusAppeal: 2, bonusJam: 1 },
  ],
  'mud-sport': [
    { moveId: 'mud-slap', bonusAppeal: 2, bonusJam: 1 },
    { moveId: 'water-gun', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'water-sport', bonusAppeal: 4, bonusJam: 0 },
  ],
  'peck': [
    { moveId: 'drill-peck', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'fury-cutter', bonusAppeal: 2, bonusJam: 1 },
  ],
  'powder-snow': [
    { moveId: 'blizzard', bonusAppeal: 4, bonusJam: 0 },
  ],
  'rest': [
    { moveId: 'sleep-talk', bonusAppeal: 3, bonusJam: 0 },
    { moveId: 'snore', bonusAppeal: 4, bonusJam: 0 },
  ],
  'sand-attack': [
    { moveId: 'mud-slap', bonusAppeal: 2, bonusJam: 1 },
  ],
  'snowscape': [
    { moveId: 'blizzard', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'powder-snow', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'weather-ball', bonusAppeal: 4, bonusJam: 0 },
  ],
  'sunny-day': [
    { moveId: 'blast-burn', bonusAppeal: 4, bonusJam: 4 },
    { moveId: 'blaze-kick', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'ember', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'eruption', bonusAppeal: 1, bonusJam: 0 },
    { moveId: 'fire-blast', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'fire-punch', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'fire-spin', bonusAppeal: 3, bonusJam: 0 },
    { moveId: 'flame-wheel', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'flamethrower', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'heat-wave', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'moonlight', bonusAppeal: 1, bonusJam: 0 },
    { moveId: 'morning-sun', bonusAppeal: 1, bonusJam: 0 },
    { moveId: 'overheat', bonusAppeal: 6, bonusJam: 0 },
    { moveId: 'sacred-fire', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'solar-beam', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'synthesis', bonusAppeal: 1, bonusJam: 0 },
    { moveId: 'weather-ball', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'will-o-wisp', bonusAppeal: 1, bonusJam: 4 },
  ],
  'surf': [
    { moveId: 'dive', bonusAppeal: 2, bonusJam: 0 },
  ],
  'sweet-scent': [
    { moveId: 'poison-powder', bonusAppeal: 3, bonusJam: 0 },
    { moveId: 'sleep-powder', bonusAppeal: 1, bonusJam: 3 },
    { moveId: 'stun-spore', bonusAppeal: 2, bonusJam: 1 },
  ],
  'swords-dance': [
    { moveId: 'crabhammer', bonusAppeal: 3, bonusJam: 0 },
    { moveId: 'crush-claw', bonusAppeal: 1, bonusJam: 4 },
    { moveId: 'cut', bonusAppeal: 2, bonusJam: 1 },
    { moveId: 'false-swipe', bonusAppeal: 1, bonusJam: 3 },
    { moveId: 'fury-cutter', bonusAppeal: 3, bonusJam: 0 },
    { moveId: 'slash', bonusAppeal: 3, bonusJam: 0 },
  ],
  'thunder-punch': [
    { moveId: 'fire-punch', bonusAppeal: 4, bonusJam: 0 },
    { moveId: 'ice-punch', bonusAppeal: 4, bonusJam: 0 },
  ],
};

export const isComboStarter = (moveId) => !!COMBO_CHART[moveId];

export const getComboBonus = (starterMoveId, followUpMoveId) =>
  COMBO_CHART[starterMoveId]?.find((c) => c.moveId === followUpMoveId) || null;

export const isValidComboFollowUp = (starterMoveId, followUpMoveId) =>
  !!getComboBonus(starterMoveId, followUpMoveId);
