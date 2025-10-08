import React, { useState } from 'react';
import RegionEditModal from '../modals/RegionEditModal';

export default function AdminView({ 
  trainer,
  members,
  updateMaxDailyWalks, 
  regions, 
  allPokemon,
  updateRegionPokemon,
  addMember,
  toggleAdminStatus,
  resetMemberWalkCount,
  resetAllWalkCounts,
  resetGameData
}) {
  const [maxWalks, setMaxWalks] = useState(trainer.maxDailyWalks);
  const [editingRegion, setEditingRegion] = useState(null);
  
  // 새 멤버 추가 폼
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  
  const handleApplyWalks = () => {
    updateMaxDailyWalks(maxWalks);
    alert('일일 산책 횟수가 설정되었습니다!');
  };

  const handleEditRegion = (region) => {
    setEditingRegion(region);
  };

  const handleCloseModal = () => {
    setEditingRegion(null);
  };

  const handleSaveRegion = (regionId, pokemonIds) => {
    updateRegionPokemon(regionId, pokemonIds);
    setEditingRegion(null);
    alert('구역 포켓몬이 업데이트되었습니다!');
  };

  const handleAddMember = () => {
    if (!newMemberId || !newMemberPassword || !newMemberName) {
      alert('모든 정보를 입력해주세요.');
      return;
    }
    
    const success = addMember(newMemberId, newMemberPassword, newMemberName);
    if (success) {
      alert(`${newMemberName}님이 추가되었습니다!`);
      setNewMemberId('');
      setNewMemberPassword('');
      setNewMemberName('');
    } else {
      alert('이미 존재하는 아이디입니다.');
    }
  };

  const handleToggleAdmin = (memberId, memberName) => {
    const member = members[memberId];
    const action = member.isAdmin ? '제거' : '부여';
    
    if (window.confirm(`${memberName}님의 관리자 권한을 ${action}하시겠습니까?`)) {
      toggleAdminStatus(memberId);
    }
  };

  const handleResetMember = (memberId, memberName) => {
    if (window.confirm(`${memberName}님의 산책 횟수를 리셋하시겠습니까?`)) {
      resetMemberWalkCount(memberId);
      alert(`${memberName}님의 산책 횟수가 리셋되었습니다!`);
    }
  };

  const handleResetAll = () => {
    if (window.confirm('⚠️ 모든 멤버의 산책 횟수를 리셋하시겠습니까?')) {
      resetAllWalkCounts();
      alert('모든 멤버의 산책 횟수가 리셋되었습니다!');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 멤버 관리 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">👥 멤버 관리</h3>
        
        {/* 새 멤버 추가 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-700 mb-3">새 멤버 추가</h4>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="아이디"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={newMemberPassword}
              onChange={(e) => setNewMemberPassword(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="이름"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleAddMember}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-semibold transition-colors"
            >
              추가
            </button>
          </div>
        </div>

        {/* 멤버 목록 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-700">멤버 목록</h4>
            <button
              onClick={handleResetAll}
              className="bg-orange-100 text-orange-700 px-4 py-1 rounded-lg hover:bg-orange-200 text-sm font-semibold transition-colors"
            >
              전체 산책 횟수 리셋
            </button>
          </div>
          
          {Object.values(members).map((member) => (
            <div 
              key={member.id}
              className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{member.name}</span>
                    <span className="text-sm text-gray-500">({member.id})</span>
                    {member.isSuperAdmin && (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                        슈퍼관리자
                      </span>
                    )}
                    {member.isAdmin && !member.isSuperAdmin && (
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                        관리자
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    산책 횟수: {member.dailyWalks}/{member.maxDailyWalks}회 | 
                    포켓몬: {member.caughtPokemon.length}마리
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleResetMember(member.id, member.name)}
                  className="bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 text-sm font-semibold transition-colors"
                >
                  산책 리셋
                </button>
                
                {trainer.isSuperAdmin && member.id !== 'admin' && (
                  <button
                    onClick={() => handleToggleAdmin(member.id, member.name)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      member.isAdmin
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {member.isAdmin ? '관리자 제거' : '관리자 부여'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 일일 산책 설정 (자신의 설정만) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">⚙️ 내 일일 산책 횟수 설정</h3>
        <div className="flex items-center gap-4">
          <input 
            type="number" 
            value={maxWalks}
            onChange={(e) => setMaxWalks(parseInt(e.target.value) || 0)}
            min="1"
            max="999"
            className="border-2 border-gray-300 rounded-lg px-4 py-3 w-32 text-lg font-semibold focus:border-indigo-500 focus:outline-none"
          />
          <span className="text-gray-600 font-semibold">회</span>
          <button 
            onClick={handleApplyWalks}
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 font-semibold transition-colors"
          >
            적용
          </button>
          <span className="text-sm text-gray-500 ml-4">
            현재: {trainer.maxDailyWalks}회
          </span>
        </div>
      </div>

      {/* 구역별 포켓몬 설정 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🗺️ 구역별 포켓몬 설정</h3>
        <div className="space-y-3">
          {regions.map((region) => (
            <div 
              key={region.id} 
              className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
            >
              <div>
                <span className="font-semibold text-lg">{region.name}</span>
                <div className="text-sm text-gray-600 mt-1">
                  등장 포켓몬: {region.pokemons.length}종
                </div>
              </div>
              <button 
                onClick={() => handleEditRegion(region)}
                className="bg-indigo-100 text-indigo-700 px-6 py-2 rounded-lg hover:bg-indigo-200 font-semibold transition-colors"
              >
                포켓몬 편집
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 슈퍼 관리자 전용: 게임 데이터 초기화 */}
      {trainer.isSuperAdmin && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <h3 className="text-xl font-bold text-red-800 mb-4">⚠️ 위험 구역</h3>
          <p className="text-red-600 mb-4">
            모든 게임 데이터를 초기화합니다. 이 작업은 되돌릴 수 없습니다!
          </p>
          <button
            onClick={resetGameData}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-semibold transition-colors"
          >
            전체 데이터 초기화
          </button>
        </div>
      )}

      {/* 구역 편집 모달 */}
      {editingRegion && (
        <RegionEditModal
          region={editingRegion}
          allPokemon={allPokemon}
          onClose={handleCloseModal}
          onSave={handleSaveRegion}
        />
      )}
    </div>
  );
}