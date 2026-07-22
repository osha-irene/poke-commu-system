// src/hooks/game/useRecipes.js

import { useState, useEffect } from 'react';
import { ref, get, set, onValue, onChildAdded, onChildChanged, onChildRemoved, runTransaction } from 'firebase/database';
import { database } from '../../firebase';
import recipesData from '../../data/recipes.json';

const getDefaultRecipes = () => [
  ...(recipesData.recipes || []),
  ...(recipesData.statBasedRecipes || [])
];

const normalizeDiscoveredRecipes = (value) => (
  Array.isArray(value) ? value : Object.values(value || {}).flat()
);

export const useRecipes = (currentUser, updateCurrentUser, updateInventory, updateHistoryField) => {
  const [recipes, setRecipes] = useState([]);
  const [discoveredRecipes, setDiscoveredRecipes] = useState([]);
  const [recipeMemos, setRecipeMemos] = useState({});

  useEffect(() => {
    const recipesRef = ref(database, 'gameData/recipes');
    const discoveredRef = ref(database, 'gameData/discoveredRecipes');

    const loadRecipes = async () => {
      const snapshot = await get(recipesRef);
      if (snapshot.exists()) {
        setRecipes(snapshot.val());
        return;
      }

      const allRecipes = getDefaultRecipes();
      await set(recipesRef, allRecipes);
      setRecipes(allRecipes);
    };

    loadRecipes().catch(error => {
      console.error('Recipe load failed:', error);
      setRecipes(getDefaultRecipes());
    });

    const applyDiscovered = (snapshot) => {
      setDiscoveredRecipes(prev => {
        const next = normalizeDiscoveredRecipes(prev);
        const key = snapshot.key;
        const value = snapshot.val();
        if (/^\d+$/.test(String(key))) next[Number(key)] = value;
        else if (!next.includes(value)) next.push(value);
        return [...new Set(next.filter(Boolean))];
      });
    };

    const removeDiscovered = (snapshot) => {
      setDiscoveredRecipes(prev => {
        const next = normalizeDiscoveredRecipes(prev);
        if (/^\d+$/.test(String(snapshot.key))) next.splice(Number(snapshot.key), 1);
        return next.filter(value => value && value !== snapshot.val());
      });
    };

    const unsubAdded = onChildAdded(discoveredRef, applyDiscovered, error => {
      console.error('Discovered recipe listener failed:', error);
    });
    const unsubChanged = onChildChanged(discoveredRef, applyDiscovered);
    const unsubRemoved = onChildRemoved(discoveredRef, removeDiscovered);

    const recipeMemosRef = ref(database, 'gameData/recipeMemos');
    const unsubMemos = onValue(recipeMemosRef, (snapshot) => {
      setRecipeMemos(snapshot.val() || {});
    }, error => {
      console.error('Recipe memo listener failed:', error);
    });

    return () => {
      unsubAdded();
      unsubChanged();
      unsubRemoved();
      unsubMemos();
    };
  }, []);

  const createRecipe = async (recipeData) => {
    if (!currentUser?.isAdmin) return false;

    const newRecipes = [...recipes, recipeData];
    setRecipes(newRecipes);

    try {
      await set(ref(database, 'gameData/recipes'), newRecipes);
      alert(`레시피 "${recipeData.name}"이 등록되었습니다!`);
      return true;
    } catch (error) {
      console.error('Recipe save failed:', error);
      alert('레시피 저장 중 오류가 발생했습니다.');
      return false;
    }
  };

  const updateRecipe = async (recipeId, recipeData) => {
    if (!currentUser?.isAdmin) return false;

    const updatedRecipes = recipes.map((recipe) => (
      recipe.id === recipeId
        ? { ...recipe, ...recipeData, id: recipeId, updatedAt: new Date().toISOString() }
        : recipe
    ));
    setRecipes(updatedRecipes);

    try {
      await set(ref(database, 'gameData/recipes'), updatedRecipes);
      alert(`레시피 "${recipeData.name}"이 수정되었습니다!`);
      return true;
    } catch (error) {
      console.error('Recipe update failed:', error);
      alert('레시피 수정 중 오류가 발생했습니다.');
      return false;
    }
  };

  const deleteRecipe = async (recipeId) => {
    if (!currentUser?.isAdmin) return false;

    const updatedRecipes = recipes.filter(recipe => recipe.id !== recipeId);
    setRecipes(updatedRecipes);

    try {
      await set(ref(database, 'gameData/recipes'), updatedRecipes);
      return true;
    } catch (error) {
      console.error('Recipe delete failed:', error);
      return false;
    }
  };

  const discoverRecipe = async (recipeId) => {
    if (!currentUser) return false;

    const globalDiscovered = normalizeDiscoveredRecipes(discoveredRecipes);
    if (globalDiscovered.includes(recipeId)) return false;

    try {
      const discoveredRef = ref(database, 'gameData/discoveredRecipes');
      const result = await runTransaction(discoveredRef, (currentDiscovered) => {
        const current = normalizeDiscoveredRecipes(currentDiscovered);
        return [...new Set([...current, recipeId])];
      });

      if (result.committed) {
        setDiscoveredRecipes(normalizeDiscoveredRecipes(result.snapshot.val()));
      }

      // 도감의 firstCatcher와 같은 개념: 이 레시피를 처음 발견한 사람만 메모를 남길 수 있다.
      // 이미 기록되어 있으면 트랜잭션이 그대로 두므로 중복 발견 시에도 안전하다.
      const memoRef = ref(database, `gameData/recipeMemos/${recipeId}`);
      await runTransaction(memoRef, (currentEntry) => {
        if (currentEntry && currentEntry.firstDiscoverer) return currentEntry;
        return { firstDiscoverer: currentUser.name, memo: currentEntry?.memo || null };
      });
    } catch (error) {
      console.error('Discovered recipe save failed:', error);
    }

    return true;
  };

  const updateRecipeMemo = async (recipeId, memo, user) => {
    if (!user) return;

    try {
      const memoRef = ref(database, `gameData/recipeMemos/${recipeId}`);
      const result = await runTransaction(memoRef, (currentEntry) => {
        if (!currentEntry || currentEntry.firstDiscoverer !== user.name) {
          return;
        }

        return {
          ...currentEntry,
          memo: memo || null
        };
      });

      if (!result.committed) {
        alert('최초 발견자만 메모를 작성할 수 있습니다!');
        return;
      }

      setRecipeMemos(prev => ({
        ...prev,
        [recipeId]: result.snapshot.val()
      }));
    } catch (error) {
      console.error('Recipe memo save failed:', error);
    }
  };

  const cookRecipe = async (recipe, usedIngredients) => {
    if (!currentUser) return false;

    const hasAllIngredients = usedIngredients.every(ing => {
      const userItem = currentUser.inventory.find(i => i.name === ing.name);
      return userItem && userItem.count >= ing.count;
    });

    if (!hasAllIngredients) {
      alert('재료가 부족합니다!');
      return false;
    }

    const resultItem = recipe.result;
    const invTxResult = await updateInventory((inventory) => {
      const enoughIngredients = usedIngredients.every(ing => {
        const userItem = inventory.find(i => i.name === ing.name);
        return userItem && userItem.count >= ing.count;
      });
      if (!enoughIngredients) return;

      let next = [...inventory];
      usedIngredients.forEach(ing => {
        next = next
          .map(item => item.name === ing.name ? { ...item, count: item.count - ing.count } : item)
          .filter(item => item.count > 0);
      });

      const existingResult = next.find(i => i.name === resultItem.name);
      if (existingResult) {
        next = next.map(item =>
          item.name === resultItem.name ? { ...item, count: item.count + 1 } : item
        );
      } else {
        next = [
          ...next,
          {
            itemId: `cooked_${Date.now()}`,
            name: resultItem.name,
            count: 1,
            imageUrl: resultItem.spriteUrl || '/images/items/default.png',
            pocket: resultItem.pocket,
            effect: resultItem.effect,
            friendshipBoost: resultItem.friendshipBoost || 0,
            conditionBoost: resultItem.conditionBoost || {},
            canSell: true,
            isCooked: true
          }
        ];
      }

      return next;
    });

    if (!invTxResult.committed) {
      alert('재료가 부족합니다!');
      return false;
    }

    const cookedAt = Date.now();
    const isFailure = recipe.id?.startsWith('fail_');
    const isFirstDiscovery = !isFailure ? await discoverRecipe(recipe.id) : false;
    const cookingHistoryEntry = {
      id: `cooked_${cookedAt}`,
      itemName: resultItem.name,
      imageUrl: resultItem.spriteUrl || '/images/items/default.png',
      recipeId: recipe.id,
      recipeName: recipe.name,
      cookedAt,
      success: !isFailure,
      isFailure,
      isFirstDiscovery
    };

    await updateHistoryField('cookingHistory', cookingHistoryEntry);

    if (!isFailure) {
      const trainerName = currentUser.name || currentUser.nickname || '트레이너';
      alert(isFirstDiscovery
        ? `${trainerName}가 처음으로 ${resultItem.name}을(를) 만들었다!`
        : `${resultItem.name}을(를) 만들었습니다!`);

      // 홈 화면 "오늘의 요리" - cookingHistory는 memberSummary에서 빠져 있어(잦은 액션마다
      // 전체 요약이 재전송되는 걸 막기 위함) 전체 회원을 훑어서는 만들 수 없다. 그래서 성공한
      // 요리마다 "가장 최근 1건"만 이 작은 노드에 덮어써서 모든 접속자가 가볍게 구독한다.
      if (!String(resultItem.name || '').includes('오란다')) {
        set(ref(database, 'homeFeed/cooking'), {
          id: cookingHistoryEntry.id,
          trainerName,
          itemName: resultItem.name,
          image: resultItem.spriteUrl || '/images/items/default.png',
          eventTime: cookedAt
        }).catch((error) => console.error('❌ 홈 피드(요리) 갱신 실패:', error));
      }
    }

    return {
      success: true,
      isFailure,
      isFirstDiscovery,
      itemName: resultItem.name,
      trainerName: currentUser.name || currentUser.nickname || '트레이너'
    };
  };

  const updateIngredientStats = (ingredientName, stats) => {
    console.log('Ingredient stats update:', ingredientName, stats);
  };

  return {
    recipes,
    discoveredRecipes: normalizeDiscoveredRecipes(discoveredRecipes),
    recipeMemos,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    discoverRecipe,
    cookRecipe,
    updateRecipeMemo,
    updateIngredientStats
  };
};

export default useRecipes;
