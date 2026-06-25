// 공통 유틸리티 — 토큰 없는 순수 함수 + DB 헬퍼

const stripHtml = (html = '') =>
  String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();

const normalizeAccount = (account = '', host = '') => {
  const cleaned = String(account).trim().replace(/^@/, '').toLowerCase();
  if (!cleaned) return '';
  return cleaned.includes('@') ? cleaned : `${cleaned}@${host}`;
};

const localUsername = (account = '') => String(account || '').split('@')[0] || '';

const toProbability = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric > 1
    ? Math.min(1, Math.max(0, numeric / 100))
    : Math.min(1, Math.max(0, numeric));
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const accountMention = (account) => {
  const cleaned = String(account || '').trim().replace(/^@/, '');
  return cleaned ? `@${cleaned}` : '';
};

const getAuthorAccount = status => status?.account?.acct || status?.account?.username || '';

const extractMentionAccounts = status =>
  (status?.mentions || [])
    .map(mention => mention.acct || mention.username)
    .filter(Boolean);

const getMembers = async (db) => {
  const snapshot = await db.ref('members').once('value');
  return snapshot.val() || {};
};

const memberMatchesAccount = (member, account, host) => {
  const target = normalizeAccount(account, host);
  const shortTarget = localUsername(target);
  const candidates = [
    member?.mastodonAccount,
    member?.mastodonId,
    member?.mastodonUsername,
    member?.acct,
  ]
    .filter(Boolean)
    .map(a => normalizeAccount(a, host));

  return candidates.some(
    candidate => candidate === target || localUsername(candidate) === shortTarget
  );
};

const findMemberByAccount = (members, account, host) => {
  for (const [id, member] of Object.entries(members)) {
    if (memberMatchesAccount(member, account, host)) {
      return { id, member: { ...member, id: member.id || id } };
    }
  }
  return null;
};

const isFromBotAccount = (status, botAccount) => {
  const account = getAuthorAccount(status);
  return localUsername(account) === localUsername(botAccount);
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
    const body = mention && !content.includes(mention) ? `${mention} ${content}` : content;
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
    isBotMentioned: (status) => isBotMentioned(status, botAccount, host),
    getAuthorAccount,
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
  getAuthorAccount,
  extractMentionAccounts,
  getMembers,
  findMemberByAccount,
  isFromBotAccount,
  isBotMentioned,
  createBotContext,
};
