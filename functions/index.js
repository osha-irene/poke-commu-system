const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { createBotContext, stripHtml, getMembers } = require('./shared');
const { createCampBot, getCommand: getCampCommand } = require('./campBot');
const { createTradeBot, getTradeCommand, extractTradePokemonName } = require('./tradeBot');
const { createNotifyBot } = require('./notifyBot');
const { createBattleBot } = require('./battleBot');

// ── Firebase 초기화 ──────────────────────────────────────────────
const getFirebaseConfig = () => {
  try { return process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {}; }
  catch (e) { console.warn('FIREBASE_CONFIG was not valid JSON:', e.message); return {}; }
};
const firebaseConfig = getFirebaseConfig();
const projectId = firebaseConfig.projectId || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'poke-commu-system';
const databaseURL = firebaseConfig.databaseURL || process.env.FIREBASE_DATABASE_URL || (projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : undefined);
admin.initializeApp(databaseURL ? { databaseURL } : undefined);
const db = admin.database();

// ── Pokemon 데이터 (lazy) ──────────────────────────────────────
let _pokemonData = null;
const getPokemonData = () => {
  if (!_pokemonData) {
    try {
      let loaded;
      try { loaded = require('./data/allPokemon.json'); } catch (_) { loaded = require('./data/pokemon.json'); }
      _pokemonData = Array.isArray(loaded) ? loaded : loaded?.pokemon || [];
    } catch (e) { console.warn('Pokemon data not loaded:', e.message); _pokemonData = []; }
  }
  return _pokemonData;
};

// ── 구 functions.config() 값 읽기 (마이그레이션 fallback) ─────────
const legacyConfig = (() => { try { return functions.config().mastodon || {}; } catch (_) { return {}; } })();

// ── 인스턴스 URL (공통) ──────────────────────────────────────────
const isLocalRuntime = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development';
const DEFAULT_INSTANCE_URL = isLocalRuntime
  ? 'https://poketodon.monster'
  : 'https://originb-pokemon.world';
const INSTANCE_URL = process.env.MASTODON_INSTANCE_URL || legacyConfig.url || DEFAULT_INSTANCE_URL;

// ── 봇 컨텍스트 생성 ────────────────────────────────────────────
const FALLBACK_TOKEN = process.env.MASTODON_TOKEN || legacyConfig.token || '';
const FALLBACK_ACCOUNT = (process.env.MASTODON_ACCOUNT || legacyConfig.account || '').toLowerCase();

const campCtx = createBotContext({
  instanceUrl: INSTANCE_URL,
  token: process.env.MASTODON_TOKEN_CAMP || FALLBACK_TOKEN,
  botAccount: (process.env.MASTODON_ACCOUNT_CAMP || FALLBACK_ACCOUNT || 'campbot').toLowerCase(),
});

const tradeCtx = createBotContext({
  instanceUrl: INSTANCE_URL,
  token: process.env.MASTODON_TOKEN_TRADE || FALLBACK_TOKEN,
  botAccount: (process.env.MASTODON_ACCOUNT_TRADE || FALLBACK_ACCOUNT || 'tradebot').toLowerCase(),
});

const battleCtx = createBotContext({
  instanceUrl: INSTANCE_URL,
  token: process.env.MASTODON_TOKEN_BATTLE || FALLBACK_TOKEN,
  botAccount: (process.env.MASTODON_ACCOUNT_BATTLE || FALLBACK_ACCOUNT || 'battlebot').toLowerCase(),
});

const notifyCtx = createBotContext({
  instanceUrl: INSTANCE_URL,
  token: process.env.MASTODON_TOKEN_NOTIFY || process.env.MASTODON_TOKEN || '',
  botAccount: (process.env.MASTODON_ACCOUNT_NOTIFY || process.env.MASTODON_ACCOUNT || 'notifybot').toLowerCase(),
});

