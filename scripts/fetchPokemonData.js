// fetchPokemonData.js - PokeAPI에서 포켓몬 데이터를 가져와 JSON에 추가하는 스크립트
// 사용법: node fetchPokemonData.js

const fs = require('fs');
const path = require('path');

// PokeAPI 호출 함수 (fetch 대신 https 모듈 사용)
async function fetchAPI(url) {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// 딜레이 함수 (API 요청 제한 방지)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 한글 타입 이름 매핑
const typeNameKo = {
  'normal': '노말',
  'fire': '불꽃',
  'water': '물',
  'electric': '전기',
  'grass': '풀',
  'ice': '얼음',
  'fighting': '격투',
  'poison': '독',
  'ground': '땅',
  'flying': '비행',
  'psychic': '에스퍼',
  'bug': '벌레',
  'rock': '바위',
  'ghost': '고스트',
  'dragon': '드래곤',
  'dark': '악',
  'steel': '강철',
  'fairy': '페어리'
};

// 한글 특성 이름 매핑 (전체)
const abilityNameKo = {
  // 1세대
  'stench': '악취',
  'drizzle': '잔비',
  'speed-boost': '가속',
  'battle-armor': '전투무장',
  'sturdy': '옹골참',
  'damp': '습기',
  'limber': '유연',
  'sand-veil': '모래숨기',
  'static': '정전기',
  'volt-absorb': '축전',
  'water-absorb': '저수',
  'oblivious': '둔감',
  'cloud-nine': '에어록',
  'compound-eyes': '복안',
  'insomnia': '불면',
  'color-change': '변색',
  'immunity': '면역',
  'flash-fire': '타오르는불꽃',
  'shield-dust': '인분',
  'own-tempo': '마이페이스',
  'suction-cups': '흡반',
  'intimidate': '위협',
  'shadow-tag': '그림자밟기',
  'rough-skin': '까칠한피부',
  'wonder-guard': '불가사의부적',
  'levitate': '부유',
  'effect-spore': '포자',
  'synchronize': '싱크로',
  'clear-body': '클리어바디',
  'natural-cure': '자연회복',
  'lightning-rod': '피뢰침',
  'serene-grace': '하늘의은총',
  'swift-swim': '쓱쓱',
  'chlorophyll': '엽록소',
  'illuminate': '발광',
  'trace': '트레이스',
  'huge-power': '큰힘',
  'poison-point': '독침',
  'inner-focus': '정신력',
  'magma-armor': '마그마의무장',
  'water-veil': '수의베일',
  'magnet-pull': '자력',
  'soundproof': '방음',
  'rain-dish': '젖은접시',
  'sand-stream': '모래날림',
  'pressure': '프레셔',
  'thick-fat': '두꺼운지방',
  'early-bird': '일찍기상',
  'flame-body': '불꽃몸',
  'run-away': '도주',
  'keen-eye': '날카로운눈',
  'hyper-cutter': '괴력집게',
  'pickup': '픽업',
  'truant': '게으름',
  'hustle': '의욕',
  'cute-charm': '헤롱헤롱바디',
  'plus': '플러스',
  'minus': '마이너스',
  'forecast': '기분파',
  'sticky-hold': '점착',
  'shed-skin': '탈피',
  'guts': '근성',
  'marvel-scale': '이상한비늘',
  'liquid-ooze': '해감액',
  'overgrow': '심록',
  'blaze': '맹화',
  'torrent': '급류',
  'swarm': '벌레의알림',
  'rock-head': '돌머리',
  'drought': '가뭄',
  'arena-trap': '개미지옥',
  'vital-spirit': '의기양양',
  'white-smoke': '하얀연기',
  'pure-power': '순수한힘',
  'shell-armor': '조가비갑옷',
  'air-lock': '에어록',
  
  // 4세대
  'tangled-feet': '갈지자걸음',
  'motor-drive': '전기엔진',
  'rivalry': '투쟁심',
  'steadfast': '불굴의마음',
  'snow-cloak': '눈숨기',
  'gluttony': '먹보',
  'anger-point': '분노의경혈',
  'unburden': '곡예',
  'heatproof': '내열',
  'simple': '단순',
  'dry-skin': '건조피부',
  'download': '다운로드',
  'iron-fist': '철주먹',
  'poison-heal': '포이즌힐',
  'adaptability': '적응력',
  'skill-link': '스킬링크',
  'hydration': '촉촉바디',
  'solar-power': '선파워',
  'quick-feet': '속보',
  'normalize': '노말스킨',
  'sniper': '스나이퍼',
  'magic-guard': '매직가드',
  'no-guard': '노가드',
  'stall': '시간벌기',
  'technician': '테크니션',
  'leaf-guard': '리프가드',
  'klutz': '서투름',
  'mold-breaker': '틀깨기',
  'super-luck': '대운',
  'aftermath': '유폭',
  'anticipation': '위험예지',
  'forewarn': '예지몽',
  'unaware': '천진함',
  'tinted-lens': '색안경',
  'filter': '필터',
  'slow-start': '슬로스타트',
  'scrappy': '배짱',
  'storm-drain': '저수',
  'ice-body': '아이스바디',
  'solid-rock': '하드록',
  'snow-warning': '눈퍼뜨리기',
  'honey-gather': '꿀모으기',
  'frisk': '통찰',
  'reckless': '이판사판',
  'multitype': '멀티타입',
  'flower-gift': '플라워기프트',
  'bad-dreams': '나이트메어',
  
  // 5세대
  'pickpocket': '나쁜손버릇',
  'sheer-force': '우격다짐',
  'contrary': '심술꾸러기',
  'unnerve': '긴장감',
  'defiant': '오기',
  'defeatist': '무기력',
  'cursed-body': '저주받은바디',
  'healer': '치유의마음',
  'friend-guard': '프렌드가드',
  'weak-armor': '깨어진갑옷',
  'heavy-metal': '헤비메탈',
  'light-metal': '라이트메탈',
  'multiscale': '멀티스케일',
  'toxic-boost': '독폭주',
  'flare-boost': '열폭주',
  'harvest': '수확',
  'telepathy': '텔레파시',
  'moody': '변덕쟁이',
  'overcoat': '방진',
  'poison-touch': '독수',
  'regenerator': '재생력',
  'big-pecks': '부풀린가슴',
  'sand-rush': '모래헤치기',
  'wonder-skin': '미라클스킨',
  'analytic': '애널라이즈',
  'illusion': '일루전',
  'imposter': '괴짜',
  'infiltrator': '틈새포착',
  'mummy': '미라',
  'moxie': '자기과신',
  'justified': '정의의마음',
  'rattled': '주눅',
  'magic-bounce': '매직미러',
  'sap-sipper': '초식',
  'prankster': '짓궂은마음',
  'sand-force': '모래의힘',
  'iron-barbs': '철가시',
  'zen-mode': '달마모드',
  'victory-star': '승리의별',
  'turboblaze': '터보블레이즈',
  'teravolt': '테라볼티지',
  
  // 6세대
  'aroma-veil': '아로마베일',
  'flower-veil': '플라워베일',
  'cheek-pouch': '볼주머니',
  'protean': '변환자재',
  'fur-coat': '퍼코트',
  'magician': '매지션',
  'bulletproof': '방탄',
  'competitive': '승기',
  'strong-jaw': '옹골진턱',
  'refrigerate': '프리즈스킨',
  'sweet-veil': '스위트베일',
  'stance-change': '배틀스위치',
  'gale-wings': '질풍날개',
  'mega-launcher': '메가런처',
  'grass-pelt': '그래스메이커',
  'symbiosis': '공생',
  'tough-claws': '단단한발톱',
  'pixilate': '페어리스킨',
  'gooey': '미끌미끌',
  'aerilate': '스카이스킨',
  'parental-bond': '부자유친',
  'dark-aura': '다크오라',
  'fairy-aura': '페어리오라',
  'aura-break': '오라브레이크',
  'primordial-sea': '시작의바다',
  'desolate-land': '끝의대지',
  'delta-stream': '델타스트림',
  
  // 7세대
  'stamina': '지구력',
  'wimp-out': '위기회피',
  'emergency-exit': '위험회피',
  'water-compaction': '저수',
  'merciless': '무자비',
  'shields-down': '리밋실드',
  'stakeout': '잠복',
  'water-bubble': '수포',
  'steelworker': '철의주먹',
  'berserk': '앙숙',
  'slush-rush': '슬러시러시',
  'long-reach': '원거리',
  'liquid-voice': '촉촉보이스',
  'triage': '힐링시프트',
  'galvanize': '일렉트릭스킨',
  'surge-surfer': '서핑테일',
  'schooling': '어군',
  'disguise': '탈',
  'battle-bond': '유대변화',
  'power-construct': '스웜체인지',
  'corrosion': '부식',
  'comatose': '절대안깸',
  'queenly-majesty': '여왕의위엄',
  'innards-out': '속살뒤집기',
  'dancer': '무용',
  'battery': '배터리',
  'fluffy': '복슬복슬',
  'dazzling': '비비드바디',
  'soul-heart': '소울하트',
  'tangling-hair': '엉킴머리',
  'receiver': '리시버',
  'power-of-alchemy': '화학의힘',
  'beast-boost': '비스트부스트',
  'rks-system': 'AR시스템',
  'electric-surge': '일렉트릭메이커',
  'psychic-surge': '사이코메이커',
  'misty-surge': '미스트메이커',
  'grassy-surge': '그래스메이커',
  'full-metal-body': '메탈프로텍트',
  'shadow-shield': '팬텀가드',
  'prism-armor': '프리즘아머',
  'neuroforce': '브레인포스',
  
  // 8세대
  'intrepid-sword': '불굴의검',
  'dauntless-shield': '불굴의방패',
  'libero': '리베로',
  'ball-fetch': '볼가져오기',
  'cotton-down': '솜모래',
  'propeller-tail': '스크류지느러미',
  'mirror-armor': '미러아머',
  'gulp-missile': '꿀꺽미사일',
  'stalwart': '일직선',
  'steam-engine': '증기기관',
  'punk-rock': '펑크록',
  'sand-spit': '모래뱉기',
  'ice-scales': '아이스페이스',
  'ripen': '익음',
  'ice-face': '아이스페이스',
  'power-spot': '파워스폿',
  'mimicry': '의태',
  'screen-cleaner': '배리어프리',
  'steely-spirit': '강철정신',
  'perish-body': '멸망의보디',
  'wandering-spirit': '헤매는혼',
  'gorilla-tactics': '무아지경',
  'neutralizing-gas': '화학변화가스',
  'pastel-veil': '파스텔베일',
  'hunger-switch': '꼬르륵스위치',
  'quick-draw': '퀵드로우',
  'unseen-fist': '보이지않는주먹',
  'curious-medicine': '기묘한약',
  'transistor': '트랜지스터',
  'dragons-maw': '용의턱',
  'chilling-neigh': '백의울음소리',
  'grim-neigh': '흑의울음소리',
  'as-one-glastrier': '동심일체',
  'as-one-spectrier': '동심일체',
  
  // 9세대
  'lingering-aroma': '향기낭',
  'seed-sower': '씨뿌리기',
  'thermal-exchange': '열교환',
  'anger-shell': '분노의껍질',
  'purifying-salt': '정화의소금',
  'well-baked-body': '노릇노릇바디',
  'wind-rider': '바람타기',
  'guard-dog': '수문장',
  'rocky-payload': '바위나르기',
  'wind-power': '풍력발전',
  'zero-to-hero': '제로투히어로',
  'commander': '사령탑',
  'electromorphosis': '전기바꾸기',
  'protosynthesis': '고대활성',
  'quark-drive': '쿼크차지',
  'good-as-gold': '황금몸',
  'vessel-of-ruin': '재앙의그릇',
  'sword-of-ruin': '재앙의검',
  'tablets-of-ruin': '재앙의목간',
  'beads-of-ruin': '재앙의구슬',
  'orichalcum-pulse': '오리하르곤펄스',
  'hadron-engine': '하드론엔진',
  'opportunist': '편승',
  'cud-chew': '되새김질',
  'sharpness': '예리함',
  'supreme-overlord': '총대장',
  'costar': '공연',
  'toxic-debris': '독치장',
  'armor-tail': '아머테일',
  'earth-eater': '토식',
  'mycelium-might': '균사의위력',
  'minds-eye': '마음의눈',
  'hospitality': '대접',
  'toxic-chain': '독사슬',
  'embody-aspect-teal': '마스크',
  'embody-aspect-wellspring': '마스크',
  'embody-aspect-hearthflame': '마스크',
  'embody-aspect-cornerstone': '마스크',
  'tera-shift': '테라체인지',
  'tera-shell': '테라셸',
  'teraform-zero': '제로포밍',
  'poison-puppeteer': '독조종'
};

// 특성 이름을 한글로 변환 (매핑에 없으면 영문 그대로)
function getAbilityNameKo(abilityNameEn) {
  return abilityNameKo[abilityNameEn] || abilityNameEn;
}

// 포켓몬 데이터 가져오기
async function fetchPokemonData(pokemonId) {
  try {
    console.log(`📥 포켓몬 #${pokemonId} 데이터 가져오는 중...`);
    
    // 포켓몬 기본 정보
    const pokemon = await fetchAPI(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
    
    // 포켓몬 종 정보 (성비, 세대 등)
    const species = await fetchAPI(pokemon.species.url);
    
    // 타입 정보
    const types = pokemon.types.map(t => typeNameKo[t.type.name] || t.type.name);
    const type1 = types[0] || '노말';
    const type2 = types[1] || null;
    
    // 특성 정보
    const normalAbilities = pokemon.abilities.filter(a => !a.is_hidden);
    const abilities = normalAbilities.map(a => getAbilityNameKo(a.ability.name));
    const abilitiesEn = normalAbilities.map(a => a.ability.name);
    
    const hiddenAbility = pokemon.abilities.find(a => a.is_hidden);
    const hiddenAbilityName = hiddenAbility 
      ? getAbilityNameKo(hiddenAbility.ability.name) 
      : null;
    const hiddenAbilityNameEn = hiddenAbility 
      ? hiddenAbility.ability.name 
      : null;
    
    // 성비 정보 (gender_rate: -1=무성, 0=100%수컷, 8=100%암컷)
    let genderRatio = { male: 50, female: 50 };
    if (species.gender_rate === -1) {
      genderRatio = { male: 0, female: 0 }; // 무성
    } else if (species.gender_rate === 0) {
      genderRatio = { male: 100, female: 0 }; // 100% 수컷
    } else if (species.gender_rate === 8) {
      genderRatio = { male: 0, female: 100 }; // 100% 암컷
    } else {
      const femalePercent = (species.gender_rate / 8) * 100;
      genderRatio = { 
        male: parseFloat((100 - femalePercent).toFixed(1)), 
        female: parseFloat(femalePercent.toFixed(1)) 
      };
    }
    
    // 한글 이름 가져오기
    const koreanName = species.names.find(n => n.language.name === 'ko');
    const nameKo = koreanName ? koreanName.name : pokemon.name;
    
    // 세대 정보
    const generationNumber = parseInt(species.generation.url.split('/').slice(-2, -1)[0]);
    
    // 데이터 구조화
    const pokemonData = {
      number: pokemon.id,
      name: nameKo,
      nameEn: pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1),
      type: type1,
      type2: type2,
      generation: generationNumber,
      
      // ⭐ 새로 추가되는 필드들
      genderRatio: genderRatio,
      height: pokemon.height, // dm 단위 (1m = 10dm)
      weight: pokemon.weight, // hg 단위 (1kg = 10hg)
      abilities: abilities.length > 0 ? abilities : ['없음'],
      abilitiesEn: abilitiesEn.length > 0 ? abilitiesEn : ['none'],
      hiddenAbility: hiddenAbilityName || null,
      hiddenAbilityEn: hiddenAbilityNameEn || null,
      
      // 기존 필드들
      baseHp: pokemon.stats[0].base_stat,
      imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`,
      iconUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${pokemon.id}.png`,
      spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`,
      shinySprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemon.id}.png`
    };
    
    console.log(`✅ ${nameKo} (${pokemon.name}) 데이터 수집 완료`);
    return pokemonData;
    
  } catch (error) {
    console.error(`❌ 포켓몬 #${pokemonId} 데이터 가져오기 실패:`, error.message);
    return null;
  }
}

// 여러 포켓몬 데이터 가져오기
async function fetchMultiplePokemon(startId, endId) {
  const allPokemon = [];
  
  for (let i = startId; i <= endId; i++) {
    const data = await fetchPokemonData(i);
    if (data) {
      allPokemon.push(data);
    }
    
    // API 요청 제한 방지를 위한 딜레이 (100ms)
    await delay(100);
  }
  
  return allPokemon;
}

// 기존 JSON 파일 업데이트
async function updateAllPokemonJson(newPokemonData) {
  // 스크립트가 src/data 폴더에 있으므로 같은 폴더의 allPokemon.json을 참조
  const jsonPath = path.join(__dirname, 'allPokemon.json');
  
  let existingData = { pokemon: [] };
  
  // 기존 파일이 있으면 읽기
  if (fs.existsSync(jsonPath)) {
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    existingData = JSON.parse(fileContent);
  }
  
  // 기존 포켓몬 번호 확인
  const existingNumbers = new Set(existingData.pokemon.map(p => p.number));
  
  // 새 포켓몬 데이터 추가 (중복 방지)
  newPokemonData.forEach(newPokemon => {
    if (existingNumbers.has(newPokemon.number)) {
      // 기존 포켓몬 업데이트
      const index = existingData.pokemon.findIndex(p => p.number === newPokemon.number);
      existingData.pokemon[index] = {
        ...existingData.pokemon[index],
        ...newPokemon
      };
      console.log(`🔄 포켓몬 #${newPokemon.number} 업데이트됨`);
    } else {
      // 새 포켓몬 추가
      existingData.pokemon.push(newPokemon);
      console.log(`➕ 포켓몬 #${newPokemon.number} 추가됨`);
    }
  });
  
  // 번호순 정렬
  existingData.pokemon.sort((a, b) => a.number - b.number);
  
  // 파일 저장
  fs.writeFileSync(jsonPath, JSON.stringify(existingData, null, 2), 'utf8');
  console.log(`\n✅ ${jsonPath} 파일이 업데이트되었습니다!`);
}

// 메인 실행 함수
async function main() {
  console.log('🚀 PokeAPI 데이터 수집 스크립트 시작!\n');
  
  // 수집할 포켓몬 범위 설정
  // 1세대: 1-151
  // 2세대: 152-251
  // 3세대: 252-386
  // 4세대: 387-493
  // 5세대: 494-649
  // 6세대: 650-721
  // 7세대: 722-809
  // 8세대: 810-905
  // 9세대: 906-1025
  const START_ID = 1;
  const END_ID = 1025; // 9세대까지 전체
  
  console.log(`📊 포켓몬 #${START_ID} ~ #${END_ID} 수집 시작...`);
  console.log(`⏱️  예상 소요 시간: 약 ${Math.ceil((END_ID - START_ID + 1) * 0.1 / 60)}분\n`);
  
  // 데이터 수집
  const pokemonData = await fetchMultiplePokemon(START_ID, END_ID);
  
  console.log(`\n✅ 총 ${pokemonData.length}마리 수집 완료!\n`);
  
  // JSON 파일 업데이트
  await updateAllPokemonJson(pokemonData);
  
  console.log('\n🎉 모든 작업이 완료되었습니다!');
  console.log(`\n📝 수집된 데이터 샘플:`);
  console.log(JSON.stringify(pokemonData[0], null, 2));
}

// 스크립트 실행
main().catch(error => {
  console.error('❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});