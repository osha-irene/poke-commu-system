const functions = require('firebase-functions');
const admin = require('firebase-admin');
const http = require('http');
const https = require('https');
const { createBattleBot } = require('./battleBot');

const getFirebaseConfig = () => {
  try {
    return process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
  } catch (error) {
    console.warn('FIREBASE_CONFIG was not valid JSON:', error.message);
    return {};
  }
};

const firebaseConfig = getFirebaseConfig();
const projectId =
  firebaseConfig.projectId ||
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.REACT_APP_FIREBASE_PROJECT_ID ||
  'poke-commu-system';

const databaseURL =
  firebaseConfig.databaseURL ||
  process.env.FIREBASE_DATABASE_URL ||
  process.env.REACT_APP_FIREBASE_DATABASE_URL ||
  (projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : undefined);

admin.initializeApp(databaseURL ? { databaseURL } : undefined);
const db = admin.database();

const MASTODON_BASE_URL =
  process.env.MASTODON_INSTANCE_URL ||
  process.env.MASTODON_BASE_URL ||
  'https://poketodon.monster';
const MASTODON_HOST = new URL(MASTODON_BASE_URL).host;
const BOT_ACCOUNT = (process.env.MASTODON_ACCOUNT || 'system').toLowerCase();
const SYSTEM_ACCOUNT = BOT_ACCOUNT;
const MASTODON_TOKEN = process.env.MASTODON_TOKEN || '';

let pokemonData = [];
try {
  let loaded;
  try {
    loaded = require('./data/allPokemon.json');
  } catch (allPokemonError) {
    loaded = require('./data/pokemon.json');
  }
  pokemonData = Array.isArray(loaded) ? loaded : loaded?.pokemon || [];
} catch (error) {
  console.warn('Pokemon data was not loaded:', error.message);
}

const DEFAULT_CAMPING_SETTINGS = {
  minCampingCount: 1,
  maxCampingCount: 5,
  duoSuccessBonus: 0.15,
  eggChance: 0.05,
  minFriendshipForBonus: 160,
  bonusItems: [
    { itemId: 101, name: '진화의돌', weight: 5 },
    { itemId: 102, name: '기술머신', weight: 10 },
    { itemId: 103, name: '레어사탕', weight: 15 },
    { itemId: 104, name: '금구슬', weight: 20 }
  ],
  eggHatchStepsByGroup: {
    monster: 5000,
    water1: 5000,
    bug: 3000,
    flying: 3000,
    field: 5000,
    fairy: 5000,
    grass: 5000,
    humanlike: 6000,
    water3: 5000,
    mineral: 6000,
    amorphous: 5000,
    water2: 5000,
    ditto: 6000,
    dragon: 8000,
    undiscovered: 0
  },
  stages: [
    {
      stage: 1,
      friendshipBonus: 10,
      expBonus: 50,
      successRate: 1,
      message: '캠핑을 시작했어요. [만족]으로 마치거나 [계속]으로 다음 단계에 도전할 수 있어요.'
    },
    {
      stage: 2,
      friendshipBonus: 20,
      expBonus: 100,
      successRate: 0.8,
      message: '캠핑이 조금 더 깊어졌어요. [만족] 또는 [계속]을 선택해 주세요.'
    },
    {
      stage: 3,
      friendshipBonus: 30,
      expBonus: 150,
      successRate: 0.6,
      message: '포켓몬들이 꽤 즐거워 보여요. [만족] 또는 [계속]을 선택해 주세요.'
    },
    {
      stage: 4,
      friendshipBonus: 40,
      expBonus: 200,
      successRate: 0.4,
      message: '캠핑 분위기가 무르익었어요. [만족] 또는 [계속]을 선택해 주세요.'
    },
    {
      stage: 5,
      friendshipBonus: 50,
      expBonus: 300,
      successRate: 0.2,
      message: '최고 단계까지 왔어요. 캠핑을 마무리합니다.'
    }
  ]
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const stripHtml = (html = '') =>
  String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();

const normalizeAccount = (account = '') => {
  const cleaned = String(account).trim().replace(/^@/, '').toLowerCase();
  if (!cleaned) return '';
  return cleaned.includes('@') ? cleaned : `${cleaned}@${MASTODON_HOST}`;
};

const localUsername = (account = '') => normalizeAccount(account).split('@')[0] || '';

const toProbability = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric > 1 ? clamp(numeric / 100, 0, 1) : clamp(numeric, 0, 1);
};

const normalizeStage = (stage, index) => ({
  stage: Number(stage?.stage ?? index + 1),
  friendshipBonus: Math.max(0, Number(stage?.friendshipBonus ?? 0) || 0),
  expBonus: Math.max(0, Number(stage?.expBonus ?? 0) || 0),
  successRate: toProbability(stage?.successRate, 1),
  message: String(stage?.message || DEFAULT_CAMPING_SETTINGS.stages[index]?.message || '')
});