// ── 봇 핸들러 (lazy 초기화) ──────────────────────────────────────
let _campBot = null;
const getCampBot = () => {
  if (!_campBot) _campBot = createCampBot({
    db, pokemonData: getPokemonData(),
    findMemberByAccount: campCtx.findMemberByAccount,
    extractMentionAccounts: campCtx.extractMentionAccounts,
    normalizeAccount: campCtx.normalizeAccount,
    localUsername: campCtx.localUsername,
    botAccount: campCtx.botAccount,
  });
  return _campBot;
};

let _tradeBot = null;
const getTradeBot = () => {
  if (!_tradeBot) _tradeBot = createTradeBot({
    db, pokemonData: getPokemonData(),
    findMemberByAccount: tradeCtx.findMemberByAccount,
    extractMentionAccounts: tradeCtx.extractMentionAccounts,
    normalizeAccount: tradeCtx.normalizeAccount,
    localUsername: tradeCtx.localUsername,
    botAccount: tradeCtx.botAccount,
  });
  return _tradeBot;
};

let _battleBot = null;
const getBattleBot = () => {
  if (!_battleBot) _battleBot = createBattleBot({
    db, pokemonData: getPokemonData(),
    getMembers: () => getMembers(db),
    findMemberByAccount: battleCtx.findMemberByAccount,
    getAuthorAccount: battleCtx.getAuthorAccount,
    getParticipantPokemon: member => {
      const caught = Array.isArray(member?.caughtPokemon) ? member.caughtPokemon.slice(0, 6).filter(Boolean) : [];
      const partner = member?.partnerPokemon ? [member.partnerPokemon] : [];
      const byId = new Map();
      [...partner, ...caught].forEach(p => { const k = p.uniqueId || p.id || p.pokemonId || `${p.number}_${p.name}`; if (k && !byId.has(k)) byId.set(k, p); });
      return Array.from(byId.values());
    },
    extractMentionAccounts: battleCtx.extractMentionAccounts,
    normalizeAccount: battleCtx.normalizeAccount,
    localUsername: battleCtx.localUsername,
    botAccount: battleCtx.botAccount,
  });
  return _battleBot;
};

const notifyBot = createNotifyBot({
  makeMastodonRequest: notifyCtx.makeMastodonRequest,
  instanceUrl: INSTANCE_URL,
});

// ── 공통 처리 헬퍼 ───────────────────────────────────────────────
const statusFromWebhookBody = body => {
  if (!body) return null;
  // 직접 status 객체 래핑
  if (body.status) return body.status;
  // Pleroma/일부 구현체 형식
  if (body.event === 'status.created' && body.object) return body.object;
  // Mastodon streaming/push 형식: payload가 JSON 문자열
  if (body.event && typeof body.payload === 'string') {
    try {
      const parsed = JSON.parse(body.payload);
      // notification 이벤트: {type: 'mention', status: {...}}
      if (parsed.status) return parsed.status;
      // 직접 status가 payload인 경우
      if (parsed.id && parsed.content) return parsed;
    } catch (_) {}
  }
  // payload가 이미 객체인 경우
  if (body.event && body.payload && typeof body.payload === 'object') {
    if (body.payload.status) return body.payload.status;
    if (body.payload.id && body.payload.content) return body.payload;
  }
  // 바디 자체가 status인 경우
  return body.id && body.content ? body : null;
};

const PROCESSING_STALE_MS = 10 * 60 * 1000;
const FAILURE_RETRY_COOLDOWN_MS = 30 * 60 * 1000;
const MAX_PROCESS_ATTEMPTS = 3;

const markProcessed = (db, statusId, data) =>
  db.ref(`mastodonBot/processedStatuses/${statusId}`).update({ status: 'done', processedAt: Date.now(), ...data });

const markProcessingFailed = async (db, statusId, prefix, error, source) => {
  if (!statusId || !prefix) return;
  const ref = db.ref(`mastodonBot/processedStatuses/${statusId}_${prefix}`);
  const snap = await ref.once('value');
  const prev = snap.val() || {};
  await ref.update({
    status: 'failed',
    failedAt: Date.now(),
    attempts: Number(prev.attempts || 1),
    source,
    error: String(error?.message || error || 'unknown error').slice(0, 500),
  });
};

