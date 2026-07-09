// src/hooks/game/usePokedex.js
// Shared Pokedex management

import { ref, set, remove, runTransaction } from 'firebase/database';
import { database } from '../../firebase';

export const usePokedex = (sharedPokedexData, setSharedPokedexData, currentUser) => {
  const mergeSharedEntry = (numericKey, updatedEntry) => {
    setSharedPokedexData(prev => ({
      ...prev,
      [numericKey]: updatedEntry
    }));
  };

  const recordFirstEncounter = async (pokemonNumber, regionName) => {
    const numericKey = String(pokemonNumber);
    const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);

    try {
      const result = await runTransaction(pokedexRef, (currentEntry) => {
        const regions = currentEntry?.regions || [];

        if (currentEntry && regions.includes(regionName)) {
          return;
        }

        if (!currentEntry) {
          return {
            firstEncounter: currentUser.name,
            encounteredAt: new Date().toISOString(),
            caughtBy: null,
            caughtAt: null,
            memo: null,
            regions: [regionName]
          };
        }

        return {
          ...currentEntry,
          regions: [...regions, regionName]
        };
      });

      if (result.committed) {
        mergeSharedEntry(numericKey, result.snapshot.val());
        console.log('Shared Pokedex encounter saved:', numericKey, regionName);
      }
    } catch (error) {
      console.error('Failed to save shared Pokedex encounter:', error);
    }
  };

  const recordFirstCatch = async (pokemonNumber) => {
    const numericKey = String(pokemonNumber);
    const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);

    try {
      const result = await runTransaction(pokedexRef, (currentEntry) => {
        if (currentEntry?.firstCatcher) {
          return;
        }

        const entry = currentEntry || {};
        return {
          ...entry,
          firstEncounter: entry.firstEncounter || currentUser.name,
          encounteredAt: entry.encounteredAt || new Date().toISOString(),
          firstCatcher: currentUser.name,
          caughtBy: currentUser.name,
          caughtAt: new Date().toISOString(),
          regions: entry.regions || []
        };
      });

      if (result.committed) {
        mergeSharedEntry(numericKey, result.snapshot.val());
        console.log('Shared Pokedex first catch saved:', numericKey);
        return true;
      }
    } catch (error) {
      console.error('Failed to save shared Pokedex first catch:', error);
    }

    return false;
  };

  const savePokedexMemo = async (pokemonNumber, memo) => {
    const numericKey = String(pokemonNumber);
    const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);

    try {
      const result = await runTransaction(pokedexRef, (currentEntry) => {
        if (!currentEntry || currentEntry.firstCatcher !== currentUser.name) {
          return;
        }

        return {
          ...currentEntry,
          memo: memo || null
        };
      });

      if (result.committed) {
        mergeSharedEntry(numericKey, result.snapshot.val());
        console.log('Shared Pokedex memo saved:', numericKey);
      } else {
        console.warn('Skipped memo save because current user is not first catcher:', numericKey);
      }
    } catch (error) {
      console.error('Failed to save shared Pokedex memo:', error);
    }
  };

  const updatePokedexRegions = async (pokemonNumber, regions) => {
    if (!currentUser?.isAdmin) return;

    const numericKey = String(pokemonNumber);

    const entry = sharedPokedexData[numericKey] || {};
    const updatedEntry = {
      ...entry,
      regions: regions,
      manuallyEdited: true
    };

    mergeSharedEntry(numericKey, updatedEntry);

    try {
      const pokedexRef = ref(database, `gameData/sharedPokedex/${numericKey}`);
      await set(pokedexRef, updatedEntry);
      console.log('Shared Pokedex regions updated:', numericKey);
    } catch (error) {
      console.error('Failed to update shared Pokedex regions:', error);
    }
  };

  const resetPokedex = async () => {
    if (!currentUser?.isAdmin) return;

    setSharedPokedexData({});

    try {
      const pokedexRef = ref(database, 'gameData/sharedPokedex');
      await remove(pokedexRef);
      console.log('Shared Pokedex reset complete');
    } catch (error) {
      console.error('Failed to reset shared Pokedex:', error);
    }
  };

  return {
    recordFirstEncounter,
    recordFirstCatch,
    savePokedexMemo,
    updatePokedexRegions,
    resetPokedex
  };
};

export default usePokedex;
