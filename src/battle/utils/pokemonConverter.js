// src/battle/utils/pokemonConverter.js
// Firebase 포켓몬 데이터를 @pkmn/sim 형식으로 변환

import { toCalcAbilityName } from '../../utils/abilityUtils';

// 한글 타입 -> 영문 타입 매핑
const TYPE_MAP = {
  '노말': 'Normal',
  '불꽃': 'Fire',
  '물': 'Water',
  '전기': 'Electric',
  '풀': 'Grass',
  '얼음': 'Ice',
  '격투': 'Fighting',
  '독': 'Poison',
  '땅': 'Ground',
  '비행': 'Flying',
  '에스퍼': 'Psychic',
  '벌레': 'Bug',
  '바위': 'Rock',
  '고스트': 'Ghost',
  '드래곤': 'Dragon',
  '악': 'Dark',
  '강철': 'Steel',
  '페어리': 'Fairy'
};

// 한글 성격 -> 영문 성격 매핑
const NATURE_MAP = {
  '고집': 'Adamant',
  '용감': 'Brave',
  '외로움': 'Lonely',
  '개구쟁이': 'Naughty',
  '대담': 'Bold',
  '장난꾸러기': 'Impish',
  '무사태평': 'Lax',
  '느긋': 'Relaxed',
  '조용': 'Quiet',
  '온순': 'Mild',
  '덜렁': 'Rash',
  '냉정': 'Modest',
  '차분': 'Calm',
  '얌전': 'Gentle',
  '신중': 'Careful',
  '건방': 'Sassy',
  '겁쟁이': 'Timid',
  '성급': 'Hasty',
  '명랑': 'Jolly',
  '천진난만': 'Naive',
  '성실': 'Serious',
  '노력': 'Docile',
  '수줍음': 'Bashful',
  '변덕': 'Quirky',
  '무난': 'Hardy'
};

// 한글 포켓몬 이름 -> 영문 이름 매핑 (주요 포켓몬만)
// 전체 목록이 필요하면 allPokemon.json의 nameEn 필드 사용
const POKEMON_NAME_MAP = {
  // 1세대
  '이상해씨': 'Bulbasaur',
  '이상해풀': 'Ivysaur',
  '이상해꽃': 'Venusaur',
  '파이리': 'Charmander',
  '리자드': 'Charmeleon',
  '리자몽': 'Charizard',
  '꼬부기': 'Squirtle',
  '어니부기': 'Wartortle',
  '거북왕': 'Blastoise',
  '피카츄': 'Pikachu',
  '라이츄': 'Raichu',
  '뮤츠': 'Mewtwo',
  '뮤': 'Mew',
  // 필요에 따라 추가
};

/**
 * 한글 타입을 영문으로 변환
 */
function translateType(koreanType) {
  if (!koreanType) return 'Normal';
  return TYPE_MAP[koreanType] || koreanType;
}

/**
 * 한글 성격을 영문으로 변환
 */
function translateNature(koreanNature) {
  if (!koreanNature) return 'Hardy';
  return NATURE_MAP[koreanNature] || koreanNature;
}

/**
 * 포켓몬 영문 이름 가져오기
 */
function getEnglishName(pokemon) {
  // nameEn이 있으면 사용
  if (pokemon.nameEn) {
    // 첫 글자 대문자로
    return pokemon.nameEn.charAt(0).toUpperCase() + pokemon.nameEn.slice(1);
  }
  
  // 매핑에서 찾기
  if (POKEMON_NAME_MAP[pokemon.name]) {
    return POKEMON_NAME_MAP[pokemon.name];
  }
  
  // species가 있으면 사용
  if (pokemon.species) {
    return pokemon.species;
  }
  
  // 기본값
  return pokemon.name || 'Ditto';
}

/**
 * Firebase 포켓몬 데이터를 @pkmn/sim 배틀 형식으로 변환
 * 
 * @param {Object} pokemon - Firebase에서 가져온 포켓몬 데이터
 * @returns {Object} 변환된 배틀용 데이터
 */
