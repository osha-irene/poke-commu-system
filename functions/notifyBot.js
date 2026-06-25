// 알림 봇 — 시스템 → 유저 방향 알림 발송 전용
// 유저 멘션 명령어는 없고, 서버 이벤트(알 부화, 진화, 관리자 공지 등)를 받아 발송

const createNotifyBot = ({ makeMastodonRequest, instanceUrl }) => {
  const postStatus = async (content, visibility = 'public') => {
    return makeMastodonRequest('/api/v1/statuses', 'POST', { status: content, visibility });
  };

  const mentionUser = async (mastodonAccount, content, visibility = 'unlisted') => {
    const mention = mastodonAccount.startsWith('@') ? mastodonAccount : `@${mastodonAccount}`;
    const body = content.includes(mention) ? content : `${mention} ${content}`;
    return postStatus(body, visibility);
  };

  const notifyEggHatched = async (mastodonAccount, pokemonName) => {
    return mentionUser(mastodonAccount, `알이 부화했어요! ${pokemonName}이(가) 태어났습니다. 🥚✨`);
  };

  const notifyEvolution = async (mastodonAccount, fromName, toName) => {
    return mentionUser(mastodonAccount, `${fromName}이(가) ${toName}(으)로 진화했어요! 🎉`);
  };

  const notifyAnnouncement = async (mastodonAccount, message) => {
    return mentionUser(mastodonAccount, message, 'unlisted');
  };

  const broadcast = async (content, visibility = 'public') => {
    return postStatus(content, visibility);
  };

  return {
    postStatus,
    mentionUser,
    notifyEggHatched,
    notifyEvolution,
    notifyAnnouncement,
    broadcast,
  };
};

module.exports = { createNotifyBot };
