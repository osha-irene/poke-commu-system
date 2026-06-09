import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Shield, X, Users } from 'lucide-react';

const POKEMON_PLACEHOLDER = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';

function getMemberList(members) {
  if (!members) return [];

  return Object.entries(members)
    .map(([id, member]) => ({
      id,
      ...(member || {})
    }))
    .filter((member) => member && member.name)
    .sort((a, b) => {
      const aAdminRank = a.isSuperAdmin ? 2 : a.isAdmin ? 1 : 0;
      const bAdminRank = b.isSuperAdmin ? 2 : b.isAdmin ? 1 : 0;

      if (aAdminRank !== bAdminRank) return bAdminRank - aAdminRank;
      return (a.name || '').localeCompare(b.name || '', 'ko');
    });
}

function getPokemonName(pokemon) {
  return pokemon?.nickname || pokemon?.name || pokemon?.nameKo || pokemon?.nameEn || '포켓몬';
}

function getPokemonImage(pokemon) {
  return (
    pokemon?.sprite ||
    pokemon?.spriteUrl ||
    pokemon?.imageUrl ||
    pokemon?.iconUrl ||
    pokemon?.frontSprite ||
    POKEMON_PLACEHOLDER
  );
}

function getMemberImage(member) {
  return member.profileImage || member.profileImageUrl || member.avatarUrl || member.imageUrl || '';
}

function getVisibleInventory(member) {
  return (member.inventory || [])
    .filter((item) => item && (item.count ?? 1) > 0)
    .slice(0, 12);
}

function getPartyPokemon(member) {
  return (member.caughtPokemon || []).slice(0, 6).filter(Boolean);
}

function getPartnerPokemon(member) {
  if (member?.partnerPokemon) return member.partnerPokemon;
  const party = getPartyPokemon(member);
  return party.find((pokemon) => pokemon.isPartner) || party[0] || null;
}

