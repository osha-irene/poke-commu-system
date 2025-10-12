// scripts/fetchItems.js
const fs = require('fs');
const https = require('https');

// Flavor → Contest Stat 매핑
const FLAVOR_TO_CONTEST = {
  'spicy': 'coolness',
  'dry': 'beauty',
  'sweet': 'cuteness',
  'bitter': 'cleverness',
  'sour': 'toughness'
};

const FLAVOR_TO_KOREAN = {
  'spicy': '매운맛',
  'dry': '떫은맛',
  'sweet': '단맛',
  'bitter': '쓴맛',
  'sour': '신맛'
};

// ⭐ 판매 불가 아이템 (중요 아이템들)
const CANNOT_SELL = [
  'master-ball', 'key-items', 'hm', 'tm', 'mega-stones', 
  'z-crystals', 'event-items', 'plates'
];

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

async function fetchItems() {
  console.log('🎒 PokeAPI에서 아이템 데이터 수집 시작...\n');

  // 1. 전체 아이템 목록 가져오기
  const itemList = await httpsGet('https://pokeapi.co/api/v2/item?limit=2000');
  console.log(`📦 총 ${itemList.results.length}개 아이템 발견\n`);

  const items = [];
  const categories = {};

  // 2. 아이템 카테고리 먼저 가져오기
  console.log('📂 아이템 카테고리 수집 중...\n');
  const categoryList = await httpsGet('https://pokeapi.co/api/v2/item-category?limit=100');
  
  for (const catRef of categoryList.results) {
    const catData = await httpsGet(catRef.url);
    categories[catData.name] = {
      id: catData.name,
      nameEn: catData.name,
      name: catData.names.find(n => n.language.name === 'ko')?.name || catData.name,
      pocket: catData.pocket?.name || 'items'
    };
    await delay(50); // API 부하 방지
  }

  console.log(`✅ ${Object.keys(categories).length}개 카테고리 수집 완료\n`);

  // 3. 각 아이템 상세 정보 가져오기
  console.log('🔍 아이템 상세 정보 수집 중...\n');
  
  for (let i = 0; i < itemList.results.length; i++) {
    const itemUrl = itemList.results[i].url;
    
    try {
      const itemData = await httpsGet(itemUrl);
      
      // 영어 effect 찾기
      const effectEntry = itemData.effect_entries.find(e => e.language.name === 'en');
      const effect = effectEntry ? effectEntry.short_effect : '';
      
      // 한글 이름 찾기
      const koreanName = itemData.names.find(n => n.language.name === 'ko');
      
      // ⭐ 판매 가능 여부 판단
      const categoryName = itemData.category?.name || '';
      const canSell = !CANNOT_SELL.some(cat => categoryName.includes(cat));
      
      // ⭐ 판매 가격 계산 (구매 가격의 50%)
      const cost = itemData.cost || 0;
      const sellPrice = canSell ? Math.floor(cost * 0.5) : 0;

      const item = {
        id: itemData.id,
        name: koreanName ? koreanName.name : itemData.name,
        nameEn: itemData.name,
        category: categoryName,
        categoryData: categories[categoryName] || null,
        
        // 💰 가격 정보
        cost: cost,
        sellPrice: sellPrice,
        canSell: canSell,
        
        // 📝 설명
        effect: effect,
        description: effect, // 커스텀 아이템과 호환
        
        // 🎨 이미지
        spriteUrl: itemData.sprites?.default || null,
        imageUrl: itemData.sprites?.default || null, // 커스텀 아이템과 호환
        
        // 🏷️ 속성
        attributes: itemData.attributes?.map(a => a.name) || [],
        flingPower: itemData.fling_power || 0,
        flingEffect: itemData.fling_effect?.name || null,
        
        // 🎯 아이템 타입 (커스텀 아이템 구분용)
        isCustom: false,
        isOfficial: true,
        
        // 👤 생성 정보
        createdBy: 'pokeapi',
        createdAt: null,
        
        // 🍳 요리 시스템용 필드
        cooking: {
          isIngredient: false,      // 요리 재료인가?
          isCookable: false,        // 요리 가능한가?
          resultItem: null,         // 요리 결과물 ID
          requiredItems: [],        // 필요한 재료 [{id, amount}]
          cookingTime: 0,           // 요리 시간 (초)
          difficulty: 'easy',       // 난이도: easy, medium, hard
          quality: 'normal'         // 품질: poor, normal, good, excellent
        },
        
        // 🎭 사용 효과 (확장 가능)
        onUse: null  // 나중에 { type: 'heal', value: 20 } 같은 형식
      };

      // ⭐ 베리인 경우 콘테스트 효과 추가
      if (categoryName.includes('berry') || categoryName.includes('berries')) {
        // 베리 상세 정보 가져오기
        try {
          const berryName = itemData.name.replace('-berry', '').replace('berry', '');
          const berryData = await httpsGet(`https://pokeapi.co/api/v2/berry/${berryName}`);
          
          item.berryData = {
            flavors: berryData.flavors.map(f => ({
              flavor: f.flavor.name,
              flavorKo: FLAVOR_TO_KOREAN[f.flavor.name] || f.flavor.name,
              contestStat: FLAVOR_TO_CONTEST[f.flavor.name] || null,
              potency: f.potency
            })),
            smoothness: berryData.smoothness,
            firmness: berryData.firmness?.name
          };
          
          // ⭐ 콘테스트 스탯 효과 추가
          const mainFlavor = berryData.flavors.find(f => f.potency > 0);
          if (mainFlavor) {
            item.contestEffect = {
              type: 'condition',
              stat: FLAVOR_TO_CONTEST[mainFlavor.flavor.name],
              value: Math.ceil(mainFlavor.potency / 10) // 10 potency = +1 stat
            };
          }
        } catch (berryError) {
          console.log(`   ⚠️ 베리 데이터 없음: ${itemData.name}`);
        }
      }

      items.push(item);
      
      // 진행 상황 출력
      if ((i + 1) % 50 === 0) {
        console.log(`   📦 ${i + 1}/${itemList.results.length} 처리 중...`);
      }
      
      await delay(100); // API 부하 방지
      
    } catch (error) {
      console.error(`❌ 오류 (${itemList.results[i].name}):`, error.message);
    }
  }

  console.log(`\n✅ 총 ${items.length}개 아이템 수집 완료!\n`);

  // 4. JSON 파일로 저장
  const output = {
    categories: Object.values(categories),
    items: items,
    metadata: {
      fetchedAt: new Date().toISOString(),
      totalItems: items.length,
      totalCategories: Object.keys(categories).length
    }
  };

  fs.writeFileSync(
    './src/data/items.json',
    JSON.stringify(output, null, 2),
    'utf8'
  );

  console.log('💾 items.json 파일 저장 완료!');
  console.log('\n📊 수집 통계:');
  console.log(`   - 총 아이템: ${items.length}개`);
  console.log(`   - 카테고리: ${Object.keys(categories).length}개`);
  console.log(`   - 판매 가능: ${items.filter(i => i.canSell).length}개`);
  console.log(`   - 판매 불가: ${items.filter(i => !i.canSell).length}개`);
  console.log(`   - 콘테스트 아이템: ${items.filter(i => i.contestEffect).length}개`);
}

// 실행
fetchItems().catch(console.error);