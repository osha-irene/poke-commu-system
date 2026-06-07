// src/components/admin/MigrationTool.jsx
import React, { useState } from 'react';
import {
  getAllMembers,
  saveMember,
  saveGameConfig,
  saveShopData,
  createPost,
  saveRecipe,
  saveDiscoveredRecipes,
  batchSaveMembers
} from '../../utils/firebaseHelpers';

function MigrationTool() {
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState('');
  const [loading, setLoading] = useState(false);

  // localStorage → Firebase 마이그레이션
  const migrateToFirebase = async () => {
    setLoading(true);
    setStatus('🚀 마이그레이션 시작...');
    setProgress('');

    try {
      // 1. 회원 데이터 마이그레이션
      setProgress('1/6 회원 데이터 마이그레이션 중...');
      const membersData = JSON.parse(localStorage.getItem('poke_members') || '{}');
      const memberCount = Object.keys(membersData).length;
      
      if (memberCount > 0) {
        await batchSaveMembers(membersData);
        setStatus(prev => prev + `\n✅ 회원 데이터: ${memberCount}명`);
      } else {
        setStatus(prev => prev + '\n⚠️ 회원 데이터 없음');
      }

      // 2. 게임 설정 마이그레이션 (지역, 포켓덱스)
      setProgress('2/6 게임 설정 마이그레이션 중...');
      const regions = JSON.parse(localStorage.getItem('poke_regions') || '[]');
      const gamePokedex = JSON.parse(localStorage.getItem('poke_gamePokedex') || '{}');
      const sharedPokedex = JSON.parse(localStorage.getItem('poke_sharedPokedexData') || '{}');
      
      await saveGameConfig({
        regions,
        gamePokedex,
        sharedPokedexData: sharedPokedex
      });
      setStatus(prev => prev + '\n✅ 게임 설정 저장 완료');

      // 3. Q&A 게시판 마이그레이션
      setProgress('3/6 Q&A 게시판 마이그레이션 중...');
      const qnaPosts = JSON.parse(localStorage.getItem('poke_qnaPosts') || '[]');
      
      if (qnaPosts.length > 0) {
        for (const post of qnaPosts) {
          await createPost(post);
        }
        setStatus(prev => prev + `\n✅ 게시글: ${qnaPosts.length}개`);
      } else {
        setStatus(prev => prev + '\n⚠️ 게시글 없음');
      }

      // 4. 상점 데이터 마이그레이션
      setProgress('4/6 상점 데이터 마이그레이션 중...');
      const shopData = JSON.parse(localStorage.getItem('poke_shopData') || '{}');
      
      if (Object.keys(shopData).length > 0) {
        await saveShopData(shopData);
        setStatus(prev => prev + '\n✅ 상점 데이터 저장 완료');
      } else {
        setStatus(prev => prev + '\n⚠️ 상점 데이터 없음');
      }

      // 5. 레시피 마이그레이션
      setProgress('5/6 레시피 마이그레이션 중...');
      const recipes = JSON.parse(localStorage.getItem('poke_recipes') || '[]');
      
      if (recipes.length > 0) {
        for (const recipe of recipes) {
          await saveRecipe(recipe);
        }
        setStatus(prev => prev + `\n✅ 레시피: ${recipes.length}개`);
      } else {
        setStatus(prev => prev + '\n⚠️ 레시피 없음');
      }

      // 6. 발견한 레시피 마이그레이션 (유저별)
      setProgress('6/6 발견 레시피 마이그레이션 중...');
      const discoveredRecipes = JSON.parse(localStorage.getItem('poke_discoveredRecipes') || '{}');
      
      if (Object.keys(discoveredRecipes).length > 0) {
        for (const [userId, recipes] of Object.entries(discoveredRecipes)) {
          await saveDiscoveredRecipes(userId, recipes);
        }
        setStatus(prev => prev + '\n✅ 발견 레시피 저장 완료');
      } else {
        setStatus(prev => prev + '\n⚠️ 발견 레시피 없음');
      }

      setProgress('');
      setStatus(prev => prev + '\n\n🎉 마이그레이션 완료!');
      
    } catch (error) {
      console.error('마이그레이션 에러:', error);
      setStatus(prev => prev + '\n\n❌ 마이그레이션 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Firebase → localStorage 다운로드 (백업용)
  const downloadFromFirebase = async () => {
    setLoading(true);
    setStatus('📥 Firebase에서 데이터 다운로드 중...');
    setProgress('');

    try {
      // 회원 데이터 가져오기
      setProgress('회원 데이터 로드 중...');
      const members = await getAllMembers();
      
      if (Object.keys(members).length > 0) {
        localStorage.setItem('poke_members', JSON.stringify(members));
        setStatus(prev => prev + `\n✅ 회원 데이터: ${Object.keys(members).length}명`);
      }

      setProgress('');
      setStatus(prev => prev + '\n\n✅ 다운로드 완료!');
      
    } catch (error) {
      console.error('다운로드 에러:', error);
      setStatus(prev => prev + '\n\n❌ 다운로드 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // localStorage 데이터 확인
  const checkLocalData = () => {
    const members = JSON.parse(localStorage.getItem('poke_members') || '{}');
    const regions = JSON.parse(localStorage.getItem('poke_regions') || '[]');
    const posts = JSON.parse(localStorage.getItem('poke_qnaPosts') || '[]');
    const recipes = JSON.parse(localStorage.getItem('poke_recipes') || '[]');

    setStatus(`
📊 로컬 데이터 현황:
- 회원: ${Object.keys(members).length}명
- 지역: ${regions.length}개
- 게시글: ${posts.length}개
- 레시피: ${recipes.length}개
    `);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        🔄 데이터 마이그레이션 도구
      </h2>
      
      <div className="space-y-4">
        {/* 버튼들 */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={checkLocalData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            📊 로컬 데이터 확인
          </button>

          <button
            onClick={migrateToFirebase}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-bold"
            disabled={loading}
          >
            {loading ? '⏳ 진행 중...' : '🚀 Firebase로 업로드'}
          </button>

          <button
            onClick={downloadFromFirebase}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            disabled={loading}
          >
            📥 Firebase에서 다운로드
          </button>
        </div>

        {/* 진행 상황 */}
        {progress && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-700 font-semibold">{progress}</p>
          </div>
        )}

        {/* 상태 메시지 */}
        {status && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {status}
            </pre>
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ 주의사항:</strong>
            <br />
            • 마이그레이션 전에 반드시 로컬 데이터를 확인하세요
            <br />
            • Firebase로 업로드하면 기존 Firebase 데이터를 덮어씁니다
            <br />
            • 마이그레이션 중에는 다른 작업을 하지 마세요
            <br />
            • 완료 후 브라우저를 새로고침하세요
          </p>
        </div>
      </div>
    </div>
  );
}

export default MigrationTool;