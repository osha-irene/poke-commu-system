// src/hooks/game/useRecipes.js
// 요리 시스템

import { useState, useEffect } from 'react';
import { ref, get, set, onValue, runTransaction } from 'firebase/database';
import { database } from '../../firebase';
import recipesData from '../../data/recipes.json';

export const useRecipes = (currentUser, updateCurrentUser, updateInventory) => {
  const [recipes, setRecipes] = useState([]);
  const [discoveredRecipes, setDiscoveredRecipes] = useState({});

  // Firebase에서 레시피 데이터 로드
  useEffect(() => {
    const recipesRef = ref(database, 'gameData/recipes');

    const initAndListen = async () => {
      const snapshot = await get(recipesRef);
      if (!snapshot.exists()) {
        const allRecipes = [
          ...(recipesData.recipes || []),
          ...(recipesData.statBasedRecipes || [])
        ];
        await set(recipesRef, allRecipes);
      }
    };

    initAndListen().catch(err => console.error('레시피 초기화 실패:', err));

    const unsubRecipes = onValue(recipesRef, (snapshot) => {
      if (snapshot.exists()) {
        setRecipes(snapshot.val());
      } else {
        const allRecipes = [
          ...(recipesData.recipes || []),
          ...(recipesData.statBasedRecipes || [])
        ];
        setRecipes(allRecipes);
      }
    }, (error) => {
      console.error('레시피 로드 실패:', error);
      setRecipes([...(recipesData.recipes || []), ...(recipesData.statBasedRecipes || [])]);
    });

    // discoveredRecipes 실시간 리스너
    const discoveredRef = ref(database, 'gameData/discoveredRecipes');
    const unsubDiscovered = onValue(discoveredRef, (snapshot) => {
      if (snapshot.exists()) {
        setDiscoveredRecipes(snapshot.val());
      }
    }, (error) => {
      console.error('발견된 레시피 로드 실패:', error);
    });

    return () => {
      unsubRecipes();
      unsubDiscovered();
    };
  }, []);

  // 레시피 생성 (관리자)
  const createRecipe = async (recipeData) => {
    if (!currentUser?.isAdmin) return false;
    
    const newRecipes = [...recipes, recipeData];
    setRecipes(newRecipes);
    
    try {
      const recipesRef = ref(database, 'gameData/recipes');
      await set(recipesRef, newRecipes);
      alert(`✅ 레시피 "${recipeData.name}"이(가) 등록되었습니다!`);
      return true;
    } catch (error) {
      console.error('레시피 저장 실패:', error);
      alert('레시피 저장 중 오류가 발생했습니다.');
      return false;
    }
  };

  // 레시피 수정 (관리자)
  const updateRecipe = async (recipeId, recipeData) => {
    if (!currentUser?.isAdmin) return false;

    const updatedRecipes = recipes.map((recipe) => (
      recipe.id === recipeId
        ? { ...recipe, ...recipeData, id: recipeId, updatedAt: new Date().toISOString() }
        : recipe
    ));
    setRecipes(updatedRecipes);

    try {
      const recipesRef = ref(database, 'gameData/recipes');
      await set(recipesRef, updatedRecipes);
      alert(`✅ 레시피 "${recipeData.name}"이(가) 수정되었습니다!`);
      return true;
    } catch (error) {
      console.error('레시피 수정 실패:', error);
      alert('레시피 수정 중 오류가 발생했습니다.');
      return false;
    }
  };

  // 레시피 삭제 (관리자)
  const deleteRecipe = async (recipeId) => {
    if (!currentUser?.isAdmin) return false;
    
    const updatedRecipes = recipes.filter(recipe => recipe.id !== recipeId);
    setRecipes(updatedRecipes);
    
    try {
      const recipesRef = ref(database, 'gameData/recipes');
      await set(recipesRef, updatedRecipes);
      return true;
    } catch (error) {
      console.error('레시피 삭제 실패:', error);
      return false;
    }
  };

  // 레시피 발견
  const discoverRecipe = async (recipeId) => {
    if (!currentUser) return false;
    
    const globalDiscovered = Array.isArray(discoveredRecipes) ? discoveredRecipes : Object.values(discoveredRecipes || {}).flat();

    if (!globalDiscovered.includes(recipeId)) {
      try {
        const discoveredRef = ref(database, 'gameData/discoveredRecipes');
        const result = await runTransaction(discoveredRef, (currentDiscovered) => {
          const current = Array.isArray(currentDiscovered)
            ? currentDiscovered
            : Object.values(currentDiscovered || {}).flat();
          return [...new Set([...current, recipeId])];
        });

        if (result.committed) {
          setDiscoveredRecipes(result.snapshot.val() || []);
        }
      } catch (error) {
        console.error('발견된 레시피 저장 실패:', error);
      }
      
      return true;
    }
    return false;
  };

  // 요리하기
  const cookRecipe = async (recipe, usedIngredients) => {
    if (!currentUser) return false;
    
    console.log('🍳 요리 시작:', recipe.name);
    console.log('📦 사용 재료:', usedIngredients);
    
    // 재료 확인 (빠른 UX 피드백용 사전 체크, 실제 검증은 트랜잭션 내부에서 최신 값 기준으로 재확인됨)
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
      if (!enoughIngredients) {
        return; // 그 사이 재료가 소모되어 트랜잭션 중단
      }

      let next = [...inventory];
      usedIngredients.forEach(ing => {
        next = next.map(item =>
          item.name === ing.name
            ? { ...item, count: item.count - ing.count }
            : item
        ).filter(item => item.count > 0);
      });

      const existingResult = next.find(i => i.name === resultItem.name);
      if (existingResult) {
        next = next.map(item =>
          item.name === resultItem.name
            ? { ...item, count: item.count + 1 }
            : item
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

    await updateCurrentUser({
      cookingHistory: [
        cookingHistoryEntry,
        ...((currentUser.cookingHistory || []).filter(Boolean))
      ].slice(0, 10)
    });
    
    // 실패 아이템이 아닐 때만 레시피 발견 처리 + 완성 알림 (실패 알림은 호출부에서 따로 처리)
    if (!isFailure) {
      const trainerName = currentUser.name || currentUser.nickname || '트레이너';
      alert(isFirstDiscovery
        ? `${trainerName}가 처음으로 ${resultItem.name}을(를) 만들었다!`
        : `${resultItem.name}을(를) 만들었습니다!`);
    }
    
    return { success: true, isFailure, isFirstDiscovery, itemName: resultItem.name, trainerName: currentUser.name || currentUser.nickname || '트레이너' };
  };

  // 재료 스탯 업데이트 (추후 구현)
  const updateIngredientStats = (ingredientName, stats) => {
    console.log('재료 스탯 업데이트:', ingredientName, stats);
  };

  return {
    recipes,
    discoveredRecipes: Array.isArray(discoveredRecipes) ? discoveredRecipes : Object.values(discoveredRecipes || {}).flat(),
    createRecipe,
    updateRecipe,
    deleteRecipe,
    discoverRecipe,
    cookRecipe,
    updateIngredientStats
  };
};

export default useRecipes;
