import React, { useState } from 'react';
import { Heart, RefreshCw, Shield, Swords, TrendingUp, Users, Zap } from 'lucide-react';
import useAdvancedBattle from '../hooks/useAdvancedBattle';

const BOOST_LABELS = {
  atk: '공격',
  def: '방어',
  spa: '특수공격',
  spd: '특수방어',
  spe: '스피드',
  accuracy: '명중률',
  evasion: '회피율',
};

const formatBoosts = (boosts = {}) => Object.entries(boosts)
  .filter(([, value]) => value !== 0)
  .map(([stat, value]) => `${BOOST_LABELS[stat] || stat} ${value > 0 ? '+' : ''}${value}`);

const pokemonLabel = (pokemon) => pokemon.nickname || pokemon.name || pokemon.species || '포켓몬';

export function AdvancedBattleSimulator({ player1Team, player2Team }) {
  const {
    battleState,
    startBattle,
    selectMove,
    resetBattle,
    previewDamage,
  } = useAdvancedBattle({
    player1Team,
    player2Team,
    battleFormat: 'Singles',
    generation: 9,
  });

  const [selectedP1Pokemon, setSelectedP1Pokemon] = useState([0]);
  const [selectedP2Pokemon, setSelectedP2Pokemon] = useState([0]);
  const [showDamagePreview, setShowDamagePreview] = useState(null);

  const toggleSelection = (index, setter) => {
    setter((prev) => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      if (prev.length < 6) return [...prev, index];
      return prev;
    });
  };

  if (battleState.phase === 'team_selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
              <Users className="text-blue-600" size={36} />
              포켓몬 배틀 시뮬레이터
              <Users className="text-red-600" size={36} />
            </h1>
            <p className="text-gray-600">각 플레이어의 포켓몬을 1~6마리 선택하세요.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 border-4 border-blue-500 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                <Shield className="text-blue-600" size={24} />
                Player 1 팀 선택
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                선택한 포켓몬 {selectedP1Pokemon.length}마리
              </p>
              <div className="space-y-2">
                {player1Team.map((pokemon, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleSelection(idx, setSelectedP1Pokemon)}
                    className={`w-full p-4 rounded-lg font-semibold transition-all flex items-center justify-between ${
                      selectedP1Pokemon.includes(idx)
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-gray-800 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {selectedP1Pokemon.includes(idx) ? '✓' : '○'}
                      </div>
                      <div className="text-left">
                        <div className="font-bold">{pokemonLabel(pokemon)}</div>
                        <div className="text-sm opacity-80">
                          Lv.{pokemon.level} {pokemon.types?.join('/')}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm opacity-80">
                      HP: {pokemon.stats?.hp || pokemon.hp}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-red-900 mb-4 flex items-center gap-2">
                <Swords className="text-red-600" size={24} />
                Player 2 팀 선택
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                선택한 포켓몬 {selectedP2Pokemon.length}마리
              </p>
              <div className="space-y-2">
                {player2Team.map((pokemon, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleSelection(idx, setSelectedP2Pokemon)}
                    className={`w-full p-4 rounded-lg font-semibold transition-all flex items-center justify-between ${
                      selectedP2Pokemon.includes(idx)
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-white text-gray-800 hover:bg-red-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {selectedP2Pokemon.includes(idx) ? '✓' : '○'}
                      </div>
                      <div className="text-left">
                        <div className="font-bold">{pokemonLabel(pokemon)}</div>
                        <div className="text-sm opacity-80">
                          Lv.{pokemon.level} {pokemon.types?.join('/')}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm opacity-80">
                      HP: {pokemon.stats?.hp || pokemon.hp}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => {
                if (selectedP1Pokemon.length > 0 && selectedP2Pokemon.length > 0) {
                  startBattle(selectedP1Pokemon, selectedP2Pokemon);
                } else {
                  alert('각 플레이어는 최소 1마리의 포켓몬을 선택해야 합니다.');
                }
              }}
              disabled={selectedP1Pokemon.length === 0 || selectedP2Pokemon.length === 0}
              className="bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-12 py-4 rounded-lg font-bold text-xl shadow-lg transition-all disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
            >
              <Zap size={24} />
              배틀 시작!
              <Zap size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (battleState.phase === 'finished') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md">
          <div className="text-8xl mb-6">🏆</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            {battleState.winner} 승리!
          </h1>
          <div className="mb-6 text-gray-600">
            <p className="mb-2">총 {battleState.turn}턴</p>
            <p>Player 1 기절: {battleState.player1.fainted.length}마리</p>
            <p>Player 2 기절: {battleState.player2.fainted.length}마리</p>
          </div>
          <button
            onClick={resetBattle}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto transition-colors"
          >
            <RefreshCw size={20} />
            다시 하기
          </button>
        </div>
      </div>
    );
  }

  const p1Active = battleState.player1.active[0];
  const p2Active = battleState.player2.active[0];

  if (!p1Active || !p2Active) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">포켓몬이 없습니다</h2>
          <button
            onClick={resetBattle}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            리셋
          </button>
        </div>
      </div>
    );
  }

  const renderPokemonPanel = (player, active, opponent, color) => {
    const waiting = player === 'player1' ? battleState.waitingForP1 : battleState.waitingForP2;
    const side = player === 'player1' ? battleState.player1 : battleState.player2;
    const borderClass = color === 'blue' ? 'border-blue-500 bg-blue-50' : 'border-red-500 bg-red-50';
    const titleClass = color === 'blue' ? 'text-blue-900' : 'text-red-900';
    const buttonClass = color === 'blue'
      ? 'bg-blue-600 hover:bg-blue-700'
      : 'bg-red-600 hover:bg-red-700';

    return (
      <div className={`${borderClass} border-4 rounded-2xl p-6 shadow-xl`}>
        <div className="text-center mb-4">
          <h2 className={`text-2xl font-bold ${titleClass} mb-2`}>
            {player === 'player1' ? 'Player 1' : 'Player 2'}: {pokemonLabel(active)}
          </h2>
          <div className="text-sm text-gray-600 mb-2">
            Lv.{active.level} | {active.types?.join('/')} | {active.ability}
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="text-red-500" size={20} />
            <div className="font-semibold">
              HP: {active.currentHP} / {active.maxHP}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                active.currentHP / active.maxHP > 0.5 ? 'bg-green-500'
                  : active.currentHP / active.maxHP > 0.2 ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${(active.currentHP / active.maxHP) * 100}%` }}
            />
          </div>
          {active.status && (
            <div className="mt-2 text-sm bg-red-100 text-red-800 px-3 py-1 rounded-full inline-block">
              {active.status}
            </div>
          )}
          {formatBoosts(active.boosts).length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {formatBoosts(active.boosts).map(boost => (
                <span key={boost} className="text-xs bg-white text-gray-900 px-2 py-1 rounded-full">
                  {boost}
                </span>
              ))}
            </div>
          )}
          {active.volatileStatus?.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {active.volatileStatus.map(status => (
                <span key={status} className="text-xs bg-purple-100 text-purple-900 px-2 py-1 rounded-full">
                  {status}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className={`font-bold ${titleClass} mb-3 flex items-center gap-2`}>
            <Swords size={20} />
            기술 선택:
          </h3>
          {active.moves?.map((move, i) => (
            <button
              key={i}
              onClick={() => selectMove(player, 0, i)}
              onMouseEnter={() => {
                const preview = previewDamage(active, opponent, move.nameEn || move.id || move.name);
                setShowDamagePreview({ player, move: move.name || move.id, preview });
              }}
              onMouseLeave={() => setShowDamagePreview(null)}
              disabled={!waiting || move.disabled}
              className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                waiting && !move.disabled
                  ? `${buttonClass} text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5`
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span>{move.name || move.id}</span>
                <span className="text-xs opacity-80">
                  {move.disabled ? `봉인됨${move.disabledSource ? ` (${move.disabledSource})` : ''}` : `${move.type} | ${move.category}`}
                </span>
              </div>
            </button>
          ))}
        </div>

        {waiting && (
          <div className={`mt-4 border-2 rounded-lg p-3 text-center ${color === 'blue' ? 'bg-blue-100 border-blue-300' : 'bg-red-100 border-red-300'}`}>
            <div className={`${color === 'blue' ? 'text-blue-800' : 'text-red-800'} font-semibold animate-pulse`}>
              기술을 선택하세요!
            </div>
          </div>
        )}

        {side.bench.length > 0 && (
          <div className="mt-4">
            <h3 className={`font-bold ${titleClass} mb-2 text-sm`}>대기 중</h3>
            <div className="grid grid-cols-3 gap-2">
              {side.bench.map((pokemon, idx) => (
                <div key={idx} className="bg-white p-2 rounded text-xs text-center">
                  <div className="font-semibold truncate">{pokemonLabel(pokemon)}</div>
                  <div className="text-gray-600">
                    HP: {pokemon.currentHP}/{pokemon.maxHP}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <Swords className="text-red-600" size={32} />
            포켓몬 배틀
            <Shield className="text-blue-600" size={32} />
          </h1>
          <div className="text-xl text-gray-600 font-semibold flex items-center justify-center gap-4">
            <span>턴 {battleState.turn}</span>
            {battleState.field.weather && (
              <span className="text-sm bg-yellow-100 px-3 py-1 rounded-full">
                날씨: {battleState.field.weather}
              </span>
            )}
            {battleState.field.terrain && (
              <span className="text-sm bg-green-100 px-3 py-1 rounded-full">
                필드: {battleState.field.terrain}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          {renderPokemonPanel('player1', p1Active, p2Active, 'blue')}
          {renderPokemonPanel('player2', p2Active, p1Active, 'red')}
        </div>

        {showDamagePreview && !showDamagePreview.preview?.error && (
          <div className="bg-white rounded-lg shadow-lg p-4 mb-6 border-2 border-yellow-400">
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <TrendingUp className="text-yellow-600" size={20} />
              데미지 미리보기: {showDamagePreview.move}
            </h3>
            <div className="text-sm text-gray-700">
              <p>{showDamagePreview.preview.damagePercent}</p>
              {showDamagePreview.preview.koChance && (
                <p className="text-red-600 font-semibold">
                  KO 확률: {showDamagePreview.preview.koChance.text}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Zap size={24} className="text-yellow-500" />
            배틀 로그
          </h3>

          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            {battleState.log.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                로그가 없습니다.
              </p>
            ) : (
              <div className="space-y-1">
                {battleState.log.map((entry, i) => (
                  <div
                    key={i}
                    className={`px-3 py-2 rounded text-sm ${
                      entry.type === 'system' ? 'bg-blue-100 font-bold'
                        : entry.type === 'damage' ? 'bg-red-50'
                          : entry.type === 'faint' ? 'bg-gray-200 font-semibold'
                            : entry.type === 'winner' ? 'bg-yellow-100 font-bold text-lg'
                              : 'bg-white'
                    }`}
                  >
                    {entry.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={resetBattle}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto transition-colors"
          >
            <RefreshCw size={20} />
            배틀 리셋
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdvancedBattleSimulator;
