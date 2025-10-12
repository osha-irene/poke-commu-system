// src/components/views/admin/member/MemberDetailPanel.jsx
import React, { useState } from 'react';
import MemberInfoTab from './member/MemberInfoTab';
import MemberPokemonTab from './member/MemberPokemonTab';
import MemberItemTab from './member/MemberItemTab';

function MemberDetailPanel({ 
  member, trainer, allItems, allPokemonMaster, regions,
  onClose, onGiveItem, onGivePokemon, onEditPokemon, onResetWalk, onToggleAdmin,
  onUpdateMoney, onUpdateRegionAccess
}) {
  const [selectedTab, setSelectedTab] = useState('info');

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
            포켓몬 ({member.caughtPokemon.length})
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
              onResetWalk={onResetWalk}
              onToggleAdmin={onToggleAdmin}
              onUpdateMoney={onUpdateMoney}
              onUpdateRegionAccess={onUpdateRegionAccess}
            />
          )}

          {selectedTab === 'pokemon' && (
            <MemberPokemonTab
              member={member}
              allPokemonMaster={allPokemonMaster}
              onGivePokemon={onGivePokemon}
              onEditPokemon={onEditPokemon}
            />
          )}

          {selectedTab === 'items' && (
            <MemberItemTab
              member={member}
              allItems={allItems}
              onGiveItem={onGiveItem}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default MemberDetailPanel;