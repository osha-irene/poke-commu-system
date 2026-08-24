// functions/raceBot.js
// 누니머기 레이스 - 상점에서 "누니머기의 눈덩이"를 사면(src/hooks/shop/useShop.js의
// feedNunmegiRace) gameData/nunmegiRace의 1/2/3번 누니머기 중 한 마리가 무작위로 1mm씩
// 전진한다. 이 봇은 그 상태를 읽기만 하는 순수 조회 명령 하나([누니머기 레이스])만 처리한다 -
// 다른 봇들과 달리 회원별 세션이나 계정 연동이 필요 없는 전체 공개 정보라서 findAuthorForStatus
// 없이 바로 응답할 수 있다.
const RACER_IDS = [1, 2, 3];

const getRaceCommand = (content) => {
  if (/\[\s*누니머기\s*레이스\s*\]/i.test(content)) return 'status';
  return null;
};

const formatRaceStatus = (raceState) => {
  const racers = raceState?.racers || {};
  const progressOf = (id) => Number(racers[String(id)]?.progressMm) || 0;
  const progresses = RACER_IDS.map(progressOf);
  const maxProgress = Math.max(...progresses);
  const leaders = RACER_IDS.filter((id) => progressOf(id) === maxProgress);

  const leaderLine = maxProgress === 0
    ? '아직 아무도 눈덩이를 먹지 않은 것 같다!'
    : `현재 1등 누니머기는 ${leaders.map((id) => `${id}번`).join(', ')} 누니머기!`;

  return [
    '사람들의 환호성 소리가 들려온다!',
    `1번 누니머기는 ${progressOf(1)}mm`,
    `2번 누니머기는 ${progressOf(2)}mm`,
    `3번 누니머기는 ${progressOf(3)}mm 을 가고 있는 것 같다!`,
    '',
    leaderLine,
    '눈덩이를 더 열심히 먹여보자!',
  ].join('\n');
};

const createRaceBot = ({ db }) => {
  const getStatus = async () => {
    const snapshot = await db.ref('gameData/nunmegiRace').once('value');
    return formatRaceStatus(snapshot.val());
  };

  const handle = async ({ command }) => {
    if (command === 'status') return getStatus();
    return null;
  };

  return { getCommand: getRaceCommand, handle };
};

module.exports = {
  createRaceBot,
  getRaceCommand,
  formatRaceStatus,
};
