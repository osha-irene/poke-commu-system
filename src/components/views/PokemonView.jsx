import useMediaQuery from '../../hooks/useMediaQuery';
import MobilePokemonView from './_mobile/MobilePokemonView';

import React, { useState, useEffect } from 'react';
import { Package, ArrowDown, ArrowUp } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import PartySlot from './pokemon/PartySlot';
import { PartnerSlot, EggSlot } from './pokemon/PartySlot';
import BoxPokemon from './pokemon/BoxPokemon';
import PokemonDetailPanel from './pokemon/PokemonDetailPanel';
import { getButtonClass, getCardClass } from '../../styles/theme';

function DesktopPokemonView() {
  const {
    caughtPokemon = [],
    items = [],
    allItems = [],
    gamePokedex = [],
    allPokemonMaster = [],
    movePokemonToParty: onMoveToParty,
    movePokemonToBox: onMoveToBox,
    releasePokemon: onReleasePokemon,
    useRareCandy: onUseRareCandy,
    updatePokemonNickname: onUpdateNickname,
    giveItemToPokemon: onGiveItem,
    takeItemFromPokemon: onTakeItem,
    setPartnerPokemon: onSetPartner,
    forgetMove: onForgetMove,
    learnMove: onLearnMove,
    reorderPartyPokemon: onReorderParty,
    currentUser,
    allMoves = [],
    pokemonLearnsets = {},
    useItemOnPokemon: onUseItemOnPokemon
  } = useGame();

  const isAdmin = currentUser?.isAdmin || false;

  const [selectedPokemonId, setSelectedPokemonId] = useState(null);
  const [showBox, setShowBox] = useState(false);
  const [draggedPokemon, setDraggedPokemon] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderList, setReorderList] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  
  const [isDraggingInParty, setIsDraggingInParty] = useState(false);
  const [partyDraggedIndex, setPartyDraggedIndex] = useState(null);
  const [partyHoverIndex, setPartyHoverIndex] = useState(null);
  const dragOverTimeoutRef = React.useRef(null);
  const dropSuccessRef = React.useRef(false);
  
  // 파트너 포켓몬은 caughtPokemon 배열에서 찾되, 엔트리/박스에서는 제외
  const partnerPokemon = caughtPokemon.find(p => p && p.isPartner) || null;
  
  // 엔트리와 박스는 원래 배열 그대로 사용 (파트너도 포함)
  const partySlots = caughtPokemon.slice(0, 6);
  while (partySlots.length < 6) partySlots.push(null);
  
  const box = caughtPokemon.slice(6).filter(p => p !== null);
  
  // 알 찾기 (임시 데이터)
  const currentEgg = null;
  
  const rareCandy = items?.find(item => 
    item.name === '이상한사탕' || 
    item.nameEn?.toLowerCase().includes('rare candy')
  );
  const hasRareCandy = rareCandy && rareCandy.count > 0;
  const rareCandyImage = rareCandy?.imageUrl;

  const selectedPokemon = selectedPokemonId 
    ? caughtPokemon.find(p => p && p.uniqueId === selectedPokemonId)
    : null;

  const selectedPokemonIndex = selectedPokemon 
    ? caughtPokemon.findIndex(p => p && p.uniqueId === selectedPokemon.uniqueId)
    : -1;
  const isSelectedInParty = selectedPokemonIndex >= 0 && selectedPokemonIndex < 6;

  useEffect(() => {
    if (selectedPokemonId && !selectedPokemon) {
      setSelectedPokemonId(null);
    }
  }, [selectedPokemonId, selectedPokemon]);

  useEffect(() => {
    const resetDragState = () => {
      setDraggedPokemon(null);
      setDropTarget(null);
      setIsDraggingInParty(false);
      setPartyDraggedIndex(null);
      setPartyHoverIndex(null);
      dropSuccessRef.current = false;
      dragEndExecutedRef.current = false;
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        console.log('ESC - 드래그 상태 리셋');
        resetDragState();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const dragEndExecutedRef = React.useRef(false);

  const handleDragStart = (e, pokemon, isInParty, slotIndex) => {
    if (!pokemon) return;
    
    console.log('드래그 시작!', {
      pokemonName: pokemon.name,
      slotIndex,
      isInParty,
      totalPartyPokemon: partySlots.filter(p => p !== null).length,
      partySlots: partySlots.map((p, i) => `[${i}] ${p?.name || 'null'}`)
    });
    
    e.stopPropagation();
    
    dropSuccessRef.current = false;
    dragEndExecutedRef.current = false;
    console.log('드래그 시작, 플래그 리셋');
    
    const actualIndex = caughtPokemon.findIndex(p => p && p.uniqueId === pokemon.uniqueId);
    const actualIsInParty = actualIndex >= 0 && actualIndex < 6;
    
    if (actualIsInParty && slotIndex !== undefined) {
      setIsDraggingInParty(true);
      setPartyDraggedIndex(slotIndex);
    } else {
      setIsDraggingInParty(false);
      setPartyDraggedIndex(null);
    }
    
    setDraggedPokemon({ pokemon, isInParty: actualIsInParty, slotIndex: actualIndex });
    e.dataTransfer.effectAllowed = 'move';
    
    const dragImage = new Image();
    dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(dragImage, 0, 0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnterParty = (e) => {
    e.preventDefault();
    if (draggedPokemon && !draggedPokemon.isInParty) {
      setDropTarget('party');
    }
  };

  const handleDragEnterBox = (e) => {
    e.preventDefault();
    if (draggedPokemon && draggedPokemon.isInParty) {
      setDropTarget('box');
    }
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) {
      return;
    }
    setDropTarget(null);
  };

  const handleDropToParty = (e) => {
    e.preventDefault();
    
    if (isDraggingInParty) {
      return;
    }
    
    setDropTarget(null);
    if (draggedPokemon && !draggedPokemon.isInParty) {
      onMoveToParty(draggedPokemon.pokemon.uniqueId);
      setDraggedPokemon(null);
    }
  };

  const handleDropToBox = (e) => {
    e.preventDefault();
    setDropTarget(null);
    if (draggedPokemon && draggedPokemon.isInParty) {
      onMoveToBox(draggedPokemon.pokemon.uniqueId);
      setDraggedPokemon(null);
    }
  };

  const handleDragEnd = () => {
    if (dragEndExecutedRef.current) {
      console.log('handleDragEnd 이미 실행됨 - 무시');
      return;
    }
    
    dragEndExecutedRef.current = true;
    
    console.log('handleDragEnd 호출, dropSuccess:', dropSuccessRef.current);
    
    const wasSuccessful = dropSuccessRef.current;
    
    if (wasSuccessful) {
      console.log('드롭 성공 - 정리 중');
    } else {
      console.log('드롭 실패 - 정리 중');
    }
    
    setTimeout(() => {
      if (!dragEndExecutedRef.current) {
        console.log('새 드래그 시작됨 - 정리 취소');
        return;
      }
      
      console.log('최종 정리!');
      setDraggedPokemon(null);
      setDropTarget(null);
      setIsDraggingInParty(false);
      setPartyDraggedIndex(null);
      setPartyHoverIndex(null);
      dropSuccessRef.current = false;
      dragEndExecutedRef.current = false;
    }, 50);
  };

  const handlePokemonClick = (pokemon) => {
    if (!pokemon) return;
    
    console.log('포켓몬 클릭 - 드래그 상태 초기화');
    setDraggedPokemon(null);
    setDropTarget(null);
    setIsDraggingInParty(false);
    setPartyDraggedIndex(null);
    setPartyHoverIndex(null);
    dropSuccessRef.current = false;
    dragEndExecutedRef.current = false;
    
    console.log('선택된 포켓몬:', pokemon.nickname || pokemon.name, 'uniqueId:', pokemon.uniqueId);
    setSelectedPokemonId(pokemon.uniqueId);
  };

  const handleUseCandy = (uniqueId, onLevelUpCallback) => {
    if (!hasRareCandy) return;
    
    const pokemon = caughtPokemon.find(p => p && p.uniqueId === uniqueId);
    if (!pokemon) return;
    
    if (window.confirm(`${pokemon.nickname || pokemon.name}에게 이상한사탕을 사용하시겠습니까?`)) {
      onUseRareCandy(uniqueId, onLevelUpCallback);
    }
  };

  const handleMove = () => {
    if (!selectedPokemon) return;
    
    if (isSelectedInParty) {
      onMoveToBox(selectedPokemon.uniqueId);
    } else {
      onMoveToParty(selectedPokemon.uniqueId);
    }
  };

  const handleRelease = () => {
    if (!selectedPokemon) return;
    if (window.confirm(`정말 ${selectedPokemon.nickname || selectedPokemon.name}을(를) 방생하시겠습니까?\n되돌릴 수 없습니다!`)) {
      onReleasePokemon(selectedPokemon.uniqueId);
      setSelectedPokemonId(null);
    }
  };

  const handleOpenReorderModal = () => {
    setReorderList(partySlots.map((p, i) => ({ pokemon: p, originalIndex: i })));
    setShowReorderModal(true);
  };

  const handleReorderDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleReorderDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setHoverIndex(index);
  };

  const handleReorderDragLeave = () => {
    setHoverIndex(null);
  };

  const handleReorderDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setHoverIndex(null);
      return;
    }

    const newList = [...reorderList];
    const [draggedItem] = newList.splice(draggedIndex, 1);
    newList.splice(dropIndex, 0, draggedItem);
    
    setReorderList(newList);
    setDraggedIndex(null);
    setHoverIndex(null);
  };

  const handleReorderDragEnd = () => {
    setDraggedIndex(null);
    setHoverIndex(null);
  };

  const handleSaveReorder = () => {
    const newParty = reorderList.map(item => item.pokemon);
    if (onReorderParty) {
      onReorderParty(newParty);
    }
    setShowReorderModal(false);
  };

  const handlePartyDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isDraggingInParty || partyDraggedIndex === null) return;
    if (partyDraggedIndex === index) return;
    
    if (partyHoverIndex !== index) {
      setPartyHoverIndex(index);
    }
  };

  const handlePartyDragLeave = (e) => {
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return;
    }
    
    setPartyHoverIndex(null);
  };

  const handlePartyDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('handlePartyDrop 호출:', { 
      isDraggingInParty, 
      partyDraggedIndex, 
      dropIndex,
      draggedPokemon: partySlots[partyDraggedIndex]?.name,
      targetPokemon: partySlots[dropIndex]?.name
    });
    
    if (!isDraggingInParty || partyDraggedIndex === null) {
      console.log('조건 불충족');
      return;
    }
    
    if (partyDraggedIndex === dropIndex) {
      console.log('같은 위치');
      setPartyHoverIndex(null);
      return;
    }

    dropSuccessRef.current = true;
    
    console.log('순서 변경 시작:', partyDraggedIndex, '->', dropIndex);

    const actualPokemon = partySlots.filter(p => p !== null);
    
    let fromIdx = -1, toIdx = -1;
    let count = 0;
    
    for (let i = 0; i < 6; i++) {
      if (partySlots[i] !== null) {
        if (i === partyDraggedIndex) fromIdx = count;
        if (i === dropIndex) toIdx = count;
        count++;
      }
    }
    
    if (dropIndex >= actualPokemon.length) {
      toIdx = actualPokemon.length - 1;
    }
    
    console.log('실제 이동:', fromIdx, '->', toIdx);
    
    const result = [...actualPokemon];
    const [removed] = result.splice(fromIdx, 1);
    result.splice(toIdx, 0, removed);
    
    console.log('새 순서:', result.map(p => p.name));
    
    if (onReorderParty) {
      console.log('onReorderParty 호출!');
      onReorderParty(result);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      <div className="space-y-6 overflow-y-auto">
        {/* 파트너 포켓몬 슬롯 */}
        <div className={getCardClass('default') + ' p-6'}>
          <PartnerSlot
            pokemon={partnerPokemon}
            onClick={() => {
              if (partnerPokemon) {
                console.log('파트너 포켓몬 클릭:', partnerPokemon.nickname || partnerPokemon.name);
                handlePokemonClick(partnerPokemon);
              }
            }}
            gamePokedex={gamePokedex}
            allPokemonMaster={allPokemonMaster}
            allItems={allItems}
          />
        </div>

        {/* 엔트리 */}
        <div className={getCardClass('default') + ' p-6'}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              엔트리 ({partySlots.filter(p => p !== null).length}/6)
            </h3>
            <button onClick={handleOpenReorderModal}></button>
          </div>
          
          <div 
            className={`space-y-2 transition-all duration-200 rounded-lg ${
              dropTarget === 'party' 
                ? 'bg-indigo-50 border-2 border-dashed border-indigo-400 p-4' 
                : ''
            }`}
            onDragOver={handleDragOver} 
            onDrop={handleDropToParty}
            onDragEnter={handleDragEnterParty}
            onDragLeave={handleDragLeave}
          >
            {dropTarget === 'party' && draggedPokemon && !draggedPokemon.isInParty && (
              <div className="text-center py-4 mb-2">
                <ArrowUp className="inline-block text-indigo-600 animate-bounce" size={32} />
                <div className="text-indigo-600 font-bold mt-2">
                  엔트리로 이동
                </div>
                <div className="text-sm text-indigo-500 mt-1">
                  {draggedPokemon.pokemon.nickname || draggedPokemon.pokemon.name}
                </div>
              </div>
            )}

            {partySlots.map((pokemon, index) => {
              const isDragging = partyDraggedIndex === index && isDraggingInParty;
              const isHovering = partyHoverIndex === index && isDraggingInParty;
              
              const draggedPokemonData = isDraggingInParty && partyDraggedIndex !== null
                ? partySlots[partyDraggedIndex]
                : null;
              
              const shouldShowPlaceholderAbove = isHovering && draggedPokemonData && pokemon !== null && partyDraggedIndex > index;
              const shouldShowPlaceholderBelow = isHovering && draggedPokemonData && pokemon !== null && partyDraggedIndex < index;
              
              return (
                <div 
                  key={`slot-${index}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    
                    if (isDraggingInParty && partyDraggedIndex !== index) {
                      setPartyHoverIndex(index);
                    }
                    if (draggedPokemon && !draggedPokemon.isInParty) {
                      setDropTarget('party');
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (dropSuccessRef.current) return;
                    
                    if (isDraggingInParty && partyDraggedIndex !== index) {
                      console.log('슬롯', index, '에 드롭!');
                      handlePartyDrop(e, index);
                    }
                    else if (draggedPokemon && !draggedPokemon.isInParty) {
                      handleDropToParty(e);
                    }
                  }}
                >
                  {shouldShowPlaceholderAbove && (
                    <div className="mb-2 bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-lg p-3 opacity-70 pointer-events-none">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 flex-shrink-0 bg-white rounded-lg flex items-center justify-center">
                          <img 
                            src={draggedPokemonData.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${draggedPokemonData.number}.png`}
                            alt={draggedPokemonData.name}
                            className="w-10 h-10 object-contain pokemon-sprite"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-indigo-600 text-sm">
                            {draggedPokemonData.nickname || draggedPokemonData.name}
                          </div>
                          <div className="text-xs text-indigo-500">여기로 이동</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className={pokemon ? `transition-opacity duration-150 ${isDragging ? 'opacity-30' : ''}` : ''}>
                    <PartySlot
                      pokemon={pokemon}
                      index={index}
                      isSelected={selectedPokemonId === pokemon?.uniqueId}
                      onDragStart={(e) => pokemon && handleDragStart(e, pokemon, true, index)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handlePokemonClick(pokemon)}
                      isDragging={isDragging}
                      gamePokedex={gamePokedex}
                      allPokemonMaster={allPokemonMaster}
                      allItems={allItems}
                    />
                  </div>
                  
                  {shouldShowPlaceholderBelow && (
                    <div className="mt-2 bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-lg p-3 opacity-70 pointer-events-none">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 flex-shrink-0 bg-white rounded-lg flex items-center justify-center">
                          <img 
                            src={draggedPokemonData.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${draggedPokemonData.number}.png`}
                            alt={draggedPokemonData.name}
                            className="w-10 h-10 object-contain pokemon-sprite"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-indigo-600 text-sm">
                            {draggedPokemonData.nickname || draggedPokemonData.name}
                          </div>
                          <div className="text-xs text-indigo-500">여기로 이동</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 알 슬롯 */}
        <div className={getCardClass('default') + ' p-6'}>
          <EggSlot
            egg={currentEgg}
            onClick={() => currentEgg && console.log('알 클릭')}
          />
        </div>

        <button
          onClick={() => setShowBox(!showBox)}
          className={getCardClass('interactive') + ' w-full p-4 flex items-center justify-between'}
        >
          <div className="flex items-center gap-3">
            <Package size={24} className="text-gray-600" />
            <span className="font-bold text-lg">보관함 ({box.length}마리)</span>
          </div>
          <span className="text-gray-500">{showBox ? '▲ 닫기' : '▼ 열기'}</span>
        </button>

        {showBox && (
          <div className={getCardClass('default') + ' p-6'}>
            <div 
              className={`min-h-[200px] transition-all duration-200 rounded-lg ${
                dropTarget === 'box' 
                  ? 'bg-orange-50 border-2 border-dashed border-orange-400 p-4' 
                  : ''
              }`}
              onDragOver={handleDragOver} 
              onDrop={handleDropToBox}
              onDragEnter={handleDragEnterBox}
              onDragLeave={handleDragLeave}
            >
              {dropTarget === 'box' && draggedPokemon && draggedPokemon.isInParty && (
                <div className="text-center py-4 mb-4">
                  <ArrowDown className="inline-block text-orange-600 animate-bounce" size={32} />
                  <div className="text-orange-600 font-bold mt-2">
                    박스로 이동
                  </div>
                  <div className="text-sm text-orange-500 mt-1">
                    {draggedPokemon.pokemon.nickname || draggedPokemon.pokemon.name}
                  </div>
                </div>
              )}
              
              {box.length > 0 ? (
                <div className="grid grid-cols-6 gap-3">
                  {box.map(pokemon => (
                    <BoxPokemon
                      key={pokemon.uniqueId}
                      pokemon={pokemon}
                      isSelected={selectedPokemonId === pokemon.uniqueId}
                      onDragStart={(e) => handleDragStart(e, pokemon, false)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handlePokemonClick(pokemon)}
                      gamePokedex={gamePokedex}
                      allPokemonMaster={allPokemonMaster}
                    />
                  ))}
                </div>
              ) : dropTarget !== 'box' ? (
                <div className="text-center py-8 text-gray-400">
                  보관함이 비어있습니다
                  <div className="text-xs mt-2">엔트리에서 포켓몬을 드래그하세요</div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="overflow-y-auto">
        {selectedPokemon ? (
          <PokemonDetailPanel
            pokemon={selectedPokemon}
            hasRareCandy={hasRareCandy}
            rareCandyImage={rareCandyImage}
            isInParty={isSelectedInParty}
            allItems={allItems}
            gamePokedex={gamePokedex}
            items={items}
            onClose={() => setSelectedPokemonId(null)}
            onUseCandy={handleUseCandy}
            onMove={handleMove}
            onRelease={handleRelease}
            onUpdateNickname={onUpdateNickname}
            onGiveItem={onGiveItem}
            onTakeItem={onTakeItem}
            onSetPartner={onSetPartner}
            onForgetMove={onForgetMove}
            isAdmin={isAdmin}
            onLearnMove={onLearnMove}    
            allMoves={allMoves} 
            pokemonLearnsets={pokemonLearnsets}
            currentUser={currentUser}
          />
        ) : (
          <div className={getCardClass('default') + ' p-6 h-full flex items-center justify-center'}>
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">👆</div>
              <p>포켓몬을 선택하세요</p>
            </div>
          </div>
        )}
      </div>

      {showReorderModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowReorderModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4">엔트리 순서 변경</h3>
            <p className="text-sm text-gray-600 mb-4">드래그하여 순서를 변경하세요</p>

            <div className="space-y-2 mb-6">
              {reorderList.map((item, index) => {
                const pokemon = item.pokemon;
                const isDragging = draggedIndex === index;
                const isHovering = hoverIndex === index;
                
                return (
                  <div key={item.originalIndex} className="relative">
                    {isHovering && draggedIndex !== null && draggedIndex < index && (
                      <div className="absolute -top-1 left-0 right-0 h-1 bg-indigo-500 rounded-full" />
                    )}
                    
                    <div
                      draggable={!!pokemon}
                      onDragStart={(e) => pokemon && handleReorderDragStart(e, index)}
                      onDragOver={(e) => handleReorderDragOver(e, index)}
                      onDragLeave={handleReorderDragLeave}
                      onDrop={(e) => handleReorderDrop(e, index)}
                      onDragEnd={handleReorderDragEnd}
                      style={{
                        pointerEvents: isDragging ? 'none' : 'auto'
                      }}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                        isDragging 
                          ? 'opacity-40 border-dashed border-gray-400'
                          : pokemon
                            ? 'bg-white border-gray-200 hover:border-indigo-400 hover:shadow-md cursor-move'
                            : 'bg-gray-50 border-gray-200 cursor-not-allowed'
                      } ${isHovering && !isDragging ? 'border-indigo-500 bg-indigo-50' : ''}`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full font-bold text-gray-600">
                        {index + 1}
                      </div>
                      
                      {pokemon ? (
                        <>
                          <div className="w-16 h-16 flex-shrink-0">
                            <img 
                              src={pokemon.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`}
                              alt={pokemon.name}
                              className="w-full h-full object-contain pokemon-sprite"
                            />
                          </div>
                          
                          <div className="flex-1">
                            <div className="font-bold text-gray-800">
                              {pokemon.nickname || pokemon.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Lv.{pokemon.level} • {pokemon.type}
                            </div>
                          </div>

                          {pokemon.isPartner && (
                            <div className="text-pink-500 font-bold text-sm">
                              파트너
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex-1 text-center text-gray-400 text-sm">
                          빈 슬롯
                        </div>
                      )}
                    </div>

                    {isHovering && draggedIndex !== null && draggedIndex > index && (
                      <div className="absolute -bottom-1 left-0 right-0 h-1 bg-indigo-500 rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReorderModal(false)}
                className={getButtonClass('secondary', 'md') + ' flex-1'}
              >
                취소
              </button>
              <button
                onClick={handleSaveReorder}
                className={getButtonClass('primary', 'md') + ' flex-1'}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PokemonView() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  return isMobile ? <MobilePokemonView /> : <DesktopPokemonView />;
}