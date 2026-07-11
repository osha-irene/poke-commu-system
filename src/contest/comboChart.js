// 6세대 Contest Spectacular 콤보 조합표 (선행 기술 id -> 유효한 연계 기술 id 목록)
// 출처: https://bulbapedia.bulbagarden.net/wiki/Contest_combination ("Contest Spectaculars" 섹션)
// 성공 시 연계 기술은 항상 어필 +3을 추가로 획득한다(3세대의 "2배" 규칙과 다름).
export const COMBO_CHART = {
  'force-palm': ['hex', 'smelling-salts'],
  'thunder-wave': ['hex', 'smelling-salts'],
  'agility': ['baton-pass', 'electro-ball'],
  'focus-energy': ['blaze-kick', 'drill-run', 'karate-chop', 'night-slash', 'poison-tail', 'shadow-claw', 'stone-edge'],
  'stealth-rock': ['dragon-tail', 'roar', 'whirlwind'],
  'inferno': ['hex'],
  'will-o-wisp': ['hex'],
  'lovely-kiss': ['dream-eater', 'hex', 'nightmare', 'wake-up-slap'],
  'spore': ['dream-eater', 'hex', 'nightmare', 'wake-up-slap'],
  'mean-look': ['explosion', 'memento', 'perish-song', 'self-destruct'],
  'rain-dance': ['hurricane', 'soak', 'thunder', 'water-sport', 'weather-ball'],
  'sunny-day': ['growth', 'moonlight', 'morning-sun', 'solar-beam', 'synthesis', 'weather-ball'],
  'celebrate': ['bestow', 'fling', 'present'],
  'covet': ['bestow', 'fling', 'present'],
  'happy-hour': ['bestow', 'fling', 'present'],
  'wish': ['bestow', 'fling', 'present'],
  'amnesia': ['baton-pass', 'stored-power'],
  'hone-claws': ['baton-pass', 'stored-power'],
  'entrainment': ['circle-throw', 'roar', 'seismic-toss', 'sky-drop', 'smack-down', 'storm-throw', 'vital-throw', 'wake-up-slap'],
  'play-nice': ['circle-throw', 'roar', 'seismic-toss', 'sky-drop', 'smack-down', 'storm-throw', 'vital-throw', 'wake-up-slap'],
  'sing': ['dream-eater', 'hex', 'nightmare', 'wake-up-slap'],
  'yawn': ['dream-eater', 'hex', 'nightmare', 'wake-up-slap'],
  'block': ['explosion', 'memento', 'perish-song', 'self-destruct'],
  'defense-curl': ['ice-ball', 'rollout'],
  'encore': ['counter', 'destiny-bond', 'grudge', 'metal-burst', 'mirror-coat', 'spite'],
  'rest': ['sleep-talk', 'snore'],
  'soft-boiled': ['egg-bomb'],
  'dark-void': ['dream-eater', 'hex', 'nightmare', 'wake-up-slap'],
  'grass-whistle': ['dream-eater', 'hex', 'nightmare', 'wake-up-slap'],
  'hypnosis': ['dream-eater', 'hex', 'nightmare', 'wake-up-slap'],
  'sleep-powder': ['dream-eater', 'hex', 'nightmare', 'wake-up-slap'],
  'poison-gas': ['hex', 'venom-drench', 'venoshock'],
  'poison-powder': ['hex', 'venom-drench', 'venoshock'],
  'toxic': ['hex', 'venom-drench', 'venoshock'],
  'calm-mind': ['baton-pass', 'stored-power'],
  'nasty-plot': ['baton-pass', 'stored-power'],
  'charge': ['charge-beam', 'discharge', 'electro-ball', 'nuzzle', 'parabolic-charge', 'shock-wave', 'spark', 'thunder', 'thunder-fang', 'thunder-punch', 'thunder-shock', 'thunderbolt', 'volt-switch', 'volt-tackle'],
  'mind-reader': ['sheer-cold'],
  'parabolic-charge': ['electrify'],
  'shift-gear': ['gear-grind'],
  'spikes': ['dragon-tail', 'roar', 'whirlwind'],
  'string-shot': ['electroweb', 'spider-web', 'sticky-web'],
  'taunt': ['counter', 'destiny-bond', 'grudge', 'metal-burst', 'mirror-coat', 'spite'],
  'toxic-spikes': ['dragon-tail', 'hex', 'roar', 'venom-drench', 'venoshock', 'whirlwind'],
  'endure': ['endeavor', 'flail', 'pain-split', 'reversal'],
  'glare': ['hex', 'smelling-salts'],
  'rock-polish': ['baton-pass', 'electro-ball'],
  'rototiller': ['bullet-seed', 'leech-seed', 'seed-bomb', 'worry-seed'],
  'sandstorm': ['sand-attack', 'sand-tomb', 'weather-ball'],
  'stockpile': ['spit-up', 'swallow'],
  'torment': ['counter', 'destiny-bond', 'grudge', 'metal-burst', 'mirror-coat', 'spite'],
};

export const COMBO_FOLLOWUP_BONUS = 3;

export const isComboStarter = (moveId) => !!COMBO_CHART[moveId];

export const isValidComboFollowUp = (starterMoveId, followUpMoveId) =>
  !!COMBO_CHART[starterMoveId]?.includes(followUpMoveId);
