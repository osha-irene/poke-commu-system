import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';
import { calculate, Pokemon, Move, Field, Side } from '@smogon/calc';

// 로컬 데이터 import
import movesData from '../../data/moves.json';
import abilitiesData from '../../data/abilities.json';
import { toShowdownSpeciesName } from './battleTranslations';

/**
 * 쇼다운 데이터와 로컬 데이터를 통합하는 클래스
 * 모든 배틀 계산에 필요한 완전한 데이터와 계산식 제공
 */
class ShowdownIntegration {
  constructor() {
    this.dex = Dex;
    this.gens = new Generations(Dex);
    this.currentGen = this.gens.get(9); // 9세대 기본
    
    // 로컬 데이터 캐시
    this.localMoves = this._indexLocalData(movesData.moves, ['id', 'nameEn', 'name']);
    this.localAbilities = this._indexLocalData(abilitiesData.abilities, ['id', 'nameEn', 'name']);
    
    console.log('[ShowdownIntegration] 초기화 완료', {
      generation: 9,
      localMoves: Object.keys(this.localMoves).length,
      localAbilities: Object.keys(this.localAbilities).length,
    });
  }

  /**
   * 로컬 데이터를 키로 인덱싱
   */
  normalizeKey(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[\s_\-'.:]/g, '')
      .replace(/[^\p{L}\p{N}]/gu, '');
  }

  _indexLocalData(dataArray, keyFields) {
    const indexed = {};
    dataArray.forEach(item => {
      keyFields.forEach(keyField => {
        const key = this.normalizeKey(item[keyField]);
        if (key) indexed[key] = item;
      });
    });
    return indexed;
  }

  /**
   * 세대 변경
   */
  setGeneration(genNumber) {
    this.currentGen = this.gens.get(genNumber);
    console.log(`[ShowdownIntegration] 세대 변경: ${genNumber}`);
    return this.currentGen;
  }

  /**
   * 기술 데이터 가져오기 (쇼다운 + 로컬 데이터 병합)
   */
  getMove(moveName) {
    if (!moveName) return null;

    const normalizedName = this.normalizeKey(moveName);
    const localMove = this.localMoves[normalizedName];
    const showdownLookupName = localMove?.nameEn || localMove?.id || moveName;
    const showdownMove = this.currentGen.moves.get(this.normalizeKey(showdownLookupName));

    if (!showdownMove && !localMove) {
      console.warn(`[ShowdownIntegration] 기술을 찾을 수 없음: ${moveName}`);
      return null;
    }

    // 데이터 병합
    return {
      // 기본 정보
      id: showdownMove?.id || localMove?.id || normalizedName,
      name: localMove?.name || showdownMove?.name || moveName,
      nameEn: showdownMove?.name || localMove?.nameEn || moveName,
      nameKo: localMove?.name || moveName,
      
      // 타입 및 분류
      type: showdownMove?.type || localMove?.type || 'Normal',
      category: showdownMove?.category || localMove?.category || 'Status',
      
      // 기본 수치
      basePower: showdownMove?.basePower || localMove?.power || 0,
      accuracy: showdownMove?.accuracy === true ? 100 : (showdownMove?.accuracy || localMove?.accuracy || 100),
      pp: showdownMove?.pp || localMove?.pp || 10,
      priority: showdownMove?.priority || localMove?.priority || 0,
      
      // 대상 및 플래그
      target: showdownMove?.target || 'normal',
      flags: showdownMove?.flags || {},
      
      // 2차 효과
      secondary: showdownMove?.secondary,
      secondaryChance: showdownMove?.secondaryChance,
      
      // 크리티컬
      critRatio: showdownMove?.critRatio || 1,
      willCrit: showdownMove?.willCrit || false,
      
      // 반동/흡수/회복
      recoil: showdownMove?.recoil,
      drain: showdownMove?.drain,
      heal: showdownMove?.heal,
      
      // 연속 공격
      multihit: showdownMove?.multihit,
      
      // 특수 속성
      hasCrashDamage: showdownMove?.hasCrashDamage || false,
      ignoreImmunity: showdownMove?.ignoreImmunity,
      ignoreDefensive: showdownMove?.ignoreDefensive || false,
      ignoreEvasion: showdownMove?.ignoreEvasion || false,
      ignoreAbility: showdownMove?.ignoreAbility || false,
      breaksProtect: showdownMove?.breaksProtect || false,
      sleepUsable: showdownMove?.sleepUsable || false,
      
      // 상태 및 효과
      volatileStatus: showdownMove?.volatileStatus,
      status: showdownMove?.status,
      boosts: showdownMove?.boosts,
      
      // 필드 효과
      weather: showdownMove?.weather,
      terrain: showdownMove?.terrain,
      pseudoWeather: showdownMove?.pseudoWeather,
      sideCondition: showdownMove?.sideCondition,
      
      // 교체
      forceSwitch: showdownMove?.forceSwitch,
      selfSwitch: showdownMove?.selfSwitch,
      
      // Z기술/다이맥스
      zMove: showdownMove?.zMove,
      maxMove: showdownMove?.maxMove,
      isZ: showdownMove?.isZ || false,
      isMax: showdownMove?.isMax || false,
      
      // 설명 (한글 우선)
      description: localMove?.description || showdownMove?.desc || '',
      shortDesc: showdownMove?.shortDesc || '',
      
      // 로컬 전용 데이터
      generation: localMove?.generation,
      contestType: localMove?.contestType,
    };
  }

  /**
   * 특성 데이터 가져오기
   */
  getAbility(abilityName) {
    if (!abilityName) return null;

    const normalizedName = this.normalizeKey(abilityName);
    const localAbility = this.localAbilities[normalizedName];
    const showdownLookupName = localAbility?.nameEn || localAbility?.id || abilityName;
    const showdownAbility = this.currentGen.abilities.get(this.normalizeKey(showdownLookupName));

    if (!showdownAbility && !localAbility) {
      console.warn(`[ShowdownIntegration] 특성을 찾을 수 없음: ${abilityName}`);
      return null;
    }

    return {
      id: showdownAbility?.id || localAbility?.id || normalizedName,
      name: localAbility?.name || showdownAbility?.name || abilityName,
      nameEn: showdownAbility?.name || localAbility?.nameEn || abilityName,
      nameKo: localAbility?.name || abilityName,
      desc: showdownAbility?.desc || localAbility?.effect || '',
      shortDesc: showdownAbility?.shortDesc || localAbility?.shortEffect || '',
      rating: showdownAbility?.rating,
      suppressWeather: showdownAbility?.suppressWeather || false,
      isNonstandard: showdownAbility?.isNonstandard,
      generation: localAbility?.generation,
    };
  }

  /**
   * 도구 데이터 가져오기
   */
  getItem(itemName) {
    if (!itemName) return null;

    const normalizedName = this.normalizeKey(itemName);
    const item = this.currentGen.items.get(normalizedName);

    if (!item) {
      console.warn(`[ShowdownIntegration] 도구를 찾을 수 없음: ${itemName}`);
      return null;
    }

    return {
      id: normalizedName,
      name: item.name,
      desc: item.desc,
      shortDesc: item.shortDesc,
      fling: item.fling,
      naturalGift: item.naturalGift,
      megaStone: item.megaStone,
      megaEvolves: item.megaEvolves,
      zMove: item.zMove,
      zMoveType: item.zMoveType,
      zMoveFrom: item.zMoveFrom,
      itemUser: item.itemUser,
      boosts: item.boosts,
      isBerry: item.isBerry || false,
      isChoice: item.isChoice || false,
      isGem: item.isGem || false,
      isPokeball: item.isPokeball || false,
    };
  }

  /**
   * 포켓몬 종족 데이터 가져오기
   */
  getSpecies(speciesName) {
    if (!speciesName) return null;

    const normalizedName = this.normalizeKey(toShowdownSpeciesName(speciesName) || speciesName);
    const species = this.currentGen.species.get(normalizedName);

    if (!species) {
      console.warn(`[ShowdownIntegration] 포켓몬을 찾을 수 없음: ${speciesName}`);
      return null;
    }

    return {
      id: normalizedName,
      name: species.name,
      baseStats: species.baseStats,
      types: species.types,
      abilities: species.abilities,
      heightm: species.heightm,
      weightkg: species.weightkg,
      color: species.color,
      evos: species.evos,
      eggGroups: species.eggGroups,
      otherFormes: species.otherFormes,
      cosmeticFormes: species.cosmeticFormes,
      forme: species.forme,
      baseSpecies: species.baseSpecies,
      baseForme: species.baseForme,
      canHatch: species.canHatch,
      canGigantamax: species.canGigantamax,
      gmaxUnreleased: species.gmaxUnreleased,
    };
  }

  /**
   * 타입 상성 계산
   */
  getTypeEffectiveness(moveType, targetTypes) {
    if (!moveType || !targetTypes || targetTypes.length === 0) return 1;

    let effectiveness = 1;

    targetTypes.forEach(defenseType => {
      const typeData = this.dex.types.get(moveType);
      if (!typeData) return;

      const damageTaken = typeData.damageTaken[defenseType];
      
      if (damageTaken === 1) effectiveness *= 2;      // 효과가 굉장
      else if (damageTaken === 2) effectiveness *= 0.5; // 효과가 별로
      else if (damageTaken === 3) effectiveness *= 0;   // 무효
    });

    return effectiveness;
  }

  /**
   * 포켓몬 객체를 @smogon/calc 형식으로 변환
   */
  createCalcPokemon(pokemon, generation = 9) {
    console.log('[createCalcPokemon] 입력:', pokemon);
    
    try {
      // 포켓몬 이름 정규화
      let speciesName = pokemon.species || pokemon.name || 'bulbasaur';
      speciesName = this.normalizeKey(toShowdownSpeciesName(speciesName) || speciesName);
      
      console.log('[createCalcPokemon] 정규화된 이름:', speciesName);
      
      // @smogon/calc에서 포켓몬 데이터 확인
      const gen = this.gens.get(generation);
      const speciesData = gen.species.get(speciesName);
      
      console.log('[createCalcPokemon] speciesData:', speciesData ? '존재' : 'null');
      
      if (!speciesData) {
        console.warn(`[ShowdownIntegration] 포켓몬을 찾을 수 없음: ${speciesName}, 기본값 사용`);
        speciesName = 'ditto'; // 폴백
      }
      
      const pokemonObj = new Pokemon(generation, speciesName, {
        level: pokemon.level || 50,
        ability: pokemon.ability || 'Adaptability',
        item: pokemon.item || '',
        nature: 'Hardy',
        ivs: pokemon.ivs || {
          hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31
        },
        evs: pokemon.evs || {
          hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0
        },
        boosts: pokemon.boosts || {
          atk: 0, def: 0, spa: 0, spd: 0, spe: 0
        },
        status: pokemon.status || '',
        curHP: pokemon.currentHP || pokemon.maxhp || pokemon.hp || 100,
        teraType: pokemon.teraType,
      });
      
      console.log('[createCalcPokemon] 생성 성공, rawStats:', pokemonObj.rawStats);
      return pokemonObj;
    } catch (error) {
      console.error('[ShowdownIntegration] Pokemon 생성 실패:', error);
      // 기본 포켓몬으로 폴백
      return new Pokemon(generation, 'ditto', {
        level: pokemon.level || 50,
        ability: 'Adaptability',
        item: '',
        nature: 'Hardy',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        status: '',
        curHP: 100,
      });
    }
  }

  /**
   * 기술 객체를 @smogon/calc 형식으로 변환
   */
  createCalcMove(moveName, options = {}) {
    try {
      // 기술 이름 정규화
      let normalizedMove = typeof moveName === 'string' ? this.normalizeKey(moveName) : moveName;
      
      const moveData = this.getMove(normalizedMove);
      if (!moveData) {
        console.warn(`[ShowdownIntegration] 기술을 찾을 수 없음: ${normalizedMove}, 기본 기술 사용`);
        normalizedMove = 'tackle';
      }

      return new Move(this.currentGen.num, moveData?.nameEn || moveData?.id || normalizedMove, {
        ability: options.ability,
        item: options.item,
        species: options.species,
        useZ: moveData?.isZ || options.useZ || false,
        useMax: moveData?.isMax || options.useMax || false,
        isCrit: moveData?.willCrit || options.isCrit || false,
        hits: moveData?.multihit ? 
          (Array.isArray(moveData.multihit) ? moveData.multihit[1] : moveData.multihit) 
          : (options.hits || 1),
      });
    } catch (error) {
      console.error('[ShowdownIntegration] Move 생성 실패:', error);
      // 기본 기술로 폴백
      return new Move(this.currentGen.num, 'tackle', {
        ability: options.ability,
        item: options.item,
        species: options.species,
      });
    }
  }

  /**
   * 필드 상태 생성
   */
  createField(fieldState = {}) {
    return new Field({
      gameType: fieldState.gameType || 'Singles',
      weather: fieldState.weather,
      terrain: fieldState.terrain,
      isMagicRoom: fieldState.isMagicRoom || false,
      isWonderRoom: fieldState.isWonderRoom || false,
      isGravity: fieldState.isGravity || false,
      isCritical: fieldState.isCritical || false,
      attackerSide: new Side(fieldState.attackerSide || {}),
      defenderSide: new Side(fieldState.defenderSide || {}),
    });
  }

  /**
   * 완전한 데미지 계산 (모든 변수 고려)
   */
  calculateDamage(attacker, defender, moveName, fieldState = {}, options = {}) {
    const generation = options.generation || 9;

    try {
      // 포켓몬 객체 생성
      const attackerPokemon = this.createCalcPokemon(attacker, generation);
      const defenderPokemon = this.createCalcPokemon(defender, generation);

      // 기술 객체 생성
      const move = this.createCalcMove(moveName, options);
      if (!move) {
        return {
          error: '기술을 찾을 수 없습니다.',
          moveName,
        };
      }

      // 필드 상태 생성
      const field = this.createField(fieldState);

      // 데미지 계산
      const result = calculate(
        generation,
        attackerPokemon,
        defenderPokemon,
        move,
        field
      );

      const moveData = this.getMove(moveName);

      return {
        damage: result.damage,
        damageRange: result.range(),
        damagePercent: result.desc(),
        koChance: result.kochance(),
        rawDesc: result.fullDesc(),
        moveData,
        attacker: {
          name: attacker.nickname || attacker.species || attacker.name,
          level: attacker.level,
          ability: attacker.ability,
          item: attacker.item,
        },
        defender: {
          name: defender.nickname || defender.species || defender.name,
          level: defender.level,
          ability: defender.ability,
          item: defender.item,
          currentHP: defender.currentHP || defender.stats?.hp,
          maxHP: defender.maxHP || defender.stats?.hp,
        },
      };
    } catch (error) {
      console.error('[ShowdownIntegration] 데미지 계산 오류:', error);
      return {
        error: error.message || '알 수 없는 오류',
        moveName,
        damage: 0,
        attacker: {
          name: attacker?.nickname || attacker?.species || attacker?.name || 'Unknown',
        },
        defender: {
          name: defender?.nickname || defender?.species || defender?.name || 'Unknown',
        },
      };
    }
  }

  /**
   * 여러 기술 데미지 비교
   */
  compareMoveDamage(attacker, defender, moveNames, fieldState = {}) {
    return moveNames.map(moveName => {
      const result = this.calculateDamage(attacker, defender, moveName, fieldState);
      return {
        moveName,
        ...result,
      };
    }).sort((a, b) => {
      if (a.error) return 1;
      if (b.error) return -1;
      
      const avgA = Array.isArray(a.damage) ? 
        a.damage.reduce((sum, val) => sum + val, 0) / a.damage.length : a.damage;
      const avgB = Array.isArray(b.damage) ? 
        b.damage.reduce((sum, val) => sum + val, 0) / b.damage.length : b.damage;
      return avgB - avgA;
    });
  }

  /**
   * 모든 기술 목록 가져오기
   */
  getAllMoves() {
    const moves = [];
    for (const move of this.currentGen.moves) {
      const localMove = this.localMoves[move.id];
      moves.push({
        id: move.id,
        name: localMove?.name || move.name,
        nameEn: move.name,
        type: move.type,
        category: move.category,
        basePower: move.basePower,
      });
    }
    return moves;
  }

  /**
   * 모든 특성 목록 가져오기
   */
  getAllAbilities() {
    const abilities = [];
    for (const ability of this.currentGen.abilities) {
      const localAbility = this.localAbilities[ability.id];
      abilities.push({
        id: ability.id,
        name: localAbility?.name || ability.name,
        nameEn: ability.name,
        desc: ability.shortDesc,
      });
    }
    return abilities;
  }

  /**
   * 모든 도구 목록 가져오기
   */
  getAllItems() {
    const items = [];
    for (const item of this.currentGen.items) {
      items.push({
        id: item.id,
        name: item.name,
        desc: item.shortDesc,
      });
    }
    return items;
  }

  /**
   * getMoveData - getMove의 별칭 (호환성)
   */
  getMoveData(moveName) {
    return this.getMove(moveName);
  }
}

// 싱글톤 인스턴스
const showdownIntegration = new ShowdownIntegration();

export default showdownIntegration;