const isAlreadyProcessed = async (db, statusId, prefix) => {
  const snap = await db.ref(`mastodonBot/processedStatuses/${statusId}_${prefix}`).once('value');
  if (!snap.exists()) return false;
  const val = snap.val() || {};
  const now = Date.now();
  const attempts = Number(val.attempts || 0);
  if (attempts >= MAX_PROCESS_ATTEMPTS && val.status !== 'done') return true;
  if (val.status === 'failed') {
    return now - Number(val.failedAt || 0) < FAILURE_RETRY_COOLDOWN_MS;
  }
  if (val.status === 'processing' && now - Number(val.processingStartedAt || 0) > PROCESSING_STALE_MS) return false;
  return true;
};

const startProcessing = async (db, statusId, prefix) => {
  const ref = db.ref(`mastodonBot/processedStatuses/${statusId}_${prefix}`);
  const snap = await ref.once('value');
  const prev = snap.val() || {};
  await ref.update({
    status: 'processing',
    processingStartedAt: Date.now(),
    attempts: Number(prev.attempts || 0) + 1,
  });
};

// ── 캠핑 봇 처리 ────────────────────────────────────────────────
const processCampStatus = async (status, source = 'webhook') => {
  if (!status?.id) return { ignored: true, reason: 'no id' };
  if (campCtx.isFromBotAccount(status)) return { ignored: true, reason: 'self' };
  if (!campCtx.isBotMentioned(status)) return { ignored: true, reason: 'not mentioned' };

  const key = `${status.id}_camp`;
  if (await isAlreadyProcessed(db, status.id, 'camp')) return { ignored: true, reason: 'already processed' };
  await startProcessing(db, status.id, 'camp');

  const content = stripHtml(status.content);
  const command = getCampCommand(content);
  if (!command) {
    await markProcessed(db, key, { source, ignored: 'unknown command' });
    await campCtx.replyToStatus(status, '[캠핑 시작], [계속], [만족] 중 하나를 사용해 주세요.');
    return { ignored: true, reason: 'unknown command' };
  }

  const members = await getMembers(db);
  const authorAccount = campCtx.getAuthorAccount(status);
  const author = campCtx.findMemberByAccount(members, authorAccount);
  if (!author) {
    await markProcessed(db, key, { source, ignored: 'unlinked' });
    await campCtx.replyToStatus(status, '연동된 계정을 찾을 수 없어요. 프로필 설정에서 마스토돈 계정을 연결해 주세요.');
    return { ignored: true, reason: 'unlinked' };
  }

  const response = await getCampBot().handle({ status, content, command, members, author, authorAccount });
  await markProcessed(db, key, { source, command, account: authorAccount });
  if (response) await campCtx.replyToStatus(status, response);
  return { processed: true, command };
};

// ── 교환 봇 처리 ────────────────────────────────────────────────
const processTradeStatus = async (status, source = 'webhook') => {
  if (!status?.id) return { ignored: true, reason: 'no id' };
  if (tradeCtx.isFromBotAccount(status)) return { ignored: true, reason: 'self' };
  if (!tradeCtx.isBotMentioned(status)) return { ignored: true, reason: 'not mentioned' };

  const key = `${status.id}_trade`;
  if (await isAlreadyProcessed(db, status.id, 'trade')) return { ignored: true, reason: 'already processed' };
  await startProcessing(db, status.id, 'trade');

  const content = stripHtml(status.content);
  const tradeCommand = getTradeCommand(content);
  if (!tradeCommand) {
    await markProcessed(db, key, { source, ignored: 'unknown command' });
    await tradeCtx.replyToStatus(status, '[교환 신청], [교환 수락], [교환 거절], [교환: 포켓몬이름] 중 하나를 사용해 주세요.');
    return { ignored: true, reason: 'unknown command' };
  }

  const members = await getMembers(db);
  const authorAccount = tradeCtx.getAuthorAccount(status);
  const author = tradeCtx.findMemberByAccount(members, authorAccount);
  if (!author) {
    await markProcessed(db, key, { source, ignored: 'unlinked' });
    await tradeCtx.replyToStatus(status, '연동된 계정을 찾을 수 없어요. 프로필 설정에서 마스토돈 계정을 연결해 주세요.');
    return { ignored: true, reason: 'unlinked' };
  }

  const response = await getTradeBot().handle({ status, content, members, author, authorAccount });
  await markProcessed(db, key, { source, command: tradeCommand, account: authorAccount });
  if (response) {
    const posted = await tradeCtx.replyToStatus(status, response);
    // 봇 답글 ID를 trade 레코드에 저장 → 스레드 식별에 사용
    if (posted?.id) {
      const snap = await db.ref('gameData/tradeRequests').once('value');
      const trades = snap.val() || {};
      const now = Date.now();
      const match = Object.entries(trades).find(([, t]) =>
        ['pending', 'accepted'].includes(t.status) &&
        (t.requesterId === author.id || t.targetId === author.id) &&
        now - Number(t.createdAt || 0) <= 24 * 60 * 60 * 1000
      );
      if (match) await db.ref(`gameData/tradeRequests/${match[0]}/lastBotStatusId`).set(posted.id);
    }
  }
  return { processed: true, command: tradeCommand };
};

