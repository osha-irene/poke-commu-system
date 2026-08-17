import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';
import { calculate, Pokemon, Move, Field, Side } from '@smogon/calc';

// 로컬 데이터 import (poke-commu-system의 src/data/*.json 이식본)
import movesData from '../data/moves.json';
import abilitiesData from '../data/abilities.json';
import allPokemonData from '../data/allPokemon.json';

/**
 * 쇼다운 데이터와 로컬(한글) 데이터를 통합하는 클래스.
 * poke-commu-system의 src/battle/utils/ShowdownIntegration.js 이식본.
 *
 * 원본과의 차이점:
 *  - createCalcPokemon이 nature를 무시하고 'Hardy'로 고정하던 버그를 고쳐서
 *    실제로 pokemon.nature 값을 사용하도록 함.
 *  - 종족명을 한글로 입력해도 @pkmn/dex에서 찾을 수 있도록 allPokemon.json으로
 *    한글→영문 종족명 변환을 추가함.
 */
class ShowdownIntegration {
  constructor() {
    this.dex = Dex;
    this.gens = new Generations(Dex);
    this.currentGen = this.gens.get(9); // 9세대 기본

    this.localMoves = this._indexLocalData(movesData.moves, ['id', 'nameEn', 'name']);
    this.localAbilities = this._indexLocalData(abilitiesData.abilities, ['id', 'nameEn', 'name']);
    this.localSpecies = this._indexLocalData(allPokemonData, ['nameEn', 'name']);
  }

