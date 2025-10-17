const fs = require('fs');
const path = require('path');

// 디버깅 스크립트
function debugMapping() {
  console.log('=== 디버깅 시작 ===\n');

  // 1. 스프라이트 파일 확인
  const spriteDir = './ingredient-sprites';
  console.log('1. 스프라이트 폴더 확인:');
  if (fs.existsSync(spriteDir)) {
    const files = fs.readdirSync(spriteDir);
    console.log(`   폴더 존재: ${spriteDir}`);
    console.log(`   파일 개수: ${files.length}개`);
    console.log('   파일 목록 (처음 5개):');
    files.slice(0, 5).forEach(f => console.log(`   - ${f}`));
  } else {
    console.log(`   ✗ 폴더 없음: ${spriteDir}`);
    return;
  }

  // 2. JSON 파일 구조 확인
  console.log('\n2. JSON 구조 확인:');
  const data = JSON.parse(fs.readFileSync('items.json', 'utf8'));
  console.log(`   타입: ${Array.isArray(data) ? '배열' : '객체'}`);
  
  let items;
  if (Array.isArray(data)) {
    items = data;
  } else if (data.items && Array.isArray(data.items)) {
    items = data.items;
    console.log('   구조: { items: [...] }');
  } else {
    items = Object.values(data);
    console.log('   구조: { key: item, ... }');
  }
  
  console.log(`   총 아이템: ${items.length}개`);

  // 3. 재료 아이템 찾기
  console.log('\n3. 재료 아이템 확인:');
  const ingredients = items.filter(item => {
    return item.category?.includes('ingredient') ||
           item.categories?.some(c => c?.includes('ingredient'));
  });
  
  console.log(`   재료 개수: ${ingredients.length}개`);
  
  if (ingredients.length > 0) {
    console.log('\n   재료 샘플 (처음 3개):');
    ingredients.slice(0, 3).forEach(item => {
      console.log(`   - ID: ${item.id}`);
      console.log(`     이름: ${item.nameEn || item.name}`);
      console.log(`     카테고리: ${item.category}`);
      console.log(`     현재 spriteUrl: ${item.spriteUrl}`);
      console.log(`     현재 imageUrl: ${item.imageUrl}`);
      console.log(`     cooking.isIngredient: ${item.cooking?.isIngredient}`);
      
      const cleanName = (item.nameEn || item.name || '').toLowerCase().replace(/-/g, '');
      console.log(`     cleanName: ${cleanName}`);
      console.log(`     예상 파일: ${cleanName}.png`);
      console.log();
    });
  }

  // 4. 매칭 테스트
  console.log('4. 매칭 테스트:');
  const sprites = fs.readdirSync(spriteDir)
    .filter(f => f.endsWith('.png'))
    .map(f => path.basename(f, '.png'));
  
  let matchCount = 0;
  ingredients.forEach(item => {
    const cleanName = (item.nameEn || item.name || '').toLowerCase().replace(/-/g, '');
    if (sprites.includes(cleanName)) {
      matchCount++;
    }
  });
  
  console.log(`   매칭 가능: ${matchCount}/${ingredients.length}개`);

  // 5. 매칭 안되는 아이템 확인
  if (matchCount < ingredients.length) {
    console.log('\n5. 매칭 안되는 아이템:');
    ingredients.forEach(item => {
      const cleanName = (item.nameEn || item.name || '').toLowerCase().replace(/-/g, '');
      if (!sprites.includes(cleanName)) {
        console.log(`   ✗ ${item.nameEn || item.name} -> ${cleanName}.png (없음)`);
      }
    });
  }
}

debugMapping();