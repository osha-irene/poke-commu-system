import React, { useState, useMemo } from 'react';
import { 
  Edit, Save, X, Trash2, Star, Sparkles, Image, 
  Award, Heart, Zap, Shield, Gift, Plus, Minus
} from 'lucide-react';

const getCategoryIcon = (category) => {
  if (category === '물리') return <Zap size={14} className="text-orange-500" />;
  if (category === '특수') return <Star size={14} className="text-purple-500" />;
  if (category === '변화') return <Shield size={14} className="text-blue-500" />;
  return null;
};

const POKEBALL_LIST = [
  { name: '몬스터볼', nameEn: 'poke-ball' },
  { name: '수퍼볼', nameEn: 'great-ball' },
  { name: '하이퍼볼', nameEn: 'ultra-ball' },
  { name: '마스터볼', nameEn: 'master-ball' },
  { name: '프리미어볼', nameEn: 'premier-ball' },
];

function MemberPokemonTab({ 
  member, 
  trainer,
  allPokemonMaster = [], 
  allMoves = [], 
  pokemonLearnsets = {},
  onGivePokemon,
  onEditPokemon,
  onDeletePokemon
}) {
  const [mode, setMode] = useState('view');
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  
  const [editData, setEditData] = useState({
    level: 5,
    friendship: 0,
    nickname: '',
    spriteUrl: '',
    iconUrl: '',
    ballImage: '',
    isShiny: false,
    heldItem: '',
    moves: [],
    effort: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    condition: { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 }
  });
  
  const [giveData, setGiveData] = useState({
    searchQuery: '',
    selectedPokemon: null,
    level: 5,
    friendship: 0,
    nickname: '',
    heldItemName: '',
    caughtWithBall: '몬스터볼',
    isShiny: false,
    selectedMoves: []
  });

  const filteredPokemon = useMemo(() => {
    if (!giveData.searchQuery) return allPokemonMaster.slice(0, 50);
    const query = giveData.searchQuery.toLowerCase();
    return allPokemonMaster
      .filter(p => 
        p.name?.toLowerCase().includes(query) || 
        p.nameEn?.toLowerCase().includes(query) ||
        p.number?.toString().includes(query)
      )
      .slice(0, 50);
  }, [giveData.searchQuery, allPokemonMaster]);

  const availableMoves = useMemo(() => {
    if (!giveData.selectedPokemon) return [];
    const learnset = pokemonLearnsets[giveData.selectedPokemon.number?.toString()];
    if (!learnset) return [];
    
    const levelMoves = learnset.levelUpMoves
      ?.filter(entry => entry.level <= giveData.level)
      .map(entry => allMoves.find(m => m.id === entry.moveId))
      .filter(Boolean) || [];
    
    const machineMoves = learnset.machineMoves
      ?.map(moveId => allMoves.find(m => m.id === moveId))
      .filter(Boolean) || [];
    
    return [...new Map([...levelMoves, ...machineMoves].map(m => [m.id, m])).values()];
  }, [giveData.selectedPokemon, giveData.level, pokemonLearnsets, allMoves]);

  const handleGivePokemon = () => {
    if (!giveData.selectedPokemon) {
      alert('포켓몬을 선택해주세요!');
      return;
    }
    
    const options = {
      level: giveData.level,
      friendship: giveData.friendship,
      nickname: giveData.nickname || null,
      heldItem: giveData.heldItemName || null,
      caughtWithBall: giveData.caughtWithBall,
      isShiny: giveData.isShiny,
      moves: giveData.selectedMoves.slice(0, 4),
      isPartner: false
    };
    
    onGivePokemon?.(member.id, giveData.selectedPokemon, options);
    
    setGiveData({
      searchQuery: '',
      selectedPokemon: null,
      level: 5,
      friendship: 0,
      nickname: '',
      heldItemName: '',
      caughtWithBall: '몬스터볼',
      isShiny: false,
      selectedMoves: []
    });
    setMode('view');
  };

  const handleEditPokemon = () => {
    if (!selectedPokemon) return;
    
    onEditPokemon?.(member.id, selectedPokemon.uniqueId, editData);
    setMode('view');
    setSelectedPokemon(null);
  };

  const startEdit = (pokemon) => {
    setSelectedPokemon(pokemon);
    setEditData({
      level: pokemon.level || 5,
      friendship: pokemon.friendship || 0,
      nickname: pokemon.nickname || '',
      spriteUrl: pokemon.spriteUrl || '',
      iconUrl: pokemon.iconUrl || '',
      ballImage: pokemon.ballImageUrl || '',
      isShiny: pokemon.isShiny || false,
      heldItem: pokemon.heldItem || '',
      moves: pokemon.moves || [],
      effort: pokemon.effort || { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      condition: pokemon.condition || { elegance: 0, beauty: 0, cuteness: 0, intelligence: 0, strength: 0 }
    });
    setMode('edit');
  };

  const renderViewMode = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">보유 포켓몬 ({member.caughtPokemon?.filter(p => p).length || 0}/26)</h3>
        <button
          onClick={() => setMode('give')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Gift size={16} />
          포켓몬 지급
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
        {member.caughtPokemon?.filter(p => p).map((pokemon, idx) => (
          <div key={pokemon.uniqueId || idx} className="bg-white border-2 border-gray-200 rounded-lg p-3 hover:border-blue-300">
            <div className="flex gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                <img 
                  src={pokemon.spriteUrl || pokemon.imageUrl} 
                  alt={pokemon.name}
                  className="w-14 h-14"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {pokemon.isShiny && <Sparkles size={14} className="text-yellow-500" />}
                  <span className="font-bold text-sm truncate">{pokemon.nickname || pokemon.name}</span>
                </div>
                <div className="text-xs text-gray-600 space-y-0.5">
                  <div>Lv.{pokemon.level} | {pokemon.type}</div>
                  <div className="flex items-center gap-1">
                    <Heart size={10} className="text-pink-500" />
                    <span>{pokemon.friendship || 0}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => startEdit(pokemon)}
                  className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  title="편집"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`${pokemon.nickname || pokemon.name}을(를) 삭제하시겠습니까?`)) {
                      onDeletePokemon?.(member.id, pokemon.uniqueId);
                    }
                  }}
                  className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"
                  title="삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGiveMode = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">포켓몬 지급</h3>
        <button
          onClick={() => setMode('view')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <X size={16} />
          취소
        </button>
      </div>

      <input
        type="text"
        placeholder="포켓몬 검색 (이름, 번호)..."
        value={giveData.searchQuery}
        onChange={(e) => setGiveData(prev => ({ ...prev, searchQuery: e.target.value }))}
        className="w-full px-4 py-2 border rounded-lg"
      />

      <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-2 bg-gray-50 rounded">
        {filteredPokemon.map(pokemon => (
          <button
            key={pokemon.id}
            onClick={() => setGiveData(prev => ({ ...prev, selectedPokemon: pokemon }))}
            className={`p-2 rounded border-2 transition-all ${
              giveData.selectedPokemon?.id === pokemon.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <img 
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`}
              alt={pokemon.name}
              className="w-full h-12 object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="text-xs text-center mt-1 truncate">{pokemon.name}</div>
          </button>
        ))}
      </div>

      {giveData.selectedPokemon && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">레벨</label>
              <input
                type="number"
                min="1"
                max="100"
                value={giveData.level}
                onChange={(e) => setGiveData(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">친밀도</label>
              <input
                type="number"
                min="0"
                max="255"
                value={giveData.friendship}
                onChange={(e) => setGiveData(prev => ({ ...prev, friendship: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">별명</label>
            <input
              type="text"
              value={giveData.nickname}
              onChange={(e) => setGiveData(prev => ({ ...prev, nickname: e.target.value }))}
              placeholder="별명 (선택사항)"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">포획볼</label>
            <select
              value={giveData.caughtWithBall}
              onChange={(e) => setGiveData(prev => ({ ...prev, caughtWithBall: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            >
              {POKEBALL_LIST.map(ball => (
                <option key={ball.nameEn} value={ball.name}>{ball.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isShiny"
              checked={giveData.isShiny}
              onChange={(e) => setGiveData(prev => ({ ...prev, isShiny: e.target.checked }))}
              className="w-4 h-4"
            />
            <label htmlFor="isShiny" className="text-sm font-semibold flex items-center gap-1">
              <Sparkles size={14} className="text-yellow-500" />
              이로치 (반짝이)
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">기술 선택 (최대 4개)</label>
            <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto p-2 bg-white rounded border">
              {availableMoves.map(move => {
                const isSelected = giveData.selectedMoves.some(m => m.id === move.id);
                return (
                  <button
                    key={move.id}
                    onClick={() => {
                      if (isSelected) {
                        setGiveData(prev => ({
                          ...prev,
                          selectedMoves: prev.selectedMoves.filter(m => m.id !== move.id)
                        }));
                      } else if (giveData.selectedMoves.length < 4) {
                        setGiveData(prev => ({
                          ...prev,
                          selectedMoves: [...prev.selectedMoves, move]
                        }));
                      }
                    }}
                    disabled={!isSelected && giveData.selectedMoves.length >= 4}
                    className={`p-2 text-left rounded border text-xs ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500'
                        : 'border-gray-200 hover:border-blue-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-1">
                      {getCategoryIcon(move.damageClass)}
                      <span className="font-semibold">{move.name}</span>
                    </div>
                    <div className="text-gray-600 text-xs">{move.type}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleGivePokemon}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
          >
            지급하기
          </button>
        </div>
      )}
    </div>
  );

  const renderEditMode = () => {
    if (!selectedPokemon) return null;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">포켓몬 편집: {selectedPokemon.nickname || selectedPokemon.name}</h3>
          <div className="flex gap-2">
            <button
              onClick={handleEditPokemon}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Save size={16} />
              저장
            </button>
            <button
              onClick={() => {
                setMode('view');
                setSelectedPokemon(null);
              }}
              className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              <X size={16} />
              취소
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1">레벨</label>
              <input
                type="number"
                min="1"
                max="100"
                value={editData.level}
                onChange={(e) => setEditData(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">친밀도</label>
              <input
                type="number"
                min="0"
                max="255"
                value={editData.friendship}
                onChange={(e) => setEditData(prev => ({ ...prev, friendship: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">별명</label>
              <input
                type="text"
                value={editData.nickname}
                onChange={(e) => setEditData(prev => ({ ...prev, nickname: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editShiny"
                checked={editData.isShiny}
                onChange={(e) => setEditData(prev => ({ ...prev, isShiny: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="editShiny" className="text-sm font-semibold flex items-center gap-1">
                <Sparkles size={14} className="text-yellow-500" />
                이로치
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 flex items-center gap-2">
                <Image size={14} />
                스프라이트 URL
              </label>
              <input
                type="text"
                value={editData.spriteUrl}
                onChange={(e) => setEditData(prev => ({ ...prev, spriteUrl: e.target.value }))}
                className="w-full px-3 py-2 border rounded text-xs"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">볼 이미지 URL</label>
              <input
                type="text"
                value={editData.ballImage}
                onChange={(e) => setEditData(prev => ({ ...prev, ballImage: e.target.value }))}
                className="w-full px-3 py-2 border rounded text-xs"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Award size={14} />
                노력치
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(editData.effort).map(([stat, value]) => (
                  <div key={stat}>
                    <label className="text-xs text-gray-600">{stat}</label>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={value}
                      onChange={(e) => setEditData(prev => ({
                        ...prev,
                        effort: { ...prev.effort, [stat]: parseInt(e.target.value) || 0 }
                      }))}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Star size={14} />
                컨디션
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(editData.condition).map(([stat, value]) => (
                  <div key={stat}>
                    <label className="text-xs text-gray-600">{stat}</label>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={value}
                      onChange={(e) => setEditData(prev => ({
                        ...prev,
                        condition: { ...prev.condition, [stat]: parseInt(e.target.value) || 0 }
                      }))}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      {mode === 'view' && renderViewMode()}
      {mode === 'give' && renderGiveMode()}
      {mode === 'edit' && renderEditMode()}
    </div>
  );
}

export default MemberPokemonTab;