const normalizeSettings = (raw = {}) => {
  const legacyEggChance =
    raw.eggChance ??
    raw.mastodonTaggedEggChance ??
    raw.eggChanceWithFriendship ??
    raw.eggChanceBase;

  const stagesSource =
    Array.isArray(raw.stages) ? raw.stages :
    Array.isArray(raw.stageRewards) ? raw.stageRewards :
    Array.isArray(raw.cookingStages) ? raw.cookingStages :
    DEFAULT_CAMPING_SETTINGS.stages;

  const stages = DEFAULT_CAMPING_SETTINGS.stages.map((defaultStage, index) =>
    normalizeStage({ ...defaultStage, ...(stagesSource[index] || {}) }, index)
  );

  const minCampingCount = Math.max(1, Number(raw.minCampingCount ?? raw.minStage ?? DEFAULT_CAMPING_SETTINGS.minCampingCount) || 1);
  const maxCampingCount = Math.max(
    minCampingCount,
    Number(raw.maxCampingCount ?? raw.maxStage ?? DEFAULT_CAMPING_SETTINGS.maxCampingCount) || DEFAULT_CAMPING_SETTINGS.maxCampingCount
  );

  return {
    ...DEFAULT_CAMPING_SETTINGS,
    ...raw,
    minCampingCount,
    maxCampingCount: Math.min(maxCampingCount, stages.length),
    duoSuccessBonus: toProbability(raw.duoSuccessBonus, DEFAULT_CAMPING_SETTINGS.duoSuccessBonus),
    eggChance: toProbability(legacyEggChance, DEFAULT_CAMPING_SETTINGS.eggChance),
    minFriendshipForBonus: Number(raw.minFriendshipForBonus ?? DEFAULT_CAMPING_SETTINGS.minFriendshipForBonus) || 160,
    bonusItems: Array.isArray(raw.bonusItems) ? raw.bonusItems : DEFAULT_CAMPING_SETTINGS.bonusItems,
    eggHatchStepsByGroup: {
      ...DEFAULT_CAMPING_SETTINGS.eggHatchStepsByGroup,
      ...(raw.eggHatchStepsByGroup || {})
    },
    stages
  };
};

const loadCampingSettings = async () => {
  const refs = [
    db.ref('gameData/campingSettings'),
    db.ref('gameData/systemSettings/campingSettings'),
    db.ref('gameData/systemSettings/camping')
  ];

  for (const settingsRef of refs) {
    const snapshot = await settingsRef.once('value');
    if (snapshot.exists()) return normalizeSettings(snapshot.val());
  }

  return normalizeSettings();
};

const makeMastodonRequest = (path, method = 'GET', data = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, MASTODON_BASE_URL);
    const client = url.protocol === 'http:' ? http : https;
    const postData = data ? JSON.stringify(data) : null;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'http:' ? 80 : 443),
      path: `${url.pathname}${url.search}`,
      method,
      headers: {
        Authorization: `Bearer ${MASTODON_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    };

    if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

    const request = client.request(options, response => {
      let responseData = '';
      response.on('data', chunk => responseData += chunk);
      response.on('end', () => {
        let parsed = responseData;
        try {
          parsed = responseData ? JSON.parse(responseData) : {};
        } catch (error) {
          // Keep plain text responses as-is.
        }

        if (response.statusCode >= 400) {
          const apiError = new Error(`Mastodon API ${response.statusCode}`);
          apiError.statusCode = response.statusCode;
          apiError.response = parsed;
          reject(apiError);
          return;
        }

        resolve(parsed);
      });
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Mastodon request timeout'));
    });

    if (postData) request.write(postData);
    request.end();
  });
};

const replyToStatus = async (status, content, visibility = 'public') => {
  const acct = status?.account?.acct;
  const mention = acct ? `@${acct}` : '';
  const body = mention && !content.includes(mention) ? `${mention} ${content}` : content;

  await makeMastodonRequest('/api/v1/statuses', 'POST', {
    status: body,
    in_reply_to_id: status.id,
    visibility: status.visibility || visibility
  });
};

const getMentions = async (sinceId = null) => {
  let path = '/api/v1/notifications?types[]=mention&limit=40';
  if (sinceId) path += `&since_id=${encodeURIComponent(sinceId)}`;
  const data = await makeMastodonRequest(path);
  return Array.isArray(data) ? data.filter(notification => notification.type === 'mention' && notification.status) : [];
};

const getMembers = async () => {
  const snapshot = await db.ref('members').once('value');
  return snapshot.val() || {};
};

const memberMatchesAccount = (member, account) => {
  const target = normalizeAccount(account);
  const shortTarget = localUsername(target);
  const candidates = [
    member?.mastodonAccount,
    member?.mastodonId,
    member?.mastodonUsername,
    member?.acct
  ]
    .filter(Boolean)
    .map(normalizeAccount);

  return candidates.some(candidate => candidate === target || localUsername(candidate) === shortTarget);
};

const findMemberByAccount = (members, account) => {
  for (const [id, member] of Object.entries(members)) {
    if (memberMatchesAccount(member, account)) {
      return { id, member: { ...member, id: member.id || id } };
    }
  }
  return null;
};

const extractMentionAccounts = status =>
  (status?.mentions || [])
    .map(mention => mention.acct || mention.username)
    .filter(Boolean);

const isSystemMentioned = status => {
  const content = stripHtml(status?.content);
  const mentions = extractMentionAccounts(status);
  const botMentionPattern = new RegExp(`@${BOT_ACCOUNT}\\b`, 'i');
  return mentions.some(account => localUsername(account) === BOT_ACCOUNT) || botMentionPattern.test(content);
};

const getAuthorAccount = status => status?.account?.acct || status?.account?.username || '';

const isFromBotAccount = status => {
  const account = getAuthorAccount(status);
  return localUsername(account) === BOT_ACCOUNT;
};

const getParticipantPokemon = member => {
  const caught = Array.isArray(member?.caughtPokemon) ? member.caughtPokemon.filter(Boolean).slice(0, 6) : [];
  const partner = member?.partnerPokemon ? [member.partnerPokemon] : [];
  const byId = new Map();

  [...partner, ...caught].forEach(pokemon => {
    const key = pokemon.uniqueId || pokemon.id || pokemon.pokemonId || `${pokemon.number}_${pokemon.name}`;
    if (key && !byId.has(key)) byId.set(key, pokemon);
  });

  return Array.from(byId.values());
};

const pokemonKey = pokemon => pokemon?.uniqueId || pokemon?.id || pokemon?.pokemonId || `${pokemon?.number}_${pokemon?.name}`;

const formatPokemonList = pokemonList => {
  if (!pokemonList.length) return '없음';
  return pokemonList.map(pokemon => pokemon.nickname || pokemon.name || `No.${pokemon.number}`).join(', ');
};

const createSession = async ({ memberId, member, partnerId = null, partner = null, statusId, settings }) => {
  const entryPokemon = getParticipantPokemon(member);
  const partnerPokemon = partner ? getParticipantPokemon(partner) : [];
  const session = {
    id: `camping_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    memberId,
    memberName: member.name || member.nickname || memberId,
    partnerId: partnerId || '',
    partnerName: partner?.name || partner?.nickname || '',
    entryPokemon: entryPokemon.map(pokemon => ({
      uniqueId: pokemon.uniqueId || '',
      pokemonId: pokemon.id || pokemon.pokemonId || '',
      number: pokemon.number || 0,
      name: pokemon.nickname || pokemon.name || '이름 없음'
    })),
    partnerEntryPokemon: partnerPokemon.map(pokemon => ({
      uniqueId: pokemon.uniqueId || '',
      pokemonId: pokemon.id || pokemon.pokemonId || '',
      number: pokemon.number || 0,
      name: pokemon.nickname || pokemon.name || '이름 없음'
    })),
    isDuo: !!partnerId,
    status: 'in_progress',
    currentStage: settings.minCampingCount,
    mastodonStatusId: statusId,
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString()
  };

  const newSessionRef = db.ref('gameData/campingSessions').push();
  await newSessionRef.set(session);
  return { sessionKey: newSessionRef.key, session, entryPokemon, partnerPokemon };
};