// ── 배틀 봇 처리 ────────────────────────────────────────────────
const processBattleStatus = async (status, source = 'webhook') => {
  if (!status?.id) return { ignored: true, reason: 'no id' };
  if (battleCtx.isFromBotAccount(status)) return { ignored: true, reason: 'self' };
  if (!battleCtx.isBotMentioned(status)) return { ignored: true, reason: 'not mentioned' };

  const key = `${status.id}_battle`;
  if (await isAlreadyProcessed(db, status.id, 'battle')) return { ignored: true, reason: 'already processed' };
  await startProcessing(db, status.id, 'battle');

  const content = stripHtml(status.content);
  const command = getBattleBot().getCommand(content);
  if (!command) {
    await markProcessed(db, key, { source, ignored: 'unknown command' });
    await battleCtx.replyToStatus(status, '[배틀 신청], [배틀 수락], [포켓몬 N], [기술 N] 중 하나를 사용해 주세요.');
    return { ignored: true, reason: 'unknown command' };
  }

  const members = await getMembers(db);
  const authorAccount = battleCtx.getAuthorAccount(status);
  const author = battleCtx.findMemberByAccount(members, authorAccount);
  if (!author) {
    await markProcessed(db, key, { source, ignored: 'unlinked' });
    await battleCtx.replyToStatus(status, '연동된 계정을 찾을 수 없어요. 프로필 설정에서 마스토돈 계정을 연결해 주세요.');
    return { ignored: true, reason: 'unlinked' };
  }

  const response = await getBattleBot().handle({ status, content, command, members, author, authorAccount });
  await markProcessed(db, key, { source, command, account: authorAccount });
  if (response) {
    const isDm = status.visibility === 'direct';
    const threadReplyCommands = ['move', 'selectPokemon'];
    if (threadReplyCommands.includes(command)) {
      // 기술/포켓몬 선택 결과는 배틀 스레드 마지막 봇 포스트에 달기
      const sessionSnap = await getBattleBot().findSessionByMember?.(author.id);
      const lastBotStatusId = sessionSnap?.session?.lastBotStatusId;
      let posted;
      if (lastBotStatusId) {
        posted = await battleCtx.replyToStatusId(lastBotStatusId, response, 'public');
      } else if (!isDm) {
        posted = await battleCtx.replyToStatus(status, response);
      } else {
        posted = await battleCtx.makeMastodonRequest('/api/v1/statuses', 'POST', { status: response, visibility: 'public' });
      }
      if (posted?.id && sessionSnap?.sessionKey) {
        await db.ref(`gameData/battleSessions/${sessionSnap.sessionKey}/lastBotStatusId`).set(posted.id);
      }
    } else {
      const posted = await battleCtx.replyToStatus(status, response);
      // 배틀 신청/수락/안내 등은 해당 포스트 ID를 세션에 저장
      if (posted?.id) {
        const sessionSnap = await getBattleBot().findSessionByMember?.(author.id);
        if (sessionSnap?.sessionKey) {
          await db.ref(`gameData/battleSessions/${sessionSnap.sessionKey}/lastBotStatusId`).set(posted.id);
        }
      }
    }
  }
  return { processed: true, command };
};

