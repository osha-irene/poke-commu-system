// addRegionalForms.js
// 실행: node addRegionalForms.js

const fs = require('fs');
const path = require('path');
const https = require('https');

function fetchFromPokeAPI(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

const typeKorean = {
  'normal': '노말', 'fire': '불꽃', 'water': '물', 'electric': '전기',
  'grass': '풀', 'ice': '얼음', 'fighting': '격투', 'poison': '독',
  'ground': '땅', 'flying': '비행', 'psychic': '에스퍼', 'bug': '벌레',
  'rock': '바위', 'ghost': '고스트', 'dragon': '드래곤', 'dark': '악',
  'steel': '강철', 'fairy': '페어리'
};

const abilityKorean = {
  'stench': '악취', 'drizzle': '잔비', 'speed-boost': '가속', 'battle-armor': '전투무장',
  'sturdy': '옹골참', 'damp': '습기', 'limber': '유연', 'sand-veil': '모래숨기',
  'static': '정전기', 'volt-absorb': '축전', 'water-absorb': '저수', 'oblivious': '둔감',
  'cloud-nine': '날씨부정', 'compound-eyes': '복안', 'insomnia': '불면', 'color-change': '변색',
  'immunity': '면역', 'flash-fire': '타오르는불꽃', 'shield-dust': '인분', 'own-tempo': '마이페이스',
  'suction-cups': '흡반', 'intimidate': '위협', 'shadow-tag': '그림자밟기', 'rough-skin': '까칠한피부',
  'wonder-guard': '불가사의부적', 'levitate': '부유', 'effect-spore': '포자', 'synchronize': '싱크로',
  'clear-body': '클리어바디', 'natural-cure': '자연회복', 'lightning-rod': '피뢰침', 'serene-grace': '하늘의은총',
  'swift-swim': '쓱쓱', 'chlorophyll': '엽록소', 'illuminate': '발광', 'trace': '트레이스',
  'huge-power': '천하장사', 'poison-point': '독침', 'inner-focus': '정신력', 'magma-armor': '마그마의무장',
  'water-veil': '수의베일', 'magnet-pull': '자력', 'soundproof': '방음', 'rain-dish': '젖은접시',
  'sand-stream': '모래날림', 'pressure': '프레셔', 'thick-fat': '두꺼운지방', 'early-bird': '일찍기상',
  'flame-body': '불꽃몸', 'run-away': '도주', 'keen-eye': '날카로운눈', 'hyper-cutter': '괴력집게',
  'pickup': '픽업', 'truant': '게으름', 'hustle': '의욕', 'cute-charm': '헤롱헤롱바디',
  'plus': '플러스', 'minus': '마이너스', 'forecast': '기분파', 'sticky-hold': '점착',
  'shed-skin': '탈피', 'guts': '근성', 'marvel-scale': '이상한비늘', 'liquid-ooze': '해감액',
  'overgrow': '심록', 'blaze': '맹화', 'torrent': '급류', 'swarm': '벌레의알림',
  'rock-head': '돌머리', 'drought': '가뭄', 'arena-trap': '개미지옥', 'vital-spirit': '의기양양',
  'white-smoke': '하얀연기', 'pure-power': '순수한힘', 'shell-armor': '조가비갑옷', 'air-lock': '에어록',
  'tangled-feet': '위기회피', 'motor-drive': '전기엔진', 'rivalry': '투쟁심', 'steadfast': '불굴의마음',
  'snow-cloak': '눈숨기', 'gluttony': '먹보', 'anger-point': '분노의경혈', 'unburden': '곡예',
  'heatproof': '내열', 'simple': '단순', 'dry-skin': '건조피부', 'download': '다운로드',
  'iron-fist': '철주먹', 'poison-heal': '포이즌힐', 'adaptability': '적응력', 'skill-link': '스킬링크',
  'hydration': '촉촉바디', 'solar-power': '선파워', 'quick-feet': '속보', 'normalize': '노말스킨',
  'sniper': '스나이퍼', 'magic-guard': '매직가드', 'no-guard': '노가드', 'stall': '시간끌기',
  'technician': '테크니션', 'leaf-guard': '리프가드', 'klutz': '서투름', 'mold-breaker': '틀깨기',
  'super-luck': '대운', 'aftermath': '유폭', 'anticipation': '위험예지', 'forewarn': '예지몽',
  'unaware': '천연', 'tinted-lens': '색안경', 'filter': '필터', 'slow-start': '슬로스타트',
  'scrappy': '배짱', 'storm-drain': '마중물', 'ice-body': '아이스바디', 'solid-rock': '하드록',
  'snow-warning': '눈퍼뜨리기', 'honey-gather': '꿀모으기', 'frisk': '통찰', 'reckless': '이판사판',
  'multitype': '멀티타입', 'flower-gift': '플라워기프트', 'bad-dreams': '나이트메어', 'pickpocket': '나쁜손버릇',
  'sheer-force': '우격다짐', 'contrary': '심술꾸러기', 'unnerve': '긴장감', 'defiant': '오기',
  'defeatist': '무기력', 'cursed-body': '저주받은바디', 'healer': '치유의마음', 'friend-guard': '프렌드가드',
  'weak-armor': '깨어진갑옷', 'heavy-metal': '헤비메탈', 'light-metal': '라이트메탈', 'multiscale': '멀티스케일',
  'toxic-boost': '독폭주', 'flare-boost': '타오르는불꽃', 'harvest': '수확', 'telepathy': '텔레파시',
  'moody': '변덕쟁이', 'overcoat': '방진', 'poison-touch': '독수', 'regenerator': '재생력',
  'big-pecks': '부풀린가슴', 'sand-rush': '모래헤치기', 'wonder-skin': '미라클스킨', 'analytic': '애널라이즈',
  'illusion': '일루전', 'imposter': '괴짜', 'infiltrator': '틈새포착', 'mummy': '미라',
  'moxie': '자신감', 'justified': '정의의마음', 'rattled': '주눅', 'magic-bounce': '매직미러',
  'sap-sipper': '초식', 'prankster': '짓궂은마음', 'sand-force': '모래의힘', 'iron-barbs': '철가시',
  'zen-mode': '달마모드', 'victory-star': '승리의별', 'turboblaze': '터보블레이즈', 'teravolt': '테라볼티지',
  'surge-surfer': '서프테일', 'tangling-hair': '얽히는머리카락', 'slush-rush': '슬러시러시',
  'long-reach': '원격', 'galvanize': '일렉트릭스킨', 'steelworker': '강철정신', 'berserk': '폭주',
  'neutralizing-gas': '화학변화가스', 'pastel-veil': '파스텔베일', 'grim-neigh': '흑의울음',
  'chilling-neigh': '백의울음', 'unseen-fist': '보이지않는주먹', 'curious-medicine': '이상한약',
  'quick-draw': '퀵드로우', 'cud-chew': '되새김질'
};

const regionalFormsConfig = {
  alola: [
    { formName: 'rattata-alola', original: 19, name: '꼬렛', id: 10091 },
    { formName: 'raticate-alola', original: 20, name: '레트라', id: 10092 },
    { formName: 'raichu-alola', original: 26, name: '라이츄', id: 10100 },
    { formName: 'sandshrew-alola', original: 27, name: '모래두지', id: 10105 },
    { formName: 'sandslash-alola', original: 28, name: '고지', id: 10106 },
    { formName: 'vulpix-alola', original: 37, name: '식스테일', id: 10103 },
    { formName: 'ninetales-alola', original: 38, name: '나인테일', id: 10104 },
    { formName: 'diglett-alola', original: 50, name: '디그다', id: 10107 },
    { formName: 'dugtrio-alola', original: 51, name: '닥트리오', id: 10108 },
    { formName: 'meowth-alola', original: 52, name: '나옹', id: 10109 },
    { formName: 'persian-alola', original: 53, name: '페르시온', id: 10110 },
    { formName: 'geodude-alola', original: 74, name: '꼬마돌', id: 10111 },
    { formName: 'graveler-alola', original: 75, name: '데구리', id: 10112 },
    { formName: 'golem-alola', original: 76, name: '딱구리', id: 10113 },
    { formName: 'grimer-alola', original: 88, name: '질퍽이', id: 10114 },
    { formName: 'muk-alola', original: 89, name: '질뻐기', id: 10115 },
    { formName: 'exeggutor-alola', original: 103, name: '나시', id: 10116 },
    { formName: 'marowak-alola', original: 105, name: '텅구리', id: 10117 },
  ],
  galar: [
    { formName: 'meowth-galar', original: 52, name: '나옹', id: 10118 },
    { formName: 'ponyta-galar', original: 77, name: '포니타', id: 10119 },
    { formName: 'rapidash-galar', original: 78, name: '날쌩마', id: 10120 },
    { formName: 'slowpoke-galar', original: 79, name: '야돈', id: 10121 },
    { formName: 'slowbro-galar', original: 80, name: '야도란', id: 10122 },
    { formName: 'farfetchd-galar', original: 83, name: '파오리', id: 10123 },
    { formName: 'weezing-galar', original: 110, name: '또도가스', id: 10124 },
    { formName: 'mr-mime-galar', original: 122, name: '마임맨', id: 10125 },
    { formName: 'articuno-galar', original: 144, name: '프리져', id: 10126 },
    { formName: 'zapdos-galar', original: 145, name: '썬더', id: 10127 },
    { formName: 'moltres-galar', original: 146, name: '파이어', id: 10128 },
    { formName: 'slowking-galar', original: 199, name: '야도킹', id: 10129 },
    { formName: 'corsola-galar', original: 222, name: '코산호', id: 10130 },
    { formName: 'zigzagoon-galar', original: 263, name: '지그제구리', id: 10131 },
    { formName: 'linoone-galar', original: 264, name: '직구리', id: 10132 },
    { formName: 'darumaka-galar', original: 554, name: '달막화', id: 10133 },
    { formName: 'darmanitan-standard-galar', original: 555, name: '불비달마', id: 10134 },
    { formName: 'yamask-galar', original: 562, name: '데스마스', id: 10135 },
    { formName: 'stunfisk-galar', original: 618, name: '메더', id: 10136 },
  ],
  hisui: [
    { formName: 'growlithe-hisui', original: 58, name: '가디', id: 10137 },
    { formName: 'arcanine-hisui', original: 59, name: '윈디', id: 10138 },
    { formName: 'voltorb-hisui', original: 100, name: '찌리리공', id: 10139 },
    { formName: 'electrode-hisui', original: 101, name: '붐볼', id: 10140 },
    { formName: 'typhlosion-hisui', original: 157, name: '블레이범', id: 10141 },
    { formName: 'qwilfish-hisui', original: 211, name: '침바루', id: 10142 },
    { formName: 'sneasel-hisui', original: 215, name: '포푸니', id: 10143 },
    { formName: 'samurott-hisui', original: 503, name: '대검귀', id: 10144 },
    { formName: 'lilligant-hisui', original: 549, name: '드레디어', id: 10145 },
    { formName: 'zorua-hisui', original: 570, name: '조로아', id: 10146 },
    { formName: 'zoroark-hisui', original: 571, name: '조로아크', id: 10147 },
    { formName: 'braviary-hisui', original: 628, name: '워글', id: 10148 },
    { formName: 'sliggoo-hisui', original: 704, name: '미끄메라', id: 10149 },
    { formName: 'goodra-hisui', original: 705, name: '미끄래곤', id: 10150 },
    { formName: 'avalugg-hisui', original: 713, name: '크레베이스', id: 10151 },
    { formName: 'decidueye-hisui', original: 724, name: '모크나이퍼', id: 10152 },
  ],
  paldea: [
    { formName: 'wooper-paldea', original: 194, name: '우파', id: 10153 },
    { formName: 'tauros-paldea-combat-breed', original: 128, name: '켄타로스', suffix: ' (투쟁종)', id: 10167 },
    { formName: 'tauros-paldea-blaze-breed', original: 128, name: '켄타로스', suffix: ' (화염종)', id: 10168 },
    { formName: 'tauros-paldea-aqua-breed', original: 128, name: '켄타로스', suffix: ' (수련종)', id: 10169 },
  ]
};

async function fetchPokemonData(formName) {
  try {
    const data = await fetchFromPokeAPI(`https://pokeapi.co/api/v2/pokemon/${formName}`);
    const species = await fetchFromPokeAPI(data.species.url);
    
    const types = data.types.map(t => typeKorean[t.type.name] || t.type.name);
    const abilities = data.abilities
      .filter(a => !a.is_hidden)
      .map(a => abilityKorean[a.ability.name] || a.ability.name);
    const hiddenAbility = data.abilities.find(a => a.is_hidden);
    
    const stats = {};
    data.stats.forEach(s => {
      const statName = s.stat.name;
      if (statName === 'hp') stats.baseHp = s.base_stat;
      if (statName === 'attack') stats.baseAttack = s.base_stat;
      if (statName === 'defense') stats.baseDefense = s.base_stat;
      if (statName === 'speed') stats.baseSpeed = s.base_stat;
    });
    
    const genderRate = species.gender_rate;
    const genderRatio = genderRate === -1 
      ? { male: 0, female: 0 }
      : { male: 100 - (genderRate * 12.5), female: genderRate * 12.5 };
    
    return {
      ...stats,
      types,
      abilities,
      abilitiesEn: data.abilities.filter(a => !a.is_hidden).map(a => a.ability.name),
      hiddenAbility: hiddenAbility ? (abilityKorean[hiddenAbility.ability.name] || hiddenAbility.ability.name) : null,
      hiddenAbilityEn: hiddenAbility ? hiddenAbility.ability.name : null,
      genderRatio,
      height: data.height,
      weight: data.weight,
      catchRate: (species.capture_rate / 255).toFixed(2),
      sprites: data.sprites
    };
  } catch (error) {
    console.error(`❌ ${formName} 데이터 가져오기 실패:`, error.message);
    return null;
  }
}

async function generateRegionalForms() {
  console.log('🌍 리전폼 데이터 생성 시작...\n');
  const results = [];
  
  for (const [region, forms] of Object.entries(regionalFormsConfig)) {
    const regionNameKo = region === 'alola' ? '알로라' : 
                        region === 'galar' ? '가라르' : 
                        region === 'hisui' ? '히스이' : '팔데아';
    
    console.log(`📍 ${regionNameKo} 리전폼 처리 중...`);
    
    for (const form of forms) {
      console.log(`  - ${form.name} (${form.formName})`);
      
      const pokemonData = await fetchPokemonData(form.formName);
      
      if (!pokemonData) {
        console.log(`    ⚠️ 건너뜀\n`);
        continue;
      }
      
      const regionalPokemon = {
        id: form.id,
        number: form.id,
        originalNumber: form.original,
        displayNumber: form.original,
        name: `${form.name} (${regionNameKo})${form.suffix || ''}`,
        nameEn: form.formName,
        type: pokemonData.types[0],
        type2: pokemonData.types[1] || null,
        catchRate: pokemonData.catchRate,
        baseHp: pokemonData.baseHp,
        baseAttack: pokemonData.baseAttack,
        baseDefense: pokemonData.baseDefense,
        baseSpeed: pokemonData.baseSpeed,
        generation: 1,
        imageUrl: pokemonData.sprites.front_default,
        shinySprite: pokemonData.sprites.front_shiny,
        isShiny: false,
        genderRatio: pokemonData.genderRatio,
        height: pokemonData.height,
        weight: pokemonData.weight,
        abilities: pokemonData.abilities,
        abilitiesEn: pokemonData.abilitiesEn,
        hiddenAbility: pokemonData.hiddenAbility,
        hiddenAbilityEn: pokemonData.hiddenAbilityEn,
        iconUrl: pokemonData.sprites.front_default,
        spriteUrl: pokemonData.sprites.front_default,
        isRegionalForm: true,
        regionalForm: region,
        formVariant: form.formName
      };
      
      results.push(regionalPokemon);
      console.log(`    ✅ 완료\n`);
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

async function addToAllPokemonJson() {
  const filePath = path.join(__dirname, 'src', 'data', 'allPokemon.json');
  
  console.log('\n📂 파일 경로:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ allPokemon.json 파일을 찾을 수 없습니다!');
    return;
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    if (!data.pokemon || !Array.isArray(data.pokemon)) {
      console.error('❌ pokemon 배열을 찾을 수 없습니다!');
      return;
    }
    
    const originalCount = data.pokemon.length;
    console.log(`📊 기존 포켓몬 수: ${originalCount}마리`);
    
    // 기존 리전폼 제거
    console.log('\n🗑️  기존 리전폼 제거 중...');
    const existingRegionalIds = new Set();
    Object.values(regionalFormsConfig).flat().forEach(form => {
      existingRegionalIds.add(form.id);
    });
    
    data.pokemon = data.pokemon.filter(p => !existingRegionalIds.has(p.id));
    const afterRemoval = data.pokemon.length;
    console.log(`   제거된 포켓몬: ${originalCount - afterRemoval}마리`);
    console.log(`   남은 포켓몬: ${afterRemoval}마리`);
    
    const newRegionalForms = await generateRegionalForms();
    
    const backupPath = filePath.replace('.json', '.backup.json');
    fs.writeFileSync(backupPath, fileContent);
    console.log(`\n💾 백업 생성: ${backupPath}`);
    
    data.pokemon = [...data.pokemon, ...newRegionalForms];
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`\n✅ ${newRegionalForms.length}개의 리전폼 추가 완료!`);
    console.log(`📊 총 포켓몬 수: ${data.pokemon.length}마리`);
    
    console.log('\n📋 추가된 리전폼:');
    newRegionalForms.forEach(rf => {
      console.log(`  - ${rf.name} (ID: ${rf.id}, 타입: ${rf.type}${rf.type2 ? '/'+rf.type2 : ''})`);
    });
    
  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error(error.stack);
  }
}

console.log('🚀 리전폼 자동 추가 스크립트 시작\n');
addToAllPokemonJson().then(() => {
  console.log('\n✨ 완료!');
});