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

// 딜레이 함수 (API 과부하 방지)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAllItems() {
  console.log('PokeAPI에서 아이템 데이터 가져오는 중...\n');

  try {
    // 1. 전체 아이템 목록 가져오기 (2000개 제한)
    const listResponse = await fetchJSON('https://pokeapi.co/api/v2/item?limit=2000');
    const itemUrls = listResponse.results;
    
    console.log(`총 ${itemUrls.length}개의 아이템 발견\n`);

    const items = [];
    
    // 2. 각 아이템 상세 정보 가져오기
    for (let i = 0; i < itemUrls.length; i++) {
      const itemUrl = itemUrls[i].url;
      
      try {
        const itemData = await fetchJSON(itemUrl);
        
        // 영어 이름과 설명 찾기
        const englishName = itemData.names.find(n => n.language.name === 'en');
        const koreanName = itemData.names.find(n => n.language.name === 'ko');
        const englishEffect = itemData.effect_entries.find(e => e.language.name === 'en');
        const koreanEffect = itemData.flavor_text_entries.find(e => e.language.name === 'ko');
        
        const item = {
          id: itemData.id,
          name: koreanName?.name || englishName?.name || itemData.name,
          nameEn: englishName?.name || itemData.name,
          category: itemData.category.name,
          cost: itemData.cost,
          effect: koreanEffect?.text || englishEffect?.effect || englishEffect?.short_effect || '',
          spriteUrl: itemData.sprites.default,
          attributes: itemData.attributes.map(attr => attr.name)
        };
        
        items.push(item);
        
        // 진행상황 출력
        if ((i + 1) % 50 === 0) {
          console.log(`진행중... ${i + 1}/${itemUrls.length}`);
        }
        
        // API 과부하 방지를 위한 딜레이
        await delay(100);
        
      } catch (error) {
        console.error(`아이템 ${itemUrl} 가져오기 실패:`, error.message);
      }
    }

    // 3. JSON 파일로 저장
    const output = {
      items: items.sort((a, b) => a.id - b.id),
      totalCount: items.length,
      fetchedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      'src/data/items.json',
      JSON.stringify(output, null, 2),
      'utf8'
    );

    console.log(`\n✅ 완료! ${items.length}개의 아이템 데이터를 src/data/items.json에 저장했습니다.`);
    
    // 카테고리별 통계
    const categoryCount = {};
    items.forEach(item => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    });
    
    console.log('\n📊 카테고리별 아이템 수:');
    Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}개`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 스크립트 실행
fetchAllItems();