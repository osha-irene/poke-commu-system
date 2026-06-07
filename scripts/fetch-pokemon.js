// PokeAPI에서 모든 포켓몬 데이터 가져오기 스크립트
// Node.js 환경에서 실행: node fetch-pokemon.js
// 필요: npm install axios

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'src', 'data', 'allPokemon.json');
const BACKUP_FILE = path.join(__dirname, 'src', 'data', 'allPokemon.backup.json');

// 타입 매핑 (영문 → 한글)
const TYPE_MAP = {
  'normal': '노말', 'fire': '불꽃', 'water': '물', 'electric': '전기',
  'grass': '풀', 'ice': '얼음', 'fighting': '격투', 'poison': '독',
  'ground': '땅', 'flying': '비행', 'psychic': '에스퍼', 'bug': '벌레',
  'rock': '바위', 'ghost': '고스트', 'dragon': '드래곤', 'dark': '악',
  'steel': '강철', 'fairy': '페어리'
};

// 알그룹 매핑 (영문 → 한글)
const EGG_GROUP_MAP = {
  'monster': '괴수', 'water1': '수중1', 'water2': '수중2', 'water3': '수중3',
  'bug': '벌레', 'flying': '비행', 'field': '육상', 'fairy': '요정',
  'grass': '식물', 'human-like': '인간형', 'mineral': '광물',
  'amorphous': '부정형', 'ditto': '메타몽', 'dragon': '드래곤',
  'undiscovered': '미발견', 'no-eggs': '알미발견'
};

