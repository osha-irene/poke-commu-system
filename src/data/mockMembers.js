const MOCK_NAMES = [
  '아이리스', '체리블라썸', '소라', '민아', '루나스타',
  '하나비', '유리카', '카라멜', '세나', '미루',
  '노아', '레나', '다온', '이슬비', '지아',
  '나비', '하늘', '채린', '수아', '별이',
];

const MOCK_MEMBERS = Object.fromEntries(
  MOCK_NAMES.map((name, i) => [
    `mock_${i}`,
    { name, hidden: false, isNPC: false, isMock: true },
  ])
);

export default MOCK_MEMBERS;
