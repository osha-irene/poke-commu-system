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

export function toMemberViewDataMap(members = {}) {
  return Object.fromEntries(
    Object.entries(members)
      .map(([id, member]) => [id, toMemberViewData(member, id)])
      .filter(([, member]) => member)
  );
}