// 특성 매핑 (영문 → 한글) - 전체
const ABILITY_MAP = {
  'adaptability': '적응력', 'aerilate': '스카이스킨', 'aftermath': '유폭',
  'air-lock': '에어록', 'analytic': '애널라이즈', 'anger-point': '분노의경지',
  'anger-shell': '분노의껍질', 'anticipation': '위험예지', 'arena-trap': '개미지옥',
  'armor-tail': '아머테일', 'aroma-veil': '아로마베일', 'as-one-glastrier': '혼연일체',
  'as-one-spectrier': '혼연일체', 'aura-break': '오라브레이크', 'bad-dreams': '나이트메어',
  'ball-fetch': '볼가져오기', 'battery': '배터리', 'battle-armor': '전투무장',
  'battle-bond': '유대변화', 'beads-of-ruin': '재앙의구슬', 'beast-boost': '비스트부스트',
  'berserk': '분노폭발', 'big-pecks': '부풀린가슴', 'blaze': '맹화',
  'bulletproof': '방탄', 'cheek-pouch': '볼주머니', 'chilling-neigh': '백의울음',
  'chlorophyll': '엽록소', 'clear-body': '클리어바디', 'cloud-nine': '날씨부정',
  'color-change': '변색', 'comatose': '절대안깸', 'commander': '사령탑',
  'competitive': '승기', 'compound-eyes': '복안', 'contrary': '심술꾸러기',
  'corrosion': '부식', 'costar': '조연', 'cotton-down': '솜털',
  'cud-chew': '되새김질', 'curious-medicine': '기묘한약', 'cursed-body': '저주받은바디',
  'cute-charm': '헤롱헤롱바디', 'damp': '습기', 'dancer': '무희',
  'dark-aura': '다크오라', 'dauntless-shield': '불굴의방패', 'dazzling': '비비드바디',
  'defeatist': '무기력', 'defiant': '오기', 'delta-stream': '델타스트림',
  'desolate-land': '끝의대지', 'disguise': '탈을쓴모습', 'download': '다운로드',
  'dragons-maw': '용의턱', 'drizzle': '잔비', 'drought': '가뭄',
  'dry-skin': '건조피부', 'early-bird': '일찍기상', 'earth-eater': '땅먹기',
  'effect-spore': '포자', 'electric-surge': '일렉트릭메이커', 'electromorphosis': '전기전환',
  'emergency-exit': '위기회피', 'fairy-aura': '페어리오라', 'filter': '필터',
  'flame-body': '불꽃몸', 'flare-boost': '열폭주', 'flash-fire': '타오르는불꽃',
  'flower-gift': '플라워기프트', 'flower-veil': '플라워베일', 'fluffy': '복슬복슬',
  'forecast': '기분파', 'forewarn': '예지몽', 'friend-guard': '프렌드가드',
  'frisk': '통찰', 'full-metal-body': '메탈프로텍트', 'fur-coat': '퍼코트',
  'gale-wings': '질풍날개', 'galvanize': '일렉트릭스킨', 'gluttony': '먹보',
  'good-as-gold': '황금몸', 'gooey': '미끌미끌', 'gorilla-tactics': '무아지경',
  'grass-pelt': '그래스메이커', 'grassy-surge': '그래스메이커', 'grim-neigh': '흑의울음',
  'guard-dog': '번견', 'gulp-missile': '꿀꺽미사일', 'guts': '근성',
  'hadron-engine': '하드론엔진', 'harvest': '수확', 'healer': '치유의마음',
  'heatproof': '내열', 'heavy-metal': '헤비메탈', 'honey-gather': '꿀모으기',
  'huge-power': '천하장사', 'hunger-switch': '배고픔스위치', 'hustle': '의욕',
  'hydration': '촉촉바디', 'hyper-cutter': '괴력집게', 'ice-body': '아이스바디',
  'ice-face': '아이스페이스', 'ice-scales': '얼음인분', 'illuminate': '발광',
  'illusion': '일루전', 'immunity': '면역', 'imposter': '괴짜',
  'infiltrator': '틈새포착', 'innards-out': '내용물', 'inner-focus': '정신력',
  'insomnia': '불면', 'intimidate': '위협', 'intrepid-sword': '불굴의검',
  'iron-barbs': '철가시', 'iron-fist': '철주먹', 'justified': '정의의마음',
  'keen-eye': '날카로운눈', 'klutz': '서투름', 'leaf-guard': '리프가드',
  'levitate': '부유', 'libero': '리베로', 'light-metal': '라이트메탈',
  'lightning-rod': '피뢰침', 'limber': '유연', 'lingering-aroma': '그윽한향기',
  'liquid-ooze': '해감액', 'liquid-voice': '촉촉보이스', 'long-reach': '원격',
  'magic-bounce': '매직미러', 'magic-guard': '매직가드', 'magician': '마술사',
  'magma-armor': '마그마의무장', 'magnet-pull': '자력', 'marvel-scale': '이상한비늘',
  'mega-launcher': '메가런처', 'merciless': '무자비', 'mimicry': '의태',
  'minus': '마이너스', 'mirror-armor': '미러아머', 'misty-surge': '미스트메이커',
  'mold-breaker': '틀깨기', 'moody': '변덕쟁이', 'motor-drive': '전기엔진',
  'moxie': '자신감', 'multiscale': '멀티스케일', 'multitype': '멀티타입',
  'mummy': '미라', 'mycelium-might': '균사의힘', 'natural-cure': '자연회복',
  'neuroforce': '뇌포스', 'neutralizing-gas': '화학변화가스', 'no-guard': '노가드',
  'normalize': '노말스킨', 'oblivious': '둔감', 'opportunist': '편승',
  'orichalcum-pulse': '오리하르곤펄스', 'overcoat': '방진', 'overgrow': '심록',
  'own-tempo': '마이페이스', 'parental-bond': '부자유친', 'pastel-veil': '파스텔베일',
  'perish-body': '멸망의바디', 'pickpocket': '나쁜손버릇', 'pickup': '픽업',
  'pixilate': '페어리스킨', 'plus': '플러스', 'poison-heal': '포이즌힐',
  'poison-point': '독침', 'poison-puppeteer': '독사술', 'poison-touch': '독수',
  'power-construct': '스웜체인지', 'power-of-alchemy': '화학의힘', 'power-spot': '파워스폿',
  'prankster': '짓궂은마음', 'pressure': '프레셔', 'primordial-sea': '시작의바다',
  'prism-armor': '프리즘아머', 'propeller-tail': '스크류테일', 'protean': '변환자재',
  'protosynthesis': '고대활성', 'psychic-surge': '사이코메이커', 'punk-rock': '펑크록',
  'pure-power': '순수한힘', 'purifying-salt': '정화의소금', 'quark-drive': '쿼크차지',
  'queenly-majesty': '여왕의위엄', 'quick-draw': '퀵드로우', 'quick-feet': '속보',
  'rain-dish': '젖은접시', 'rattled': '주눅', 'receiver': '리시버',
  'reckless': '이판사판', 'refrigerate': '프리즈스킨', 'regenerator': '재생력',
  'ripen': '숙성', 'rivalry': '투쟁심', 'rks-system': 'AR시스템',
  'rock-head': '돌머리', 'rocky-payload': '암석운반', 'rough-skin': '까칠한피부',
  'run-away': '도주', 'sand-force': '모래의힘', 'sand-rush': '모래헤치기',
  'sand-spit': '모래뿜기', 'sand-stream': '모래날림', 'sand-veil': '모래숨기',
  'sap-sipper': '초식', 'schooling': '어군', 'scrappy': '배짱',
  'screen-cleaner': '배리어프리', 'seed-sower': '씨뿌리기', 'serene-grace': '하늘의은총',
  'shadow-shield': '섀도실드', 'shadow-tag': '그림자밟기', 'shed-skin': '탈피',
  'sheer-force': '우격다짐', 'shell-armor': '조개껍질', 'shield-dust': '인분',
  'shields-down': '리밋실드', 'simple': '단순', 'skill-link': '스킬링크',
  'slow-start': '슬로스타트', 'slush-rush': '슬러시러시', 'sniper': '스나이퍼',
  'snow-cloak': '눈숨기', 'snow-warning': '눈퍼뜨리기', 'solar-power': '선파워',
  'solid-rock': '하드록', 'soul-heart': '소울하트', 'soundproof': '방음',
  'speed-boost': '가속', 'stakeout': '잠복', 'stall': '최후의선택',
  'stalwart': '일직선', 'stamina': '지구력', 'stance-change': '배틀스위치',
  'static': '정전기', 'steadfast': '불굴의마음', 'steam-engine': '증기기관',
  'steelworker': '강철사용자', 'steely-spirit': '강철정신', 'stench': '악취',
  'sticky-hold': '점착', 'storm-drain': '마중물', 'strong-jaw': '옹골찬턱',
  'sturdy': '옹골참', 'suction-cups': '흡반', 'super-luck': '행운',
  'supreme-overlord': '총대장', 'surge-surfer': '서핑테일', 'swarm': '벌레의알림',
  'sweet-veil': '스위트베일', 'swift-swim': '쓱쓱', 'sword-of-ruin': '재앙의검',
  'symbiosis': '공생', 'synchronize': '싱크로', 'tablets-of-ruin': '재앙의목간',
  'tangled-feet': '위기회피', 'tangling-hair': '컬리헤어', 'technician': '테크니션',
  'telepathy': '텔레파시', 'teravolt': '테라볼트', 'thermal-exchange': '열교환',
  'thick-fat': '두꺼운지방', 'tinted-lens': '색안경', 'torrent': '급류',
  'tough-claws': '단단한발톱', 'toxic-boost': '독폭주', 'toxic-chain': '독사슬',
  'toxic-debris': '독치장', 'trace': '트레이스', 'transistor': '트랜지스터',
  'triage': '힐링시프트', 'truant': '게으름', 'turboblaze': '터보블레이즈',
  'unaware': '천진', 'unburden': '곡예', 'unnerve': '긴장감',
  'unseen-fist': '보이지않는주먹', 'vessel-of-ruin': '재앙의그릇', 'victory-star': '승리의별',
  'vital-spirit': '의기양양', 'volt-absorb': '축전', 'wandering-spirit': '떠도는영혼',
  'water-absorb': '저수', 'water-bubble': '수포', 'water-compaction': '물다지기',
  'water-veil': '수의베일', 'weak-armor': '약점보험', 'well-baked-body': '완성된몸',
  'white-smoke': '하얀연기', 'wimp-out': '도주', 'wind-power': '풍력발전',
  'wind-rider': '바람타기', 'wonder-guard': '불가사의부적', 'wonder-skin': '미라클스킨',
  'zen-mode': '달마모드', 'zero-to-hero': '마이티체인지'
};