const findActiveSession = async memberId => {
  const snapshot = await db.ref('gameData/campingSessions').once('value');
  const sessions = snapshot.val() || {};
  const active = Object.entries(sessions)
    .filter(([, session]) =>
      session.memberId === memberId &&
      !['completed', 'applied', 'failed'].includes(session.status)
    )
    .sort((a, b) => String(b[1].createdAt || '').localeCompare(String(a[1].createdAt || '')));

  if (!active.length) return null;
  const [sessionKey, session] = active[0];
  return { sessionKey, session };
};

const getStageSettings = (settings, stage) =>
  settings.stages.find(item => Number(item.stage) === Number(stage)) ||
  settings.stages[clamp(Number(stage) - 1, 0, settings.stages.length - 1)];

const rollStageSuccess = (settings, stage, isDuo) => {
  const stageSettings = getStageSettings(settings, stage);
  const chance = clamp(stageSettings.successRate + (isDuo ? settings.duoSuccessBonus : 0), 0, 1);
  return { success: Math.random() < chance, chance, stageSettings };
};

const getMasterPokemon = pokemon =>
  pokemonData.find(item => Number(item.number) === Number(pokemon?.number));

const getPokemonOriginalNumber = pokemon =>
  Number(pokemon?.originalNumber || pokemon?.displayNumber || pokemon?.number || 0);

const gendersAreCompatible = (pokemon1, pokemon2) => {
  const gender1 = String(pokemon1?.gender || '').toLowerCase();
  const gender2 = String(pokemon2?.gender || '').toLowerCase();
  if (!gender1 || !gender2) return true;
  if (gender1 === 'ditto' || gender2 === 'ditto') return true;
  return (gender1 === 'female' && gender2 === 'male') || (gender1 === 'male' && gender2 === 'female');
};

const eggGroupsMatch = (pokemon1, pokemon2) => {
  const data1 = getMasterPokemon(pokemon1);
  const data2 = getMasterPokemon(pokemon2);
  const groups1 = data1?.eggGroups || pokemon1?.eggGroups || [];
  const groups2 = data2?.eggGroups || pokemon2?.eggGroups || [];
  if (!groups1.length || !groups2.length) return null;
  if (groups1.includes('undiscovered') || groups2.includes('undiscovered')) return null;
  const groups = groups1.filter(group => groups2.includes(group));
  return groups.length ? { data1, data2, groups } : null;
};

