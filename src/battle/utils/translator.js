// src/battle/utils/translator.js
// 배틀 프로토콜 한글 번역 유틸리티

/**
 * @pkmn/sim 배틀 프로토콜 라인을 한글로 번역
 * 
 * @param {string} line - 프로토콜 라인 (예: "|move|p1a: Pikachu|Thunderbolt|p2a: Charizard")
 * @returns {string|null} 번역된 메시지 또는 null (무시할 라인)
 */
export function translateProtocolLine(line) {
  if (!line || typeof line !== 'string') return null;
  
  const parts = line.split('|').filter(Boolean);
  if (parts.length < 1) return null;
  
  const command = parts[0];
  
  switch (command) {
    case 'move':
      return translateMove(parts);
    case '-damage':
      return translateDamage(parts);
    case '-heal':
      return translateHeal(parts);
    case '-status':
      return translateStatus(parts);
    case '-boost':
      return translateBoost(parts);
    case '-unboost':
      return translateUnboost(parts);
    case '-crit':
      return translateCrit(parts);
    case '-supereffective':
      return '효과가 굉장했다!';
    case '-resisted':
      return '효과가 별로인 듯하다...';
    case '-immune':
      return translateImmune(parts);
    case '-miss':
      return translateMiss(parts);
    case '-fail':
      return translateFail(parts);
    case 'faint':
      return translateFaint(parts);
    case 'switch':
    case 'drag':
      return translateSwitch(parts);
    case 'turn':
      return `--- 턴 ${parts[1]} ---`;
    case 'win':
      return `${parts[1]}의 승리!`;
    case '-weather':
      return translateWeather(parts);
    case '-fieldstart':
    case '-fieldend':
      return translateField(parts);
    case '-ability':
      return translateAbility(parts);
    case '-activate':
      return translateActivate(parts);
    case '-start':
      return translateStart(parts);
    case '-end':
      return translateEnd(parts);
    case 'cant':
      return translateCant(parts);
    case '-item':
      return translateItem(parts);
    case '-enditem':
      return translateEndItem(parts);
    default:
      // 무시할 명령어들
      if (['', 'player', 'teamsize', 'gametype', 'gen', 'tier', 'rule', 
           'start', 'upkeep', 'request', 'j', 'J', 'l', 'L', 'n', 'N',
           'chat', 'c', 'c:', 'html', 'uhtml', 'raw', 'inactive', 'inactiveoff',
           'debug', 'seed', 'split'].includes(command)) {
        return null;
      }
      // 알 수 없는 명령어는 원본 반환 (디버깅용)
      console.log('[translator] 알 수 없는 명령어:', line);
      return null;
  }
}

/**
 * 포켓몬 이름 추출 (예: "p1a: Pikachu" -> "피카츄")
 */
function extractPokemonName(pokemonStr) {
  if (!pokemonStr) return '포켓몬';
  
  // "p1a: Name" 형식에서 이름만 추출
  const match = pokemonStr.match(/p[12][abc]?: (.+)/);
  if (match) {
    return match[1];
  }
  return pokemonStr;
}

/**
 * 플레이어 번호 추출
 */
function extractPlayerNum(pokemonStr) {
  if (!pokemonStr) return '';
  if (pokemonStr.includes('p1')) return '1P';
  if (pokemonStr.includes('p2')) return '2P';
  return '';
}

/**
 * 기술 사용 번역
 */
function translateMove(parts) {
  const pokemon = extractPokemonName(parts[1]);
  const move = parts[2] || '기술';
  const target = extractPokemonName(parts[3]);
  
  if (target && target !== pokemon) {
    return `${pokemon}의 ${move}!`;
  }
  return `${pokemon}의 ${move}!`;
}

/**
 * 데미지 번역
 */
function translateDamage(parts) {
  const pokemon = extractPokemonName(parts[1]);
  const hpInfo = parts[2] || '';
  const source = parts[3] || '';
  
  // HP 정보 파싱
  let hpText = '';
  if (hpInfo.includes('/')) {
    const [current, max] = hpInfo.split('/');
    hpText = ` (HP: ${current}/${max.split(' ')[0]})`;
  } else if (hpInfo === '0 fnt') {
    return `${pokemon}은(는) 쓰러졌다!`;
  }
  
  // 데미지 원인
  if (source) {
    if (source.includes('[from] item:')) {
      const item = source.replace('[from] item:', '').trim();
      return `${pokemon}은(는) ${item}에 의해 데미지를 입었다!${hpText}`;
    }
    if (source.includes('[from] ability:')) {
      const ability = source.replace('[from] ability:', '').trim();
      return `${pokemon}은(는) ${ability}에 의해 데미지를 입었다!${hpText}`;
    }
    if (source.includes('[from]')) {
      return `${pokemon}은(는) 데미지를 입었다!${hpText}`;
    }
  }
  
  return `${pokemon}은(는) 데미지를 입었다!${hpText}`;
}