  normalizeKey(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[\s_\-'.:]/g, '')
      .replace(/[^\p{L}\p{N}]/gu, '');
  }

  _indexLocalData(dataArray, keyFields) {
    const indexed = {};
    dataArray.forEach((item) => {
      keyFields.forEach((keyField) => {
        const key = this.normalizeKey(item[keyField]);
        if (key) indexed[key] = item;
      });
    });
    return indexed;
  }

  setGeneration(genNumber) {
    this.currentGen = this.gens.get(genNumber);
    return this.currentGen;
  }

  /** 종족명(한글/영문) → @pkmn/dex가 이해하는 영문 종족명 */
  resolveSpeciesName(speciesName) {
    const normalized = this.normalizeKey(speciesName);
    const local = this.localSpecies[normalized];
    return local?.nameEn ? this.normalizeKey(local.nameEn) : normalized;
  }

  /**
   * moveName은 로컬 moves.json에서 한글 이름/설명 매칭에만 쓰이고, 위력·타입·명중률 등
   * 실제 계산에 쓰이는 값은 전부 @pkmn/dex(showdownMove) 데이터를 그대로 사용한다.
   * 쇼다운 데이터에 없는 기술은 로컬 데이터만으로는 계산할 수 없으므로 찾을 수 없는 것으로 취급한다.
   */
  getMove(moveName) {
    if (!moveName) return null;

    const normalizedName = this.normalizeKey(moveName);
    const localMove = this.localMoves[normalizedName];
    const showdownLookupName = localMove?.nameEn || localMove?.id || moveName;
    const showdownMove = this.currentGen.moves.get(this.normalizeKey(showdownLookupName));

    if (!showdownMove) {
      console.warn(`[showdownIntegration] 기술을 찾을 수 없음(쇼다운 데이터 없음): ${moveName}`);
      return null;
    }

    return {
      id: showdownMove.id,
      name: localMove?.name || showdownMove.name,
      nameEn: showdownMove.name,
      nameKo: localMove?.name || showdownMove.name,
      type: showdownMove.type,
      category: showdownMove.category,
      basePower: showdownMove.basePower,
      accuracy: showdownMove.accuracy === true ? 100 : showdownMove.accuracy,
      // accuracy: true인 기술(에어슬래시류 X, 스매쉬다운/에어로블래스트 등 "명중 판정 자체가 없는" 기술)은
      // 명중률/회피율 랭크가 어떻든 절대 빗나가지 않는다 — 위 accuracy 필드만 보면 100과 구분이 안 되므로 별도 플래그로 보존
      alwaysHit: showdownMove.accuracy === true,
      hasCrashDamage: showdownMove.hasCrashDamage || false,
      pp: showdownMove.pp,
      priority: showdownMove.priority,
      target: showdownMove.target,
      flags: showdownMove.flags || {},
      secondary: showdownMove.secondary,
      secondaryChance: showdownMove.secondaryChance,
      // 오버히트/드래곤에너지/파워제네레이터/절대영도킥 등: secondary(확률부가효과)와 별개로,
      // "사용하면 무조건 자신에게 적용되는" 랭크변화 등을 담는 필드 (@pkmn/dex 원본 구조 그대로)
      self: showdownMove.self,
      critRatio: showdownMove.critRatio || 1,
      willCrit: showdownMove.willCrit || false,
      recoil: showdownMove.recoil,
      mindBlownRecoil: showdownMove.mindBlownRecoil || false,
      drain: showdownMove.drain,
      heal: showdownMove.heal,
      multihit: showdownMove.multihit,
      ignoreDefensive: showdownMove.ignoreDefensive || false,
      ignoreEvasion: showdownMove.ignoreEvasion || false,
      ignoreAbility: showdownMove.ignoreAbility || false,
      breaksProtect: showdownMove.breaksProtect || false,
      volatileStatus: showdownMove.volatileStatus,
      status: showdownMove.status,
      boosts: showdownMove.boosts,
      weather: showdownMove.weather,
      terrain: showdownMove.terrain,
      isZ: showdownMove.isZ || false,
      isMax: showdownMove.isMax || false,
      description: localMove?.description || showdownMove.desc || '',
      shortDesc: showdownMove.shortDesc || '',
    };
  }

  /** abilityName은 로컬 abilities.json에서 한글 이름 매칭에만 쓰이고, 실제 특성 효과는
   * @smogon/calc가 nameEn(쇼다운 영문명)을 받아 자체적으로 @pkmn/dex를 조회해 적용한다. */
  getAbility(abilityName) {
    if (!abilityName) return null;

    const normalizedName = this.normalizeKey(abilityName);
    const localAbility = this.localAbilities[normalizedName];
    const showdownLookupName = localAbility?.nameEn || localAbility?.id || abilityName;
    const showdownAbility = this.currentGen.abilities.get(this.normalizeKey(showdownLookupName));

    if (!showdownAbility) {
      console.warn(`[showdownIntegration] 특성을 찾을 수 없음(쇼다운 데이터 없음): ${abilityName}`);
      return null;
    }

    return {
      id: showdownAbility.id,
      name: localAbility?.name || showdownAbility.name,
      nameEn: showdownAbility.name,
      nameKo: localAbility?.name || showdownAbility.name,
    };
  }

  /** 도구는 로컬 한글 데이터가 없어 @pkmn/dex 아이템 데이터를 그대로 사용 (영문 입력 필요) */
  getItem(itemName) {
    if (!itemName) return null;

    const normalizedName = this.normalizeKey(itemName);
    const item = this.currentGen.items.get(normalizedName);

    if (!item) {
      console.warn(`[showdownIntegration] 도구를 찾을 수 없음(쇼다운 데이터 없음): ${itemName}`);
      return null;
    }

    return { id: item.id, name: item.name };
  }

  getSpecies(speciesName) {
    if (!speciesName) return null;

    const normalizedName = this.resolveSpeciesName(speciesName);
    // currentGen(세대별 Generations 래퍼)은 그 세대 지역도감에 없는 포켓몬(예: 구구, 꼬렛)을
    // 존재하지 않는 것으로 걸러버린다. 종족값/타입은 세대에 안 흔들리는 값이므로 그런 필터가
    // 없는 원본 dex에서 직접 조회한다.
    const species = this.dex.species.get(normalizedName);

    if (!species) {
      console.warn(`[showdownIntegration] 포켓몬을 찾을 수 없음: ${speciesName}`);
      return null;
    }

    const localEntry = this.localSpecies[this.normalizeKey(speciesName)];

    return {
      id: normalizedName,
      name: localEntry?.name || species.name,
      nameEn: species.name,
      baseStats: species.baseStats,
      types: species.types,
      abilities: species.abilities,
    };
  }

  /** 기술 타입 vs 방어 측 타입(1~2개) 상성 배율 (0, 0.25, 0.5, 1, 2, 4) */
  getTypeEffectiveness(moveType, targetTypes) {
    if (!moveType || !targetTypes || targetTypes.length === 0) return 1;

    // dex.types.get(X).damageTaken[Y] = "X 타입이 Y 타입 공격을 받을 때"의 배율 코드이므로
    // 방어 측 타입(defenseType) 기준으로 조회하고, 공격 기술의 타입(moveType)으로 인덱싱해야 한다.
    let effectiveness = 1;
    targetTypes.forEach((defenseType) => {
      const typeData = this.dex.types.get(defenseType);
      if (!typeData) return;
      const damageTaken = typeData.damageTaken[moveType];
      if (damageTaken === 1) effectiveness *= 2; // 효과가 굉장했다
      else if (damageTaken === 2) effectiveness *= 0.5; // 효과가 별로였다
      else if (damageTaken === 3) effectiveness *= 0; // 효과가 없다
    });

    return effectiveness;
  }

  /**
   * 포켓몬 객체를 @smogon/calc 형식으로 변환.
   * (원본 버그 수정: nature를 실제로 반영함)
   */
  createCalcPokemon(pokemon, generation = 9) {
    try {
      const natureName = pokemon.nature
        ? pokemon.nature.charAt(0).toUpperCase() + pokemon.nature.slice(1).toLowerCase()
        : 'Hardy';

      // 레이드 계산기에서는 보스/참가자 모두 종족값·타입을 직접 지정하는 커스텀 유닛이므로
      // 항상 overrides로 완전히 덮어써서 사용 (앵커 종족명은 베이스만 빌려오는 더미)
      const overrides = {
        baseStats: pokemon.baseStats || { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
        types: pokemon.types && pokemon.types.length ? pokemon.types : ['Normal'],
      };

      // 한글로 입력됐을 수 있는 특성/도구를 @smogon/calc가 이해하는 쇼다운 영문명으로 변환
      const resolvedAbility = pokemon.ability ? this.getAbility(pokemon.ability)?.nameEn : undefined;
      const resolvedItem = pokemon.item ? this.getItem(pokemon.item)?.name : undefined;

      return new Pokemon(generation, 'bulbasaur', {
        level: pokemon.level || 50,
        ability: resolvedAbility,
        item: resolvedItem || '',
        nature: natureName,
        gender: pokemon.gender || undefined,
        ivs: pokemon.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: pokemon.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        boosts: pokemon.boosts || { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        status: pokemon.status || '',
        curHP: pokemon.currentHP,
        teraType: pokemon.teraType || undefined,
        overrides,
      });
    } catch (error) {
      console.error('[showdownIntegration] Pokemon 생성 실패:', error);
      return new Pokemon(generation, 'ditto', {
        level: pokemon.level || 50,
        nature: 'Hardy',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      });
    }
  }

  createCalcMove(moveName, options = {}) {
    try {
      let normalizedMove = this.normalizeKey(moveName);
      const moveData = this.getMove(normalizedMove);
      if (!moveData) {
        console.warn(`[showdownIntegration] 기술을 찾을 수 없음: ${normalizedMove}, tackle로 대체`);
        normalizedMove = 'tackle';
      }

      return new Move(this.currentGen.num, moveData?.nameEn || moveData?.id || normalizedMove, {
        ability: options.ability,
        item: options.item,
        useZ: moveData?.isZ || false,
        useMax: moveData?.isMax || false,
        isCrit: options.isCrit || false,
        hits: moveData?.multihit
          ? (Array.isArray(moveData.multihit) ? moveData.multihit[1] : moveData.multihit)
          : (options.hits || 1),
      });
    } catch (error) {
      console.error('[showdownIntegration] Move 생성 실패:', error);
      return new Move(this.currentGen.num, 'tackle', {});
    }
  }

  createField(fieldState = {}) {
    return new Field({
      gameType: fieldState.gameType || 'Singles',
      weather: fieldState.weather,
      terrain: fieldState.terrain,
      attackerSide: new Side(fieldState.attackerSide || {}),
      defenderSide: new Side(fieldState.defenderSide || {}),
    });
  }

  /**
   * 완전한 데미지 계산.
   * attacker/defender에는 currentHP를 넘겨야 @smogon/calc의 curHP 기반 결과(koChance 등)가 정확함.
   */
  calculateDamage(attacker, defender, moveName, fieldState = {}, options = {}) {
    const generation = options.generation || 9;
    const moveData = this.getMove(moveName);

    // 변화기술(0위력)은 @smogon/calc의 calculate()가 예외를 던지므로 미리 걸러서 0 데미지로 처리
    if (moveData && (!moveData.basePower || moveData.basePower === 0)) {
      return { damage: 0, damageRange: null, desc: '', koChance: null, moveData };
    }

    try {
      const attackerPokemon = this.createCalcPokemon(attacker, generation);
      const defenderPokemon = this.createCalcPokemon(defender, generation);
      const move = this.createCalcMove(moveName, options);
      const field = this.createField(fieldState);

      const result = calculate(generation, attackerPokemon, defenderPokemon, move, field);

      return {
        damage: result.damage,
        damageRange: typeof result.range === 'function' ? result.range() : null,
        desc: typeof result.desc === 'function' ? result.desc() : '',
        koChance: typeof result.kochance === 'function' ? result.kochance() : null,
        moveData: this.getMove(moveName),
      };
    } catch (error) {
      // 0 데미지(타입 무효 등)일 때 @smogon/calc 내부 assertion이 던지는 잘 알려진 예외 -
      // 정상적으로 처리되는 케이스이므로 warn만 남기고 error로는 남기지 않음
      const isKnownZeroDamageAssertion = /damage\[damage\.length - 1\] === 0/.test(error.message || '');
      if (isKnownZeroDamageAssertion) {
        console.warn(`[showdownIntegration] ${moveName}: 데미지 0 (타입 무효 등)`);
      } else {
        console.error('[showdownIntegration] 데미지 계산 오류:', error);
      }
      return { error: error.message || '알 수 없는 오류', damage: 0, moveName, moveData: this.getMove(moveName) };
    }
  }
}

const showdownIntegration = new ShowdownIntegration();

export default showdownIntegration;
