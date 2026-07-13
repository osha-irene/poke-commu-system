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

// 파티 상세(멤버/NPC 목록 탭에서만 필요) - caughtPokemon/partnerPokemon만 담는다.
export function toMemberParty(member = {}, id = member?.id) {
  if (!member || typeof member !== 'object') return null;

  const party = {
    id,
    name: member.name ?? null,
    hidden: member.hidden ?? false,
    caughtPokemon: member.caughtPokemon ?? null,
    partnerPokemon: member.partnerPokemon ?? null,
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
