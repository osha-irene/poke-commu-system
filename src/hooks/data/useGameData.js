// src/hooks/useGameData.js

import { useState, useEffect } from 'react';
import {
  ref,
  get,
  set,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  runTransaction
} from 'firebase/database';
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

  return numericEntries.length > 0
    ? numericEntries.map(([, value]) => value)
    : entries.map(([, value]) => value);
};

const normalizeRegions = (nextRegions = []) => (
  toRegionList(nextRegions).filter(region => region?.id && region?.name && !(
    region?.isTownMeta && (!region.groupId || !region.groupName)
  ))
);

const getDefaultRegions = () => (
  regionsData.regions.map(region => ({
    ...region,
    pokemons: region.defaultPokemon
  }))
);

const getDefaultPokedex = (allPokemonData = []) => (
  allPokemonData
    .filter(pokemon => parseInt(pokemon.generation, 10) === 1)
    .map((pokemon, index) => ({
      ...pokemon,
      originalNumber: pokemon.number,
      newNumber: index + 1
    }))
);

const markDatabaseCustomItems = (customItems = []) => (
  (Array.isArray(customItems) ? customItems : Object.values(customItems || {}))
    .filter(Boolean)
    .map(item => ({
      ...item,
      isCustom: true,
      __customItemSource: 'database'
    }))
);

const buildAllItems = (customItems = []) => {
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
    cost: 10000,
    sellPrice: 5000,
    canSell: true,
    effect: tm.description,
    description: tm.description,
    spriteUrl: tm.spriteUrl,
    imageUrl: tm.spriteUrl,
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

  return [...itemsData.items, ...tmItems, ...markDatabaseCustomItems(customItems)];
};

const getCustomItemsFromAllItems = (allItems = []) => (
  allItems.filter(item => item?.__customItemSource === 'database')
);

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

  return Array.from(townMap.values()).sort((a, b) => {
    const orderA = a.townOrder !== null ? a.townOrder : Infinity;
    const orderB = b.townOrder !== null ? b.townOrder : Infinity;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.groupId).localeCompare(String(b.groupId));
  });
};

const upsertArrayChild = (prev, key, value, normalize = items => items) => {
  const next = Array.isArray(prev) ? [...prev] : [];
  if (/^\d+$/.test(String(key))) {
    next[Number(key)] = value;
  } else {
    const index = next.findIndex(item => String(item?.id) === String(key));
    if (index >= 0) next[index] = value;
    else next.push(value);
  }
  return normalize(next);
};

const removeArrayChild = (prev, key, normalize = items => items.filter(Boolean)) => {
  const next = Array.isArray(prev) ? [...prev] : [];
  if (/^\d+$/.test(String(key))) {
    next.splice(Number(key), 1);
    return normalize(next);
  }
  return normalize(next.filter(item => String(item?.id) !== String(key)));
};