/**
 * 회복 번역
 */
function translateHeal(parts) {
  const pokemon = extractPokemonName(parts[1]);
  const source = parts[3] || '';
  
  if (source.includes('[from] item:')) {
    const item = source.replace('[from] item:', '').trim();
    return `${pokemon}은(는) ${item}으로 HP를 회복했다!`;
  }
  if (source.includes('[from] ability:')) {
    const ability = source.replace('[from] ability:', '').trim();
    return `${pokemon}은(는) ${ability}으로 HP를 회복했다!`;
  }
  
  return `${pokemon}은(는) HP를 회복했다!`;
}

/**
 * 상태이상 번역
 */
function translateStatus(parts) {
  const pokemon = extractPokemonName(parts[1]);
  const status = parts[2] || '';
  
  const statusMap = {
    'brn': '화상을 입었다!',
    'par': '마비되었다!',
    'slp': '잠들어 버렸다!',
    'frz': '얼어붙었다!',
    'psn': '독에 걸렸다!',
    'tox': '맹독에 걸렸다!'
  };
  
  return `${pokemon}은(는) ${statusMap[status] || `${status} 상태가 되었다!`}`;
}

/**
 * 스탯 상승 번역
 */
function translateBoost(parts) {
  const pokemon = extractPokemonName(parts[1]);
  const stat = parts[2] || '';
  const amount = parseInt(parts[3]) || 1;
  
  const statMap = {
    'atk': '공격',
    'def': '방어',
    'spa': '특수공격',
    'spd': '특수방어',
    'spe': '스피드',
    'accuracy': '명중률',
    'evasion': '회피율'
  };
  
  const statName = statMap[stat] || stat;
  const amountText = amount === 1 ? '' : amount === 2 ? '크게 ' : '매우 크게 ';
  
  return `${pokemon}의 ${statName}이(가) ${amountText}올랐다!`;
}

/**
 * 스탯 하락 번역
 */
function translateUnboost(parts) {
  const pokemon = extractPokemonName(parts[1]);
  const stat = parts[2] || '';
  const amount = parseInt(parts[3]) || 1;
  
  const statMap = {
    'atk': '공격',
    'def': '방어',
    'spa': '특수공격',
    'spd': '특수방어',
    'spe': '스피드',
    'accuracy': '명중률',
    'evasion': '회피율'
  };
  
  const statName = statMap[stat] || stat;
  const amountText = amount === 1 ? '' : amount === 2 ? '크게 ' : '매우 크게 ';
  
  return `${pokemon}의 ${statName}이(가) ${amountText}떨어졌다!`;
}

/**
 * 급소 번역
 */
function translateCrit(parts) {
  return '급소에 맞았다!';
}

/**
 * 무효화 번역
 */
function translateImmune(parts) {
  const pokemon = extractPokemonName(parts[1]);
  return `${pokemon}에게는 효과가 없는 것 같다...`;
}

/**
 * 빗나감 번역
 */
function translateMiss(parts) {
  const attacker = extractPokemonName(parts[1]);
  const defender = extractPokemonName(parts[2]);
  
  if (defender) {
    return `${defender}은(는) 공격을 피했다!`;
  }
  return `${attacker}의 공격은 빗나갔다!`;
}

/**
 * 실패 번역
 */
function translateFail(parts) {
  const pokemon = extractPokemonName(parts[1]);
  return `${pokemon}은(는) 기술을 사용할 수 없다!`;
}

/**
 * 쓰러짐 번역
 */
function translateFaint(parts) {
  const pokemon = extractPokemonName(parts[1]);
  return `${pokemon}은(는) 쓰러졌다!`;
}

/**
 * 교체 번역
 */
function translateSwitch(parts) {
  const player = extractPlayerNum(parts[1]);
  const pokemon = extractPokemonName(parts[1]);
  const species = parts[2] || '';
  
  return `${player} ${pokemon} 등장!`;
}

/**
 * 날씨 번역
 */
function translateWeather(parts) {
  const weather = parts[1] || '';
  
  const weatherMap = {
    'RainDance': '비가 내리기 시작했다!',
    'SunnyDay': '햇살이 강해졌다!',
    'Sandstorm': '모래바람이 불기 시작했다!',
    'Hail': '싸라기눈이 내리기 시작했다!',
    'Snow': '눈이 내리기 시작했다!',
    'none': '날씨가 정상으로 돌아왔다.'
  };
  
  // [upkeep] 태그가 있으면 날씨 지속
  if (parts.includes('[upkeep]')) {
    const upkeepMap = {
      'RainDance': '비가 계속 내리고 있다.',
      'SunnyDay': '햇살이 강하다.',
      'Sandstorm': '모래바람이 세차다.',
      'Hail': '싸라기눈이 계속 내린다.',
      'Snow': '눈이 계속 내리고 있다.'
    };
    return upkeepMap[weather] || null;
  }
  
  return weatherMap[weather] || `${weather} 날씨가 되었다!`;
}