function MemberAvatar({ member, className = '' }) {
  const imageUrl = getMemberImage(member);
  const initial = member.name?.trim()?.charAt(0) || '?';

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={member.name}
        className={`bg-indigo-100 object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`border-2 border-lime-300 bg-white/55 text-green-950 flex items-center justify-center font-bold ${className}`}>
      {initial}
    </div>
  );
}

function RoleBadge({ member }) {
  if (member.isSuperAdmin) {
    return <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold">슈퍼관리자</span>;
  }

  if (member.isAdmin) {
    return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">관리자</span>;
  }

  return <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-semibold">회원</span>;
}

export default function MembersView({ members = {}, isLoading = false }) {
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const memberList = useMemo(() => getMemberList(members), [members]);
  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return memberList;

    return memberList.filter((member) => {
      const searchable = [
        member.name,
        member.nickname,
        member.email,
        member.mastodonAccount
      ].filter(Boolean).join(' ').toLowerCase();

      return searchable.includes(query);
    });
  }, [memberList, searchQuery]);

  const selectedMember = selectedMemberId
    ? memberList.find((member) => member.id === selectedMemberId) || null
    : null;
  const selectedParty = selectedMember ? getPartyPokemon(selectedMember) : [];
  const selectedPartner = selectedMember ? getPartnerPokemon(selectedMember) : null;
  const selectedInventory = selectedMember ? getVisibleInventory(selectedMember) : [];

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <div className="members-toolbar rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Users size={22} className="text-emerald-700" />
            멤버
          </h2>
          <p className="text-sm text-gray-500">
            {isLoading ? '회원 데이터를 불러오는 중입니다.' : `총 ${memberList.length}명`}
          </p>
        </div>

        <label className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="이름, 이메일, 계정 검색"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          회원 목록을 불러오고 있습니다.
        </div>
      )}

      {!isLoading && filteredMembers.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          표시할 회원이 없습니다.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {filteredMembers.map((member) => (
          <button
            type="button"
            key={member.id}
            onClick={() => setSelectedMemberId(member.id)}
            className="member-image-tile group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-slate-100 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
            title={member.name}
          >
            <MemberAvatar member={member} className="h-full w-full text-5xl" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-slate-950/78 px-2.5 py-2 text-left transition-transform duration-200 group-hover:translate-y-0 group-focus:translate-y-0">
              <div className="truncate text-sm font-bold text-white">{member.name}</div>
              <div className="mt-1">
                <RoleBadge member={member} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedMember && createPortal((
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedMemberId(null)}>
          <section className="flex max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <aside className="flex w-80 flex-shrink-0 flex-col border-r-2 border-lime-200 bg-white/55">
              <div className="relative flex-1 p-4">
                <button
                  type="button"
                  onClick={() => setSelectedMemberId(null)}
                  className="absolute left-3 top-3 z-10 rounded-full bg-white/90 p-1.5 text-gray-700 shadow hover:bg-white"
                  aria-label="닫기"
                >
                  <X size={20} aria-hidden="true" />
                </button>
                <MemberAvatar member={selectedMember} className="h-full min-h-80 w-full rounded-lg text-8xl" />
              </div>

              <div className="border-t bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="min-w-0 flex-1 truncate text-lg font-bold text-gray-900">{selectedMember.name}</h2>
                  <RoleBadge member={selectedMember} />
                </div>
                <p className="truncate text-xs text-gray-500">{selectedMember.email || selectedMember.mastodonAccount || selectedMember.id}</p>
              </div>
            </aside>

            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="text-xs text-gray-500">소지금</div>
                  <div className="text-lg font-bold text-yellow-600">{(selectedMember.money || 0).toLocaleString()}원</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="text-xs text-gray-500">탐험</div>
                  <div className="text-lg font-bold text-purple-600">{selectedMember.dailyWalks ?? 0}/{selectedMember.maxDailyWalks ?? 0}회</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="text-xs text-gray-500">포켓몬</div>
                  <div className="text-lg font-bold text-blue-600">{(selectedMember.caughtPokemon || []).filter(Boolean).length}마리</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="text-xs text-gray-500">아이템</div>
                  <div className="text-lg font-bold text-emerald-600">{(selectedMember.inventory || []).filter(Boolean).length}개</div>
                </div>
              </div>

              <section className="rounded-lg border border-blue-200 bg-white p-3">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800">
                  <Shield size={16} aria-hidden="true" />
                  파트너
                </h3>
                {selectedPartner ? (
                  <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3">
                    <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white p-2">
                      <img
                        src={getPokemonImage(selectedPartner)}
                        alt={getPokemonName(selectedPartner)}
                        className="member-pokemon-modal-sprite object-contain pokemon-sprite"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-bold text-gray-800">{getPokemonName(selectedPartner)}</h4>
                      <p className="text-sm text-gray-600">Lv.{selectedPartner.level || 1}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">파트너 포켓몬이 없습니다.</p>
                )}
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-3">
                <h3 className="mb-2 text-sm font-bold text-gray-800">엔트리</h3>
                {selectedParty.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {selectedParty.map((pokemon, index) => (
                      <div key={pokemon.uniqueId || pokemon.id || index} className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                        <div className="mb-1 flex h-28 items-center justify-center rounded bg-white">
                          <img
                            src={getPokemonImage(pokemon)}
                            alt={getPokemonName(pokemon)}
                            className="member-pokemon-modal-sprite object-contain pokemon-sprite"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </div>
                        <div className="truncate text-center text-xs font-semibold text-gray-800">{getPokemonName(pokemon)}</div>
                        <div className="text-center text-xs text-gray-500">Lv.{pokemon.level || 1}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">등록된 포켓몬이 없습니다.</p>
                )}
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-3">
                <h3 className="mb-2 text-sm font-bold text-gray-800">보유 아이템</h3>
                {selectedInventory.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {selectedInventory.map((item, index) => (
                      <div key={item.itemId || item.id || index} className="rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-center">
                        <div className="mx-auto mb-1 h-10 w-10">
                          <img
                            src={item.imageUrl || item.spriteUrl || POKEMON_PLACEHOLDER}
                            alt={item.name || '아이템'}
                            className="h-full w-full object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </div>
                        <div className="truncate text-xs font-semibold text-gray-700">{item.name || '아이템'}</div>
                        <div className="text-xs text-gray-500">x{item.count ?? 1}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">보유 아이템이 없습니다.</p>
                )}
              </section>
            </div>
          </section>
        </div>
      ), document.body)}
    </div>
  );
}
