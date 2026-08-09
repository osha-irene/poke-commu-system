const { toProbability, clamp, accountMention, normalizeCaughtPokemon } = require('./shared');

const DEFAULT_CAMPING_SETTINGS = {
  minCampingCount: 1,
  maxCampingCount: 5,
  duoSuccessBonus: 0.15,
  eggChance: 0.05,
  minFriendshipForBonus: 160,
  bonusItems: [
    { itemId: 50, name: '이상한사탕', weight: 15 },
    { itemId: 92, name: '금구슬', weight: 20 },
  ],
  eggHatchStepsByGroup: {
    monster: 5000, water1: 5000, bug: 3000, flying: 3000, field: 5000,
    fairy: 5000, grass: 5000, humanlike: 6000, water3: 5000, mineral: 6000,
    amorphous: 5000, water2: 5000, ditto: 6000, dragon: 8000, undiscovered: 0,
  },
  stages: [
    { stage: 1, friendshipBonus: 10, expBonus: 50,  successRate: 1,   message: '캠핑을 시작했어요. [만족]으로 마치거나 [계속]으로 다음 단계에 도전할 수 있어요.' },
    { stage: 2, friendshipBonus: 20, expBonus: 100, successRate: 0.8, message: '캠핑이 조금 더 깊어졌어요. [만족] 또는 [계속]을 선택해 주세요.' },
    { stage: 3, friendshipBonus: 30, expBonus: 150, successRate: 0.6, message: '포켓몬들이 꽤 즐거워 보여요. [만족] 또는 [계속]을 선택해 주세요.' },
    { stage: 4, friendshipBonus: 40, expBonus: 200, successRate: 0.4, message: '캠핑 분위기가 무르익었어요. [만족] 또는 [계속]을 선택해 주세요.' },
    { stage: 5, friendshipBonus: 50, expBonus: 300, successRate: 0.2, message: '최고 단계까지 왔어요. 캠핑을 마무리합니다.' },
  ],
};

const CAMPING_DISH_CHOICES = [
  { type: 'spicy', label: '고추장', aliases: ['고추장', 'spicy'] },
  { type: 'cream', label: '크림', aliases: ['크림', 'cream'] },
  { type: 'soy', label: '궁중', aliases: ['궁중', '간장', 'soy'] },
];

const CAMPING_DISH_STAGE_SUFFIXES = {
  1: 'wobbuffet',
  2: 'milcery',
  3: 'wailord',
  4: { spicy: 'charizard', cream: 'blastoise', soy: 'venusaur' },
  5: 'yyn',
};

const TERMINAL_CAMPING_STATUSES = ['completed', 'applied', 'failed', 'applying'];
const isTerminalCampingStatus = status =>
  TERMINAL_CAMPING_STATUSES.includes(String(status || '').toLowerCase());

const getCampingDishChoice = content => {
  const normalized = String(content || '').toLowerCase();
  return CAMPING_DISH_CHOICES.find(choice =>
    choice.aliases.some(alias => new RegExp(`\\[\\s*${alias.toLowerCase()}\\s*\\]`, 'i').test(normalized))
  ) || null;
};

const normalizeItemKeys = item =>
  [item?.id, item?.itemId, item?.nameEn, item?.name]
    .map(value => String(value || '').trim().toLowerCase())
    .filter(Boolean);

const normalizeRange = (minValue, maxValue, fallback = 0) => {
  const min = Math.max(0, Number(minValue ?? fallback) || 0);
  const max = Math.max(0, Number(maxValue ?? minValue ?? fallback) || 0);
  return min <= max ? { min, max } : { min: max, max: min };
};

const normalizeStage = (stage, index) => ({
  ...(() => {
    const friendship = normalizeRange(stage?.friendshipMin, stage?.friendshipMax, stage?.friendshipBonus ?? 0);
    const exp = normalizeRange(stage?.expMin, stage?.expMax, stage?.expBonus ?? 0);
    return {
      stage: Number(stage?.stage ?? index + 1),
      friendshipMin: friendship.min,
      friendshipMax: friendship.max,
      friendshipBonus: friendship.min,
      expMin: exp.min,
      expMax: exp.max,
      expBonus: exp.min,
      successRate: toProbability(stage?.successRate, 1),
      message: String(stage?.message || DEFAULT_CAMPING_SETTINGS.stages[index]?.message || ''),
      bonusItems: Array.isArray(stage?.bonusItems) ? stage.bonusItems : [],
      minPick: Math.max(1, Number(stage?.minPick ?? 1) || 1),
      maxPick: Math.max(1, Number(stage?.maxPick ?? stage?.minPick ?? 1) || 1),
    };
  })(),
});