export function convertToBattleFormat(pokemon) {
  if (!pokemon) {
    console.error('[pokemonConverter] 포켓몬 데이터가 없습니다');
    return null;
  }
  
  console.log('[convertToBattleFormat] 입력:', pokemon);
  
  // 영문 이름 가져오기
  const englishName = getEnglishName(pokemon);
  
  // 특성 변환 (한글 -> @smogon/calc 형식)
  const ability = toCalcAbilityName(pokemon.ability) || 'Adaptability';
  
  // 성격 변환
  const nature = translateNature(pokemon.nature) || 'Hardy';
  
  // 타입 변환
  const types = [translateType(pokemon.type)];
  if (pokemon.type2) {
    types.push(translateType(pokemon.type2));
  }
  
  // 기술 변환
  const moves = (pokemon.moves || []).map(m => {
    // 기술 객체에서 영문 이름 추출
    if (typeof m === 'string') return m;
    return m.nameEn || m.name || 'Tackle';
  }).slice(0, 4);
  
  // 4개 미만이면 Struggle로 채우기
  while (moves.length < 4) {
    moves.push('Struggle');
  }
  
  // 스탯 계산 (baseStats + IV + EV + 레벨)
  const level = pokemon.level || 50;
  
  const ivs = {
    hp: pokemon.ivs?.hp ?? 31,
    atk: pokemon.ivs?.attack ?? 31,
    def: pokemon.ivs?.defense ?? 31,
    spa: pokemon.ivs?.specialAttack ?? 31,
    spd: pokemon.ivs?.specialDefense ?? 31,
    spe: pokemon.ivs?.speed ?? 31
  };
  
  const evs = {
    hp: pokemon.effort?.hp ?? 0,
    atk: pokemon.effort?.attack ?? 0,
    def: pokemon.effort?.defense ?? 0,
    spa: pokemon.effort?.specialAttack ?? 0,
    spd: pokemon.effort?.specialDefense ?? 0,
    spe: pokemon.effort?.speed ?? 0
  };
  
  // 기본 스탯 (baseHp 등이 없으면 기본값)
  const baseStats = {
    hp: pokemon.baseHp || pokemon.baseStats?.hp || 50,
    atk: pokemon.baseAttack || pokemon.baseStats?.attack || 50,
    def: pokemon.baseDefense || pokemon.baseStats?.defense || 50,
    spa: pokemon.baseSpAttack || pokemon.baseStats?.spAttack || 50,
    spd: pokemon.baseSpDefense || pokemon.baseStats?.spDefense || 50,
    spe: pokemon.baseSpeed || pokemon.baseStats?.speed || 50
  };
  
  // 실제 스탯 계산
  const stats = calculateStats(baseStats, ivs, evs, level);
  
  const result = {
    // 표시용 정보
    display: {
      name: pokemon.nickname || pokemon.name,
      species: pokemon.name,
      level: level,
      types: [pokemon.type, pokemon.type2].filter(Boolean),
      ability: pokemon.ability,
      isShiny: pokemon.isShiny || false,
      sprite: pokemon.spriteUrl || `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokemon.number}.png`
    },
    
    // @pkmn/sim 배틀용 정보
    battle: {
      name: englishName,
      species: englishName,
      level: level,
      ability: ability,
      item: translateItem(pokemon.heldItem),
      nature: nature,
      moves: moves,
      ivs: ivs,
      evs: evs,
      gender: translateGender(pokemon.gender)
    },
    
    // 계산된 스탯
    stats: stats,
    
    // HP 정보
    currentHP: pokemon.hp || stats.hp,
    maxHP: pokemon.maxHp || stats.hp
  };
  
  console.log('[convertToBattleFormat] 결과:', result);
  return result;
}

/**
 * 아이템 이름 영문 변환
 */
function translateItem(itemName) {
  if (!itemName) return '';
  
  // 주요 아이템 매핑
  const itemMap = {
    '구애스카프': 'Choice Scarf',
    '구애안경': 'Choice Specs',
    '구애머리띠': 'Choice Band',
    '생명의구슬': 'Life Orb',
    '기합의띠': 'Focus Sash',
    '돌격조끼': 'Assault Vest',
    '먹다남은음식': 'Leftovers',
    '진화의휘석': 'Eviolite',
    '약점보험': 'Weakness Policy',
    '변함없는돌': 'Everstone'
  };
  
  return itemMap[itemName] || itemName;
}

/**
 * 성별 변환
 */
function translateGender(gender) {
  if (gender === 'male') return 'M';
  if (gender === 'female') return 'F';
  return '';
}

/**
 * 스탯 계산
 */
function calculateStats(base, ivs, evs, level) {
  return {
    hp: Math.floor(((2 * base.hp + ivs.hp + Math.floor(evs.hp / 4)) * level) / 100) + level + 10,
    atk: Math.floor(((2 * base.atk + ivs.atk + Math.floor(evs.atk / 4)) * level) / 100) + 5,
    def: Math.floor(((2 * base.def + ivs.def + Math.floor(evs.def / 4)) * level) / 100) + 5,
    spa: Math.floor(((2 * base.spa + ivs.spa + Math.floor(evs.spa / 4)) * level) / 100) + 5,
    spd: Math.floor(((2 * base.spd + ivs.spd + Math.floor(evs.spd / 4)) * level) / 100) + 5,
    spe: Math.floor(((2 * base.spe + ivs.spe + Math.floor(evs.spe / 4)) * level) / 100) + 5
  };
}

/**
 * Packed Team 형식으로 변환 (@pkmn/sim에서 사용)
 * 
 * 형식: name|species|item|ability|moves|nature|evs|gender|ivs|shiny|level|happiness,pokeball,hiddenpowertype,gigantamax,dynamaxlevel,teratype
 */
export function toPackedFormat(battleData) {
  if (!battleData) return '';
  
  const {
    name = battleData.species,
    species,
    item = '',
    ability,
    moves = [],
    nature = 'Hardy',
    evs = {},
    gender = '',
    ivs = {},
    level = 50
  } = battleData;
  
  // EV 문자열 (hp,atk,def,spa,spd,spe)
  const evString = [
    evs.hp || 0,
    evs.atk || 0,
    evs.def || 0,
    evs.spa || 0,
    evs.spd || 0,
    evs.spe || 0
  ].join(',');
  
  // IV 문자열
  const ivString = [
    ivs.hp ?? 31,
    ivs.atk ?? 31,
    ivs.def ?? 31,
    ivs.spa ?? 31,
    ivs.spd ?? 31,
    ivs.spe ?? 31
  ].join(',');
  
  // 기술 문자열
  const movesString = moves.slice(0, 4).join(',');
  
  // Packed 형식 생성
  const packed = [
    name || species,           // 0: nickname
    species,                   // 1: species
    item,                      // 2: item
    ability,                   // 3: ability
    movesString,               // 4: moves
    nature,                    // 5: nature
    evString,                  // 6: evs
    gender,                    // 7: gender
    ivString,                  // 8: ivs
    '',                        // 9: shiny (빈 문자열 = false)
    level,                     // 10: level
    ''                         // 11: 기타 (happiness 등)
  ].join('|');
  
  console.log('[toPackedFormat] 결과:', packed);
  return packed;
}

export default {
  convertToBattleFormat,
  toPackedFormat
};
