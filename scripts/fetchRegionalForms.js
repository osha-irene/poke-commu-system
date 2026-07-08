// fetchRegionalForms.js - 리전폼 포켓몬만 수집하는 스크립트
// 사용법: node fetchRegionalForms.js

const fs = require('fs');
const path = require('path');

// PokeAPI 호출 함수
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

// 딜레이 함수
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

// 특성 이름을 한글로 변환
function getAbilityNameKo(abilityNameEn) {
  return abilityNameKo[abilityNameEn] || abilityNameEn;
}

// 리전폼 ID 목록 (PokeAPI 기준 - 정확한 ID)
const REGIONAL_FORM_IDS = [
  // 알로라 폼 (7세대)
  10100, // 라이츄-alola
  10101, // 나옹-alola  
  10102, // 꼬렛-alola
  10103, // 레트라-alola
  10104, // 디그다-alola
  10105, // 닥트리오-alola
  10106, // 나옹마-alola
  10107, // 페르시온-alola
  
  // 가라르 폼 (8세대) - ID 수정
  10158, // 나옹-galar
  10159, // 폼나옹-galar
  10161, // 지그제구리-galar
  10162, // 직구리-galar
  10163, // 꼬마돌-galar
  10164, // 데구리-galar
  10165, // 딱구리-galar
  10166, // 야도란-galar
  10167, // 야도킹-galar
  10170, // 파이어-galar
  10168, // 썬더-galar
  10169, // 프리져-galar
  10171, // 데스마스-galar
  10172, // 데스니칸-galar
  10175, // 카모네기-galar
  10176, // 마임맨-galar
  10177, // 코산호-galar
  10178, // 창파나이트-galar
  10179, // 대여름-galar
  
  // 히스이 폼 (레전드 아르세우스)
  10234, // 질뻐기-hisui
  10235, // 야도란-hisui
  10236, // 야도킹-hisui
  10238, // 딱구리-hisui
  10241, // 스나이젤-hisui
  10244  // 주뱃-hisui
];

// 리전폼 포켓몬 데이터 가져오기
async function fetchRegionalFormData(pokemonId) {
  try {
    console.log(`📥 리전폼 #${pokemonId} 데이터 가져오는 중...`);
    
    const pokemon = await fetchAPI(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
    const species = await fetchAPI(pokemon.species.url);
    
    // 리전폼 정보 파싱
    let regionalForm = null;
    let formSuffix = '';
    
    if (pokemon.name.includes('-alola')) {
      regionalForm = 'alola';
      formSuffix = ' (알로라)';
    } else if (pokemon.name.includes('-galar')) {
      regionalForm = 'galar';
      formSuffix = ' (가라르)';
    } else if (pokemon.name.includes('-hisui')) {
      regionalForm = 'hisui';
      formSuffix = ' (히스이)';
    } else if (pokemon.name.includes('-paldea')) {
      regionalForm = 'paldea';
      formSuffix = ' (팔데아)';
    }
    
    // 원종 포켓몬 번호 (안전하게 처리)
    let originalPokemonId = pokemonId;
    if (species && species.url) {
      originalPokemonId = parseInt(species.url.split('/').slice(-2, -1)[0]);
    } else if (species && species.id) {
      originalPokemonId = species.id;
    }
    
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
    
    // 성비 정보
    let genderRatio = { male: 50, female: 50 };
    if (species.gender_rate === -1) {
      genderRatio = { male: 0, female: 0 };
    } else if (species.gender_rate === 0) {
      genderRatio = { male: 100, female: 0 };
    } else if (species.gender_rate === 8) {
      genderRatio = { male: 0, female: 100 };
    } else if (typeof species.gender_rate === 'number') {
      const femalePercent = (species.gender_rate / 8) * 100;
      genderRatio = { 
        male: parseFloat((100 - femalePercent).toFixed(1)), 
        female: parseFloat(femalePercent.toFixed(1)) 
      };
    }
    
    // 한글 이름
    const koreanName = species.names?.find(n => n.language.name === 'ko');
    const nameKo = koreanName ? koreanName.name + formSuffix : pokemon.name + formSuffix;
    
    // 세대 정보 (안전하게 처리)
    let generationNumber = 1;
    if (species.generation && species.generation.url) {
      generationNumber = parseInt(species.generation.url.split('/').slice(-2, -1)[0]);
    }
    
    const pokemonData = {
      number: pokemonId,
      originalNumber: originalPokemonId,
      displayNumber: originalPokemonId,
      name: nameKo,
      nameEn: pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1),
      type: type1,
      type2: type2,
      generation: generationNumber,
      
      // 리전폼 정보
      isRegionalForm: true,
      regionalForm: regionalForm,
      formVariant: pokemon.name,
      
      // 개체값 정보
      genderRatio: genderRatio,
      height: pokemon.height,
      weight: pokemon.weight,
      abilities: abilities.length > 0 ? abilities : ['없음'],
      abilitiesEn: abilitiesEn.length > 0 ? abilitiesEn : ['none'],
      hiddenAbility: hiddenAbilityName || null,
      hiddenAbilityEn: hiddenAbilityNameEn || null,
      
      // 기타 정보
      baseHp: pokemon.stats[0].base_stat,
      imageUrl: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokemonId}.png`,
      iconUrl: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/versions/generation-viii/icons/${pokemonId}.png`,
      spriteUrl: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${pokemonId}.png`,
      shinySprite: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/shiny/${pokemonId}.png`
    };
    
    console.log(`✅ ${nameKo} (${regionalForm}) 데이터 수집 완료`);
    return pokemonData;
    
  } catch (error) {
    console.error(`❌ 리전폼 #${pokemonId} 데이터 가져오기 실패:`, error.message);
    return null;
  }
}

