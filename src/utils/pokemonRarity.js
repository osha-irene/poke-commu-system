// 전설의 포켓몬 / 환상의 포켓몬 / 패러독스 포켓몬 판정
// 폼체인지(오리진폼, 크라운폼 등)는 number가 10000번대 폼 전용 id를 쓰므로,
// originalNumber(원종 도감 번호)가 있으면 그쪽을 기준으로 판정한다.

const LEGENDARY_NUMBERS = new Set([
  144, 145, 146, 150,
  243, 244, 245, 249, 250,
  377, 378, 379, 380, 381, 382, 383, 384,
  480, 481, 482, 483, 484, 485, 486, 487, 488,
  638, 639, 640, 641, 642, 643, 644, 645, 646,
  716, 717, 718,
  785, 786, 787, 788, 789, 790, 791, 792, 800,
  888, 889, 890, 894, 895, 896, 897, 898, 905,
  1001, 1002, 1003, 1004, 1007, 1008, 1014, 1015, 1016, 1017, 1024,
]);

const MYTHICAL_NUMBERS = new Set([
  151, 251, 385, 386, 490, 491, 492, 493, 494,
  647, 648, 649,
  719, 720, 721,
  801, 802, 807, 808, 809,
  893,
  1025,
]);

const PARADOX_NUMBERS = new Set([
  984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995,
  1005, 1006, 1009, 1010,
  1020, 1021, 1022, 1023,
]);

// 게임 내부 플래그상 공식 전설/환상은 아니지만, 관리자 요청으로 동일하게 취급하는 예외.
const SPECIAL_UNCATCHABLE_NUMBERS = new Set([
  489, // 피오네
  891, // 치고마 (Kubfu)
  892, // 우라오스 (Urshifu)
  // 울트라비스트
  793, // 텅비드
  794, // 매시붕
  795, // 페로코체
  796, // 전수목
  797, // 철화구야
  798, // 종이신도
  799, // 악식킹
  803, // 베베놈
  804, // 아고용
  805, // 차곡차곡
  806, // 두파팡
]);

function getSpeciesNumber(pokemon) {
  const number = Number(pokemon?.originalNumber ?? pokemon?.number);
  return Number.isFinite(number) ? number : null;
}

export function isUncatchableRarePokemon(pokemon) {
  const speciesNumber = getSpeciesNumber(pokemon);
  if (speciesNumber === null) return false;
  return LEGENDARY_NUMBERS.has(speciesNumber)
    || MYTHICAL_NUMBERS.has(speciesNumber)
    || PARADOX_NUMBERS.has(speciesNumber)
    || SPECIAL_UNCATCHABLE_NUMBERS.has(speciesNumber);
}