// 지연 함수
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 한글 이름 가져오기
function getKoreanName(names) {
  const koreanName = names.find(n => n.language.name === 'ko');
  return koreanName ? koreanName.name : null;
}

// 포켓몬 데이터 가져오기
async function fetchPokemon(idOrName) {
  try {
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${idOrName}`);
    const speciesResponse = await axios.get(response.data.species.url);
    
    const data = response.data;
    const speciesData = speciesResponse.data;
    
    // 기본 정보
    const number = data.id;
    const nameEn = data.name;
    const nameKo = getKoreanName(speciesData.names) || nameEn;
    
    // 타입
    const types = data.types.map(t => t.type.name);
    const type1 = TYPE_MAP[types[0]] || types[0];
    const type2 = types[1] ? (TYPE_MAP[types[1]] || types[1]) : null;
    
    // 특성
    const abilities = data.abilities
      .filter(a => !a.is_hidden)
      .map(a => ABILITY_MAP[a.ability.name] || a.ability.name);
    const abilitiesEn = data.abilities
      .filter(a => !a.is_hidden)
      .map(a => a.ability.name);
    
    const hiddenAbility = data.abilities.find(a => a.is_hidden);
    const hiddenAbilityKo = hiddenAbility ? (ABILITY_MAP[hiddenAbility.ability.name] || hiddenAbility.ability.name) : null;
    const hiddenAbilityEn = hiddenAbility ? hiddenAbility.ability.name : null;
    
    // 스탯
    const stats = {};
    data.stats.forEach(s => {
      const statName = s.stat.name;
      if (statName === 'hp') stats.hp = s.base_stat;
      if (statName === 'attack') stats.attack = s.base_stat;
      if (statName === 'defense') stats.defense = s.base_stat;
      if (statName === 'speed') stats.speed = s.base_stat;
    });
    
    // 포획률
    const catchRate = (speciesData.capture_rate / 255).toFixed(2);
    
    // 세대
    const generation = parseInt(speciesData.generation.url.split('/').slice(-2)[0]);
    
    // 성별 비율
    const genderRate = speciesData.gender_rate;
    let genderRatio = { male: 0, female: 0 };
    if (genderRate === -1) {
      genderRatio = { male: 0, female: 0 };
    } else {
      genderRatio = {
        male: ((8 - genderRate) / 8) * 100,
        female: (genderRate / 8) * 100
      };
    }
    
    // 알그룹
    const eggGroups = speciesData.egg_groups.map(eg => EGG_GROUP_MAP[eg.name] || eg.name);
    const eggGroupsEn = speciesData.egg_groups.map(eg => eg.name);
    
    // 부화 걸음수
    const hatchSteps = speciesData.hatch_counter * 255;
    
    // 리전폼 체크
    const isRegionalForm = nameEn.includes('-alola') || nameEn.includes('-galar') || 
                           nameEn.includes('-hisui') || nameEn.includes('-paldea');
    let regionalForm = null;
    let originalNumber = number;
    
    if (isRegionalForm) {
      if (nameEn.includes('-alola')) regionalForm = 'alola';
      else if (nameEn.includes('-galar')) regionalForm = 'galar';
      else if (nameEn.includes('-hisui')) regionalForm = 'hisui';
      else if (nameEn.includes('-paldea')) regionalForm = 'paldea';
      
      const baseFormId = speciesData.varieties.find(v => v.is_default)?.pokemon.url.split('/').slice(-2)[0];
      if (baseFormId) originalNumber = parseInt(baseFormId);
    }
    
    // 이미지 URL
    const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${number}.png`;
    const shinySprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${number}.png`;
    
    return {
      id: number,
      number: number,
      originalNumber: isRegionalForm ? originalNumber : undefined,
      displayNumber: originalNumber,
      name: nameKo,
      nameEn: nameEn,
      type: type1,
      type2: type2,
      catchRate: catchRate,
      baseHp: stats.hp,
      baseAttack: stats.attack,
      baseDefense: stats.defense,
      baseSpeed: stats.speed,
      generation: generation,
      imageUrl: imageUrl,
      shinySprite: shinySprite,
      isShiny: false,
      genderRatio: genderRatio,
      height: data.height,
      weight: data.weight,
      abilities: abilities,
      abilitiesEn: abilitiesEn,
      hiddenAbility: hiddenAbilityKo,
      hiddenAbilityEn: hiddenAbilityEn,
      eggGroups: eggGroups,
      eggGroupsEn: eggGroupsEn,
      hatchSteps: hatchSteps,
      iconUrl: imageUrl,
      spriteUrl: imageUrl,
      isRegionalForm: isRegionalForm,
      regionalForm: regionalForm,
      formVariant: isRegionalForm ? nameEn : undefined
    };
    
  } catch (error) {
    console.error(`❌ ${idOrName} 실패:`, error.message);
    return null;
  }
}

// 메인 실행
async function main() {
  console.log('🔍 PokeAPI에서 포켓몬 데이터 가져오기 시작...\n');
  
  if (fs.existsSync(OUTPUT_FILE)) {
    console.log('💾 백업 중...');
    fs.copyFileSync(OUTPUT_FILE, BACKUP_FILE);
    console.log(`✅ 백업: ${BACKUP_FILE}\n`);
  }
  
  const allPokemon = [];
  
  console.log('📥 기본 포켓몬 (1~1025)');
  for (let i = 1; i <= 1025; i++) {
    process.stdout.write(`\r진행: ${i}/1025`);
    const pokemon = await fetchPokemon(i);
    if (pokemon) allPokemon.push(pokemon);
    await delay(100);
  }
  console.log('\n✅ 기본 완료\n');
  
  console.log('📥 알로라 폼...');
  const alolaForms = [
    'rattata-alola', 'raticate-alola', 'raichu-alola', 'sandshrew-alola', 
    'sandslash-alola', 'vulpix-alola', 'ninetales-alola', 'diglett-alola',
    'dugtrio-alola', 'meowth-alola', 'persian-alola', 'geodude-alola',
    'graveler-alola', 'golem-alola', 'grimer-alola', 'muk-alola',
    'exeggutor-alola', 'marowak-alola'
  ];
  
  for (const form of alolaForms) {
    const pokemon = await fetchPokemon(form);
    if (pokemon) {
      allPokemon.push(pokemon);
      console.log(`✅ ${pokemon.name}`);
    }
    await delay(100);
  }
  console.log('✅ 알로라 완료\n');
  
  console.log('📥 가라르 폼...');
  const galarForms = [
    'meowth-galar', 'ponyta-galar', 'rapidash-galar', 'slowpoke-galar',
    'slowbro-galar', 'farfetchd-galar', 'weezing-galar', 'mr-mime-galar',
    'articuno-galar', 'zapdos-galar', 'moltres-galar', 'slowking-galar',
    'corsola-galar', 'zigzagoon-galar', 'linoone-galar', 'darumaka-galar',
    'darmanitan-galar', 'yamask-galar', 'stunfisk-galar'
  ];
  
  for (const form of galarForms) {
    const pokemon = await fetchPokemon(form);
    if (pokemon) {
      allPokemon.push(pokemon);
      console.log(`✅ ${pokemon.name}`);
    }
    await delay(100);
  }
  console.log('✅ 가라르 완료\n');
  
  console.log('📥 히스이 폼...');
  const hisuiForms = [
    'growlithe-hisui', 'arcanine-hisui', 'voltorb-hisui', 'electrode-hisui',
    'typhlosion-hisui', 'qwilfish-hisui', 'sneasel-hisui', 'samurott-hisui',
    'lilligant-hisui', 'zorua-hisui', 'zoroark-hisui', 'braviary-hisui',
    'sliggoo-hisui', 'goodra-hisui', 'avalugg-hisui', 'decidueye-hisui'
  ];
  
  for (const form of hisuiForms) {
    const pokemon = await fetchPokemon(form);
    if (pokemon) {
      allPokemon.push(pokemon);
      console.log(`✅ ${pokemon.name}`);
    }
    await delay(100);
  }
  console.log('✅ 히스이 완료\n');
  
  console.log('📥 팔데아 폼...');
  const paldeaForms = [
    'tauros-paldea-combat-breed',
    'tauros-paldea-blaze-breed',
    'tauros-paldea-aqua-breed',
    'wooper-paldea'
  ];
  
  for (const form of paldeaForms) {
    const pokemon = await fetchPokemon(form);
    if (pokemon) {
      allPokemon.push(pokemon);
      console.log(`✅ ${pokemon.name}`);
    }
    await delay(100);
  }
  console.log('✅ 팔데아 완료\n');
  
  console.log('💾 저장 중...');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allPokemon, null, 2), 'utf8');
  console.log(`✅ 완료: ${OUTPUT_FILE}`);
  console.log(`📊 총 ${allPokemon.length}개 포켓몬\n`);
  console.log('🎉 완료!');
}

main().catch(console.error);