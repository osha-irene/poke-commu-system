// src/hooks/useGameData.js - Firebase 완전 버전 + TM 통합

import { useState, useEffect } from 'react';
import { ref, get, set, onValue } from 'firebase/database';
import { database } from '../../firebase';
import itemsData from '../../data/items.json';
import regionsData from '../../data/regions.json';
import technicalMachinesData from '../../data/technicalMachines.json';
import { ITEM_POCKETS } from '../../utils/itemUtils';

const toRegionList = (nextRegions = []) => {
  if (Array.isArray(nextRegions)) return nextRegions;
  if (!nextRegions || typeof nextRegions !== 'object') return [];

  const entries = Object.entries(nextRegions);
  const numericEntries = entries
    .filter(([key]) => /^\d+$/.test(key))
    .sort(([a], [b]) => Number(a) - Number(b));

  if (numericEntries.length > 0) {
    return numericEntries.map(([, value]) => value);
  }

  return entries.map(([, value]) => value);
};

const normalizeRegions = (nextRegions = []) => {
  return toRegionList(nextRegions).filter(region => region?.id && region?.name && !(
    region?.isTownMeta && (!region.groupId || !region.groupName)
  ));
};

const buildAllItems = (customItems = []) => {
  const baseItems = itemsData.items;
  const tmItems = technicalMachinesData.tms.map(tm => ({
    id: tm.id,
    name: tm.name,
    nameEn: tm.nameEn,
    category: ITEM_POCKETS.MACHINES,
    categoryData: {
      id: ITEM_POCKETS.MACHINES,
      nameEn: 'machines',
      name: '기술머신',
      pocket: ITEM_POCKETS.MACHINES
    },
    cost: 10000, // 기본 가격 (필요시 조정)
    sellPrice: 5000,
    canSell: true,
    effect: tm.description,
    description: tm.description,
    spriteUrl: tm.spriteUrl,
    imageUrl: tm.spriteUrl,
    // TM 전용 데이터
    tmNumber: tm.tmNumber,
    moveId: tm.moveId,
    type: tm.type,
    typeEn: tm.typeEn,
    moveCategory: tm.category,
    power: tm.power,
    accuracy: tm.accuracy,
    pp: tm.pp,
    isTM: true,
    generation: tm.generation
  }));

  return [...baseItems, ...tmItems, ...(Array.isArray(customItems) ? customItems : [])];
};

const getTownRowsFromRegions = (nextRegions = []) => {
  const townMap = new Map();

  normalizeRegions(nextRegions).forEach(region => {
    if (!region.isTownMeta || !region.groupId || townMap.has(region.groupId)) return;
    townMap.set(region.groupId, {
      groupId: region.groupId,
      groupName: region.groupName,
      x: region.x,
      y: region.y,
      color: region.color,
      isDefaultTown: region.isDefaultTown || false,
      visible: region.groupVisible !== false,
      townOrder: Number.isFinite(Number(region.townOrder)) ? Number(region.townOrder) : null
    });
  });

  // townOrder가 없는 마을은 항상 뒤로 보내고 groupId로 타이브레이크 (비결정적 순서 방지)
  return Array.from(townMap.values()).sort((a, b) => {
    const orderA = a.townOrder !== null ? a.townOrder : Infinity;
    const orderB = b.townOrder !== null ? b.townOrder : Infinity;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.groupId).localeCompare(String(b.groupId));
  });
};

