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

async function fetchAllTypes() {
  console.log('PokeAPI에서 타입 데이터 가져오는 중...\n');

  try {
    // 1. 전체 타입 목록 가져오기
    const listResponse = await fetchJSON('https://pokeapi.co/api/v2/type?limit=20');
    const typeUrls = listResponse.results.filter(type => 
      // stellar, unknown 제외
      type.name !== 'stellar' && type.name !== 'unknown'
    );
    
    console.log(`총 ${typeUrls.length}개의 타입 발견\n`);

    const types = [];
    
    // 2. 각 타입 상세 정보 가져오기
    for (let i = 0; i < typeUrls.length; i++) {
      const typeUrl = typeUrls[i].url;
      
      try {
        const typeData = await fetchJSON(typeUrl);
        
        // 영어, 한국어, 일본어 이름 찾기
        const englishName = typeData.names.find(n => n.language.name === 'en');
        const koreanName = typeData.names.find(n => n.language.name === 'ko');
        const japaneseName = typeData.names.find(n => n.language.name === 'ja');
        
        const type = {
          id: typeData.id,
          name: typeData.name, // 영어 소문자 (API 기본)
          nameEn: englishName?.name || typeData.name,
          nameKo: koreanName?.name || typeData.name,
          nameJa: japaneseName?.name || typeData.name,
          imageUrl: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/types/generation-viii/sword-shield/${typeData.name}.png`
        };
        
        types.push(type);
        
        console.log(`✓ ${type.nameKo} (${type.nameEn})`);
        
      } catch (error) {
        console.error(`타입 ${typeUrl} 가져오기 실패:`, error.message);
      }
    }

    // 3. JSON 파일로 저장
    const output = {
      types: types.sort((a, b) => a.id - b.id),
      totalCount: types.length,
      fetchedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      'src/data/types.json',
      JSON.stringify(output, null, 2),
      'utf8'
    );

    console.log(`\n✅ 완료! ${types.length}개의 타입 데이터를 src/data/types.json에 저장했습니다.`);
    
    // 타입 목록 출력
    console.log('\n📊 타입 목록:');
    types.forEach(type => {
      console.log(`  ${type.id}. ${type.nameKo} (${type.nameEn}) - ${type.name}`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 스크립트 실행
fetchAllTypes();