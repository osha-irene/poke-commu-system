import itemsData from './items.json';

// items.json에서 nameEn → item 인덱스
const ITEM_DB = {};
for (const item of (itemsData.items || [])) {
  if (item.nameEn) ITEM_DB[item.nameEn] = item;
}

// 배틀에서 사용 허용할 카테고리
const ALLOWED_CATEGORIES = new Set([
  'healing',        // 상처약, 좋은상처약, 신선한 물, 원기뿌리 등
  'status-cures',   // 마비치료제, 화상치료제 등
  'stat-boosts',    // X어택, 플러스파워 등
  'medicine',       // 나무열매 (오란, 시트러스, 루미 등)
  'picky-healing',  // 파이열매, 위키열매 등 (HP 8분의 1 회복)
  'revival',        // 기력의 조각(revive), 기력의 덩어리(max-revive)
]);

// nameEn + category로 배틀 효과 도출
function deriveEffect(nameEn, category) {
  // ── 회복 아이템 ──
  if (category === 'healing') {
    if (nameEn === 'max-potion')    return { type: 'heal', amount: null };   // 완전 회복
    if (nameEn === 'full-restore')  return { type: 'fullheal' };             // HP 완전 + 상태이상 치료
    // items.json에서 HP 수치 파싱
    const db = ITEM_DB[nameEn];
    const match = (db?.effect || db?.description || '').match(/HP\S*\s*(\d+)/);
    if (match) return { type: 'heal', amount: Number(match[1]) };
    return { type: 'heal', amount: 20 }; // 파싱 실패 시 기본값
  }

  // ── 상태이상 치료 ──
  if (category === 'status-cures') {
    if (nameEn === 'antidote')      return { type: 'curestatus', status: 'psn' };
    if (nameEn === 'burn-heal')     return { type: 'curestatus', status: 'brn' };
    if (nameEn === 'ice-heal')      return { type: 'curestatus', status: 'frz' };
    if (nameEn === 'awakening')     return { type: 'curestatus', status: 'slp' };
    if (nameEn === 'paralyze-heal') return { type: 'curestatus', status: 'par' };
    return { type: 'curestatus' }; // full-heal, heal-powder, lava-cookie 등: 모든 상태이상
  }

  // ── 배틀 아이템 (X 아이템) ──
  if (category === 'stat-boosts') {
    if (/x-attack/.test(nameEn))   return { type: 'boost', stat: 'atk',      stages: 1 };
    if (/x-defense/.test(nameEn))  return { type: 'boost', stat: 'def',      stages: 1 };
    if (/x-sp-atk/.test(nameEn))   return { type: 'boost', stat: 'spa',      stages: 1 };
    if (/x-sp-def/.test(nameEn))   return { type: 'boost', stat: 'spd',      stages: 1 };
    if (/x-speed/.test(nameEn))    return { type: 'boost', stat: 'spe',      stages: 1 };
    if (/x-accuracy/.test(nameEn)) return { type: 'boost', stat: 'accuracy', stages: 1 };
    if (/dire-hit/.test(nameEn))   return { type: 'boost', stat: 'accuracy', stages: 1 };
    return { type: 'boost', stat: 'atk', stages: 1 };
  }

  // ── 부활 아이템 (기력의 조각/기력의 덩어리) ──
  if (category === 'revival') {
    if (nameEn === 'max-revive' || nameEn === 'sacred-ash' || nameEn === 'revival-herb') {
      return { type: 'revive', fullHP: true };   // 완전 회복 부활
    }
    return { type: 'revive', fullHP: false };    // 50% HP 부활
  }

  // ── picky-healing 나무열매 (HP 8분의 1 회복) ──
  if (category === 'picky-healing') {
    return { type: 'healpercent', percent: 0.125 };
  }

  // ── 나무열매 (category: 'medicine') ──
  if (category === 'medicine') {
    if (/sitrus/.test(nameEn))  return { type: 'healpercent', percent: 0.25 };
    if (/oran/.test(nameEn))    return { type: 'heal', amount: 10 };
    if (/cheri/.test(nameEn))   return { type: 'curestatus', status: 'par' };
    if (/chesto/.test(nameEn))  return { type: 'curestatus', status: 'slp' };
    if (/pecha/.test(nameEn))   return { type: 'curestatus', status: 'psn' };
    if (/rawst/.test(nameEn))   return { type: 'curestatus', status: 'brn' };
    if (/aspear/.test(nameEn))  return { type: 'curestatus', status: 'frz' };
    if (/lum/.test(nameEn))     return { type: 'curestatus' };
    // 그 외 열매는 items.json에서 HP 파싱
    const db = ITEM_DB[nameEn];
    const match = (db?.effect || db?.description || '').match(/HP\S*\s*(\d+)/);
    if (match) return { type: 'heal', amount: Number(match[1]) };
    return null; // 효과 불명 열매는 제외
  }

  return null;
}

export const getBattleItemEffect = (item) => {
  if (!item) return null;
  const nameEn = item.nameEn || '';

  // items.json에서 카테고리 확인 (없으면 인벤토리 아이템의 category 사용)
  const dbItem = ITEM_DB[nameEn];
  const category = dbItem?.category || item.category || '';

  if (!ALLOWED_CATEGORIES.has(category)) return null;

  return deriveEffect(nameEn, category);
};

// 인벤토리에서 배틀 사용 가능한 아이템만 추출
export const filterBattleItems = (inventory = []) =>
  inventory
    .filter(item => {
      const effect = getBattleItemEffect(item);
      if (!effect) return false;
      const qty = item.count ?? item.quantity ?? 1;
      return qty > 0;
    })
    .map(item => ({
      ...item,
      battleEffect: getBattleItemEffect(item),
      _qty: item.count ?? item.quantity ?? 1,
    }));