export const useGameData = (allPokemonData) => {
  const [allItems, setAllItems] = useState([]);
  const [regions, setRegions] = useState([]);
  const [gamePokedex, setGamePokedex] = useState([]);
  const [sharedPokedexData, setSharedPokedexData] = useState({});
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceScheduledAt, setMaintenanceScheduledAt] = useState(null);
  const [systemSettings, setSystemSettings] = useState({
    maxNonPartnerPokemon: 18,
    escapeMode: 'none',
    conditionMax: 100,
  });
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 Firebase에서 데이터 로드
  useEffect(() => {
    const loadGameData = async () => {
      try {
        // 1. 지역 데이터 로드
        const regionsRef = ref(database, 'gameData/regions');
        const regionsSnapshot = await get(regionsRef);
        if (regionsSnapshot.exists()) {
          const rawRegions = regionsSnapshot.val();
          const normalizedRegions = normalizeRegions(rawRegions);
          setRegions(normalizedRegions);
          if (JSON.stringify(rawRegions) !== JSON.stringify(normalizedRegions)) {
            await set(regionsRef, normalizedRegions);
            await set(ref(database, 'gameData/towns'), getTownRowsFromRegions(normalizedRegions));
            const configRef = ref(database, 'gameData/config');
            const configSnapshot = await get(configRef);
            const currentConfig = configSnapshot.val() || {};
            await set(configRef, {
              ...currentConfig,
              regions: normalizedRegions
            });
            console.log('🧹 삭제된 마을의 남은 메타 데이터 정리 완료');
          }
          console.log('💾 지역 데이터 로드:', normalizedRegions.length, '개');
        } else {
          // 초기 데이터 설정
          const initialRegions = regionsData.regions.map(region => ({
            ...region,
            pokemons: region.defaultPokemon
          }));
          await set(regionsRef, initialRegions);
          setRegions(initialRegions);
          console.log('🔧 초기 지역 데이터 생성');
        }

        // 4. 영운 도감 로드
        const pokedexRef = ref(database, 'gameData/gamePokedex');
        const pokedexSnapshot = await get(pokedexRef);
        if (pokedexSnapshot.exists()) {
          setGamePokedex(pokedexSnapshot.val());
          console.log('📖 영운 도감 로드 완료:', pokedexSnapshot.val().length, '마리');
        } else {
          // 초기 데이터 설정 (1세대만)
          const initialPokedex = allPokemonData
            .filter(p => parseInt(p.generation) === 1)
            .map((p, index) => ({
              ...p,
              originalNumber: p.number,
              newNumber: index + 1
            }));
          await set(pokedexRef, initialPokedex);
          setGamePokedex(initialPokedex);
          console.log('🔧 초기 영운 도감 생성');
        }

        // 5. 공유 도감 실시간 리스너 (다른 브라우저/기기에서 변경 즉시 반영)
        const sharedPokedexRef = ref(database, 'gameData/sharedPokedex');
        onValue(sharedPokedexRef, (snapshot) => {
          if (snapshot.exists()) {
            const sharedData = snapshot.val();
            const validatedData = {};
            Object.entries(sharedData).forEach(([key, value]) => {
              if (!isNaN(key) && typeof value === 'object' && value !== null) {
                validatedData[key] = value;
              }
            });
            setSharedPokedexData(validatedData);
          } else {
            setSharedPokedexData({});
          }
        });

        // 6. 점검 모드 로드 (onValue로 실시간 처리, 별도 useEffect에서 구독)

        // 7. 시스템 설정 로드
        const systemSettingsRef = ref(database, 'gameData/systemSettings');
        const systemSettingsSnapshot = await get(systemSettingsRef);
        const savedSystemSettings = systemSettingsSnapshot.exists() ? systemSettingsSnapshot.val() : {};
        const savedEscapeMode = ['none', 'instant', 'speed'].includes(savedSystemSettings.escapeMode)
          ? savedSystemSettings.escapeMode
          : 'none';
        const normalizedSystemSettings = {
          maxNonPartnerPokemon: Number(savedSystemSettings.maxNonPartnerPokemon) || 18,
          escapeMode: savedEscapeMode,
          campingSettings: savedSystemSettings.campingSettings || {},
          ...(savedSystemSettings.conditionMax != null && { conditionMax: Number(savedSystemSettings.conditionMax) }),
          ...(savedSystemSettings.pokedexActiveTowns != null && { pokedexActiveTowns: savedSystemSettings.pokedexActiveTowns }),
          ...(savedSystemSettings.hiddenMenus != null && { hiddenMenus: savedSystemSettings.hiddenMenus }),
        };
        await set(systemSettingsRef, normalizedSystemSettings);
        setSystemSettings(normalizedSystemSettings);
        console.log('⚙️ 시스템 설정:', normalizedSystemSettings);

        console.log('✅ 게임 데이터 로딩 완료!');
      } catch (error) {
        console.error('❌ 게임 데이터 로드 실패:', error);
        // 폴백: JSON 파일 사용
        const tmItems = technicalMachinesData.tms.map(tm => ({
          id: tm.id,
          name: tm.name,
          nameEn: tm.nameEn,
          category: 'machines',
          spriteUrl: tm.spriteUrl,
          isTM: true
        }));
        setAllItems([...itemsData.items, ...tmItems]);
        setRegions(regionsData.regions.map(r => ({ ...r, pokemons: r.defaultPokemon })));
        setGamePokedex(allPokemonData.filter(p => parseInt(p.generation) === 1));
        setSharedPokedexData({});
        setMaintenanceMode(false);
        setSystemSettings({ maxNonPartnerPokemon: 18, escapeMode: 'none', campingSettings: {} });
      } finally {
        setIsLoading(false);
      }
    };

    loadGameData();
  }, [allPokemonData]);

  // 커스텀 아이템 실시간 리스너 (관리자가 커스텀 아이템 추가/수정/삭제 시 즉시 반영)
  useEffect(() => {
    if (isLoading) return undefined;

    const customItemsRef = ref(database, 'gameData/customItems');
    const unsubscribe = onValue(customItemsRef, (snapshot) => {
      const customItems = snapshot.exists() ? snapshot.val() : [];
      setAllItems(buildAllItems(customItems));
    });

    return () => unsubscribe();
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return undefined;

    const regionsRef = ref(database, 'gameData/regions');
    const unsubscribe = onValue(regionsRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const rawRegions = snapshot.val();
      const normalizedRegions = normalizeRegions(rawRegions);
      setRegions(prevRegions => (
        JSON.stringify(prevRegions) === JSON.stringify(normalizedRegions)
          ? prevRegions
          : normalizedRegions
      ));
    }, (error) => {
      console.error('지역 데이터 실시간 동기화 실패:', error);
    });

    return () => unsubscribe();
  }, [isLoading]);

  // 영운 도감 실시간 리스너
  useEffect(() => {
    if (isLoading) return undefined;

    const pokedexRef = ref(database, 'gameData/gamePokedex');
    const unsub = onValue(pokedexRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.val();
      setGamePokedex(prev =>
        JSON.stringify(prev) === JSON.stringify(data) ? prev : data
      );
    }, (error) => {
      console.error('영운 도감 실시간 동기화 실패:', error);
    });

    return () => unsub();
  }, [isLoading]);

  // 시스템 설정 실시간 리스너
  useEffect(() => {
    if (isLoading) return undefined;

    const systemSettingsRef = ref(database, 'gameData/systemSettings');
    const unsub = onValue(systemSettingsRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.val();
      setSystemSettings(prev =>
        JSON.stringify(prev) === JSON.stringify(data) ? prev : data
      );
    }, (error) => {
      console.error('시스템 설정 실시간 동기화 실패:', error);
    });

    return () => unsub();
  }, [isLoading]);

  // 🔥 지역 데이터 변경 시 Firebase에 저장
  useEffect(() => {
    const saveRegions = async () => {
      if (isLoading || regions.length === 0) return;
      try {
        const regionsRef = ref(database, 'gameData/regions');
        await set(regionsRef, regions);
        console.log('💾 지역 데이터 저장:', regions.length, '개');
      } catch (error) {
        console.error('❌ 지역 데이터 저장 실패:', error);
      }
    };
    saveRegions();
  }, [regions, isLoading]);

  // 🔥 영운 도감 변경 시 Firebase에 저장
  useEffect(() => {
    const saveGamePokedex = async () => {
      if (isLoading || gamePokedex.length === 0) return;
      try {
        const pokedexRef = ref(database, 'gameData/gamePokedex');
        await set(pokedexRef, gamePokedex);
        console.log('💾 영운 도감 저장:', gamePokedex.length, '마리');
      } catch (error) {
        console.error('❌ 영운 도감 저장 실패:', error);
      }
    };
    saveGamePokedex();
  }, [gamePokedex, isLoading]);

  // 공유 도감은 onValue 실시간 리스너로 관리 — 전체 덮어쓰기 불필요

  // 🔥 점검 모드 실시간 리스너
  useEffect(() => {
    const maintenanceRef = ref(database, 'gameData/maintenanceMode');
    const unsub = onValue(maintenanceRef, (snapshot) => {
      setMaintenanceMode(snapshot.exists() ? snapshot.val() : false);
    });
    return () => unsub();
  }, []);

  // 🔥 점검 예약 시각 실시간 리스너
  useEffect(() => {
    const scheduledRef = ref(database, 'gameData/maintenanceScheduledAt');
    const unsub = onValue(scheduledRef, (snapshot) => {
      setMaintenanceScheduledAt(snapshot.exists() ? snapshot.val() : null);
    });
    return () => unsub();
  }, []);

  const scheduleMaintenanceMode = async (delayMs = 5 * 60 * 1000) => {
    const scheduledAt = Date.now() + delayMs;
    const scheduledRef = ref(database, 'gameData/maintenanceScheduledAt');
    await set(scheduledRef, scheduledAt);
  };

  const cancelScheduledMaintenance = async () => {
    const scheduledRef = ref(database, 'gameData/maintenanceScheduledAt');
    await set(scheduledRef, null);
  };

  // 🔥 점검 모드 변경 시 Firebase에 저장
  useEffect(() => {
    const saveMaintenanceMode = async () => {
      if (isLoading) return;
      try {
        const maintenanceRef = ref(database, 'gameData/maintenanceMode');
        await set(maintenanceRef, maintenanceMode);
        console.log('💾 점검 모드 저장:', maintenanceMode);
      } catch (error) {
        console.error('❌ 점검 모드 저장 실패:', error);
      }
    };
    saveMaintenanceMode();
  }, [maintenanceMode, isLoading]);

  const updatePokedexMemo = async (pokemonNumber, memo, currentUser) => {
    const numericKey = String(pokemonNumber);
    
    const entry = sharedPokedexData[numericKey];
    if (!entry || entry.firstCatcher !== currentUser.name) {
      alert('첫 포획자만 메모를 작성할 수 있습니다!');
      return;
    }
    
    const updatedEntry = {
      ...entry,
      memo: memo
    };
    
    setSharedPokedexData(prev => ({
      ...prev,
      [numericKey]: updatedEntry
    }));
    
    // 🔥 Firebase에 직접 저장
    try {
      const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);
      await set(pokedexRef, updatedEntry);
      console.log('✅ 메모 저장 완료:', numericKey);
    } catch (error) {
      console.error('❌ 메모 저장 실패:', error);
    }
  };

  const updateSystemSettings = async (nextSettings) => {
    const nextEscapeMode = nextSettings?.escapeMode ?? systemSettings.escapeMode;
    const normalizedSettings = {
      ...systemSettings,
      ...(nextSettings || {}),
      maxNonPartnerPokemon: Math.max(1, Number(nextSettings?.maxNonPartnerPokemon ?? systemSettings.maxNonPartnerPokemon) || 18),
      escapeMode: ['none', 'instant', 'speed'].includes(nextEscapeMode) ? nextEscapeMode : 'none'
    };

    setSystemSettings(normalizedSettings);

    const systemSettingsRef = ref(database, 'gameData/systemSettings');
    await set(systemSettingsRef, normalizedSettings);

    // 봇이 gameData/campingSettings를 우선 참조하므로 동기화
    if (normalizedSettings.campingSettings) {
      await set(ref(database, 'gameData/campingSettings'), normalizedSettings.campingSettings);
    }

    console.log('💾 시스템 설정 저장:', normalizedSettings);
  };

  return {
    allItems,
    setAllItems,
    regions,
    setRegions,
    gamePokedex,
    setGamePokedex,
    sharedPokedexData,
    setSharedPokedexData,
    maintenanceMode,
    setMaintenanceMode,
    maintenanceScheduledAt,
    scheduleMaintenanceMode,
    cancelScheduledMaintenance,
    systemSettings,
    updateSystemSettings,
    updatePokedexMemo,
    isLoading
  };
};
