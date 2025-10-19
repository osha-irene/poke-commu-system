// fixRegionalForms.js
// Node.js로 실행: node fixRegionalForms.js

const fs = require('fs');
const path = require('path');

// 파일 경로 설정
const filePath = path.join(__dirname, 'src', 'data', 'allPokemon.json');

console.log('📂 파일 읽는 중:', filePath);

// JSON 파일 읽기
const rawData = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(rawData);

console.log('📊 원본 데이터 구조:', Object.keys(data));
console.log('📊 전체 포켓몬 수:', data.pokemon.length);

// 리전폼 찾기
const regionalForms = data.pokemon.filter(p => p.isRegionalForm && !p.id);
console.log('🔍 id 필드가 없는 리전폼:', regionalForms.length, '개');

if (regionalForms.length > 0) {
  console.log('📝 샘플:', regionalForms.slice(0, 3).map(p => ({
    name: p.name,
    number: p.number,
    hasId: !!p.id
  })));
}

// id 필드 추가
let fixedCount = 0;
data.pokemon = data.pokemon.map(p => {
  // id가 없고 number가 있는 경우 id 추가
  if (!p.id && p.number) {
    fixedCount++;
    return {
      id: p.number, // number를 id로 사용
      ...p
    };
  }
  return p;
});

console.log('✅ 수정된 포켓몬:', fixedCount, '개');

// 백업 파일 생성
const backupPath = filePath.replace('.json', '.backup.json');
console.log('💾 백업 생성 중:', backupPath);
fs.writeFileSync(backupPath, rawData, 'utf8');

// 수정된 파일 저장
console.log('💾 수정된 파일 저장 중:', filePath);
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

console.log('✨ 완료!');
console.log('📊 최종 결과:');
console.log('  - 전체 포켓몬:', data.pokemon.length);
console.log('  - id 필드 추가:', fixedCount);
console.log('  - 백업 파일:', backupPath);

// 검증
const verifyRegionalForms = data.pokemon.filter(p => p.isRegionalForm);
const regionalFormsWithoutId = verifyRegionalForms.filter(p => !p.id);
console.log('🔍 검증:');
console.log('  - 리전폼 총:', verifyRegionalForms.length);
console.log('  - id 없는 리전폼:', regionalFormsWithoutId.length);

if (regionalFormsWithoutId.length === 0) {
  console.log('✅ 모든 리전폼에 id 필드가 추가되었습니다!');
} else {
  console.log('⚠️ 일부 리전폼에 id가 없습니다:');
  console.log(regionalFormsWithoutId.slice(0, 5));
}