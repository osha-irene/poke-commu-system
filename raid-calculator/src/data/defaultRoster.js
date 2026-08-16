/**
 * 고정 참가자 명단(트레이너 이름 · 파트너 포켓몬 · 타입). 참가자 종족값/개체값/특성/도구는
 * 규칙 I장 4항에 따라 항상 고정값을 쓰므로, 여기서는 표시용 포켓몬 이름과 실제 데미지 계산에
 * 쓰이는 타입만 하드코딩한다(규칙 I장 5항: 타입은 기존 포켓몬과 동일하게 유지).
 */
export const DEFAULT_ROSTER = [
  // 철벽
  {
    position: "철벽",
    nickname: "펑크",
    pokemon: "부르르룸",
    types: ["Steel", "Poison"],
  },
  { position: "철벽", nickname: "나몬", pokemon: "픽시", types: ["Fairy"] },
  {
    position: "철벽",
    nickname: "네온",
    pokemon: "저리더프",
    types: ["Electric"],
  },
  {
    position: "철벽",
    nickname: "실트",
    pokemon: "토오",
    types: ["Poison", "Ground"],
  },
  {
    position: "철벽",
    nickname: "타이드",
    pokemon: "누오",
    types: ["Water", "Ground"],
  },

  // 칼춤
  {
    position: "칼춤",
    nickname: "더트",
    pokemon: "루가루암(황혼)",
    types: ["Rock"],
  },
  {
    position: "칼춤",
    nickname: "금채",
    pokemon: "모아머",
    types: ["Bug", "Grass"],
  },
  {
    position: "칼춤",
    nickname: "댕이",
    pokemon: "대검귀",
    types: ["Water", "Dark"],
  },
  {
    position: "칼춤",
    nickname: "수이",
    pokemon: "포푸니크",
    types: ["Fighting", "Poison"],
  },
  {
    position: "칼춤",
    nickname: "피요",
    pokemon: "따라큐",
    types: ["Ghost", "Fairy"],
  },
  {
    position: "칼춤",
    nickname: "마노",
    pokemon: "번치코",
    types: ["Fire", "Fighting"],
  },
  {
    position: "칼춤",
    nickname: "너울",
    pokemon: "엠페르트",
    types: ["Water", "Steel"],
  },
  {
    position: "칼춤",
    nickname: "총 군",
    pokemon: "창파나이트",
    types: ["Fighting"],
  },
  {
    position: "칼춤",
    nickname: "가넷",
    pokemon: "라우드본",
    types: ["Fire", "Ghost"],
  },
  {
    position: "칼춤",
    nickname: "로토무",
    pokemon: "로토무",
    types: ["Electric", "Ghost"],
  },
  {
    position: "칼춤",
    nickname: "마루",
    pokemon: "바랜드",
    types: ["Normal"],
  },
  {
    position: "칼춤",
    nickname: "만치닐",
    pokemon: "초염몽",
    types: ["Fire", "Fighting"],
  },

  // 도우미
  {
    position: "도우미",
    nickname: "꼬마",
    pokemon: "부스터",
    types: ["Fire"],
  },
  {
    position: "도우미",
    nickname: "프레이즈",
    pokemon: "가디안",
    types: ["Psychic", "Fairy"],
  },
  {
    position: "도우미",
    nickname: "바보",
    pokemon: "오롱털",
    types: ["Dark", "Fairy"],
  },
  {
    position: "도우미",
    nickname: "방울이",
    pokemon: "치렁",
    types: ["Psychic"],
  },
];
