// fetchMoves.js - Node.js에서 실행하는 스크립트
// 실행 방법: node fetchMoves.js

const fs = require('fs');

// 한글 번역 매핑
const typeTranslations = {
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

const categoryTranslations = {
  'physical': '물리',
  'special': '특수',
  'status': '변화'
};

// 딜레이 함수
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAllMoves() {
  console.log('🎯 PokeAPI에서 기술 데이터 수집 시작...\n');
  
  try {
    // 1. 전체 기술 목록 가져오기 (모든 세대)
    console.log('📋 기술 목록 가져오는 중...');
    const listResponse = await fetch('https://pokeapi.co/api/v2/move?limit=10000');
    const listData = await listResponse.json();
    
    const moves = [];
    const totalMoves = listData.results.length; // 모든 기술
    
    // 2. 각 기술의 상세 정보 가져오기
    for (let i = 0; i < totalMoves; i++) {
      const moveId = i + 1;
      
      try {
        console.log(`⚡ (${i + 1}/${totalMoves}) 기술 ${moveId}번 가져오는 중...`);
        
        const response = await fetch(`https://pokeapi.co/api/v2/move/${moveId}`);
        const data = await response.json();
        
        // 한글 이름 찾기
        const koreanName = data.names.find(n => n.language.name === 'ko');
        
        // 한글 설명 찾기
        const koreanFlavorText = data.flavor_text_entries.find(
          f => f.language.name === 'ko'
        );
        
        const move = {
          id: data.id,
          name: koreanName?.name || data.name,
          nameEn: data.name,
          type: typeTranslations[data.type.name] || data.type.name,
          typeEn: data.type.name,
          power: data.power || 0,
          accuracy: data.accuracy || 100,
          pp: data.pp || 0,
          category: categoryTranslations[data.damage_class.name] || data.damage_class.name,
          categoryEn: data.damage_class.name,
          priority: data.priority || 0,
          description: koreanFlavorText?.flavor_text.replace(/\n/g, ' ') || '',
          effect: data.effect_entries.find(e => e.language.name === 'en')?.short_effect || ''
        };
        
        moves.push(move);
        
        // API 과부하 방지를 위한 딜레이 (200ms)
        await delay(200);
        
      } catch (error) {
        console.error(`❌ 기술 ${moveId}번 가져오기 실패:`, error.message);
      }
    }
    
    // 3. JSON 파일로 저장
    const outputData = {
      moves: moves,
      metadata: {
        totalMoves: moves.length,
        generation: 'all',
        updatedAt: new Date().toISOString(),
        source: 'PokeAPI v2'
      }
    };
    
    fs.writeFileSync(
      'moves.json',
      JSON.stringify(outputData, null, 2),
      'utf-8'
    );
    
    console.log(`\n✅ 완료! ${moves.length}개의 기술 데이터를 moves.json에 저장했습니다.`);
    console.log('📁 파일 위치: ./moves.json');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 실행
fetchAllMoves();