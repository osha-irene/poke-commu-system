// 공통 유틸리티 — 토큰 없는 순수 함수 + DB 헬퍼

const stripHtml = (html = '') =>
  String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();

const parseAccount = (account = '', host = '') => {
  const fallbackHost = String(host || '').trim().toLowerCase();
  let value = String(account || '').trim().toLowerCase();
  if (!value) return null;

  value = value.replace(/^acct:/, '').replace(/^@+/, '').replace(/\/+$/, '');

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const match = url.pathname.match(/\/@([^/?#]+)/);
      if (match?.[1]) {
        value = `${match[1].replace(/^@+/, '')}@${url.host.toLowerCase()}`;
      }
    } catch (_) {}
  }

  const pathMatch = value.match(/^([^/]+)\/@([^/?#]+)$/);
  if (pathMatch) value = `${pathMatch[2]}@${pathMatch[1]}`;

  const atParts = value.split('@').filter(Boolean);
  const username = atParts[0]?.trim();
  const accountHost = atParts[1]?.trim() || fallbackHost;
  if (!username) return null;

  return {
    username,
    host: accountHost,
    full: accountHost ? `${username}@${accountHost}` : username,
  };
};

const normalizeAccount = (account = '', host = '') => {
  const parsed = parseAccount(account, host);
  return parsed?.full || '';
};

const localUsername = (account = '') => {
  const parsed = parseAccount(account);
  return parsed?.username || String(account || '').replace(/^@+/, '').split('@')[0] || '';
};

const toProbability = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric > 1
    ? Math.min(1, Math.max(0, numeric / 100))
    : Math.min(1, Math.max(0, numeric));
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Firebase RTDB는 배열 중간에 구멍(삭제/방출 등으로 인덱스가 비는 경우)이 있으면
// 이를 배열이 아니라 숫자 키를 가진 객체로 돌려준다. Array.isArray()로만 체크하면
// 이런 경우 전체를 빈 목록으로 취급해버리므로, 두 형태를 모두 받아 순서를 보존한
// 배열로 정규화한다.
const normalizeCaughtPokemon = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => value[key]);
  }
  return [];
};

const accountMention = (account) => {
  const cleaned = String(account || '').trim().replace(/^@/, '');
  return cleaned ? `@${cleaned}` : '';
};

const getAuthorAccount = status =>
  status?.account?.acct ||
  status?.account?.username ||
  status?.account?.url ||
  status?.account?.uri ||
  status?.account?.id ||
  '';

const extractMentionAccounts = status => {
  const rawContent = String(status?.content || '');
  const fromMentions = (status?.mentions || [])
    .flatMap(mention => [
      mention.acct,
      mention.username,
      mention.url,
      mention.uri,
      mention.id,
    ])
    .filter(Boolean);
  const fromContent = (stripHtml(rawContent).match(/@[\w.-]+(?:@[\w.-]+)?/g) || [])
    .map(account => account.replace(/^@/, ''));
  const fromProfileLinks = Array.from(rawContent.matchAll(/https?:\/\/[^"'\s<>]+\/(?:@|users\/)([^"'\/?#\s<>]+)/gi))
    .map(match => match[0].includes('/@') ? match[0] : match[1]);
  return [...new Set([...fromMentions, ...fromContent, ...fromProfileLinks])];
};

const getAuthorAccountCandidates = (status, host) => [
  status?.account?.acct,
  status?.account?.username,
  status?.account?.url,
  status?.account?.uri,
  status?.account?.id,
].filter(Boolean).map(account => normalizeAccount(account, host)).filter(Boolean);

const getMemberAccountValues = member => [
  member?.mastodonAccount,
  member?.mastodonId,
  member?.mastodonUsername,
  member?.acct,
  member?.account?.mastodon,
  member?.account?.mastodonAccount,
  member?.profile?.mastodon,
  member?.profile?.mastodonAccount,
  member?.social?.mastodon,
  member?.socials?.mastodon,
].filter(Boolean);

const getMembers = async (db) => {
  const snapshot = await db.ref('members').once('value');
  return snapshot.val() || {};
};

// 계정 매칭(마스토돈 handle -> 회원)만 필요한 곳에서는 members 전체(캐치몬/인벤토리 포함,
// 회원당 수십KB)를 읽을 필요가 없다 - 매칭에 쓰는 필드(mastodonAccount/name/nickname 등)는
// 전부 memberSummary에도 그대로 있다. members는 실제 명령을 처리할 때만(getMembers) 쓴다.
const getMemberSummaries = async (db) => {
  const snapshot = await db.ref('memberSummary').once('value');
  return snapshot.val() || {};
};

const memberMatchesAccount = (member, account, host) => {
  const target = parseAccount(account, host);
  if (!target) return false;

  return getMemberAccountValues(member).some(value => {
    const candidate = parseAccount(value, host);
    if (!candidate) return false;
    if (candidate.full === target.full) return true;
    return candidate.username === target.username && (
      !candidate.host ||
      !target.host ||
      candidate.host === target.host ||
      candidate.host === host ||
      target.host === host
    );
  });
};

const memberNameMatchesAccount = (member, account, host) => {
  const target = parseAccount(account, host);
  if (!target) return false;
  const targetUsername = target.username.toLowerCase();
  return [
    member?.name,
    member?.nickname,
    member?.displayName,
    member?.trainerName,
    member?.username,
  ]
    .filter(Boolean)
    .some(value => String(value).trim().toLowerCase() === targetUsername);
};

const findMemberByAccount = (members, account, host) => {
  for (const [id, member] of Object.entries(members)) {
    if (memberMatchesAccount(member, account, host)) {
      return { id, member: { ...member, id: member.id || id } };
    }
  }

  const nameMatches = Object.entries(members).filter(([, member]) =>
    memberNameMatchesAccount(member, account, host)
  );
  if (nameMatches.length === 1) {
    const [id, member] = nameMatches[0];
    console.warn('findMemberByAccount: mastodon field match failed, using unique name fallback', {
      account,
      host,
      memberId: id,
      memberName: member?.name || member?.nickname || null,
    });
    return { id, member: { ...member, id: member.id || id } };
  }

  // 전체 회원 목록을 매 실패마다 통째로 로그로 찍으면 회원 수가 늘어날수록 웹훅 응답이
  // 느려진다 (Cloud Logging 직렬화 비용). 검색값과 회원 수만 남긴다.
  console.error('❌ findMemberByAccount: 매칭 실패', {
    account,
    host,
    normalizedTarget: normalizeAccount(account, host),
    memberCount: Object.keys(members).length,
  });

  return null;
};

const isFromBotAccount = (status, botAccount) => {
  const account = getAuthorAccount(status);
  return localUsername(account).toLowerCase() === localUsername(botAccount).toLowerCase();
};

const isBotMentioned = (status, botAccount, host) => {
  const content = stripHtml(status?.content);
  const mentions = extractMentionAccounts(status);
  const botLocal = localUsername(botAccount);
  const botMentionPattern = new RegExp(`@${botLocal}\\b`, 'i');
  return (
    mentions.some(a => localUsername(normalizeAccount(a, host)) === botLocal) ||
    botMentionPattern.test(content)
  );
};

// 봇 컨텍스트 팩토리 — 각 봇이 자신의 토큰/계정/인스턴스를 주입받아 생성
const createBotContext = ({ instanceUrl, token, botAccount }) => {
  const http = require('http');
  const https = require('https');
  const host = new URL(instanceUrl).host;

  const makeMastodonRequest = (path, method = 'GET', data = null) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, instanceUrl);
      const client = url.protocol === 'http:' ? http : https;
      const postData = data ? JSON.stringify(data) : null;
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'http:' ? 80 : 443),
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      };
      if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

      const request = client.request(options, response => {
        let responseData = '';
        response.on('data', chunk => (responseData += chunk));
        response.on('end', () => {
          let parsed = responseData;
          try { parsed = responseData ? JSON.parse(responseData) : {}; } catch (_) {}
          if (response.statusCode >= 400) {
            const err = new Error(`Mastodon API ${response.statusCode}`);
            err.statusCode = response.statusCode;
            err.response = parsed;
            err.retryAfter = Number(response.headers['retry-after']) || null;
            reject(err);
            return;
          }
          resolve(parsed);
        });
      });
      request.on('error', reject);
      request.on('timeout', () => { request.destroy(); reject(new Error('Mastodon request timeout')); });
      if (postData) request.write(postData);
      request.end();
    });
  };

  const replyToStatus = async (status, content, visibility = 'public') => {
    const acct = status?.account?.acct;
    const mention = acct ? `@${acct}` : '';
    // content에 이미 같은 사람이 다른 대소문자/호스트 표기(예: @user vs @user@host)로
    // 멘션돼 있으면 중복으로 또 붙이지 않는다.
    const mentionUsername = localUsername(acct);
    const alreadyMentioned = mentionUsername &&
      new RegExp(`@${mentionUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(@|\\b)`, 'i').test(content);
    const body = mention && !alreadyMentioned ? `${mention} ${content}` : content;
    return makeMastodonRequest('/api/v1/statuses', 'POST', {
      status: body,
      in_reply_to_id: status.id,
      visibility: status.visibility || visibility,
    });
  };

  const replyToStatusId = async (statusId, content, visibility = 'public') => {
    return makeMastodonRequest('/api/v1/statuses', 'POST', {
      status: content,
      in_reply_to_id: statusId,
      visibility,
    });
  };

  const getMentions = async (sinceId = null) => {
    let path = '/api/v1/notifications?types[]=mention&limit=40';
    if (sinceId) path += `&since_id=${encodeURIComponent(sinceId)}`;
    const data = await makeMastodonRequest(path);
    return Array.isArray(data)
      ? data.filter(n => n.type === 'mention' && n.status)
      : [];
  };

  // 웹훅 payload에 status.account.acct/username이 비어 숫자 id만 오는 경우, 그 글이 봇
  // 자신이 쓴 글이어도 localUsername 비교로는 자기 자신임을 못 알아챈다. verify_credentials는
  // 토큰 스코프 부족으로 403이 나므로 API 호출 없이, 다른 사용자가 이 봇을 멘션한 status의
  // mentions[]에서 얻은 실제 id를 호출부(index.js)가 기억해뒀다가 넘겨주는 방식을 쓴다.
  let knownBotAccountId = null;
  const setBotAccountId = (id) => { if (id) knownBotAccountId = String(id); };
  const isFromBotAccountById = (status) => {
    const accountId = status?.account?.id;
    return Boolean(knownBotAccountId) && Boolean(accountId) && String(accountId) === knownBotAccountId;
  };

  return {
    host,
    botAccount,
    makeMastodonRequest,
    replyToStatus,
    replyToStatusId,
    getMentions,
    normalizeAccount: (a) => normalizeAccount(a, host),
    localUsername,
    findMemberByAccount: (members, account) => findMemberByAccount(members, account, host),
    isFromBotAccount: (status) => isFromBotAccount(status, botAccount),
    isFromBotAccountById,
    setBotAccountId,
    isBotMentioned: (status) => isBotMentioned(status, botAccount, host),
    getAuthorAccount,
    getAuthorAccountCandidates: (status) => getAuthorAccountCandidates(status, host),
    extractMentionAccounts,
  };
};

module.exports = {
  stripHtml,
  normalizeAccount,
  localUsername,
  toProbability,
  clamp,
  accountMention,
  normalizeCaughtPokemon,
  parseAccount,
  getAuthorAccount,
  getAuthorAccountCandidates,
  extractMentionAccounts,
  getMembers,
  getMemberSummaries,
  findMemberByAccount,
  isFromBotAccount,
  isBotMentioned,
  createBotContext,
};
