/**
 * 레이드 규칙(V장 1항)에서 참가자 파트너 포켓몬이 사용할 수 없는 기술 목록.
 * 규칙 원문의 예시 기술을 쇼다운 영문 id로 매핑했고, "등"으로 끝나는 카테고리 항목은
 * 같은 카테고리의 잘 알려진 기술 몇 개를 함께 포함시켰다(예: 고정 데미지 기술에
 * 지구던지기/분노의앞니 외에 나이트헤드·용의분노·소닉붐 추가).
 * 규칙에 없던 기술이 카테고리 확장으로 잘못 포함됐다면 이 목록에서 빼면 된다.
 */
export const BANNED_MOVE_IDS = new Set([
  // 1. 바톤터치, 꼬리자르기
  'baton-pass',
  'shed-tail',
  // 2. 사슬묶기
  'disable',
  // 3. 봉인
  'imprison',
  // 4. 앙코르
  'encore',
  // 5. 트집
  'torment',
  // 6. 사이드 체인지
  'ally-switch',
  // 7. 당신먼저, 순서미루기
  'after-you',
  'quash',
  // 8. 트릭, 바꿔치기
  'trick',
  'switcheroo',
  // 9. 가드셰어, 파워셰어
  'guard-split',
  'power-split',
  // 10. 날따름, 분노가루 (어그로 관련 기술)
  'follow-me',
  'rage-powder',
  // 11. 치유소원, 초승달춤, 추억의 선물
  'healing-wish',
  'lunar-dance',
  'memento',
  // 12. 타르샷 등 약점 타입을 바꾸는 기술
  'tar-shot',
  // 13. 분노의 앞니, 지구던지기 등 고정 수치 데미지 기술
  'super-fang',
  'seismic-toss',
  'night-shade',
  'dragon-rage',
  'sonic-boom',
  // 14. 베껴그리기, 위액, 고민씨, 스킬스왑 등 특성변화기
  'doodle',
  'gastro-acid',
  'worry-seed',
  'skill-swap',
  // 15. 대폭발, 자폭, 목숨걸기 등 자폭 기술
  'explosion',
  'self-destruct',
  'final-gambit',
  // 16. 마법가루, 물붓기, 숲의저주 등 타입변화기
  'magic-powder',
  'soak',
  'forests-curse',
  'trick-or-treat',
  // 17. 멸망의 노래, 길동무 포함 즉사기
  'perish-song',
  'destiny-bond',
  // 18. 땅가르기, 가위자르기 포함 일격기
  'fissure',
  'guillotine',
  'horn-drill',
  'sheer-cold',
]);

export function isMoveBanned(moveId) {
  return BANNED_MOVE_IDS.has(moveId);
}
