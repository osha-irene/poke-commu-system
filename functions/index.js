const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { createBotContext, stripHtml, getMembers } = require('./shared');
const { createCampBot, getCommand: getCampCommand } = require('./campBot');
const { createTradeBot, getTradeCommand, extractTradePokemonName } = require('./tradeBot');
const { createNotifyBot } = require('./notifyBot');
const { createBattleBot } = require('./battleBot');
const { createContestBot, getContestCommand } = require('./contestBot');

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

const contestCtx = createBotContext({
  instanceUrl: INSTANCE_URL,
  token: process.env.MASTODON_TOKEN_CONTEST || FALLBACK_TOKEN,
  botAccount: (process.env.MASTODON_ACCOUNT_CONTEST || FALLBACK_ACCOUNT || 'contestbot').toLowerCase(),
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

let _contestBot = null;
const getContestBot = () => {
  if (!_contestBot) _contestBot = createContestBot({
    db,
    findMemberByAccount: contestCtx.findMemberByAccount,
    normalizeAccount: contestCtx.normalizeAccount,
  });
  return _contestBot;
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

const markIgnoredBattleCandidate = async (status, source, reason, content = '') => {
  if (!status?.id) return false;
  try {
    const members = await getMembers(db);
    const { author, authorAccount } = await findAuthorForStatus(battleCtx, members, status);
    if (!author) return false;

    const sessionSnap = await getBattleBot().findSessionByMember?.(author.id);
    if (!sessionSnap?.sessionKey) return false;

    await markProcessed(db, `${status.id}_battle`, {
      source,
      ignored: reason,
      account: authorAccount,
      activeBattleSessionKey: sessionSnap.sessionKey,
      activeBattleStatus: sessionSnap.session?.status || null,
      contentPreview: String(content || stripHtml(status.content || '')).slice(0, 200),
    });
    return true;
  } catch (e) {
    console.warn('markIgnoredBattleCandidate failed', {
      statusId: status?.id || null,
      reason,
      error: e.message,
    });
    return false;
  }
};

const findAuthorForStatus = async (ctx, members, status) => {
  const accounts = ctx.getAuthorAccountCandidates?.(status) || [ctx.getAuthorAccount(status)];
  for (const account of accounts) {
    const author = ctx.findMemberByAccount(members, account);
    if (author) return { author, authorAccount: account };
  }

  // 웹훅 payload에 status.account.acct/username이 비어 있고 숫자 id만 오는 경우가 있다.
  // members DB는 유저네임 기반 mastodonAccount만 저장하므로, 이 경우 Mastodon API로
  // 계정을 조회해 실제 acct를 얻은 뒤 다시 매칭을 시도한다.
  const accountId = status?.account?.id;
  if (accountId && ctx.makeMastodonRequest) {
    try {
      const resolved = await ctx.makeMastodonRequest(`/api/v1/accounts/${accountId}`);
      const resolvedHandle = resolved?.acct || resolved?.username;
      if (resolvedHandle) {
        const normalized = ctx.normalizeAccount(resolvedHandle);
        const author = ctx.findMemberByAccount(members, normalized);
        if (author) return { author, authorAccount: normalized };
      }
    } catch (e) {
      console.warn('findAuthorForStatus: account API lookup failed', { accountId, error: e.message });
    }
  }

  return { author: null, authorAccount: accounts[0] || ctx.getAuthorAccount(status) || '' };
};

// 봇 자신의 계정 id를 status.mentions에서 배워 캐시해두고, self-check에 사용한다.
// verify_credentials 호출은 토큰 스코프 부족으로 403이 나서 쓸 수 없다.
const botIdLoadedFromDb = { camp: false, trade: false, battle: false, contest: false };
const isSelfAuthoredStatus = async (prefix, ctx, status) => {
  if (ctx.isFromBotAccount(status)) return true;

  const botUsername = ctx.localUsername(ctx.botAccount);
  for (const mention of status?.mentions || []) {
    const handle = mention?.acct || mention?.username;
    if (mention?.id && handle && ctx.localUsername(handle) === botUsername) {
      ctx.setBotAccountId(mention.id);
      db.ref(`mastodonBot/botAccountIds/${prefix}`).set(String(mention.id)).catch(() => {});
      break;
    }
  }

  if (!botIdLoadedFromDb[prefix]) {
    botIdLoadedFromDb[prefix] = true;
    try {
      const snap = await db.ref(`mastodonBot/botAccountIds/${prefix}`).once('value');
      if (snap.exists()) ctx.setBotAccountId(snap.val());
    } catch (_) {}
  }

  return ctx.isFromBotAccountById(status);
};

// 웹훅 재전송(Mastodon retry)이나 웹훅+폴러가 같은 status를 거의 동시에 넘길 수 있어서,
// "이미 처리 중인지 확인" 후 "처리 중으로 표시"를 각각 따로 하면 그 사이 틈에 둘 다
// 통과해 같은 글을 두 번 처리(세션 중복 생성 등)할 수 있다. transaction으로 원자적으로
// 판단+claim을 한 번에 한다.
const claimProcessing = async (db, statusId, prefix) => {
  const ref = db.ref(`mastodonBot/processedStatuses/${statusId}_${prefix}`);
  const now = Date.now();
  const result = await ref.transaction((current) => {
    const val = current || {};
    const attempts = Number(val.attempts || 0);
    if (attempts >= MAX_PROCESS_ATTEMPTS && val.status !== 'done') return; // 재시도 한도 초과 → 거부
    if (val.status === 'done') return; // 이미 완료됨 → 거부
    if (val.status === 'failed' && now - Number(val.failedAt || 0) < FAILURE_RETRY_COOLDOWN_MS) return; // 실패 쿨다운 중 → 거부
    if (val.status === 'processing' && now - Number(val.processingStartedAt || 0) <= PROCESSING_STALE_MS) return; // 다른 요청이 처리 중 → 거부
    return { ...val, status: 'processing', processingStartedAt: now, attempts: attempts + 1 };
  });
  return result.committed;
};

// ── 캠핑 봇 처리 ────────────────────────────────────────────────
const processCampStatus = async (status, source = 'webhook') => {
  if (!status?.id) return { ignored: true, reason: 'no id' };
  if (await isSelfAuthoredStatus('camp', campCtx, status)) return { ignored: true, reason: 'self' };
  const content = stripHtml(status.content);
  if (getBattleBot().getCommand(content) || getTradeCommand(content)) {
    return { ignored: true, reason: 'routed to another bot' };
  }
  if (!campCtx.isBotMentioned(status)) return { ignored: true, reason: 'not mentioned' };

  const key = `${status.id}_camp`;
  if (!(await claimProcessing(db, status.id, 'camp'))) return { ignored: true, reason: 'already processed' };

  const command = getCampCommand(content);
  if (!command) {
    // 답글 체인에 멘션이 계속 남아있는 경우가 많아, 알 수 없는 명령은 조용히 무시한다.
    await markProcessed(db, key, { source, ignored: 'unknown command' });
    return { ignored: true, reason: 'unknown command' };
  }

  const members = await getMembers(db);
  const { author, authorAccount } = await findAuthorForStatus(campCtx, members, status);
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
  if (await isSelfAuthoredStatus('trade', tradeCtx, status)) return { ignored: true, reason: 'self' };
  const content = stripHtml(status.content);
  if (getBattleBot().getCommand(content) || getCampCommand(content)) {
    return { ignored: true, reason: 'routed to another bot' };
  }
  if (!tradeCtx.isBotMentioned(status)) return { ignored: true, reason: 'not mentioned' };

  const key = `${status.id}_trade`;
  if (!(await claimProcessing(db, status.id, 'trade'))) return { ignored: true, reason: 'already processed' };

  const tradeCommand = getTradeCommand(content);
  if (!tradeCommand) {
    await markProcessed(db, key, { source, ignored: 'unknown command' });
    return { ignored: true, reason: 'unknown command' };
  }

  const members = await getMembers(db);
  const { author, authorAccount } = await findAuthorForStatus(tradeCtx, members, status);
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
  if (await isSelfAuthoredStatus('battle', battleCtx, status)) return { ignored: true, reason: 'self' };
  const content = stripHtml(status.content);
  if (getTradeCommand(content) || getCampCommand(content)) {
    return { ignored: true, reason: 'routed to another bot' };
  }
  const command = getBattleBot().getCommand(content);
  if (!battleCtx.isBotMentioned(status)) {
    await markIgnoredBattleCandidate(status, source, 'not mentioned', content);
    return { ignored: true, reason: 'not mentioned' };
  }

  const key = `${status.id}_battle`;
  if (!(await claimProcessing(db, status.id, 'battle'))) return { ignored: true, reason: 'already processed' };

  if (!command) {
    if (!(await markIgnoredBattleCandidate(status, source, 'unknown command', content))) {
      await markProcessed(db, key, { source, ignored: 'unknown command' });
    }
    return { ignored: true, reason: 'unknown command' };
  }

  const members = await getMembers(db);
  const { author, authorAccount } = await findAuthorForStatus(battleCtx, members, status);
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

// ── 콘테스트 봇 처리 ────────────────────────────────────────────
// 배틀/캠핑/교환과 달리 참가자별 세션이 아니라 gameData/activeContest 하나를 공개 스레드로
// 계속 이어붙이는 구조라, 매 응답을 항상 lastStatusId(직전 봇 포스트)에 답글로 단다.
const processContestStatus = async (status, source = 'webhook') => {
  if (!status?.id) return { ignored: true, reason: 'no id' };
  if (await isSelfAuthoredStatus('contest', contestCtx, status)) return { ignored: true, reason: 'self' };
  const content = stripHtml(status.content);
  if (!contestCtx.isBotMentioned(status)) return { ignored: true, reason: 'not mentioned' };

  const key = `${status.id}_contest`;
  if (!(await claimProcessing(db, status.id, 'contest'))) return { ignored: true, reason: 'already processed' };

  const command = getContestCommand(content);
  const members = await getMembers(db);
  const { author, authorAccount } = await findAuthorForStatus(contestCtx, members, status);
  if (!author) {
    await markProcessed(db, key, { source, ignored: 'unlinked' });
    await contestCtx.replyToStatus(status, '연동된 계정을 찾을 수 없어요. 프로필 설정에서 마스토돈 계정을 연결해 주세요.');
    return { ignored: true, reason: 'unlinked' };
  }

  const response = await getContestBot().handle({ status, content, command, members, author, authorAccount });
  await markProcessed(db, key, { source, command, account: authorAccount });
  if (response) {
    const contest = await getContestBot().getContest();
    const lastStatusId = contest?.lastStatusId;
    const posted = lastStatusId
      ? await contestCtx.replyToStatusId(lastStatusId, response, 'public')
      : await contestCtx.replyToStatus(status, response);
    if (posted?.id) {
      const patch = { lastStatusId: posted.id };
      if (!contest?.rootStatusId) patch.rootStatusId = posted.id;
      await db.ref('gameData/activeContest').update(patch);
    }
  }
  return { processed: true, command };
};

const closeTimedOutContestTurn = async () => {
  const result = await getContestBot().closeTimedOutTurn?.();
  if (!result?.message) return { closed: false };
  const posted = result.lastStatusId
    ? await contestCtx.replyToStatusId(result.lastStatusId, result.message, 'public')
    : await contestCtx.makeMastodonRequest('/api/v1/statuses', 'POST', { status: result.message, visibility: 'public' });
  if (posted?.id) await db.ref('gameData/activeContest/lastStatusId').set(posted.id);
  return { closed: true };
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

const getBotRoutesForStatus = (status) => {
  const content = stripHtml(status?.content || '');
  if (getBattleBot().getCommand(content)) {
    return [{ prefix: 'battle', processStatus: processBattleStatus }];
  }
  if (getTradeCommand(content)) {
    return [{ prefix: 'trade', processStatus: processTradeStatus }];
  }
  if (getCampCommand(content)) {
    return [{ prefix: 'camp', processStatus: processCampStatus }];
  }
  // 콘테스트 봇의 기술 선언(declareMove)은 이름만으로 배틀 기술 선언과 겹칠 수 있어
  // 레거시 공용 웹훅에서는 명시적 명령(시작/참가/마감/취소/도움말)만 우선 라우팅한다.
  // 기술 선언은 전용 contestWebhook을 통해서만 안전하게 처리된다.
  if (getContestCommand(content) !== 'declareMove') {
    return [{ prefix: 'contest', processStatus: processContestStatus }];
  }

  const routes = [];
  if (campCtx.isBotMentioned(status)) routes.push({ prefix: 'camp', processStatus: processCampStatus });
  if (tradeCtx.isBotMentioned(status)) routes.push({ prefix: 'trade', processStatus: processTradeStatus });
  if (battleCtx.isBotMentioned(status)) routes.push({ prefix: 'battle', processStatus: processBattleStatus });
  if (contestCtx.isBotMentioned(status)) routes.push({ prefix: 'contest', processStatus: processContestStatus });
  return routes;
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
      const expired = await getBattleBot().expireStalePendingChallenges?.();
      return { mentions, timeouts, expired };
    } catch (e) { console.error(e); return null; }
  });

// 콘테스트 봇
exports.contestWebhook = functions.region(region.region).runWith(webhookOpts).https.onRequest(async (req, res) => {
  await handleBotWebhook(req, res, processContestStatus, 'contest');
});
exports.checkContestMentions = functions.region(region.region).runWith(scheduleOpts)
  .pubsub.schedule('every 1 minutes').timeZone('Asia/Seoul')
  .onRun(async () => {
    try {
      const mentions = await pollMentions(contestCtx, processContestStatus, 'lastContestNotificationId', 'contest');
      const timeout = await closeTimedOutContestTurn();
      return { mentions, timeout };
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
    const routes = getBotRoutesForStatus(status);
    if (!routes.length) {
      await markIgnoredBattleCandidate(status, 'webhook', 'no matching bot route');
      res.status(200).json({ ignored: true, reason: 'no matching bot route' });
      return;
    }
    const results = await Promise.allSettled(routes.map(route => route.processStatus(status, 'webhook')));
    await Promise.all(results.map((result, index) => {
      if (result.status !== 'rejected') return null;
      const prefix = routes[index]?.prefix;
      return markProcessingFailed(db, status?.id, prefix, result.reason, 'webhook');
    }));
    const processed = results.filter(r => r.status === 'fulfilled' && r.value?.processed);
    res.status(200).json({
      processed: processed.length > 0,
      routes: routes.map(route => route.prefix),
      results: results.map(r => r.value || r.reason?.message),
    });
  } catch (e) {
    await Promise.all(['camp', 'trade', 'battle', 'contest'].map(prefix => markProcessingFailed(db, status?.id, prefix, e, 'webhook')));
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

  const targetSnap = await db.ref(`members/${targetUid}`).once('value');
  const targetMember = targetSnap.val();
  if (!targetMember) {
    throw new functions.https.HttpsError('not-found', '대상 회원을 찾을 수 없습니다.');
  }

  let authUid = targetMember.authUid || targetUid;
  try {
    try {
      await admin.auth().getUser(authUid);
    } catch (e) {
      if (e?.code !== 'auth/user-not-found') throw e;
      const email = targetMember.email || (targetMember.loginId ? `${targetMember.loginId}@pokemon.com` : '');
      if (!email) {
        throw new functions.https.HttpsError('not-found', '대상 회원의 로그인 이메일을 찾을 수 없습니다.');
      }
      const authUser = await admin.auth().getUserByEmail(email);
      authUid = authUser.uid;
    }

    await admin.auth().updateUser(authUid, { password: authPassword });
  } catch (e) {
    console.error('adminResetPassword updateUser error:', e);
    if (e instanceof functions.https.HttpsError) throw e;
    if (e?.code === 'auth/user-not-found') {
      throw new functions.https.HttpsError('not-found', 'Firebase Auth에서 대상 계정을 찾을 수 없습니다.');
    }
    if (e?.code === 'auth/invalid-password' || e?.code === 'auth/weak-password') {
      throw new functions.https.HttpsError('invalid-argument', '비밀번호는 6자 이상이어야 합니다. 임시 비밀번호는 0000을 사용할 수 있습니다.');
    }
    throw new functions.https.HttpsError('unknown', '비밀번호 변경 중 오류가 발생했습니다.', {
      code: e?.code || null,
      message: e?.message || String(e),
    });
  }

  await db.ref(`members/${targetUid}`).update({
    authUid,
    password: isTemporaryPassword ? '0000' : null,
    forcePasswordChange: isTemporaryPassword,
  });

  return { success: true };
});
