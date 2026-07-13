// 알림 봇 — 시스템 → 유저 방향 알림 발송 전용
// 유저 멘션 명령어는 없고, 서버 이벤트(알 부화, 진화, 관리자 공지 등)를 받아 발송

// 요리/진화 등이 짧은 시간에 몰리면(특히 함수가 죽었다가 복구된 직후 밀린 이벤트가
// 한꺼번에 트리거될 때) 여러 Cloud Functions 인스턴스가 동시에 마스토돈에 상태를
// 쏴서 429(Too many requests)를 유발하고, 그 알림들은 재시도 없이 그대로 유실됐다
// (2026-07-13 발생 사고). 아래 두 장치로 이를 막는다:
//   1) RTDB 트랜잭션으로 "다음 발송 가능 시각"을 예약해 여러 인스턴스의 발송 시점을 강제로 벌림
//   2) 그래도 429가 나면 Retry-After(또는 기본 백오프)만큼 기다렸다가 몇 번 재시도
const MIN_INTERVAL_MS = 1500;
const MAX_WAIT_MS = 20000; // 함수 타임아웃(기본 60초)을 넘기지 않도록 대기 시간 상한
const MAX_RETRIES = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createNotifyBot = ({ makeMastodonRequest, instanceUrl, db }) => {
  const reserveSlot = async () => {
    if (!db) return;
    const lockRef = db.ref('mastodonBot/notifyPacing/nextSlotAt');
    const result = await lockRef.transaction((current) => {
      const now = Date.now();
      const base = typeof current === 'number' && current > now ? current : now;
      return base + MIN_INTERVAL_MS;
    });
    const mySlot = (result.snapshot.val() || Date.now()) - MIN_INTERVAL_MS;
    const wait = Math.min(mySlot - Date.now(), MAX_WAIT_MS);
    if (wait > 0) await sleep(wait);
  };

  const postStatus = async (content, visibility = 'public') => {
    await reserveSlot();

    for (let attempt = 0; ; attempt += 1) {
      try {
        return await makeMastodonRequest('/api/v1/statuses', 'POST', { status: content, visibility });
      } catch (error) {
        if (error?.statusCode !== 429 || attempt >= MAX_RETRIES) throw error;
        const backoffMs = Math.min(error.retryAfter ? error.retryAfter * 1000 : 2000 * (attempt + 1), MAX_WAIT_MS);
        console.warn(`notifyBot postStatus rate-limited, retry ${attempt + 1}/${MAX_RETRIES} after ${backoffMs}ms`);
        await sleep(backoffMs);
      }
    }
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
