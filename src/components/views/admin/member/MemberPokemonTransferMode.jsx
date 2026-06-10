import React, { useMemo, useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';

export default function MemberPokemonTransferMode({
  member,
  members = {},
  transferTarget,
  onTransfer,
  onCancel
}) {
  const [targetMemberId, setTargetMemberId] = useState('');

  const targetMembers = useMemo(() => (
    Object.entries(members)
      .filter(([id]) => id !== member.id)
      .map(([id, memberData]) => ({
        id,
        name: memberData?.name || memberData?.loginId || id,
        egg: memberData?.egg,
        pokemonCount: (memberData?.caughtPokemon || []).filter(p => p && !p.isPartner).length
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  ), [member.id, members]);

  const isEgg = transferTarget?.type === 'egg';
  const pokemon = transferTarget?.pokemon;
  const egg = transferTarget?.egg;
  const targetMember = targetMemberId ? members[targetMemberId] : null;
  const targetHasEgg = isEgg && Boolean(targetMember?.egg);
  const title = isEgg
    ? `${egg?.species || egg?.name || '알'} 알`
    : (pokemon?.nickname || pokemon?.name || '포켓몬');

  const handleTransfer = () => {
    if (!targetMemberId) {
      alert('받을 멤버를 선택해주세요.');
      return;
    }

    if (targetHasEgg) {
      alert('선택한 멤버는 이미 알을 보유하고 있습니다.');
      return;
    }

    const targetName = targetMember?.name || targetMemberId;
    if (!window.confirm(`${member.name}님의 ${title}을(를) ${targetName}님에게 이전할까요?`)) {
      return;
    }

    onTransfer(targetMemberId, isEgg
      ? { transferEgg: true }
      : { pokemonUniqueId: pokemon?.uniqueId }
    );
  };

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <ArrowRightLeft size={18} />
          알/포켓몬 이전
        </h3>
        <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-gray-100">
          <X size={20} />
        </button>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
        <div className="text-xs font-semibold text-amber-700 mb-1">이전 대상</div>
        <div className="font-bold text-gray-900">{title}</div>
        {!isEgg && (
          <div className="text-sm text-gray-600">
            Lv.{pokemon?.level || 1} · No.{pokemon?.number || '???'}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">받을 멤버</label>
        <select
          value={targetMemberId}
          onChange={(event) => setTargetMemberId(event.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="">멤버 선택</option>
          {targetMembers.map(target => (
            <option key={target.id} value={target.id}>
              {target.name} · 포켓몬 {target.pokemonCount}마리{target.egg ? ' · 알 보유' : ''}
            </option>
          ))}
        </select>
        {targetHasEgg && (
          <p className="mt-2 text-sm text-red-600">이 멤버는 이미 알을 보유하고 있어 알을 받을 수 없습니다.</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded font-semibold hover:bg-gray-200"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleTransfer}
          disabled={!targetMemberId || targetHasEgg}
          className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          이전하기
        </button>
      </div>
    </div>
  );
}
