const fs = require('fs');

const FILES = [
  'src/data/moves.json',
  'functions/data/moves.json',
];

const CONTEST_TYPE_KO = {
  cool: '근사함',
  beauty: '아름다움',
  cute: '귀여움',
  smart: '슬기로움',
  tough: '강인함',
};

const ORAS_GENERATIONS = new Set(['i', 'ii', 'iii', 'iv', 'v', 'vi']);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toPokeApiMoveName = (move) =>
  String(move.nameEn || move.id || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'poke-commu-system/contest-sync' },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
}

function getEnglishEffect(effect) {
  return effect?.effect_entries?.find((entry) => entry.language?.name === 'en')?.effect || '';
}

async function buildContestPatch(moves) {
  const effectCache = new Map();
  const patch = new Map();
  let processed = 0;

  for (const move of moves) {
    processed += 1;
    if (processed % 50 === 0) {
      console.log(`processed ${processed}/${moves.length}`);
    }

    if (!move?.nameEn) continue;
    if (!ORAS_GENERATIONS.has(move.generation)) {
      patch.set(move.id, {
        contestType: null,
        contestEffect: '',
        contestAppeals: 0,
        contestJam: 0,
      });
      continue;
    }

    let apiMove = null;
    try {
      apiMove = await fetchJson(`https://pokeapi.co/api/v2/move/${toPokeApiMoveName(move)}`);
    } catch (error) {
      throw new Error(`Failed while fetching move ${move.id} (${move.nameEn}): ${error.message}`);
    }
    const contestType = apiMove.contest_type?.name ? CONTEST_TYPE_KO[apiMove.contest_type.name] : null;
    // ORAS 라이브 콘테스트는 어필(♥)/방해(♡) 체계를 쓰는 고전 Contest(contest_effect)를 따른다.
    // super_contest_effect는 DPPt식 Voltage/Judge 시스템이라 이 저장소 규칙과 맞지 않는다.
    const effectUrl = apiMove.contest_effect?.url || null;

    if (!contestType || !effectUrl) {
      patch.set(move.id, {
        contestType: null,
        contestEffect: '',
        contestAppeals: 0,
        contestJam: 0,
      });
      continue;
    }

    if (!effectCache.has(effectUrl)) {
      try {
        effectCache.set(effectUrl, await fetchJson(effectUrl));
      } catch (error) {
        throw new Error(`Failed while fetching contest effect for ${move.id}: ${error.message}`);
      }
      await sleep(50);
    }

    const contestEffect = effectCache.get(effectUrl);
    patch.set(move.id, {
      contestType,
      contestEffect: getEnglishEffect(contestEffect),
      contestAppeals: Number(contestEffect.appeal) || 0,
      contestJam: Number(contestEffect.jam) || 0,
    });

    await sleep(50);
  }

  return patch;
}

async function main() {
  const primary = JSON.parse(fs.readFileSync(FILES[0], 'utf8'));
  const patch = await buildContestPatch(primary.moves || []);

  for (const file of FILES) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    let changed = 0;

    data.moves = (data.moves || []).map((move) => {
      const update = patch.get(move.id);
      if (!update && move.superContestEffect === undefined) return move;
      changed += 1;
      // superContestEffect는 이전(잘못된) 실행에서 남은 필드라 정리한다.
      return { ...move, ...update, superContestEffect: undefined };
    });

    fs.writeFileSync(file, JSON.stringify(data, null, file.startsWith('functions/') ? 2 : 0), 'utf8');
    console.log(`${file}: updated ${changed} moves`);
  }

  const reflect = primary.moves.find((move) => move.id === 'reflect');
  const reflectPatch = reflect ? patch.get(reflect.id) : null;
  console.log('reflect:', reflectPatch);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