// ── 폴링 헬퍼 ──────────────────────────────────────────────────
const pollMentions = async (ctx, processStatus, lastIdKey, prefix) => {
  const lastIdRef = db.ref(`mastodonBot/${lastIdKey}`);
  const lastIdSnap = await lastIdRef.once('value');
  const notifications = await ctx.getMentions(lastIdSnap.val());
  if (!notifications.length) return { count: 0 };
  for (const n of [...notifications].reverse()) {
    try {
      await processStatus(n.status, 'schedule');
    } catch (e) {
      await markProcessingFailed(db, n?.status?.id, prefix, e, 'schedule');
      console.error(`Poll error [${lastIdKey}]:`, e);
    }
  }
  await lastIdRef.set(notifications[0].id);
  return { count: notifications.length };
};

const handleBotWebhook = async (req, res, processStatus, prefix) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  let status = null;
  try {
    status = statusFromWebhookBody(req.body);
    if (!status) { res.status(200).json({ ignored: true }); return; }
    res.status(200).json(await processStatus(status, 'webhook'));
  } catch (e) {
    await markProcessingFailed(db, status?.id, prefix, e, 'webhook');
    console.error(`${prefix}Webhook error:`, e);
    res.status(200).json({ ok: false, accepted: true, retrySuppressed: true, error: e.message });
  }
};

const closeTimedOutBattleSessions = async () => {
  const closed = await getBattleBot().closeTimedOutBattles?.();
  if (!closed?.length) return { count: 0 };

  for (const entry of closed) {
    try {
      const posted = entry.lastBotStatusId
        ? await battleCtx.replyToStatusId(entry.lastBotStatusId, entry.message, 'public')
        : await battleCtx.makeMastodonRequest('/api/v1/statuses', 'POST', { status: entry.message, visibility: 'public' });
      if (posted?.id && entry.sessionKey) {
        await db.ref(`gameData/battleSessions/${entry.sessionKey}/lastBotStatusId`).set(posted.id);
      }
    } catch (e) {
      console.error(`Battle timeout notification failed [${entry.sessionKey}]:`, e);
    }
  }

  return { count: closed.length };
};

// ── Firebase Functions 내보내기 ──────────────────────────────────
const region = { region: 'asia-northeast3' };
const webhookOpts = { timeoutSeconds: 60, memory: '256MB' };
const scheduleOpts = { timeoutSeconds: 300, memory: '256MB' };

// 캠핑 봇
exports.campWebhook = functions.region(region.region).runWith(webhookOpts).https.onRequest(async (req, res) => {
  await handleBotWebhook(req, res, processCampStatus, 'camp');
});
exports.checkCampMentions = functions.region(region.region).runWith(scheduleOpts)
  .pubsub.schedule('every 1 minutes').timeZone('Asia/Seoul')
  .onRun(async () => { try { return await pollMentions(campCtx, processCampStatus, 'lastCampNotificationId', 'camp'); } catch (e) { console.error(e); return null; } });

// 교환 봇
exports.tradeWebhook = functions.region(region.region).runWith(webhookOpts).https.onRequest(async (req, res) => {
  await handleBotWebhook(req, res, processTradeStatus, 'trade');
});
exports.checkTradeMentions = functions.region(region.region).runWith(scheduleOpts)
  .pubsub.schedule('every 1 minutes').timeZone('Asia/Seoul')
  .onRun(async () => { try { return await pollMentions(tradeCtx, processTradeStatus, 'lastTradeNotificationId', 'trade'); } catch (e) { console.error(e); return null; } });

