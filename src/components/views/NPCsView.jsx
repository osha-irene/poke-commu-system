import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

export default function PlayersView() {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [players] = useState([
    {
      id: 'player1',
      name: '최민',
      age: 27,
      height: 181,
      imageUrl: 'https://via.placeholder.com/300x600/4F46E5/FFFFFF?text=Player',
      isLocked: true,
      badges: ['H 252', 'A 0', 'B 0', 'C 0', 'D 252', 'S 0'],
      partner: { name: '포켓몬 이름', level: 100, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png' },
      entry: [
        { name: '엔트리1', level: 100, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/470.png' },
        { name: '엔트리2', level: 100, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/471.png' },
        { name: '엔트리3', level: 100, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' },
        { name: '엔트리4', level: 100, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/131.png' },
        { name: '엔트리5', level: 100, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png' },
        { name: '엔트리6', level: 100, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png' }
      ],
      items: [
        { name: '아이템1', imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png' },
        { name: '아이템2', imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png' },
        { name: '아이템3', imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png' },
        { name: '아이템4', imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' },
        { name: '아이템5', imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png' },
        { name: '아이템6', imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png' }
      ]
    },
    {
      id: 'player2',
      name: '희진',
      age: 25,
      height: 165,
      imageUrl: 'https://via.placeholder.com/300x600/10B981/FFFFFF?text=Player+2',
      isLocked: false,
      badges: ['H 252', 'A 252', 'B 0', 'C 0', 'D 4', 'S 0'],
      partner: { name: '리자몽', level: 85, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png' },
      entry: [
        { name: '이상해꽃', level: 82, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png' }
      ],
      items: []
    }
  ]);

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">플레이어</h2>
          <p className="text-sm text-gray-500">{players.length}명</p>
        </div>
        <button className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold flex items-center gap-1.5">
          <Plus size={16} />
          추가
        </button>
      </div>

      {/* 검색 */}
      <input
        type="text"
        placeholder="이름 검색..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
      />

      {/* 그리드 */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredPlayers.map(player => (
          <div
            key={player.id}
            onClick={() => setSelectedPlayer(player)}
            className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group border border-gray-200 hover:border-blue-500 transition-all"
          >
            <img 
              src={player.imageUrl}
              alt={player.name}
              className="w-full h-full object-cover group-hover:brightness-75 transition-all"
            />
            {player.isLocked && (
              <div className="absolute top-1.5 right-1.5 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded font-semibold">
                🔒
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
              <h3 className="text-white font-bold text-sm mb-0.5">{player.name}</h3>
              <p className="text-white/90 text-xs">{player.age}세 • {player.height}cm</p>
            </div>
          </div>
        ))}
      </div>

      {/* 전체화면 모달 */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPlayer(null)}>
          <div className="bg-white rounded-lg w-full max-w-5xl h-[85vh] max-h-[800px] overflow-hidden flex" onClick={(e) => e.stopPropagation()}>
            {/* 왼쪽: 사람 전신 이미지 */}
            <div className="w-80 flex-shrink-0 border-r-2 border-lime-200 bg-white/55 flex flex-col">
              <button 
                onClick={() => setSelectedPlayer(null)} 
                className="absolute top-3 left-3 bg-white/90 hover:bg-white rounded-full p-1.5 transition-colors z-10"
              >
                <X size={20} />
              </button>

              {/* 헤더 정보 */}
              <div className="p-3 bg-blue-600 text-white flex-shrink-0">
                <div className="flex gap-1.5 mb-1.5 text-xs">
                  <span className="bg-white/20 px-2 py-0.5 rounded font-semibold">ID:{selectedPlayer.id}</span>
                  {selectedPlayer.isLocked && <span className="bg-red-500 px-2 py-0.5 rounded font-semibold">🔒</span>}
                </div>
                <h2 className="text-lg font-bold">{selectedPlayer.name}</h2>
                <p className="text-xs text-blue-100">채희 (러너이름) • {selectedPlayer.age}세 • {selectedPlayer.height}cm</p>
              </div>

              {/* 전신 이미지 */}
              <div className="flex-1 flex items-center justify-center p-3 min-h-0">
                <img 
                  src={selectedPlayer.imageUrl}
                  alt={selectedPlayer.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* 액션 버튼 */}
              <div className="p-2 flex gap-2 bg-white border-t flex-shrink-0">
                <button className="flex-1 flex items-center justify-center gap-1 bg-blue-50 text-blue-700 px-2 py-1.5 rounded text-xs font-semibold hover:bg-blue-100">
                  <Edit2 size={12} />
                  편집
                </button>
                <button className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-700 px-2 py-1.5 rounded text-xs font-semibold hover:bg-red-100">
                  <Trash2 size={12} />
                  삭제
                </button>
              </div>
            </div>

            {/* 오른쪽: 포켓몬 데이터 */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-3 space-y-2.5">
              {/* 파트너 포켓몬 */}
              <div className="bg-white rounded-lg border border-blue-200 p-2.5">
                <h3 className="font-bold text-xs text-gray-800 mb-2 flex items-center gap-1.5">
                  <span>파트너</span>
                  <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">포켓몬 이름</span>
                </h3>
                {selectedPlayer.partner && (
                  <div className="flex items-center gap-2.5 bg-white/40 rounded border border-lime-200 p-2">
                    <div className="w-16 h-16 bg-white rounded border border-blue-300 flex items-center justify-center flex-shrink-0">
                      <img 
                        src={selectedPlayer.partner.sprite} 
                        alt={selectedPlayer.partner.name}
                        className="w-14 h-14"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-800 truncate">{selectedPlayer.partner.name}</h4>
                      <p className="text-xs text-gray-600">Lv.{selectedPlayer.partner.level}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 엔트리 포켓몬 */}
              <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                <h3 className="font-bold text-xs text-gray-800 mb-2">엔트리</h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {selectedPlayer.entry?.map((poke, i) => (
                    <div key={i} className="bg-gray-50 rounded border border-gray-200 p-1.5">
                      <div className="w-full h-14 bg-white rounded flex items-center justify-center mb-1">
                        <img 
                          src={poke.sprite} 
                          alt={poke.name}
                          className="w-12 h-12"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-xs text-gray-800 truncate">{poke.name}</div>
                        <div className="text-xs text-gray-500">Lv.{poke.level}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 뱃지 or 컨테스트 리본 */}
              <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                <h3 className="font-bold text-xs text-gray-800 mb-2">뱃지 or 컨테스트 리본</h3>
                <div className="grid grid-cols-6 gap-1.5">
                  {selectedPlayer.items?.map((item, i) => (
                    <div key={i} className="w-full h-12 bg-white/40 rounded border border-lime-200 flex items-center justify-center">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-9 h-9"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 노력치 */}
              <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                <h3 className="font-bold text-xs text-gray-800 mb-2">노력치</h3>
                <div className="flex flex-wrap gap-1">
                  {selectedPlayer.badges.map((badge, i) => (
                    <span key={i} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