const isValidSharedPokedexEntry = (key, value) => (
  !isNaN(key) && typeof value === 'object' && value !== null
);

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

  useEffect(() => {
    const loadGameData = async () => {
      try {
        setAllItems(buildAllItems([]));

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
            await set(configRef, {
              ...(configSnapshot.val() || {}),
              regions: normalizedRegions
            });
          }
        } else {
          const initialRegions = getDefaultRegions();
          await set(regionsRef, initialRegions);
          setRegions(initialRegions);
        }

        const pokedexRef = ref(database, 'gameData/gamePokedex');
        const pokedexSnapshot = await get(pokedexRef);
        if (pokedexSnapshot.exists()) {
          setGamePokedex(pokedexSnapshot.val());
        } else {
          const initialPokedex = getDefaultPokedex(allPokemonData);
          await set(pokedexRef, initialPokedex);
          setGamePokedex(initialPokedex);
        }

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
      } catch (error) {
        console.error('Game data load failed:', error);
        setAllItems(buildAllItems([]));
        setRegions(getDefaultRegions());
        setGamePokedex(getDefaultPokedex(allPokemonData));
        setSharedPokedexData({});
        setMaintenanceMode(false);
        setSystemSettings({ maxNonPartnerPokemon: 18, escapeMode: 'none', campingSettings: {} });
      } finally {
        setIsLoading(false);
      }
    };

    loadGameData();
  }, [allPokemonData]);

  useEffect(() => {
    if (isLoading) return undefined;

    const customItemsRef = ref(database, 'gameData/customItems');
    const applyCustomItem = (snapshot) => {
      setAllItems(prevItems => {
        const customItems = getCustomItemsFromAllItems(prevItems);
        return buildAllItems(upsertArrayChild(customItems, snapshot.key, snapshot.val()));
      });
    };
    const removeCustomItem = (snapshot) => {
      setAllItems(prevItems => {
        const customItems = getCustomItemsFromAllItems(prevItems);
        return buildAllItems(removeArrayChild(customItems, snapshot.key));
      });
    };

    const unsubAdded = onChildAdded(customItemsRef, applyCustomItem);
    const unsubChanged = onChildChanged(customItemsRef, applyCustomItem);
    const unsubRemoved = onChildRemoved(customItemsRef, removeCustomItem);

    return () => {
      unsubAdded();
      unsubChanged();
      unsubRemoved();
    };
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return undefined;

    const regionsRef = ref(database, 'gameData/regions');
    const applyRegion = (snapshot) => {
      setRegions(prevRegions => upsertArrayChild(prevRegions, snapshot.key, snapshot.val(), normalizeRegions));
    };
    const removeRegion = (snapshot) => {
      setRegions(prevRegions => removeArrayChild(prevRegions, snapshot.key, normalizeRegions));
    };

    const unsubAdded = onChildAdded(regionsRef, applyRegion);
    const unsubChanged = onChildChanged(regionsRef, applyRegion);
    const unsubRemoved = onChildRemoved(regionsRef, removeRegion);

    return () => {
      unsubAdded();
      unsubChanged();
      unsubRemoved();
    };
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return undefined;

    const pokedexRef = ref(database, 'gameData/gamePokedex');
    const applyPokedexEntry = (snapshot) => {
      setGamePokedex(prev => upsertArrayChild(prev, snapshot.key, snapshot.val(), items => items.filter(Boolean)));
    };
    const removePokedexEntry = (snapshot) => {
      setGamePokedex(prev => removeArrayChild(prev, snapshot.key));
    };

    const unsubAdded = onChildAdded(pokedexRef, applyPokedexEntry);
    const unsubChanged = onChildChanged(pokedexRef, applyPokedexEntry);
    const unsubRemoved = onChildRemoved(pokedexRef, removePokedexEntry);

    return () => {
      unsubAdded();
      unsubChanged();
      unsubRemoved();
    };
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return undefined;

    const sharedPokedexRef = ref(database, 'gameData/sharedPokedex');
    const applySharedEntry = (snapshot) => {
      const key = snapshot.key;
      const value = snapshot.val();
      if (!isValidSharedPokedexEntry(key, value)) return;
      setSharedPokedexData(prev => ({ ...prev, [key]: value }));
    };
    const removeSharedEntry = (snapshot) => {
      setSharedPokedexData(prev => {
        const next = { ...prev };
        delete next[snapshot.key];
        return next;
      });
    };

    const unsubAdded = onChildAdded(sharedPokedexRef, applySharedEntry);
    const unsubChanged = onChildChanged(sharedPokedexRef, applySharedEntry);
    const unsubRemoved = onChildRemoved(sharedPokedexRef, removeSharedEntry);

    return () => {
      unsubAdded();
      unsubChanged();
      unsubRemoved();
    };
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return undefined;

    const systemSettingsRef = ref(database, 'gameData/systemSettings');
    const unsub = onValue(systemSettingsRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.val();
      setSystemSettings(prev => (
        JSON.stringify(prev) === JSON.stringify(data) ? prev : data
      ));
    }, (error) => {
      console.error('System settings listener failed:', error);
    });

    return () => unsub();
  }, [isLoading]);

  useEffect(() => {
    const maintenanceRef = ref(database, 'gameData/maintenanceMode');
    const unsub = onValue(maintenanceRef, (snapshot) => {
      setMaintenanceMode(snapshot.exists() ? snapshot.val() : false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const scheduledRef = ref(database, 'gameData/maintenanceScheduledAt');
    const unsub = onValue(scheduledRef, (snapshot) => {
      setMaintenanceScheduledAt(snapshot.exists() ? snapshot.val() : null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    set(ref(database, 'gameData/maintenanceMode'), maintenanceMode).catch((error) => {
      console.error('Maintenance mode save failed:', error);
    });
  }, [maintenanceMode, isLoading]);

  const scheduleMaintenanceMode = async (delayMs = 5 * 60 * 1000) => {
    await set(ref(database, 'gameData/maintenanceScheduledAt'), Date.now() + delayMs);
  };

  const cancelScheduledMaintenance = async () => {
    await set(ref(database, 'gameData/maintenanceScheduledAt'), null);
  };

  const updatePokedexMemo = async (pokemonNumber, memo, currentUser) => {
    const numericKey = String(pokemonNumber);

    try {
      const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);
      const result = await runTransaction(pokedexRef, (currentEntry) => {
        if (!currentEntry || currentEntry.firstCatcher !== currentUser.name) {
          return;
        }

        return {
          ...currentEntry,
          memo: memo || null
        };
      });

      if (!result.committed) {
        alert('첫 포획자만 메모를 작성할 수 있습니다!');
        return;
      }

      setSharedPokedexData(prev => ({
        ...prev,
        [numericKey]: result.snapshot.val()
      }));
    } catch (error) {
      console.error('Failed to save Pokedex memo:', error);
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
    await set(ref(database, 'gameData/systemSettings'), normalizedSettings);

    if (normalizedSettings.campingSettings) {
      await set(ref(database, 'gameData/campingSettings'), normalizedSettings.campingSettings);
    }
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