// 배틀 봇
exports.battleWebhook = functions.region(region.region).runWith(webhookOpts).https.onRequest(async (req, res) => {
  await handleBotWebhook(req, res, processBattleStatus, 'battle');
});
exports.checkBattleMentions = functions.region(region.region).runWith(scheduleOpts)
  .pubsub.schedule('every 1 minutes').timeZone('Asia/Seoul')
  .onRun(async () => {
    try {
      const mentions = await pollMentions(battleCtx, processBattleStatus, 'lastBattleNotificationId', 'battle');
      const timeouts = await closeTimedOutBattleSessions();
      return { mentions, timeouts };
    } catch (e) { console.error(e); return null; }
  });

// 알림 봇 — HTTP 트리거로 외부에서 호출 (관리자용)
exports.sendNotify = functions.region(region.region).runWith(webhookOpts).https.onRequest(async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const { type, mastodonAccount, message, pokemonName, fromName, toName, visibility } = req.body || {};
    let result;
    if (type === 'egg') result = await notifyBot.notifyEggHatched(mastodonAccount, pokemonName);
    else if (type === 'evolution') result = await notifyBot.notifyEvolution(mastodonAccount, fromName, toName);
    else if (type === 'broadcast') result = await notifyBot.broadcast(message, visibility);
    else result = await notifyBot.mentionUser(mastodonAccount, message, visibility);
    res.status(200).json({ ok: true, result });
  } catch (e) { console.error('sendNotify error:', e); res.status(500).json({ error: e.message }); }
});

// ── DB 트리거: 진화 감지 ──────────────────────────────────────────
// members/{memberId}/evolutionHistory 배열이 바뀌면 맨 앞 항목을 새 진화로 판단
exports.onEvolutionHistory = functions
  .region('us-central1')
  .database.ref('members/{memberId}/evolutionHistory')
  .onWrite(async (change, context) => {
    if (!change.after.exists()) { console.log('[evo] no after'); return null; }

    const before = change.before.val();
    const after = change.after.val();

    if (!Array.isArray(after) || !after[0]?.id) return null;
    const latestId = after[0].id;
    const prevLatestId = Array.isArray(before) ? before[0]?.id : null;
    if (latestId === prevLatestId) return null;

    const latest = after[0];
    if (!latest?.id) { console.log('[evo] no id'); return null; }
    console.log('[evo] latest.id=', latest.id);

    const dedupRef = db.ref(`mastodonBot/notifyDedup/evo_${latest.id}`);
    const snap = await dedupRef.once('value');
    if (snap.exists()) { console.log('[evo] dedup hit'); return null; }
    await dedupRef.set(Date.now());

    const memberId = context.params.memberId;
    const memberSnap = await db.ref(`members/${memberId}`).once('value');
    if (!memberSnap.exists()) { console.log('[evo] member not found'); return null; }
    const member = memberSnap.val();

    const trainerName = member.name || member.nickname || '트레이너';
    const fromName = latest.fromName || '포켓몬';
    const toName = latest.toName || '???';
    const message = `🎉 ${trainerName}의 ${fromName}이(가) ${toName}(으)로 진화했다!`;
    console.log('[evo] broadcasting:', message);

    try {
      const result = await notifyBot.broadcast(message, 'public');
      console.log('[evo] broadcast ok, id=', result?.id);
    } catch (e) {
      console.error('[evo] broadcast error:', e.message, e.statusCode, JSON.stringify(e.response));
    }
    return null;
  });

