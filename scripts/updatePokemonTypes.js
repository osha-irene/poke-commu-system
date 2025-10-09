const fs = require('fs');
const https = require('https');

// HTTPS GET 요청 헬퍼 함수
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
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

// 타입 이름을 한글로 변환
const TYPE_MAP = {
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

async function updatePokemonTypes() {
  console.log('포켓몬 타입 정보 업데이트 중...\n');

  try {
    // 1. 기존 pokemon.json 읽기
    const pokemonJson = JSON.parse(fs.readFileSync('src/data/pokemon.json', 'utf8'));
    const pokemons = pokemonJson.pokemon;

    console.log(`총 ${pokemons.length}마리의 포켓몬 처리 중...\n`);

    // 2. 각 포켓몬의 타입 정보 가져오기
    for (let i = 0; i < pokemons.length; i++) {
      const pokemon = pokemons[i];
      
      try {
        // PokeAPI에서 상세 정보 가져오기
        const pokemonData = await fetchJSON(`https://pokeapi.co/api/v2/pokemon/${pokemon.number}`);
        
        // 타입 정보 추출
        const types = pokemonData.types.map(t => TYPE_MAP[t.type.name] || t.type.name);
        
        // 타입 업데이트
        pokemon.type = types[0]; // 첫 번째 타입
        if (types[1]) {
          pokemon.type2 = types[1]; // 두 번째 타입 (있는 경우)
        }
        
        console.log(`✓ No.${pokemon.number} ${pokemon.name}: ${types.join('/')}`);
        
        // API 과부하 방지
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`✗ No.${pokemon.number} ${pokemon.name} 실패:`, error.message);
      }
    }

    // 3. 업데이트된 데이터 저장
    fs.writeFileSync(
      'src/data/pokemon.json',
      JSON.stringify(pokemonJson, null, 2),
      'utf8'
    );

    console.log('\n✅ 완료! pokemon.json이 업데이트되었습니다.');
    
    // 통계 출력
    const dualTypes = pokemons.filter(p => p.type2).length;
    console.log(`\n📊 통계:`);
    console.log(`  - 단일 타입: ${pokemons.length - dualTypes}마리`);
    console.log(`  - 복합 타입: ${dualTypes}마리`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 스크립트 실행
updatePokemonTypes();