const rollEgg = (memberPokemon, partnerPokemon, settings) => {
  if (!memberPokemon.length || !partnerPokemon.length) return null;

  for (const pokemon1 of memberPokemon) {
    for (const pokemon2 of partnerPokemon) {
      const match = eggGroupsMatch(pokemon1, pokemon2);
      if (!match || !gendersAreCompatible(pokemon1, pokemon2)) continue;
      if (Math.random() >= settings.eggChance) continue;

      const mother = String(pokemon2.gender).toLowerCase() === 'female' ? pokemon2 : pokemon1;
      const motherData = getMasterPokemon(mother) || match.data1 || match.data2;
      if (!motherData) return null;

      const eggGroup = (motherData.eggGroups || match.groups)[0] || 'field';
      const hatchSteps = settings.eggHatchStepsByGroup[eggGroup] || 5000;

      return {
        eggId: `egg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        species: motherData.name,
        speciesNumber: motherData.number,
        speciesOriginalNumber: getPokemonOriginalNumber(motherData),
        motherSpeciesNumber: motherData.number,
        motherOriginalNumber: getPokemonOriginalNumber(motherData),
        motherRegionalForm: motherData.regionalForm || null,
        motherFormVariant: motherData.formVariant || null,
        parent1Name: pokemon1.nickname || pokemon1.name,
        parent2Name: pokemon2.nickname || pokemon2.name,
        parent1Ball: {
          caughtWithBall: pokemon1.caughtWithBall || '몬스터볼',
          ballImageUrl: pokemon1.ballImageUrl || null
        },
        parent2Ball: {
          caughtWithBall: pokemon2.caughtWithBall || '몬스터볼',
          ballImageUrl: pokemon2.ballImageUrl || null
        },
        parentBalls: [
          {
            caughtWithBall: pokemon1.caughtWithBall || '몬스터볼',
            ballImageUrl: pokemon1.ballImageUrl || null
          },
          {
            caughtWithBall: pokemon2.caughtWithBall || '몬스터볼',
            ballImageUrl: pokemon2.ballImageUrl || null
          }
        ],
        eggGroups: motherData.eggGroups || match.groups,
        hatchSteps,
        stepsRemaining: hatchSteps,
        hatchProgress: 0,
        receivedDate: new Date().toISOString(),
        imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/egg.png'
      };
    }
  }

  return null;
};

const rollBonusItem = settings => {
  const items = settings.bonusItems.filter(item => Number(item.weight) > 0);
  const totalWeight = items.reduce((sum, item) => sum + Number(item.weight), 0);
  if (!totalWeight) return null;

  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= Number(item.weight);
    if (roll <= 0) return item;
  }
  return null;
};

const addInventoryItem = (inventory = [], item) => {
  if (!item) return inventory;
  const itemId = item.itemId || item.id;
  const index = inventory.findIndex(entry => String(entry.itemId || entry.id) === String(itemId));
  if (index >= 0) {
    return inventory.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, count: Number(entry.count || 0) + 1 } : entry
    );
  }
  return [...inventory, { itemId, name: item.name || String(itemId), count: 1 }];
};

const applyFriendship = (memberData, participantKeys, bonus) => {
  const keys = new Set(participantKeys);
  const caughtPokemon = Array.isArray(memberData.caughtPokemon)
    ? memberData.caughtPokemon.map(pokemon => {
        if (!pokemon || !keys.has(pokemonKey(pokemon))) return pokemon;
        return { ...pokemon, friendship: Math.min(255, Number(pokemon.friendship || 0) + bonus) };
      })
    : memberData.caughtPokemon;

  let partnerPokemon = memberData.partnerPokemon || null;
  if (partnerPokemon && keys.has(pokemonKey(partnerPokemon))) {
    partnerPokemon = {
      ...partnerPokemon,
      friendship: Math.min(255, Number(partnerPokemon.friendship || 0) + bonus)
    };
  }

  return { caughtPokemon, partnerPokemon };
};

const applyRewardsToMember = async ({ sessionKey, session, settings, success }) => {
  const stageSettings = getStageSettings(settings, session.currentStage);
  const memberRef = db.ref(`members/${session.memberId}`);
  const memberSnapshot = await memberRef.once('value');
  if (!memberSnapshot.exists()) throw new Error('Member not found');

  const memberData = memberSnapshot.val();
  const participantKeys = (session.entryPokemon || []).map(pokemonKey).filter(Boolean);
  const friendshipBonus = success ? stageSettings.friendshipBonus : 0;
  const expBonus = success ? stageSettings.expBonus : 0;
  const friendshipResult = applyFriendship(memberData, participantKeys, friendshipBonus);
  const highFriendship = getParticipantPokemon({
    ...memberData,
    caughtPokemon: friendshipResult.caughtPokemon,
    partnerPokemon: friendshipResult.partnerPokemon
  }).some(pokemon => Number(pokemon.friendship || 0) >= settings.minFriendshipForBonus);

  let inventory = memberData.inventory || [];
  let bonusItem = null;
  if (success && highFriendship) {
    bonusItem = rollBonusItem(settings);
    inventory = addInventoryItem(inventory, bonusItem);
  }

  let egg = null;
  if (success && session.isDuo && session.partnerId) {
    const partnerSnapshot = await db.ref(`members/${session.partnerId}`).once('value');
    if (partnerSnapshot.exists()) {
      egg = rollEgg(
        getParticipantPokemon(memberData),
        getParticipantPokemon(partnerSnapshot.val()),
        settings
      );
    }
  }

  const updates = {
    caughtPokemon: friendshipResult.caughtPokemon,
    characterExp: Number(memberData.characterExp || 0) + expBonus,
    trainerExp: Number(memberData.trainerExp || 0) + expBonus,
    inventory,
    'campingData/lastCampingDate': new Date().toISOString(),
    'campingData/totalCampings': Number(memberData.campingData?.totalCampings || 0) + 1,
    'campingData/bestStageReached': Math.max(Number(memberData.campingData?.bestStageReached || 0), Number(session.currentStage || 0))
  };

  if (friendshipResult.partnerPokemon) updates.partnerPokemon = friendshipResult.partnerPokemon;
  if (egg) updates.egg = egg;

  await memberRef.update(updates);
  await db.ref(`gameData/campingSessions/${sessionKey}`).update({
    status: success ? 'applied' : 'failed',
    appliedAt: new Date().toISOString(),
    success,
    reward: {
      stage: session.currentStage,
      friendshipBonus,
      expBonus,
      bonusItem: bonusItem || null,
      egg: egg || null
    }
  });

  return { stageSettings, friendshipBonus, expBonus, bonusItem, egg };
};

const finishSession = async ({ sessionKey, session, settings, success }) => {
  const rewards = await applyRewardsToMember({ sessionKey, session, settings, success });
  if (!success) return '캠핑이 중단되었어요. 이번에는 보상이 적용되지 않았습니다.';

  const lines = [
    `캠핑 완료! 단계 ${session.currentStage}`,
    `친밀도 +${rewards.friendshipBonus}`,
    `경험치 +${rewards.expBonus}`
  ];
  if (rewards.bonusItem) lines.push(`보너스 아이템: ${rewards.bonusItem.name}`);
  if (rewards.egg) lines.push('어라? 포켓몬의 알이 있다!');
  return lines.join('\n');
};

const startCamping = async ({ status, memberId, member, partnerId, partner, settings }) => {
  const active = await findActiveSession(memberId);
  if (active) {
    return '이미 진행 중인 캠핑이 있어요. [만족] 또는 [계속]으로 먼저 마무리해 주세요.';
  }

  const created = await createSession({
    memberId,
    member,
    partnerId,
    partner,
    statusId: status.id,
    settings
  });

  const lines = [
    '캠핑 시작!',
    `함께 캠핑하는 포켓몬: ${formatPokemonList(created.entryPokemon)}`,
  ];

  if (partner) {
    lines.push(`${partner.name || partner.nickname || '상대'}의 포켓몬: ${formatPokemonList(created.partnerPokemon)}`);
  }

  const stageSettings = getStageSettings(settings, created.session.currentStage);
  if (stageSettings.message) lines.push(stageSettings.message);
  return lines.join('\n');
};

const continueCamping = async ({ memberId, settings }) => {
  const active = await findActiveSession(memberId);
  if (!active) return '진행 중인 캠핑이 없어요. [캠핑 시작]으로 시작해 주세요.';

  const { sessionKey, session } = active;
  const { success, stageSettings } = rollStageSuccess(settings, session.currentStage, session.isDuo);
  if (!success) {
    return finishSession({ sessionKey, session, settings, success: false });
  }

  const nextStage = Number(session.currentStage || settings.minCampingCount) + 1;
  if (nextStage > settings.maxCampingCount) {
    return finishSession({ sessionKey, session, settings, success: true });
  }

  await db.ref(`gameData/campingSessions/${sessionKey}`).update({
    currentStage: nextStage,
    lastUpdatedAt: new Date().toISOString()
  });

  const nextStageSettings = getStageSettings(settings, nextStage);
  return nextStageSettings.message || `단계 ${nextStage}로 진행했어요. [만족] 또는 [계속]을 선택해 주세요.`;
};

const satisfyCamping = async ({ memberId, settings }) => {
  const active = await findActiveSession(memberId);
  if (!active) return '진행 중인 캠핑이 없어요. [캠핑 시작]으로 시작해 주세요.';
  return finishSession({ sessionKey: active.sessionKey, session: active.session, settings, success: true });
};

const getCommand = content => {
  if (/\[?\s*캠핑\s*시작\s*\]?/i.test(content) || /\[캠핑\]/i.test(content)) return 'start';
  if (/\[?\s*계속\s*\]?/i.test(content)) return 'continue';
  if (/\[?\s*만족\s*\]?/i.test(content)) return 'satisfy';
  return null;
};

const findTaggedPartner = (members, status, authorAccount) => {
  const author = normalizeAccount(authorAccount);
  const accounts = extractMentionAccounts(status)
    .map(normalizeAccount)
    .filter(account => localUsername(account) !== SYSTEM_ACCOUNT && account !== author);

  for (const account of accounts) {
    const match = findMemberByAccount(members, account);
    if (match) return match;
  }
  return null;
};

const TRADE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

const accountMention = (account) => {
  const cleaned = String(account || '').trim().replace(/^@/, '');
  return cleaned ? `@${cleaned}` : '';
};

const getTradeCommand = (content = '') => {
  const text = String(content || '');
  if (/\[\s*교환\s*신청\s*\]|\b교환\s*신청\b/i.test(text)) return 'request';
  if (/\[\s*교환\s*수락\s*\]|\b교환\s*수락\b/i.test(text)) return 'accept';
  if (/\[\s*교환\s*거절\s*\]|\b교환\s*거절\b/i.test(text)) return 'decline';
  return extractTradePokemonName(text) ? 'selectPokemon' : null;
};

const extractTradePokemonName = (content = '') => {
  const text = String(content || '');
  const bracketMatch = text.match(/\[\s*교환\s*[:：]\s*([^\]]+)\]/i);
  if (bracketMatch) {
    const value = bracketMatch[1].trim();
    return /^(신청|수락|거절)$/i.test(value) ? null : value;
  }

  const looseMatch = text.match(/교환\s*[:：]\s*([^\n\r\[]+)/i);
  if (!looseMatch) return null;
  const value = looseMatch[1].replace(/@\S+/g, '').trim();
  return /^(신청|수락|거절)$/i.test(value) ? null : value;
};

const normalizePokemonSearchText = (value = '') => String(value || '')
  .toLowerCase()
  .replace(/\s+/g, '')
  .replace(/[()[\]{}'"`.,:;!?_\-]/g, '');

const tradePokemonLabel = pokemon =>
  pokemon?.nickname || pokemon?.name || pokemon?.nameEn || `No.${pokemon?.number || '?'}`;

const getTradePokemonKey = pokemon =>
  pokemon?.uniqueId || pokemon?.id || pokemon?.pokemonId || `${pokemon?.number}_${pokemon?.name}`;

const getTradeSearchFields = pokemon => [
  pokemon?.nickname,
  pokemon?.name,
  pokemon?.nameEn,
  pokemon?.species,
  pokemon?.baseSpecies,
  pokemon?.number ? `No.${pokemon.number}` : '',
  pokemon?.number ? String(pokemon.number) : ''
].filter(Boolean);

const findOwnedPokemonForTrade = (member, query) => {
  const normalizedQuery = normalizePokemonSearchText(query);
  if (!normalizedQuery) {
    return { error: '교환할 포켓몬 이름을 찾을 수 없어요. [교환: 피카츄]처럼 적어 주세요.' };
  }

  const caughtPokemon = Array.isArray(member?.caughtPokemon) ? member.caughtPokemon : [];
  const candidates = caughtPokemon
    .map((pokemon, index) => ({ pokemon, index }))
    .filter(({ pokemon }) => pokemon && !pokemon.isPartner);

  const exactMatches = candidates.filter(({ pokemon }) =>
    getTradeSearchFields(pokemon).some(field => normalizePokemonSearchText(field) === normalizedQuery)
  );
  const matches = exactMatches.length ? exactMatches : candidates.filter(({ pokemon }) =>
    getTradeSearchFields(pokemon).some(field => normalizePokemonSearchText(field).includes(normalizedQuery))
  );

  if (!matches.length) {
    return { error: `${query}을(를) 보유 포켓몬에서 찾을 수 없어요.` };
  }

  if (matches.length > 1) {
    const labels = matches.slice(0, 5).map(({ pokemon }) => tradePokemonLabel(pokemon)).join(', ');
    return { error: `${query}에 해당하는 포켓몬이 여러 마리예요. 닉네임으로 다시 지정해 주세요. (${labels})` };
  }

  return matches[0];
};

const findPendingTrade = async (targetId, requesterId = null) => {
  const snapshot = await db.ref('gameData/tradeRequests').once('value');
  const trades = snapshot.val() || {};
  const now = Date.now();
  const pending = Object.entries(trades)
    .filter(([, trade]) =>
      trade.status === 'pending' &&
      trade.targetId === targetId &&
      (!requesterId || trade.requesterId === requesterId) &&
      now - Number(trade.createdAt || 0) <= TRADE_EXPIRATION_MS
    )
    .sort((a, b) => Number(b[1].createdAt || 0) - Number(a[1].createdAt || 0));

  if (!pending.length) return null;
  return { tradeKey: pending[0][0], trade: pending[0][1] };
};

const findActiveTradeForMember = async (memberId, otherMemberId = null) => {
  const snapshot = await db.ref('gameData/tradeRequests').once('value');
  const trades = snapshot.val() || {};
  const now = Date.now();
  const active = Object.entries(trades)
    .filter(([, trade]) => {
      if (!['pending', 'accepted'].includes(trade.status)) return false;
      if (now - Number(trade.createdAt || 0) > TRADE_EXPIRATION_MS) return false;
      const isParticipant = trade.requesterId === memberId || trade.targetId === memberId;
      const matchesOther = !otherMemberId || trade.requesterId === otherMemberId || trade.targetId === otherMemberId;
      return isParticipant && matchesOther;
    })
    .sort((a, b) => Number(b[1].updatedAt || b[1].createdAt || 0) - Number(a[1].updatedAt || a[1].createdAt || 0));

  if (!active.length) return null;
  return { tradeKey: active[0][0], trade: active[0][1] };
};

const withTradeOwner = (pokemon, fromMemberId, toMemberId) => ({
  ...pokemon,
  ownerId: toMemberId,
  ...(Object.prototype.hasOwnProperty.call(pokemon || {}, 'memberId') ? { memberId: toMemberId } : {}),
  ...(Object.prototype.hasOwnProperty.call(pokemon || {}, 'trainerId') ? { trainerId: toMemberId } : {}),
  isPartner: false,
  tradedAt: new Date().toISOString(),
  tradedFrom: fromMemberId,
  tradedTo: toMemberId
});

const completeTrade = async ({ tradeKey, trade }) => {
  const requesterRef = db.ref(`members/${trade.requesterId}`);
  const targetRef = db.ref(`members/${trade.targetId}`);
  const [requesterSnapshot, targetSnapshot] = await Promise.all([
    requesterRef.once('value'),
    targetRef.once('value')
  ]);

  if (!requesterSnapshot.exists() || !targetSnapshot.exists()) {
    await db.ref(`gameData/tradeRequests/${tradeKey}`).update({
      status: 'failed',
      failedReason: 'member_not_found',
      updatedAt: Date.now()
    });
    return '교환할 회원 정보를 찾을 수 없어서 신청을 취소했어요.';
  }

  const requester = requesterSnapshot.val();
  const target = targetSnapshot.val();
  const requesterCaughtPokemon = Array.isArray(requester.caughtPokemon) ? [...requester.caughtPokemon] : [];
  const targetCaughtPokemon = Array.isArray(target.caughtPokemon) ? [...target.caughtPokemon] : [];
  const requesterIndex = requesterCaughtPokemon.findIndex(pokemon =>
    pokemon && getTradePokemonKey(pokemon) === trade.requesterPokemonKey
  );

  if (requesterIndex < 0) {
    await db.ref(`gameData/tradeRequests/${tradeKey}`).update({
      status: 'failed',
      failedReason: 'requester_pokemon_missing',
      updatedAt: Date.now()
    });
    return `${trade.requesterPokemonName || '상대 포켓몬'}을(를) 더 이상 찾을 수 없어서 교환을 취소했어요.`;
  }

  const targetIndex = targetCaughtPokemon.findIndex(pokemon =>
    pokemon && getTradePokemonKey(pokemon) === trade.targetPokemonKey
  );

  if (targetIndex < 0) {
    await db.ref(`gameData/tradeRequests/${tradeKey}`).update({
      status: 'failed',
      failedReason: 'target_pokemon_missing',
      updatedAt: Date.now()
    });
    return `${trade.targetPokemonName || '상대 포켓몬'}을(를) 더 이상 찾을 수 없어서 교환을 취소했어요.`;
  }

  const requesterPokemon = requesterCaughtPokemon[requesterIndex];
  const targetPokemon = targetCaughtPokemon[targetIndex];
  requesterCaughtPokemon[requesterIndex] = withTradeOwner(targetPokemon, trade.targetId, trade.requesterId);
  targetCaughtPokemon[targetIndex] = withTradeOwner(requesterPokemon, trade.requesterId, trade.targetId);

  await Promise.all([
    requesterRef.update({ caughtPokemon: requesterCaughtPokemon }),
    targetRef.update({ caughtPokemon: targetCaughtPokemon }),
    db.ref(`gameData/tradeRequests/${tradeKey}`).update({
      status: 'completed',
      targetPokemonKey: getTradePokemonKey(targetPokemon),
      targetPokemonName: tradePokemonLabel(targetPokemon),
      completedAt: Date.now(),
      updatedAt: Date.now()
    })
  ]);

  const requesterMention = accountMention(trade.requesterAccount);
  const targetMention = accountMention(trade.targetAccount);
  return [
    [requesterMention, targetMention].filter(Boolean).join(' '),
    '교환 완료!',
    `${trade.requesterName || '신청자'}의 ${tradePokemonLabel(requesterPokemon)} ↔ ${trade.targetName || '상대'}의 ${tradePokemonLabel(targetPokemon)}`
  ].filter(Boolean).join('\n');
};

const createTradeRequest = async ({ status, author, authorAccount, target, targetAccount, offeredName }) => {
  if (!target) return '교환할 상대를 멘션으로 태그해 주세요. 예: @상대 [교환: 피카츄]';
  if (target.id === author.id) return '자기 자신과는 교환할 수 없어요.';

  const offeredPokemonResult = offeredName ? findOwnedPokemonForTrade(author.member, offeredName) : null;
  if (offeredPokemonResult?.error) return offeredPokemonResult.error;

  const existing = await findPendingTrade(target.id, author.id);
  if (existing) {
    await db.ref(`gameData/tradeRequests/${existing.tradeKey}`).update({
      status: 'cancelled',
      cancelledAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  const offeredPokemon = offeredPokemonResult?.pokemon || null;
  const trade = {
    id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    status: 'pending',
    requesterId: author.id,
    requesterName: author.member.name || author.member.nickname || author.id,
    requesterAccount: normalizeAccount(authorAccount),
    requesterPokemonKey: offeredPokemon ? getTradePokemonKey(offeredPokemon) : null,
    requesterPokemonName: offeredPokemon ? tradePokemonLabel(offeredPokemon) : null,
    targetId: target.id,
    targetName: target.member.name || target.member.nickname || target.id,
    targetAccount: normalizeAccount(targetAccount || target.member.mastodonAccount || target.member.mastodonId || ''),
    mastodonStatusId: status.id,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await db.ref('gameData/tradeRequests').push().set(trade);

  const mention = accountMention(trade.targetAccount);
  return [
    mention,
    `${trade.targetName}에게 교환을 신청했어요.`,
    trade.requesterPokemonName ? `${trade.requesterName}의 ${trade.requesterPokemonName}` : null,
    `두 사람 모두 [교환: 내보낼 포켓몬 이름]을 보내면 교환이 완료돼요.`
  ].filter(Boolean).join('\n');
};

const declineTrade = async ({ tradeKey, trade, author }) => {
  await db.ref(`gameData/tradeRequests/${tradeKey}`).update({
    status: 'declined',
    declinedBy: author.id,
    updatedAt: Date.now()
  });
  return [
    [accountMention(trade.requesterAccount), accountMention(trade.targetAccount)].filter(Boolean).join(' '),
    '교환 신청을 거절했어요.'
  ].filter(Boolean).join('\n');
};

const saveTradePokemonSelection = async ({ tradeKey, trade, author, offeredName }) => {
  const isRequester = author.id === trade.requesterId;
  const isTarget = author.id === trade.targetId;
  if (!isRequester && !isTarget) return '이 교환의 참가자가 아니에요.';

  const pokemonResult = findOwnedPokemonForTrade(author.member, offeredName);
  if (pokemonResult.error) return pokemonResult.error;

  const pokemon = pokemonResult.pokemon;
  const updates = {
    status: 'accepted',
    updatedAt: Date.now()
  };
  if (isRequester) {
    updates.requesterPokemonKey = getTradePokemonKey(pokemon);
    updates.requesterPokemonName = tradePokemonLabel(pokemon);
  } else {
    updates.targetPokemonKey = getTradePokemonKey(pokemon);
    updates.targetPokemonName = tradePokemonLabel(pokemon);
  }

  await db.ref(`gameData/tradeRequests/${tradeKey}`).update(updates);
  const updatedTrade = { ...trade, ...updates };
  if (updatedTrade.requesterPokemonKey && updatedTrade.targetPokemonKey) {
    return completeTrade({ tradeKey, trade: updatedTrade });
  }

  const waitingFor = updatedTrade.requesterPokemonKey ? updatedTrade.targetAccount : updatedTrade.requesterAccount;
  return [
    accountMention(waitingFor),
    `${tradePokemonLabel(pokemon)}을(를) 교환 포켓몬으로 선택했어요.`,
    '상대도 [교환: 포켓몬이름]을 보내면 교환이 완료돼요.'
  ].filter(Boolean).join('\n');
};

const handleTrade = async ({ status, content, members, author, authorAccount }) => {
  const tradeCommand = getTradeCommand(content);
  const offeredName = extractTradePokemonName(content);

  const authorNormalized = normalizeAccount(authorAccount);
  const taggedAccount = extractMentionAccounts(status)
    .map(normalizeAccount)
    .find(account => localUsername(account) !== SYSTEM_ACCOUNT && account !== authorNormalized);
  const taggedMember = taggedAccount ? findMemberByAccount(members, taggedAccount) : null;

  if (tradeCommand === 'request') {
    return createTradeRequest({
      status,
      author,
      authorAccount,
      target: taggedMember,
      targetAccount: taggedAccount,
      offeredName
    });
  }

  const active = await findActiveTradeForMember(author.id, taggedMember?.id || null);
  if (tradeCommand === 'decline') {
    if (!active) return '거절할 교환 신청이 없어요.';
    return declineTrade({ tradeKey: active.tradeKey, trade: active.trade, author });
  }

  if (tradeCommand === 'accept') {
    if (!active) return '수락할 교환 신청이 없어요.';
    await db.ref(`gameData/tradeRequests/${active.tradeKey}`).update({
      status: 'accepted',
      acceptedAt: Date.now(),
      updatedAt: Date.now()
    });
    return [
      [accountMention(active.trade.requesterAccount), accountMention(active.trade.targetAccount)].filter(Boolean).join(' '),
      '교환을 수락했어요.',
      '두 사람 모두 [교환: 내보낼 포켓몬 이름]을 보내 주세요.'
    ].filter(Boolean).join('\n');
  }

  if (offeredName && active) {
    return saveTradePokemonSelection({
      tradeKey: active.tradeKey,
      trade: active.trade,
      author,
      offeredName
    });
  }

  if (!taggedMember) {
    return '받은 교환 신청이 없어요. 새로 신청하려면 @상대 [교환: 포켓몬이름]으로 보내 주세요.';
  }

  return createTradeRequest({
    status,
    author,
    authorAccount,
    target: taggedMember,
    targetAccount: taggedAccount,
    offeredName
  });
};

const battleBot = createBattleBot({
  db,
  pokemonData,
  getMembers,
  findMemberByAccount,
  getAuthorAccount,
  getParticipantPokemon,
  extractMentionAccounts,
  normalizeAccount,
  localUsername,
  botAccount: BOT_ACCOUNT
});

const processStatus = async (status, source = 'webhook') => {
  if (!status?.id) return { ignored: true, reason: 'missing status id' };
  if (isFromBotAccount(status)) return { ignored: true, reason: 'bot self status' };
  if (!isSystemMentioned(status)) return { ignored: true, reason: 'system not mentioned' };

  const processedRef = db.ref(`mastodonBot/processedStatuses/${status.id}`);
  const processedSnapshot = await processedRef.once('value');
  if (processedSnapshot.exists()) {
    const processed = processedSnapshot.val() || {};
    const isStaleProcessing =
      processed.status === 'processing' &&
      Date.now() - Number(processed.processingStartedAt || 0) > 5 * 60 * 1000;
    if (!isStaleProcessing) return { ignored: true, reason: 'already processed' };
  }
  await processedRef.set({
    processingStartedAt: Date.now(),
    source,
    status: 'processing'
  });

  const content = stripHtml(status.content);
  const tradeCommand = getTradeCommand(content);
  const tradePokemonName = extractTradePokemonName(content);
  const battleCommand = tradeCommand ? null : battleBot.getCommand(content);
  const command = getCommand(content);
  if (!tradeCommand && !battleCommand && !command) {
    await processedRef.set({ processedAt: Date.now(), source, ignored: 'unknown command' });
    await replyToStatus(status, '알 수 없는 명령어예요. [캠핑 시작], [계속], [만족], [교환: 포켓몬이름], [배틀 신청], [배틀 수락], [포켓몬 1], [기술 1] 또는 [기술명] 중 하나를 사용해 주세요.');
    return { ignored: true, reason: 'unknown command' };
  }

  const members = await getMembers();
  const authorAccount = getAuthorAccount(status);
  const author = findMemberByAccount(members, authorAccount);
  if (!author) {
    await processedRef.set({ processedAt: Date.now(), source, ignored: 'unlinked account' });
    await replyToStatus(status, '연동된 계정을 찾을 수 없어요. 웹 프로필 설정에서 마스토돈 계정을 먼저 연결해 주세요.');
    return { ignored: true, reason: 'unlinked account' };
  }

  if (tradeCommand) {
    const response = await handleTrade({
      status,
      content,
      members,
      author,
      authorAccount
    });

    await processedRef.set({
      processedAt: Date.now(),
      source,
      command: `trade:${tradeCommand}`,
      account: authorAccount
    });
    if (response) await replyToStatus(status, response);
    return { processed: true, command: `trade:${tradeCommand}` };
  }

  if (battleCommand) {
    const response = await battleBot.handle({
      status,
      content,
      command: battleCommand,
      members,
      author,
      authorAccount
    });

    await processedRef.set({
      processedAt: Date.now(),
      source,
      command: `battle:${battleCommand}`,
      account: authorAccount
    });
    if (response) await replyToStatus(status, response);
    return { processed: true, command: `battle:${battleCommand}` };
  }

  const settings = await loadCampingSettings();
  const partner = command === 'start' ? findTaggedPartner(members, status, authorAccount) : null;

  let response;
  if (command === 'start') {
    response = await startCamping({
      status,
      memberId: author.id,
      member: author.member,
      partnerId: partner?.id || null,
      partner: partner?.member || null,
      settings
    });
  } else if (command === 'continue') {
    response = await continueCamping({ memberId: author.id, settings });
  } else {
    response = await satisfyCamping({ memberId: author.id, settings });
  }

  await processedRef.set({
    processedAt: Date.now(),
    source,
    command,
    account: authorAccount
  });
  await replyToStatus(status, response);
  return { processed: true, command };
};

const statusFromWebhookBody = body => {
  if (!body) return null;
  if (body.status) return body.status;
  if (body.event === 'status.created' && body.object) return body.object;
  return body.id && body.content ? body : null;
};

const processMastodonMentionsOnce = async () => {
  const lastIdRef = db.ref('mastodonBot/lastNotificationId');
  const lastIdSnapshot = await lastIdRef.once('value');
  const notifications = await getMentions(lastIdSnapshot.val());
  if (!notifications.length) return { count: 0 };

  for (const notification of [...notifications].reverse()) {
    try {
      await processStatus(notification.status, 'schedule');
    } catch (error) {
      console.error('Failed to process notification:', notification.id, error);
    }
  }

  await lastIdRef.set(notifications[0].id);
  return { count: notifications.length };
};

exports.mastodonWebhook = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    console.log('mastodonWebhook received:', req.method, req.body?.event || req.body?.type || req.body?.id || 'unknown');

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const status = statusFromWebhookBody(req.body);
      if (!status) {
        res.status(200).json({ ignored: true, reason: 'no status payload' });
        return;
      }

      const result = await processStatus(status, 'webhook');
      res.status(200).json(result);
    } catch (error) {
      console.error('mastodonWebhook failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

exports.checkMastodonMentions = functions
  .region('asia-northeast3')
  .runWith({ timeoutSeconds: 300, memory: '256MB' })
  .pubsub.schedule('every 1 minutes')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    try {
      return await processMastodonMentionsOnce();
    } catch (error) {
      console.error('checkMastodonMentions failed:', error);
      return null;
    }
  });

exports.testNetwork = functions
  .region('asia-northeast3')
  .https.onRequest(async (req, res) => {
    try {
      const instance = await makeMastodonRequest('/api/v1/instance');
      res.json({
        success: true,
        baseUrl: MASTODON_BASE_URL,
        instance: {
          title: instance.title,
          version: instance.version
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        statusCode: error.statusCode || null
      });
    }
  });

exports.checkIP = functions
  .region('asia-northeast3')
  .https.onRequest(async (req, res) => {
    try {
      const ipData = await new Promise((resolve, reject) => {
        https
          .get('https://api.ipify.org?format=json', response => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => resolve(JSON.parse(data)));
          })
          .on('error', reject);
      });

      res.json({
        cloudFunctionIP: ipData.ip,
        message: 'Cloud Functions outbound IP'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