// ── DB 트리거: 요리 감지 ──────────────────────────────────────────
// members/{memberId}/cookingHistory 배열이 바뀌면 맨 앞 항목을 새 요리로 판단
exports.onCookingHistory = functions
  .region('us-central1')
  .database.ref('members/{memberId}/cookingHistory')
  .onWrite(async (change, context) => {
    if (!change.after.exists()) return null;

    const before = change.before.val();
    const after = change.after.val();

    if (!Array.isArray(after) || !after[0]?.id) return null;
    if (Array.isArray(before) && before[0]?.id === after[0].id) return null;

    const latest = after[0];
    const dedupRef = db.ref(`mastodonBot/notifyDedup/cook_${latest.id}`);
    const snap = await dedupRef.once('value');
    if (snap.exists()) return null;
    await dedupRef.set(Date.now());

    const memberId = context.params.memberId;
    const memberSnap = await db.ref(`members/${memberId}`).once('value');
    if (!memberSnap.exists()) return null;
    const member = memberSnap.val();

    const mastodonAccount = member.mastodonAccount;
    const trainerName = member.name || member.nickname || '트레이너';
    const itemName = latest.itemName || latest.recipeName || '요리';

    const isFailure = latest.isFailure === true || latest.success === false || String(latest.recipeId || '').startsWith('fail_');
    const message = isFailure
      ? `🍳 ${trainerName}가 요리에 실패했다! ${itemName}가 만들어졌다...!`
      : latest.isFirstDiscovery
        ? `🍳 ${trainerName}가 처음으로 ${itemName}을(를) 만들었다!`
        : `🍳 ${trainerName}가 ${itemName}을(를) 만들었다!`;

    try {
      await notifyBot.broadcast(message, 'public');
    } catch (e) {
      console.error('onCookingHistory notify error:', e);
    }
    return null;
  });

// 테스트 / 진단
exports.testNetwork = functions.region(region.region).https.onRequest(async (req, res) => {
  try {
    const instance = await campCtx.makeMastodonRequest('/api/v1/instance');
    res.json({ success: true, instanceUrl: INSTANCE_URL, title: instance.title, version: instance.version });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// 하위 호환 — 기존 단일 웹훅 엔드포인트 유지 (캠핑+교환+배틀 모두 처리)
exports.mastodonWebhook = functions.region(region.region).runWith(webhookOpts).https.onRequest(async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  let status = null;
  try {
    status = statusFromWebhookBody(req.body);
    if (!status) { res.status(200).json({ ignored: true }); return; }
    const results = await Promise.allSettled([
      processCampStatus(status, 'webhook'),
      processTradeStatus(status, 'webhook'),
      processBattleStatus(status, 'webhook'),
    ]);
    await Promise.all(results.map((result, index) => {
      if (result.status !== 'rejected') return null;
      const prefix = ['camp', 'trade', 'battle'][index];
      return markProcessingFailed(db, status?.id, prefix, result.reason, 'webhook');
    }));
    const processed = results.filter(r => r.status === 'fulfilled' && r.value?.processed);
    res.status(200).json({ processed: processed.length > 0, results: results.map(r => r.value || r.reason?.message) });
  } catch (e) {
    await Promise.all(['camp', 'trade', 'battle'].map(prefix => markProcessingFailed(db, status?.id, prefix, e, 'webhook')));
    console.error('mastodonWebhook error:', e);
    res.status(200).json({ ok: false, accepted: true, retrySuppressed: true, error: e.message });
  }
});

// 관리자 — 회원 비밀번호 강제 재설정 (본인 인증 없이, 관리자 권한으로 실행)
exports.adminResetPassword = functions.region(region.region).runWith(webhookOpts).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  const callerSnap = await db.ref(`members/${context.auth.uid}`).once('value');
  const caller = callerSnap.val();
  if (!caller || !(caller.isAdmin || caller.isSuperAdmin)) {
    throw new functions.https.HttpsError('permission-denied', '관리자 권한이 필요합니다.');
  }

  const targetUid = String(data?.targetUid || '').trim();
  const rawPassword = String(data?.newPassword || '');
  if (!targetUid) {
    throw new functions.https.HttpsError('invalid-argument', '대상 회원을 지정해주세요.');
  }

  const isTemporaryPassword = rawPassword === '0000';
  const authPassword = isTemporaryPassword ? '000000' : rawPassword;
  if (authPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', '비밀번호는 6자 이상이어야 합니다. 임시 비밀번호는 0000을 사용할 수 있습니다.');
  }

  try {
    await admin.auth().updateUser(targetUid, { password: authPassword });
  } catch (e) {
    console.error('adminResetPassword updateUser error:', e);
    throw new functions.https.HttpsError('internal', '비밀번호 변경 중 오류가 발생했습니다.');
  }

  await db.ref(`members/${targetUid}`).update({
    password: isTemporaryPassword ? '0000' : null,
    forcePasswordChange: isTemporaryPassword,
  });

  return { success: true };
});