const normalizeSettings = (raw = {}) => {
  const legacyEggChance =
    raw.eggChance ?? raw.mastodonTaggedEggChance ?? raw.eggChanceWithFriendship ?? raw.eggChanceBase;
  const stagesSource =
    Array.isArray(raw.stages) ? raw.stages :
    Array.isArray(raw.stageRewards) ? raw.stageRewards :
    Array.isArray(raw.cookingStages) ? raw.cookingStages :
    DEFAULT_CAMPING_SETTINGS.stages;
  const stages = DEFAULT_CAMPING_SETTINGS.stages.map((d, i) =>
    normalizeStage({ ...d, ...(stagesSource[i] || {}) }, i)
  );
  const minCampingCount = Math.max(1, Number(raw.minCampingCount ?? raw.minStage ?? DEFAULT_CAMPING_SETTINGS.minCampingCount) || 1);
  const maxCampingCount = Math.max(minCampingCount, Number(raw.maxCampingCount ?? raw.maxStage ?? DEFAULT_CAMPING_SETTINGS.maxCampingCount) || DEFAULT_CAMPING_SETTINGS.maxCampingCount);
  return {
    ...DEFAULT_CAMPING_SETTINGS, ...raw,
    minCampingCount,
    maxCampingCount: Math.min(maxCampingCount, stages.length),
    duoSuccessBonus: toProbability(raw.duoSuccessBonus, DEFAULT_CAMPING_SETTINGS.duoSuccessBonus),
    eggChance: toProbability(legacyEggChance, DEFAULT_CAMPING_SETTINGS.eggChance),
    minFriendshipForBonus: Number(raw.minFriendshipForBonus ?? DEFAULT_CAMPING_SETTINGS.minFriendshipForBonus) || 160,
    bonusItems: Array.isArray(raw.bonusItems) ? raw.bonusItems : DEFAULT_CAMPING_SETTINGS.bonusItems,
    eggHatchStepsByGroup: { ...DEFAULT_CAMPING_SETTINGS.eggHatchStepsByGroup, ...(raw.eggHatchStepsByGroup || {}) },
    stages,
  };
};

const getCommand = content => {
  if (/\[\s*캠핑\s*시작\s*\]/i.test(content) || /\[\s*캠핑\s*\]/i.test(content)) return 'start';
  if (getCampingDishChoice(content)) return 'dish';
  if (/\[\s*계속\s*\]/i.test(content)) return 'continue';
  if (/\[\s*만족\s*\]/i.test(content)) return 'satisfy';
  return null;
};