/**
 * 필드 효과 번역
 */
function translateField(parts) {
  const field = parts[1] || '';
  const isStart = parts[0] === '-fieldstart';
  
  const fieldMap = {
    'Electric Terrain': isStart ? '전기 필드가 펼쳐졌다!' : '전기 필드가 사라졌다.',
    'Grassy Terrain': isStart ? '그래스 필드가 펼쳐졌다!' : '그래스 필드가 사라졌다.',
    'Misty Terrain': isStart ? '미스트 필드가 펼쳐졌다!' : '미스트 필드가 사라졌다.',
    'Psychic Terrain': isStart ? '사이코 필드가 펼쳐졌다!' : '사이코 필드가 사라졌다.',
    'Trick Room': isStart ? '트릭룸이 발동되었다!' : '트릭룸이 해제되었다.'
  };
  
  return fieldMap[field] || (isStart ? `${field}이(가) 발동되었다!` : `${field}이(가) 해제되었다.`);
}

/**
 * 특성 발동 번역
 */
function translateAbility(parts) {
  const pokemon = extractPokemonName(parts[1]);
  const ability = parts[2] || '';
  
  return `[${pokemon}의 특성: ${ability}]`;
}

/**
 * 효과 발동 번역
 */
function translateActivate(parts) {
  const pokemon = extractPokemonName(parts[1]);
  const effect = parts[2] || '';
  
  if (effect.includes('ability:')) {
    const ability = effect.replace('ability:', '').trim();
    return `${pokemon}의 ${ability} 발동!`;
  }
  if (effect.includes('item:')) {
    const item = effect.replace('item:', '').trim();
    return `${pokemon}의 ${item} 발동!`;
  }
  if (effect.includes('move:')) {
    const move = effect.replace('move:', '').trim();
    return `${pokemon}의 ${move} 효과 발동!`;
  }
  
  return `${pokemon}의 ${effect} 발동!`;
}

/**
 * 상태 시작 번역
 */
function translateStart(parts) {
  const pokemon = extractPokemonName(parts[1]);
  const effect = parts[2] || '';
  
  const effectMap = {
    'confusion': '혼란에 빠졌다!',
    'Substitute': '대타출동을 썼다!',
    'perish3': '멸망의 노래를 듣기 시작했다!',
    'Taunt': '도발에 걸렸다!',
    'Disable': '기술봉인에 걸렸다!',
    'Encore': '앙코르에 걸렸다!'
  };
  
  if (effect.includes('move:')) {
    const move = effect.replace('move:', '').trim();
    return `${pokemon}은(는) ${move}을(를) 준비하고 있다!`;
  }
  
  return `${pokemon}은(는) ${effectMap[effect] || `${effect} 상태가 되었다!`}`;
}

/**
 * 상태 종료 번역
 */
function translateEnd(parts) {
  const pokemon = extractPokemonName(parts[1]);
  const effect = parts[2] || '';
  
  const effectMap = {
    'confusion': '혼란에서 풀렸다.',
    'Substitute': '대타가 사라졌다!',
    'Taunt': '도발이 풀렸다.',
    'Disable': '기술봉인이 풀렸다.',
    'Encore': '앙코르가 풀렸다.'
  };
  
  return `${pokemon}의 ${effectMap[effect] || `${effect}이(가) 해제되었다.`}`;
}

/**
 * 행동 불가 번역
 */
function translateCant(parts) {
  const pokemon = extractPokemonName(parts[1]);
  const reason = parts[2] || '';
  
  const reasonMap = {
    'par': '마비되어 움직일 수 없다!',
    'slp': '새근새근 잠들어 있다.',
    'frz': '얼어붙어 움직일 수 없다!',
    'flinch': '풀이 죽어 기술을 쓸 수 없었다!',
    'nopp': '기술의 PP가 없다!',
    'recharge': '공격의 반동으로 움직일 수 없다!',
    'Taunt': '도발을 당해 기술을 사용할 수 없다!',
    'Disable': '봉인당해 기술을 사용할 수 없다!'
  };
  
  return `${pokemon}은(는) ${reasonMap[reason] || '움직일 수 없다!'}`;
}

/**
 * 아이템 획득/사용 번역
 */
function translateItem(parts) {
  const pokemon = extractPokemonName(parts[1]);
  const item = parts[2] || '';
  
  return `${pokemon}은(는) ${item}을(를) 발동시켰다!`;
}

/**
 * 아이템 소모 번역
 */
function translateEndItem(parts) {
  const pokemon = extractPokemonName(parts[1]);
  const item = parts[2] || '';
  
  return `${pokemon}의 ${item}이(가) 사라졌다!`;
}

export default {
  translateProtocolLine
};
