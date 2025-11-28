import React from 'react';
import { useBattle } from '../hooks/useBattle';

/**
 * 포켓몬 배틀 아레나 - 심플 텍스트 기반
 */
export function BattleArena({ player1Pokemon, player2Pokemon }) {
  const { battleState, useMove: executeMove, resetBattle } = useBattle(player1Pokemon, player2Pokemon);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">포켓몬 배틀</h1>
          <div className="flex gap-4">
            <span className="text-gray-600">턴: {battleState.turn}</span>
            <button
              onClick={resetBattle}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
            >
              재시작
            </button>
          </div>
        </div>

        {battleState.winner && (
          <div className="p-4 bg-green-100 border border-green-400 rounded mb-4">
            <p className="text-center font-bold text-green-800">
              {battleState.winner === 'player1' ? player1Pokemon.name : player2Pokemon.name}의 승리!
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="border rounded p-4">
          <h2 className="font-bold text-lg mb-2">{battleState.player1.pokemon.name}</h2>
          <p className="text-sm text-gray-600 mb-2">Lv.{battleState.player1.pokemon.level}</p>
          <p className="mb-1">
            HP: {battleState.player1.currentHP} / {battleState.player1.pokemon.stats.hp}
          </p>
          <div className="w-full bg-gray-200 h-2 rounded mb-3">
            <div
              className="bg-green-500 h-full rounded transition-all"
              style={{
                width: `${(battleState.player1.currentHP / battleState.player1.pokemon.stats.hp) * 100}%`
              }}
            />
          </div>

          {!battleState.winner && (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-semibold mb-2">기술 선택:</p>
              {battleState.player1.pokemon.moves.map((move, idx) => (
                <button
                  key={idx}
                  onClick={() => executeMove('player1', idx)}
                  className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-left"
                >
                  {move.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded p-4">
          <h2 className="font-bold text-lg mb-2">{battleState.player2.pokemon.name}</h2>
          <p className="text-sm text-gray-600 mb-2">Lv.{battleState.player2.pokemon.level}</p>
          <p className="mb-1">
            HP: {battleState.player2.currentHP} / {battleState.player2.pokemon.stats.hp}
          </p>
          <div className="w-full bg-gray-200 h-2 rounded">
            <div
              className="bg-green-500 h-full rounded transition-all"
              style={{
                width: `${(battleState.player2.currentHP / battleState.player2.pokemon.stats.hp) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      <div className="border rounded p-4">
        <h2 className="font-bold mb-3">배틀 로그</h2>
        <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-sm">
          {battleState.log.length === 0 ? (
            <p className="text-gray-400">배틀이 시작되지 않았습니다.</p>
          ) : (
            battleState.log.map((entry, idx) => (
              <div key={idx} className="py-1">
                <span className="text-gray-500">[턴 {entry.turn}]</span>{' '}
                {entry.message}
                {entry.damage !== undefined && (
                  <span className="text-red-600 font-bold"> ({entry.damage} 데미지)</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}