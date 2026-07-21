const MEMBER_VIEW_OMIT_KEYS = new Set([
  'auth',
  'authUid',
  'email',
  'password',
  'forcePasswordChange',
  'inventory',
  'money',
  'purchaseHistory',
  'dailyWalks',
  'maxDailyWalks',
  'lastAttendanceDate',
  'trainerExp',
  'canManageItems',
  'isAdmin',
  'isSuperAdmin',
  'egg',
  // 아래는 멤버/NPC 목록이나 다른 유저의 요약 카드 어디에서도 쓰이지 않는데(본인 화면·관리자
  // 상세 패널은 summary가 아니라 currentUser/members 원본을 직접 읽는다), 탐험·요리·진화처럼
  // 매우 잦은 액션마다 값이 바뀌어서 그때마다 memberSummary 전체가 접속자 전원에게 재전송되던
  // 필드들이다. summary 계산에서 빼면 그 액션들도 "요약 무변화"로 처리되어 재전송 자체가 스킵된다.
  'characterExp',
  'totalExploreCount',
  'cookingHistory',
  'evolutionHistory',
  'assignedTitles',
  'trainerId',
  'cramorantBeakClaimed',
]);

export function toMemberViewData(member = {}, id = member?.id) {
  if (!member || typeof member !== 'object') return null;

  const viewData = {};
  Object.entries(member).forEach(([key, value]) => {
    if (!MEMBER_VIEW_OMIT_KEYS.has(key)) {
      viewData[key] = value;
    }
  });

  if (id) viewData.id = id;
  return JSON.parse(JSON.stringify(viewData, (_, value) => (value === undefined ? null : value)));
}

function deriveCaughtNumbers(caughtPokemon) {
  if (!Array.isArray(caughtPokemon)) return [];
  const numbers = new Set();
  caughtPokemon.forEach((pokemon) => {
    if (!pokemon) return;
    [pokemon.number, pokemon.originalNumber].forEach((num) => {
      if (num) numbers.add(num);
    });
  });
  return Array.from(numbers);
}

// 가벼운 목록/홈 화면용 요약 - caughtPokemon/partnerPokemon(스탯·기술·IV 등 상세)을 뺀 나머지 전부.
// 도감 열람자 판별에 필요한 최소 정보만 caughtNumbers로 별도 보관한다.
export function toMemberSummary(member = {}, id = member?.id) {
  const viewData = toMemberViewData(member, id);
  if (!viewData) return null;

  const { caughtPokemon, partnerPokemon, ...summary } = viewData;
  summary.caughtNumbers = deriveCaughtNumbers(caughtPokemon);
  return summary;
}

export function toMemberSummaryMap(members = {}) {
  return Object.fromEntries(
    Object.entries(members)
      .map(([id, member]) => [id, toMemberSummary(member, id)])
      .filter(([, member]) => member)
  );
}

// 파티 상세(멤버/NPC 목록 탭에서만 필요) - partnerPokemon(목록 카드 아이콘용)만 담는다.
// caughtPokemon(포켓몬 전체 상세: IV/EV/기술 등, 회원당 최대 20마리)은 여기 안 실린다 -
// 예전엔 여기 실려서 멤버/NPC 탭을 열어둔 모두에게 "아무나" 포켓몬을 잡을 때마다 재전송
// 됐는데, 실제로 그게 필요한 건 상세 카드를 연 그 한 명뿐이라 useMemberCaughtPokemon 훅으로
// 온디맨드 조회하도록 분리했다.
export function toMemberParty(member = {}, id = member?.id) {
  if (!member || typeof member !== 'object') return null;

  // NpcView.jsx의 목록 카드는 partnerPokemon이 명시적으로 없으면 caughtPokemon에서
  // isPartner로 표시된 개체(없으면 첫 슬롯)로 대체해서 아이콘을 보여준다. caughtPokemon
  // 자체는 더 이상 party payload에 안 실리니, 그 대체 로직을 여기(쓰는 시점)에서 미리
  // 계산해 partnerPokemon 자리에 채워 넣는다 - 그래야 목록 화면들이 caughtPokemon 없이도
  // 지금과 같은 아이콘을 그대로 보여준다.
  const caughtPokemon = Array.isArray(member.caughtPokemon) ? member.caughtPokemon.filter(Boolean) : [];
  const effectivePartner = member.partnerPokemon
    ?? caughtPokemon.find(p => p?.isPartner)
    ?? caughtPokemon[0]
    ?? null;

  const party = {
    id,
    name: member.name ?? null,
    hidden: member.hidden ?? false,
    partnerPokemon: effectivePartner,
  };
  return JSON.parse(JSON.stringify(party, (_, value) => (value === undefined ? null : value)));
}

export function toMemberPartyMap(members = {}) {
  return Object.fromEntries(
    Object.entries(members)
      .map(([id, member]) => [id, toMemberParty(member, id)])
      .filter(([, member]) => member)
  );
}
