// src/components/views/admin/MemberDetailPanel.jsx
import React, { useState } from 'react';
import { useGame } from '../../../contexts/GameContext';
import MemberInfoTab from './member/MemberInfoTab';
import MemberPokemonTab from './member/MemberPokemonTab';
import MemberItemTab from './member/MemberItemTab';

function MemberDetailPanel({ member, onClose }) {
  const {
    currentUser: trainer,
    members,
    allItems,
    allPokemonMaster,
    allMoves,
    pokemonLearnsets,
    systemSettings,
    setMembers,
    updateCurrentUser,
    giveItemToMember,
    givePokemonToMember,
    transferMemberPokemon,
    editMemberPokemon,
    getPokemonFormCandidates,
    deleteMemberPokemon,
    hatchMemberEgg,
    deleteMember,
    resetMemberWalkCount,
    toggleAdminStatus,
    updateMemberMoney,
  } = useGame();

  const [selectedTab, setSelectedTab] = useState('info');

  // ⭐ 포켓몬 삭제 핸들러 (완전히 새로 작성)
  const handleDeletePokemon = (pokemonUniqueId) => {
    if (window.confirm('정말 이 포켓몬을 삭제하시겠습니까?')) {
      deleteMemberPokemon(member.id, pokemonUniqueId);
    }
  };

  const handleUpdateWalkCount = (memberId, newWalkCount) => {
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], dailyWalks: newWalkCount }
    }));
    
    if (trainer?.id === memberId) {
      updateCurrentUser({ dailyWalks: newWalkCount });
    }
  };

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
    const action = member.isAdmin ? '제거' : '부여';
    if (window.confirm(`${memberName}님의 관리자 권한을 ${action}하시겠습니까?`)) {
      toggleAdminStatus(memberId);
    }
  };

  const handleDeleteMember = async (memberId, memberName) => {
    if (!trainer?.isSuperAdmin) return;
    if (!window.confirm(`${memberName}님을 삭제하시겠습니까?\n\n회원 데이터가 삭제되며 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    const success = await deleteMember?.(memberId);
    if (success) {
      alert(`${memberName}님이 삭제되었습니다.`);
      onClose?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="border-b-2 border-lime-300 bg-white/95 px-6 py-4 rounded-t-xl flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-green-950">{member.name}</h2>
            <p className="text-green-800 text-sm">ID: {member.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-green-950 hover:bg-lime-100/70 p-2 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 탭 */}
        <div className="border-b border-gray-200 flex px-6 bg-gray-50">
          <button
            onClick={() => setSelectedTab('info')}
            className={`flex-1 py-3 font-semibold ${selectedTab === 'info' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600'}`}
          >
            기본정보
          </button>
          <button
            onClick={() => setSelectedTab('pokemon')}
            className={`flex-1 py-3 font-semibold ${selectedTab === 'pokemon' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600'}`}
          >
            포켓몬 ({member.caughtPokemon?.filter(p => p && !p.isPartner).length || 0})
          </button>
          <button
            onClick={() => setSelectedTab('items')}
            className={`flex-1 py-3 font-semibold ${selectedTab === 'items' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600'}`}
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
              onResetWalk={handleResetWalk}
              onToggleAdmin={handleToggleAdmin}
              onUpdateMoney={updateMemberMoney}
              onUpdateWalkCount={handleUpdateWalkCount}
              onUpdateMaxWalkCount={handleUpdateMaxWalkCount}
              onDeleteMember={handleDeleteMember}
            />
          )}

          {selectedTab === 'pokemon' && (
            <MemberPokemonTab
              member={member}
              members={members}
              trainer={trainer}
              allItems={allItems}
              allPokemonMaster={allPokemonMaster}
              allMoves={allMoves}
              pokemonLearnsets={pokemonLearnsets}
              onGivePokemon={givePokemonToMember}
              onEditPokemon={editMemberPokemon}
              getPokemonFormCandidates={getPokemonFormCandidates}
              onDeletePokemon={handleDeletePokemon}
              onHatchEgg={hatchMemberEgg}
              onTransferPokemon={transferMemberPokemon}
              maxNonPartnerPokemon={systemSettings?.maxNonPartnerPokemon || 18}
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
