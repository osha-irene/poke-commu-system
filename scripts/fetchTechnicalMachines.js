// PokeAPI에서 기술머신 데이터를 가져오는 스크립트
// Node.js 환경에서 실행: node fetchTechnicalMachines.js

const fs = require('fs');

// 타입 한글 매핑
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

// 카테고리 한글 매핑
const CATEGORY_MAP = {
  'physical': '물리',
  'special': '특수',
  'status': '변화'
};

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`재시도 중... (${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

async function fetchTechnicalMachines() {
  console.log('🚀 PokeAPI에서 기술머신 데이터 수집 시작...\n');

  const tms = [];
  
  // TM01 ~ TM100까지 (1~8세대 전체)
  for (let i = 1; i <= 100; i++) {
    const tmNumber = i.toString().padStart(2, '0');
    const itemId = `tm${tmNumber}`;
    
    try {
      console.log(`📀 ${itemId} 가져오는 중...`);
      
      // 아이템 정보 가져오기
      const itemData = await fetchWithRetry(`https://pokeapi.co/api/v2/item/${itemId}`);
      
      // 이 TM이 어떤 기술을 가르치는지 확인 (machines 엔드포인트)
      const machineData = await fetchWithRetry(`https://pokeapi.co/api/v2/machine/${itemData.id}`);
      
      // 기술 정보 가져오기
      const moveUrl = machineData.move.url;
      const moveData = await fetchWithRetry(moveUrl);
      
      // 한글 이름 찾기
      const koreanName = moveData.names.find(n => n.language.name === 'ko');
      const koreanFlavorText = moveData.flavor_text_entries.find(
        f => f.language.name === 'ko' && f.version_group.name === 'sword-shield'
      ) || moveData.flavor_text_entries.find(f => f.language.name === 'ko');
      
      const tm = {
        id: itemId,
        number: i,
        name: koreanName?.name || moveData.name,
        nameEn: moveData.name,
        tmNumber: `기술머신${tmNumber}`,
        description: koreanFlavorText?.flavor_text.replace(/\n/g, ' ') || '',
        moveId: moveData.id,
        type: TYPE_MAP[moveData.type.name] || moveData.type.name,
        typeEn: moveData.type.name,
        category: CATEGORY_MAP[moveData.damage_class.name] || moveData.damage_class.name,
        power: moveData.power || 0,
        accuracy: moveData.accuracy || 100,
        pp: moveData.pp || 0,
        spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-${moveData.type.name}.png`
      };
      
      tms.push(tm);
      console.log(`✅ ${tm.tmNumber}: ${tm.name} (${tm.type})`);
      
      // API 과부하 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ ${itemId} 가져오기 실패:`, error.message);
      // 실패해도 계속 진행
      continue;
    }
  }
  
  // JSON 파일로 저장
  const output = {
    tms: tms,
    generatedAt: new Date().toISOString(),
    totalCount: tms.length
  };
  
  fs.writeFileSync(
    './src/data/technicalMachines.json',
    JSON.stringify(output, null, 2),
    'utf-8'
  );
  
  console.log('\n✨ 완료!');
  console.log(`📁 저장 위치: ./src/data/technicalMachines.json`);
  console.log(`📊 총 ${tms.length}개의 기술머신 데이터 생성`);
}

// 실행
fetchTechnicalMachines().catch(console.error);