const createCampBot = ({ db, pokemonData, findMemberByAccount, extractMentionAccounts, normalizeAccount, localUsername, botAccount }) => {
  let evolutionsData = [];
  try {
    const evo = require('./data/evolutions.json');
    evolutionsData = evo.evolutions || [];
  } catch (_) {}

  const TRADE_HELD_ITEM_MAP = {
    '왕의징표석': 'kings-rock', '금속코트': 'metal-coat', '프로텍터': 'protector',
    '용의비늘': 'dragon-scale', '에레키부스터': 'electirizer', '마그마부스터': 'magmarizer',
    '업그레이드': 'up-grade', '괴상한패치': 'dubious-disc', '영계의천': 'reaper-cloth',
    '심해의이빨': 'deep-sea-tooth', '심해의비늘': 'deep-sea-scale',
    '고운비늘': 'prism-scale', '향기주머니': 'sachet', '휘핑팝': 'whipped-dream', '복합금속': 'metal-alloy',
  };
  const getItemNameEn = (name) => TRADE_HELD_ITEM_MAP[name] || String(name || '').toLowerCase().replace(/\s+/g, '-');

  const loadCampingSettings = async () => {
    const refs = [
      db.ref('gameData/systemSettings/campingSettings'),
      db.ref('gameData/campingSettings'),
      db.ref('gameData/systemSettings/camping'),
    ];
    for (const r of refs) {
      const snap = await r.once('value');
      if (snap.exists()) return normalizeSettings(snap.val());
    }
    return normalizeSettings();
  };

  const getParticipantPokemon = member => {
    const caught = normalizeCaughtPokemon(member?.caughtPokemon).slice(0, 6).filter(Boolean);
    const partner = member?.partnerPokemon ? [member.partnerPokemon] : [];
    const byId = new Map();
    [...partner, ...caught].forEach(p => {
      const key = p.uniqueId || p.id || p.pokemonId || `${p.number}_${p.name}`;
      if (key && !byId.has(key)) byId.set(key, p);
    });
    return Array.from(byId.values());
  };

  const pokemonKey = p => p?.uniqueId || p?.id || p?.pokemonId || `${p?.number}_${p?.name}`;
  const formatPokemonList = list => list.length ? list.map(p => p.nickname || p.name || `No.${p.number}`).join(', ') : '없음';

  const getStageSettings = (settings, stage) =>
    settings.stages.find(s => Number(s.stage) === Number(stage)) ||
    settings.stages[clamp(Number(stage) - 1, 0, settings.stages.length - 1)];

  const rollStageSuccess = (settings, stage, isDuo) => {
    const s = getStageSettings(settings, stage);
    const chance = clamp(s.successRate + (isDuo ? settings.duoSuccessBonus : 0), 0, 1);
    return { success: Math.random() < chance, stageSettings: s };
  };

  const rollRange = (minValue, maxValue, fallback = 0) => {
    const { min, max } = normalizeRange(minValue, maxValue, fallback);
    if (min >= max) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const getMasterPokemon = p => pokemonData.find(d => Number(d.number) === Number(p?.number));
  const getPokemonOriginalNumber = p => Number(p?.originalNumber || p?.displayNumber || p?.number || 0);

  const gendersAreCompatible = (p1, p2) => {
    const g1 = String(p1?.gender || '').toLowerCase();
    const g2 = String(p2?.gender || '').toLowerCase();
    if (!g1 || !g2 || g1 === 'ditto' || g2 === 'ditto') return true;
    return (g1 === 'female' && g2 === 'male') || (g1 === 'male' && g2 === 'female');
  };

  const eggGroupsMatch = (p1, p2) => {
    const d1 = getMasterPokemon(p1);
    const d2 = getMasterPokemon(p2);
    const g1 = d1?.eggGroups || p1?.eggGroups || [];
    const g2 = d2?.eggGroups || p2?.eggGroups || [];
    if (!g1.length || !g2.length) return null;
    if (g1.includes('undiscovered') || g2.includes('undiscovered')) return null;
    const groups = g1.filter(g => g2.includes(g));
    return groups.length ? { data1: d1, data2: d2, groups } : null;
  };

  const rollEgg = (memberPokemon, partnerPokemon, settings, name1, name2) => {
    if (!memberPokemon.length || !partnerPokemon.length) return null;
    const validPairs = [];
    for (const p1 of memberPokemon) {
      for (const p2 of partnerPokemon) {
        const match = eggGroupsMatch(p1, p2);
        if (match && gendersAreCompatible(p1, p2)) validPairs.push({ p1, p2, match });
      }
    }
    if (!validPairs.length || Math.random() >= settings.eggChance) return null;
    const { p1, p2, match } = validPairs[Math.floor(Math.random() * validPairs.length)];
    const mother = String(p2.gender).toLowerCase() === 'female' ? p2 : p1;
    const motherData = getMasterPokemon(mother) || match.data1 || match.data2;
    if (!motherData) return null;
    const eggGroup = (motherData.eggGroups || match.groups)[0] || 'field';
    const hatchSteps = settings.eggHatchStepsByGroup[eggGroup] || 5000;
    return {
      eggId: `egg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      species: motherData.name, speciesNumber: motherData.number,
      speciesOriginalNumber: getPokemonOriginalNumber(motherData),
      motherSpeciesNumber: motherData.number,
      motherOriginalNumber: getPokemonOriginalNumber(motherData),
      motherRegionalForm: motherData.regionalForm || null,
      motherFormVariant: motherData.formVariant || null,
      parent1Name: p1.nickname || p1.name, parent2Name: p2.nickname || p2.name,
      parent1TrainerName: name1 || null, parent2TrainerName: name2 || null,
      parent1Ball: { caughtWithBall: p1.caughtWithBall || '몬스터볼', ballImageUrl: p1.ballImageUrl || null },
      parent2Ball: { caughtWithBall: p2.caughtWithBall || '몬스터볼', ballImageUrl: p2.ballImageUrl || null },
      parentBalls: [
        { caughtWithBall: p1.caughtWithBall || '몬스터볼', ballImageUrl: p1.ballImageUrl || null },
        { caughtWithBall: p2.caughtWithBall || '몬스터볼', ballImageUrl: p2.ballImageUrl || null },
      ],
      eggGroups: motherData.eggGroups || match.groups,
      hatchSteps, stepsRemaining: hatchSteps, hatchProgress: 0,
      receivedDate: new Date().toISOString(),
      imageUrl: 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/egg.png',
      parentMoves: [...(p1.moves || []), ...(p2.moves || [])].filter(Boolean),
      parentHeldItems: [p1.heldItem || null, p2.heldItem || null],
      parent1Number: p1.number || null, parent2Number: p2.number || null,
      parent1Nature: p1.nature || null, parent2Nature: p2.nature || null,
    };
  };

  // 단계 완료 시 지급되는 "단계 아이템 풀": 친밀도 조건과 무관하게, 이 단계 완료 1회당
  // minPick~maxPick개를 풀에서 매번 독립적으로(복원추출로) 뽑는다 — 같은 아이템이 여러 번
  // 나올 수 있다 (예: A/B/C 풀 → ABC, AAB, ACC 등 모두 가능).
  const rollStageItems = (settings, currentStage) => {
    const idx = typeof currentStage === 'number' ? currentStage - 1 : -1;
    const stageSettings = idx >= 0 ? settings.stages?.[idx] : null;
    const pool = Array.isArray(stageSettings?.bonusItems) ? stageSettings.bonusItems : [];
    if (pool.length === 0) return [];
    const minPick = Math.max(1, Number(stageSettings.minPick ?? 1) || 1);
    const maxPick = Math.max(minPick, Number(stageSettings.maxPick ?? minPick) || minPick);
    const pickCount = rollRange(minPick, maxPick, minPick);
    const picked = [];
    for (let i = 0; i < pickCount; i++) {
      picked.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return picked;
  };

  // 전역 "보너스 아이템": 친밀도 기준을 넘는 참가 포켓몬 마리 수만큼 반복해서, 풀의 각
  // 아이템을 지정된 확률(chance/weight, %)로 독립적으로 굴린다.
  const rollBonusItems = (settings) => {
    const pool = Array.isArray(settings.bonusItems) ? settings.bonusItems : [];
    const items = pool.filter(item => Number(item.chance ?? item.weight) > 0);
    return items.filter(item => Math.random() < toProbability(item.chance ?? item.weight, 0));
  };

  const addInventoryItem = (inventory = [], item, count = 1) => {
    if (!item) return inventory;
    const itemId = item.itemId || item.id;
    const idx = inventory.findIndex(e => String(e.itemId || e.id) === String(itemId));
    const amount = Math.max(1, Number(count) || 1);
    if (idx >= 0) return inventory.map((e, i) => i === idx ? { ...e, count: Number(e.count || 0) + amount } : e);
    return [...inventory, { itemId, name: item.name || item.nameKo || item.nameEn || String(itemId), count: amount, imageUrl: item.imageUrl || item.spriteUrl || '' }];
  };

  const loadCustomItems = async () => {
    const snap = await db.ref('gameData/customItems').once('value');
    const raw = snap.exists() ? snap.val() : [];
    return Array.isArray(raw)
      ? raw
      : Object.entries(raw || {}).map(([id, item]) => ({ id, ...(item || {}) }));
  };

  const getDishStageSuffix = (dishType, stage) => {
    const suffix = CAMPING_DISH_STAGE_SUFFIXES[Number(stage)] || CAMPING_DISH_STAGE_SUFFIXES[5];
    return typeof suffix === 'object' ? suffix[dishType] || 'yyn' : suffix;
  };

  const findCampingDishItem = async (dishType, stage) => {
    const type = String(dishType || '').trim().toLowerCase();
    if (!type) return null;
    const suffix = getDishStageSuffix(type, stage);
    const target = `${type}_${suffix}`;
    const candidates = (await loadCustomItems()).map(item => ({ item, keys: normalizeItemKeys(item) }));
    return (
      candidates.find(({ keys }) => keys.includes(target))?.item ||
      candidates.find(({ keys }) => keys.some(key => key === target || key.endsWith(`/${target}`)))?.item ||
      null
    );
  };

  const pendingRef = memberId => db.ref(`gameData/campingPending/${memberId}`);

  const savePendingStart = async ({ memberId, partnerId, statusId }) => {
    await pendingRef(memberId).set({
      memberId,
      partnerId: partnerId || '',
      statusId: statusId || '',
      createdAt: new Date().toISOString(),
    });
  };

  const loadPendingStart = async memberId => {
    const snap = await pendingRef(memberId).once('value');
    return snap.exists() ? snap.val() : null;
  };

  const clearPendingStart = memberId => pendingRef(memberId).remove();

  const applyFriendshipToCaught = (caughtPokemon, participantKeys, bonus) => {
    const keys = new Set(participantKeys);
    const applyBonus = (p) => (
      p && keys.has(pokemonKey(p)) ? { ...p, friendship: Math.min(255, Number(p.friendship || 0) + bonus) } : p
    );

    if (Array.isArray(caughtPokemon)) {
      // 중간에 삭제된 자리로 배열에 구멍이 있으면 .map()이 건너뛰어 구멍이 그대로 남고,
      // Firebase는 그 구멍(undefined)을 그대로 쓸 수 없어 트랜잭션이 예외로 실패한다.
      return Array.from({ length: caughtPokemon.length }, (_, i) => applyBonus(caughtPokemon[i] ?? null));
    }

    if (caughtPokemon && typeof caughtPokemon === 'object') {
      // Firebase가 구멍 있는 배열을 숫자 키 객체로 돌려준 경우 — 같은 형태로 되돌려 써야
      // 기존 인덱스가 흐트러지지 않는다.
      return Object.fromEntries(Object.entries(caughtPokemon).map(([key, p]) => [key, applyBonus(p)]));
    }

    return caughtPokemon;
  };

  const applyFriendshipToPartner = (partnerPokemon, participantKeys, bonus) => {
    const keys = new Set(participantKeys);
    if (partnerPokemon && keys.has(pokemonKey(partnerPokemon))) {
      return { ...partnerPokemon, friendship: Math.min(255, Number(partnerPokemon.friendship || 0) + bonus) };
    }
    return partnerPokemon || null;
  };

  const applyFriendship = (memberData, participantKeys, bonus) => ({
    caughtPokemon: applyFriendshipToCaught(memberData.caughtPokemon, participantKeys, bonus),
    partnerPokemon: applyFriendshipToPartner(memberData.partnerPokemon, participantKeys, bonus),
  });

  // gameData/campingSessions는 삭제 없이 계속 쌓이는 컬렉션이라, 예전처럼 [계속]/[만족]
  // 답글마다 전체를 훑으면(index.js:syncCampingSessionIndex 주석 참고) 답글 하나당 그동안
  // 쌓인 캠핑 이력 전체를 다시 다운로드하게 된다. 회원별 포인터 색인
  // (gameData/memberCampingSessions/{memberId})만 보고 실제로 필요한 세션 하나만 개별
  // 조회한다 - battleBot.js의 findActiveBattle과 동일한 패턴(2026-08-05).
  const findActiveSession = async memberId => {
    const snap = await db.ref(`gameData/memberCampingSessions/${memberId}`).once('value');
    const pointers = snap.val() || {};
    const active = Object.entries(pointers)
      .filter(([, p]) => !isTerminalCampingStatus(p.status))
      .sort((a, b) => String(b[1].updatedAt || b[1].createdAt || '').localeCompare(String(a[1].updatedAt || a[1].createdAt || '')));
    if (!active.length) return null;
    const [sessionKey] = active[0];
    const sessionSnap = await db.ref(`gameData/campingSessions/${sessionKey}`).once('value');
    return sessionSnap.exists() ? { sessionKey, session: sessionSnap.val() } : null;
  };

  const createSession = async ({ memberId, member, partnerId, partner, statusId, settings, dishChoice }) => {
    const entryPokemon = getParticipantPokemon(member);
    const partnerPokemon = partner ? getParticipantPokemon(partner) : [];
    const session = {
      id: `camping_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      memberId,
      memberName: member.name || member.nickname || memberId,
      partnerId: partnerId || '',
      partnerName: partner?.name || partner?.nickname || '',
      entryPokemon: entryPokemon.map(p => ({ uniqueId: p.uniqueId || '', pokemonId: p.id || p.pokemonId || '', number: p.number || 0, name: p.nickname || p.name || '이름 없음' })),
      partnerEntryPokemon: partnerPokemon.map(p => ({ uniqueId: p.uniqueId || '', pokemonId: p.id || p.pokemonId || '', number: p.number || 0, name: p.nickname || p.name || '이름 없음' })),
      campingDishType: dishChoice.type,
      campingDishLabel: dishChoice.label,
      campingDish: dishChoice,
      isDuo: !!partnerId,
      status: 'in_progress',
      currentStage: settings.minCampingCount,
      mastodonStatusId: statusId,
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };
    const ref = db.ref('gameData/campingSessions').push();
    await ref.set(session);
    return { sessionKey: ref.key, session, entryPokemon, partnerPokemon };
  };

  const applyRewards = async ({ sessionKey, session, settings, success }) => {
    const stageSettings = getStageSettings(settings, session.currentStage);
    const memberRef = db.ref(`members/${session.memberId}`);
    const snap = await memberRef.once('value');
    if (!snap.exists()) throw new Error('Member not found');
    const memberData = snap.val();
    const participantKeys = (session.entryPokemon || []).map(pokemonKey).filter(Boolean);
    const friendshipBonus = success
      ? rollRange(stageSettings.friendshipMin, stageSettings.friendshipMax, stageSettings.friendshipBonus)
      : rollRange(settings.failFriendshipMin, settings.failFriendshipMax, 0);
    const expBonus = success
      ? rollRange(stageSettings.expMin, stageSettings.expMax, stageSettings.expBonus)
      : rollRange(settings.failExpMin, settings.failExpMax, 0);
    const friendshipResult = applyFriendship(memberData, participantKeys, friendshipBonus);

    const entryIdSet = new Set((session.entryPokemon || []).flatMap(e => [e.uniqueId, e.pokemonId]).filter(Boolean));
    const isEntry = p => p && (entryIdSet.has(p.uniqueId) || entryIdSet.has(p.id) || entryIdSet.has(p.pokemonId));
    const memberEntryPokemon = [
      ...normalizeCaughtPokemon(friendshipResult.caughtPokemon).filter(isEntry),
      ...(friendshipResult.partnerPokemon ? [friendshipResult.partnerPokemon] : []),
    ];
    const highFriendshipCount = memberEntryPokemon.filter(p => Number(p.friendship || 0) >= settings.minFriendshipForBonus).length;

    let inventory = memberData.inventory || [];
    const dishItem = success
      ? await findCampingDishItem(session.campingDishType || session.campingDish?.type, session.currentStage)
      : null;
    inventory = addInventoryItem(inventory, dishItem);
    const failRewards = !success && Array.isArray(settings.failRewards) ? settings.failRewards : [];
    for (const reward of failRewards) {
      inventory = addInventoryItem(inventory, reward, reward.count || 1);
    }
    let bonusItems = [];
    if (success) {
      bonusItems.push(...rollStageItems(settings, session.currentStage));
    }
    if (success && highFriendshipCount > 0) {
      for (let i = 0; i < highFriendshipCount; i++) {
        bonusItems.push(...rollBonusItems(settings));
      }
    }
    for (const item of bonusItems) {
      inventory = addInventoryItem(inventory, item);
    }

    let egg = null;
    if (session.isDuo && session.partnerId && !memberData.egg) {
      const partnerSnap = await db.ref(`members/${session.partnerId}`).once('value');
      if (partnerSnap.exists()) {
        const partnerData = partnerSnap.val();
        egg = rollEgg(getParticipantPokemon(memberData), getParticipantPokemon(partnerData), settings, memberData.name, partnerData.name);
      }
    }

    const updates = {
      characterExp: Number(memberData.characterExp || 0) + expBonus,
      trainerExp: Number(memberData.trainerExp || 0) + expBonus,
      inventory,
      'campingData/lastCampingDate': new Date().toISOString(),
      'campingData/totalCampings': Number(memberData.campingData?.totalCampings || 0) + 1,
      'campingData/bestStageReached': Math.max(Number(memberData.campingData?.bestStageReached || 0), Number(session.currentStage || 0)),
    };
    if (egg) updates.egg = egg;

    await memberRef.update(updates);
    // caughtPokemon/partnerPokemon은 배틀·교환 등 다른 흐름과 동시에 건드릴 수 있어서,
    // memberData 스냅샷을 그대로 덮어쓰지 않고 transaction으로 최신 값 위에 친밀도만 얹는다.
    if (participantKeys.length) {
      await memberRef.child('caughtPokemon').transaction((current) =>
        applyFriendshipToCaught(current, participantKeys, friendshipBonus));
      await memberRef.child('partnerPokemon').transaction((current) =>
        applyFriendshipToPartner(current, participantKeys, friendshipBonus));
    }
    const finishedStatus = success ? 'applied' : 'failed';
    await db.ref(`gameData/campingSessions/${sessionKey}`).update({
      status: finishedStatus,
      appliedAt: success ? new Date().toISOString() : null,
      failedAt: success ? null : new Date().toISOString(),
      success,
      reward: { stage: session.currentStage, friendshipBonus, expBonus, dishItem: dishItem || null, bonusItems, failRewards, egg: egg || null },
    });
    return { stageSettings, friendshipBonus, expBonus, dishItem, bonusItems, failRewards, egg };
  };

  const finishSession = async ({ sessionKey, session, settings, success, prefixLines = [] }) => {
    const sessionRef = db.ref(`gameData/campingSessions/${sessionKey}`);
    await sessionRef.update({
      status: 'applying',
      success,
      finishedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    });

    let rewards;
    try {
      rewards = await applyRewards({ sessionKey, session, settings, success });
    } catch (error) {
      console.error('camping finish reward error:', error);
      await sessionRef.update({
        status: 'failed',
        success,
        failedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        rewardError: error?.message || String(error),
      });
      return [
        success ? `캠핑 완료 처리 중 오류가 발생했어요. 세션은 종료했습니다.` : `캠핑 종료 처리 중 오류가 발생했어요. 세션은 종료했습니다.`,
        '관리자에게 보상 지급 상태를 확인해 달라고 알려 주세요.',
      ].join('\n');
    }
    const lines = [
      ...prefixLines.filter(Boolean),
      success ? `캠핑 완료! 단계 ${session.currentStage}` : `캠핑 실패! 단계 ${session.currentStage} 실패 보상을 지급합니다.`,
      `친밀도 +${rewards.friendshipBonus}`, `경험치 +${rewards.expBonus}`,
    ];
    if (rewards.dishItem) lines.push(`떡볶이 아이템: ${rewards.dishItem.name || rewards.dishItem.nameEn}`);
    if (rewards.bonusItems?.length) {
      const grouped = Object.values(rewards.bonusItems.reduce((acc, item) => {
        const key = item.itemId || item.id || item.name;
        if (!acc[key]) acc[key] = { name: item.name, count: 0 };
        acc[key].count += 1;
        return acc;
      }, {}));
      lines.push(`보너스 아이템: ${grouped.map(g => g.count > 1 ? `${g.name} x${g.count}` : g.name).join(', ')}`);
    }
    if (rewards.failRewards?.length) lines.push(`실패 보상: ${rewards.failRewards.map(item => `${item.name || item.nameKo || item.nameEn || item.itemId} x${item.count || 1}`).join(', ')}`);
    if (rewards.egg) lines.push('알을 발견했어요!');
    return lines.join('\n');
  };

  const findTaggedPartner = (members, status, authorAccount) => {
    const author = normalizeAccount(authorAccount);
    const botUsername = localUsername(botAccount);
    const botMentionIds = new Set(
      (status?.mentions || [])
        .filter(m => localUsername(m?.acct || m?.username || '') === botUsername)
        .map(m => String(m?.id || ''))
        .filter(Boolean)
    );
    const accounts = extractMentionAccounts(status)
      .map(normalizeAccount)
      .filter(a => localUsername(a) !== botUsername && a !== author && !botMentionIds.has(localUsername(a)));
    for (const a of accounts) {
      const match = findMemberByAccount(members, a);
      if (match) return match;
    }
    return null;
  };

  return {
    getCommand,
    handle: async ({ status, content, command, members, author, authorAccount }) => {
      const settings = await loadCampingSettings();
      if (command === 'start') {
        const partner = findTaggedPartner(members, status, authorAccount);
        return askCampingDish({ status, memberId: author.id, partnerId: partner?.id || null });
      }
      if (command === 'dish') {
        const dishChoice = getCampingDishChoice(content);
        return startCampingFromDish({ status, memberId: author.id, member: author.member, members, settings, dishChoice });
      }
      if (command === 'continue') return continueCamping({ memberId: author.id, settings });
      return satisfyCamping({ memberId: author.id, settings });
    },
  };

  async function startCamping({ status, memberId, member, partnerId, partner, settings, dishChoice }) {
    const active = await findActiveSession(memberId);
    if (active) return '이미 진행 중인 캠핑이 있어요. [만족] 또는 [계속]으로 먼저 마무리해 주세요.';
    const created = await createSession({ memberId, member, partnerId, partner, statusId: status.id, settings, dishChoice });
    const { success } = rollStageSuccess(settings, created.session.currentStage, created.session.isDuo);
    if (!success) return finishSession({ sessionKey: created.sessionKey, session: created.session, settings, success: false });
    const lines = [`${dishChoice.label} 떡볶이 캠핑 시작!`, `함께 캠핑하는 포켓몬: ${formatPokemonList(created.entryPokemon)}`];
    if (partner) lines.push(`${partner.name || partner.nickname || '상대'}의 포켓몬: ${formatPokemonList(created.partnerPokemon)}`);
    const stageSettings = getStageSettings(settings, created.session.currentStage);
    if (stageSettings.message) lines.push(stageSettings.message);
    return lines.join('\n');
  }

  async function askCampingDish({ status, memberId, partnerId }) {
    const active = await findActiveSession(memberId);
    if (active) return '이미 진행 중인 캠핑이 있어요. [만족] 또는 [계속]으로 먼저 마무리해 주세요.';
    await savePendingStart({ memberId, partnerId, statusId: status.id });
    return '무슨 떡볶이를 만들까?\n[고추장] [크림] [궁중] 중 하나를 골라 답해 주세요.';
  }

  async function startCampingFromDish({ status, memberId, member, members, settings, dishChoice }) {
    const pending = await loadPendingStart(memberId);
    if (!pending) return '먼저 [캠핑 시작]을 보내 주세요.';
    const partnerId = pending.partnerId || null;
    const partner = partnerId ? { id: partnerId, member: members[partnerId] } : null;
    await clearPendingStart(memberId);
    return startCamping({
      status,
      memberId,
      member,
      partnerId,
      partner: partner?.member || null,
      settings,
      dishChoice,
    });
  }

  async function continueCamping({ memberId, settings }) {
    const active = await findActiveSession(memberId);
    if (!active) return '진행 중인 캠핑이 없어요. [캠핑 시작]으로 시작해 주세요.';
    const { sessionKey, session } = active;
    const nextStage = Number(session.currentStage || settings.minCampingCount) + 1;
    if (nextStage > settings.maxCampingCount) return finishSession({ sessionKey, session, settings, success: true });
    const nextStageSettings = getStageSettings(settings, nextStage);
    const { success } = rollStageSuccess(settings, nextStage, session.isDuo);
    if (!success) return finishSession({ sessionKey, session, settings, success: false });
    const updatedSession = { ...session, currentStage: nextStage };
    await db.ref(`gameData/campingSessions/${sessionKey}`).update({ currentStage: nextStage, lastUpdatedAt: new Date().toISOString() });
    if (nextStage === settings.maxCampingCount) {
      return finishSession({
        sessionKey,
        session: updatedSession,
        settings,
        success: true,
        prefixLines: [nextStageSettings.message],
      });
    }
    return nextStageSettings.message || `단계 ${nextStage}로 진행했어요. [만족] 또는 [계속]을 선택해 주세요.`;
  }

  async function satisfyCamping({ memberId, settings }) {
    const active = await findActiveSession(memberId);
    if (!active) return '진행 중인 캠핑이 없어요. [캠핑 시작]으로 시작해 주세요.';
    return finishSession({ sessionKey: active.sessionKey, session: active.session, settings, success: true });
  }
};

module.exports = { createCampBot, getCommand };
