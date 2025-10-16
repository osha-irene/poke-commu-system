// items.json에서 기술머신(TM) 제거 스크립트
// Node.js에서 실행: node removeTMsFromItems.js

const fs = require('fs');
const path = require('path');

function removeTMsFromItems() {
  console.log('🔧 items.json에서 TM 제거 시작...\n');

  // items.json 파일 경로
  const itemsPath = path.join(__dirname, 'src', 'data', 'items.json');
  
  // 파일 존재 확인
  if (!fs.existsSync(itemsPath)) {
    console.error('❌ items.json 파일을 찾을 수 없습니다!');
    console.error('   경로:', itemsPath);
    return;
  }

  // JSON 파일 읽기
  const itemsData = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));
  
  console.log('📊 원본 아이템 개수:', itemsData.items.length);

  // TM 제거 전 백업
  const backupPath = path.join(__dirname, 'src', 'data', 'items.backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(itemsData, null, 2), 'utf-8');
  console.log('💾 백업 완료:', backupPath);

  // TM 필터링 (여러 패턴으로 검사)
  const removedItems = [];
  const filteredItems = itemsData.items.filter(item => {
    // 문자열로 변환하여 안전하게 체크
    const itemId = String(item.id || '');
    const itemName = String(item.name || '');
    const itemNameEn = String(item.nameEn || '');
    const itemCategory = String(item.category || '');
    
    const isTM = 
      // 1. id가 tm으로 시작 (문자열)
      itemId.match(/^tm\d+$/i) ||
      // 2. name이 "기술머신"으로 시작
      itemName.startsWith('기술머신') || itemName.match(/^TM\d+/i) ||
      // 3. nameEn이 tm으로 시작
      itemNameEn.match(/^tm\d+$/i) ||
      // 4. category가 machines 또는 all-machines
      itemCategory === 'machines' || itemCategory === 'all-machines' ||
      // 5. pocket이 machines
      (item.pocket === 'machines') ||
      // 6. categoryData.pocket이 machines
      (item.categoryData && item.categoryData.pocket === 'machines');
    
    if (isTM) {
      removedItems.push({
        id: item.id,
        name: item.name,
        nameEn: item.nameEn
      });
      return false; // 제거
    }
    return true; // 유지
  });

  console.log('\n🗑️  제거된 TM 목록:');
  removedItems.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.id || item.nameEn} - ${item.name}`);
  });

  console.log('\n📊 제거 전:', itemsData.items.length, '개');
  console.log('📊 제거 후:', filteredItems.length, '개');
  console.log('🗑️  제거된 TM:', removedItems.length, '개');

  // 새로운 items.json 저장
  const newItemsData = {
    ...itemsData,
    items: filteredItems
  };

  fs.writeFileSync(itemsPath, JSON.stringify(newItemsData, null, 2), 'utf-8');
  
  console.log('\n✅ items.json 업데이트 완료!');
  console.log('📁 백업 파일:', backupPath);
  console.log('\n💡 문제가 생기면 백업 파일로 복구할 수 있습니다:');
  console.log(`   복사: cp src/data/items.backup.json src/data/items.json`);
}

// 실행
try {
  removeTMsFromItems();
} catch (error) {
  console.error('❌ 오류 발생:', error.message);
  console.error(error.stack);
}