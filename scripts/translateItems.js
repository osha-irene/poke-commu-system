// scripts/translateItems.js
const fs = require('fs');
const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
      res.on('error', reject);
    });
  });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateItems() {
  console.log('🌏 아이템 한국어 번역 시작...\n');

  // 1. 기존 items.json 읽기
  const itemsData = JSON.parse(fs.readFileSync('./src/data/items.json', 'utf8'));
  const items = itemsData.items;
  
  console.log(`📦 총 ${items.length}개 아이템 번역 시작\n`);

  let translatedCount = 0;
  let notFoundCount = 0;

  // 2. 각 아이템 한국어 정보 가져오기
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    try {
      // PokeAPI에서 아이템 상세 정보 다시 가져오기
      const itemData = await httpsGet(`https://pokeapi.co/api/v2/item/${item.nameEn}`);
      
      // 한글 이름 찾기
      const koreanName = itemData.names.find(n => n.language.name === 'ko');
      
      // 한글 설명 찾기 (flavor_text_entries에서)
      let koreanEffect = '';
      if (itemData.flavor_text_entries && itemData.flavor_text_entries.length > 0) {
        const koreanFlavor = itemData.flavor_text_entries
          .reverse() // 최신 버전부터
          .find(f => f.language.name === 'ko');
        
        if (koreanFlavor) {
          koreanEffect = koreanFlavor.text.replace(/\n/g, ' ').trim();
        }
      }
      
      // 한글 효과 설명 찾기 (effect_entries에서)
      if (!koreanEffect && itemData.effect_entries && itemData.effect_entries.length > 0) {
        const koreanEffectEntry = itemData.effect_entries.find(e => e.language.name === 'ko');
        if (koreanEffectEntry) {
          koreanEffect = koreanEffectEntry.short_effect || koreanEffectEntry.effect;
        }
      }
      
      // 데이터 업데이트
      if (koreanName) {
        item.name = koreanName.name;
        translatedCount++;
      } else {
        console.log(`   ⚠️ 한글 이름 없음: ${item.nameEn}`);
        notFoundCount++;
      }
      
      if (koreanEffect) {
        item.effect = koreanEffect;
        item.description = koreanEffect;
      } else if (!item.effect) {
        // 영어 설명이라도 유지
        const englishEffect = itemData.effect_entries.find(e => e.language.name === 'en');
        if (englishEffect) {
          item.effect = englishEffect.short_effect;
          item.description = englishEffect.short_effect;
        }
      }
      
      // 카테고리 한글 이름 가져오기
      if (item.category && itemData.category) {
        try {
          const categoryData = await httpsGet(itemData.category.url);
          const koreanCatName = categoryData.names.find(n => n.language.name === 'ko');
          if (koreanCatName && item.categoryData) {
            item.categoryData.name = koreanCatName.name;
          }
        } catch (catError) {
          // 카테고리 번역 실패는 무시
        }
      }
      
      // 진행 상황 출력
      if ((i + 1) % 50 === 0) {
        console.log(`   🌏 ${i + 1}/${items.length} 번역 중... (성공: ${translatedCount}, 실패: ${notFoundCount})`);
      }
      
      await delay(100); // API 부하 방지
      
    } catch (error) {
      console.error(`   ❌ 오류 (${item.nameEn}):`, error.message);
      notFoundCount++;
    }
  }

  console.log(`\n✅ 번역 완료!`);
  console.log(`   - 성공: ${translatedCount}개`);
  console.log(`   - 실패: ${notFoundCount}개`);
  console.log(`   - 총: ${items.length}개\n`);

  // 3. 업데이트된 데이터 저장
  itemsData.metadata = {
    ...itemsData.metadata,
    translatedAt: new Date().toISOString(),
    translatedCount: translatedCount,
    language: 'ko'
  };

  fs.writeFileSync(
    './src/data/items.json',
    JSON.stringify(itemsData, null, 2),
    'utf8'
  );

  console.log('💾 items.json 파일 업데이트 완료!');
  
  // 4. 샘플 출력
  console.log('\n📋 샘플 아이템:');
  items.slice(0, 5).forEach(item => {
    console.log(`   ${item.name} (${item.nameEn})`);
    console.log(`   └─ ${item.effect || '설명 없음'}\n`);
  });
}

// 실행
translateItems().catch(console.error);