// 모든 리전폼 수집
async function fetchAllRegionalForms() {
  const allForms = [];
  
  for (const id of REGIONAL_FORM_IDS) {
    const data = await fetchRegionalFormData(id);
    if (data) {
      allForms.push(data);
    }
    await delay(100);
  }
  
  return allForms;
}

// 기존 JSON에 추가
async function addToAllPokemonJson(regionalForms) {
  const jsonPath = path.join(__dirname, 'allPokemon.json');
  
  let existingData = { pokemon: [] };
  
  if (fs.existsSync(jsonPath)) {
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    existingData = JSON.parse(fileContent);
  }
  
  // 기존 리전폼 제거 (중복 방지)
  existingData.pokemon = existingData.pokemon.filter(p => !p.isRegionalForm);
  
  // 새 리전폼 추가
  existingData.pokemon.push(...regionalForms);
  
  // 번호순 정렬 (displayNumber 기준, 같으면 number 기준)
  existingData.pokemon.sort((a, b) => {
    const aDisplay = a.displayNumber || a.originalNumber || a.number;
    const bDisplay = b.displayNumber || b.originalNumber || b.number;
    
    if (aDisplay !== bDisplay) return aDisplay - bDisplay;
    return a.number - b.number;
  });
  
  // 파일 저장
  fs.writeFileSync(jsonPath, JSON.stringify(existingData, null, 2), 'utf8');
  console.log(`\n✅ ${jsonPath} 파일에 리전폼 ${regionalForms.length}개가 추가되었습니다!`);
}

// 메인 실행
async function main() {
  console.log('🌍 리전폼 포켓몬 수집 스크립트 시작!\n');
  console.log(`📊 총 ${REGIONAL_FORM_IDS.length}개의 리전폼을 수집합니다...\n`);
  
  const regionalForms = await fetchAllRegionalForms();
  
  console.log(`\n✅ 총 ${regionalForms.length}개 리전폼 수집 완료!\n`);
  
  await addToAllPokemonJson(regionalForms);
  
  console.log('\n🎉 모든 작업이 완료되었습니다!');
  console.log('\n📝 수집된 리전폼 목록:');
  regionalForms.forEach(p => {
    console.log(`  - ${p.name} (${p.formVariant})`);
  });
}

main().catch(error => {
  console.error('❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});