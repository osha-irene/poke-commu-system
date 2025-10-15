// src/components/views/admin/MemberDetailPanel.jsx - Context 버전

import React, { useState } from 'react';
import { useGame } from '../../../contexts/GameContext';
import MemberInfoTab from './member/MemberInfoTab';
import MemberPokemonTab from './member/MemberPokemonTab';
import MemberItemTab from './member/MemberItemTab';

function MemberDetailPanel({ member, onClose }) {
  // ✅ Context에서 필요한 것들 가져오기
  const {
    currentUser: trainer,
    allItems,
    allPokemonMaster,
    regions,
    setMembers,
    updateCurrentUser,
    giveItemToMember,
    givePokemonToMember,
    editMemberPokemon,
    resetMemberWalkCount,
    toggleAdminStatus,
    updateMemberMoney,
    updateMemberRegionAccess,
  } = useGame();

  const [selectedTab, setSelectedTab] = useState('info');

  // 탐험횟수 업데이트
  const handleUpdateWalkCount = (memberId, newWalkCount) => {
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], dailyWalks: newWalkCount }
    }));
    
    if (trainer?.id === memberId) {
      updateCurrentUser({ dailyWalks: newWalkCount });
    }
  };

  // 최대 탐험횟수 업데이트
  const handleUpdateMaxWalkCount = (memberId, newMaxWalkCount) => {
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], maxDailyWalks: newMaxWalkCount }
    }));
    
    if (trainer?.id === memberId) {
      updateCurrentUser({ maxDailyWalks: newMaxWalkCount });
    }
  };

  const handleResetWalk = (memberId, memberName) => {
    if (window.confirm(`${memberName}님의 탐험 횟수를 초기화하시겠습니까?`)) {
      resetMemberWalkCount(memberId);
      alert('탐험 횟수가 초기화되었습니다.');
    }
  };

  const handleToggleAdmin = (memberId, memberName) => {
    const action = member.isAdmin ? '해제' : '부여';
    if (window.confirm(`${memberName}님의 관리자 권한을 ${action}하시겠습니까?`)) {
      toggleAdminStatus(memberId);
      alert(`관리자 권한이 ${action}되었습니다.`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="bg-indigo-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold text-2xl">
              {member.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{member.name}</h2>
              <p className="text-indigo-100">ID: {member.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-indigo-700 rounded-lg p-2">✕</button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setSelectedTab('info')} 
            className={`flex-1 py-3 font-semibold ${
              selectedTab === 'info' 
                ? 'border-b-2 border-indigo-600 text-indigo-600' 
                : 'text-gray-600'
            }`}
          >
            💰 정보/관리
          </button>
          <button 
            onClick={() => setSelectedTab('pokemon')} 
            className={`flex-1 py-3 font-semibold ${
              selectedTab === 'pokemon' 
                ? 'border-b-2 border-indigo-600 text-indigo-600' 
                : 'text-gray-600'
            }`}
          >
            포켓몬 ({member.caughtPokemon?.filter(p => p && !p.isPartner).length || 0})
          </button>
          <button 
            onClick={() => setSelectedTab('items')} 
            className={`flex-1 py-3 font-semibold ${
              selectedTab === 'items' 
                ? 'border-b-2 border-indigo-600 text-indigo-600' 
                : 'text-gray-600'
            }`}
          >
            아이템 ({member.inventory?.length || 0})
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedTab === 'info' && (
            <MemberInfoTab
              member={member}
              trainer={trainer}
              regions={regions}
              onResetWalk={handleResetWalk}
              onToggleAdmin={handleToggleAdmin}
              onUpdateMoney={updateMemberMoney}
              onUpdateRegionAccess={updateMemberRegionAccess}
              onUpdateWalkCount={handleUpdateWalkCount}
              onUpdateMaxWalkCount={handleUpdateMaxWalkCount}
            />
          )}

          {selectedTab === 'pokemon' && (
            <MemberPokemonTab
              member={member}
              allPokemonMaster={allPokemonMaster}
              onGivePokemon={givePokemonToMember}
              onEditPokemon={editMemberPokemon}
            />
          )}

          {selectedTab === 'items' && (
            <MemberItemTab
              member={member}
              allItems={allItems}
              onGiveItem={giveItemToMember}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default MemberDetailPanel;