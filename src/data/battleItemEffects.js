// 배틀 중 사용 가능한 아이템과 효과 정의
// type: 'heal' | 'healpercent' | 'fullheal' | 'curestatus' | 'boost'

const BATTLE_ITEM_EFFECTS = {
  // ── 회복 아이템 ──
  'potion':       { type: 'heal',       amount: 20,   label: '상처약',      category: 'heal' },
  'superpotion':  { type: 'heal',       amount: 60,   label: '좋은상처약',   category: 'heal' },
  'hyperpotion':  { type: 'heal',       amount: 120,  label: '대단한상처약', category: 'heal' },
  'maxpotion':    { type: 'heal',       amount: null, label: '만능상처약',   category: 'heal' }, // null = 완전 회복
  'fullrestore':  { type: 'fullheal',                 label: '상태회복약',   category: 'heal' }, // HP 완전 + 상태이상 치료
  // ── 나무열매 ──
  'oranberry':    { type: 'heal',       amount: 10,         label: '오란열매',     category: 'berry' },
  'sitrusberry':  { type: 'healpercent', percent: 0.25,     label: '시트러스열매', category: 'berry' },
  'lumberry':     { type: 'curestatus',                     label: '루미열매',     category: 'berry' },
  'rawstberry':   { type: 'curestatus', status: 'brn',      label: '로웰열매',     category: 'berry' },
  'cherriberry':  { type: 'curestatus', status: 'par',      label: '체리열매',     category: 'berry' },
  'chestoberry':  { type: 'curestatus', status: 'slp',      label: '체스토열매',   category: 'berry' },
  'pechaberry':   { type: 'curestatus', status: 'psn',      label: '피치열매',     category: 'berry' },
  'aspearberry':  { type: 'curestatus', status: 'frz',      label: '아스피어열매', category: 'berry' },
  // ── 배틀 아이템 (X 아이템) ──
  'xattack':      { type: 'boost', stat: 'atk',      stages: 1, label: 'X어택',   category: 'battle' },
  'xdefense':     { type: 'boost', stat: 'def',      stages: 1, label: 'X디펜스', category: 'battle' },
  'xspatk':       { type: 'boost', stat: 'spa',      stages: 1, label: 'X특공',   category: 'battle' },
  'xspdef':       { type: 'boost', stat: 'spd',      stages: 1, label: 'X특방',   category: 'battle' },
  'xspeed':       { type: 'boost', stat: 'spe',      stages: 1, label: 'X스피드', category: 'battle' },
  'xaccuracy':    { type: 'boost', stat: 'accuracy', stages: 1, label: 'X정확성', category: 'battle' },
  'direhit':      { type: 'boost', stat: 'accuracy', stages: 1, label: '기합의띠', category: 'battle' },
};

const normalizeKey = (name) =>
  String(name || '').toLowerCase().replace(/[\s_\-'.]/g, '');

export const getBattleItemEffect = (item) => {
  if (!item) return null;
  const key = normalizeKey(item.nameEn || item.name || item.id || '');
  return BATTLE_ITEM_EFFECTS[key] || null;
};

export const filterBattleItems = (inventory = []) =>
  inventory
    .filter(item => getBattleItemEffect(item))
    .map(item => ({ ...item, battleEffect: getBattleItemEffect(item) }));

export default BATTLE_ITEM_EFFECTS;
