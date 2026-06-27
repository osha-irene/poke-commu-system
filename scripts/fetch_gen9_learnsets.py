"""
PokeAPI에서 9세대(스칼렛/바이올렛) 기준 리어셋을 가져와 moves.json을 업데이트하는 스크립트
"""
import json
import time
import sys
import urllib.request
import urllib.error

INPUT_FILE = "F:/BOT/poke-commu-system/src/data/moves.json"
OUTPUT_FILE = "F:/BOT/poke-commu-system/src/data/moves.json"

# 9세대 버전 그룹 (우선순위 순)
GEN9_VERSION_GROUPS = {"scarlet-violet"}

# TM 학습 방법 (method: machine)
# egg move 학습 방법
# tutor 학습 방법

LEVEL_UP_METHOD = "level-up"
MACHINE_METHOD = "machine"
EGG_METHOD = "egg"
TUTOR_METHOD = "tutor"


def fetch_json(url, retries=5):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "poke-commu-system/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            print(f"  HTTP {e.code} for {url}, retry {attempt+1}/{retries}")
            time.sleep(2 ** attempt)
        except Exception as e:
            print(f"  Error {e} for {url}, retry {attempt+1}/{retries}")
            time.sleep(2 ** attempt)
    return None


def get_pokemon_learnset(pokemon_id):
    url = f"https://pokeapi.co/api/v2/pokemon/{pokemon_id}/"
    data = fetch_json(url)
    if not data:
        return None

    level_up = []
    tm = []
    egg = []
    tutor = []

    seen_level_up = {}  # moveId -> min level

    for move_entry in data.get("moves", []):
        move_id = move_entry["move"]["name"]
        for vgd in move_entry.get("version_group_details", []):
            vg = vgd["version_group"]["name"]
            if vg not in GEN9_VERSION_GROUPS:
                continue
            method = vgd["move_learn_method"]["name"]
            level = vgd.get("level_learned_at", 0)

            if method == LEVEL_UP_METHOD:
                # 중복 moveId는 가장 낮은 레벨로
                if move_id not in seen_level_up or level < seen_level_up[move_id]:
                    seen_level_up[move_id] = level
            elif method == MACHINE_METHOD:
                if move_id not in tm:
                    tm.append(move_id)
            elif method == EGG_METHOD:
                if move_id not in egg:
                    egg.append(move_id)
            elif method == TUTOR_METHOD:
                if move_id not in tutor:
                    tutor.append(move_id)

    # level_up 정렬
    for move_id, level in seen_level_up.items():
        level_up.append({"moveId": move_id, "level": level})
    level_up.sort(key=lambda x: (x["level"], x["moveId"]))

    return {
        "levelUpMoves": level_up,
        "tmMoves": tm,
        "eggMoves": egg,
        "tutorMoves": tutor,
    }


def main():
    print("moves.json 로드 중...")
    with open(INPUT_FILE, encoding="utf-8") as f:
        moves_data = json.load(f)

    old_learnsets = moves_data.get("pokemonLearnsets", {})
    pokemon_ids = sorted([int(k) for k in old_learnsets.keys() if k.isdigit()])
    total = len(pokemon_ids)
    print(f"총 {total}마리 처리 시작\n")

    new_learnsets = {}
    skipped = []

    for i, pid in enumerate(pokemon_ids):
        sys.stdout.write(f"\r[{i+1}/{total}] #{pid} 처리 중...")
        sys.stdout.flush()

        learnset = get_pokemon_learnset(pid)
        if learnset is None:
            print(f"\n  #{pid}: 데이터 없음, 기존 데이터 유지")
            new_learnsets[str(pid)] = old_learnsets[str(pid)]
            skipped.append(pid)
        else:
            # 9세대 데이터가 전혀 없으면 기존 유지
            has_any = (
                learnset["levelUpMoves"]
                or learnset["tmMoves"]
                or learnset["eggMoves"]
                or learnset["tutorMoves"]
            )
            if not has_any:
                print(f"\n  #{pid}: 9세대 기술 없음, 기존 데이터 유지")
                new_learnsets[str(pid)] = old_learnsets[str(pid)]
                skipped.append(pid)
            else:
                new_learnsets[str(pid)] = learnset

        # PokeAPI rate limit 방지 (약 100ms 간격)
        time.sleep(0.15)

        # 100마리마다 중간 저장
        if (i + 1) % 100 == 0:
            moves_data["pokemonLearnsets"] = new_learnsets
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(moves_data, f, ensure_ascii=False, separators=(",", ":"))
            print(f"\n  중간 저장 완료 ({i+1}/{total})")

    # 최종 저장
    moves_data["pokemonLearnsets"] = new_learnsets
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(moves_data, f, ensure_ascii=False, separators=(",", ":"))

    print(f"\n\n완료! 저장: {OUTPUT_FILE}")
    print(f"처리: {total - len(skipped)}마리 업데이트, {len(skipped)}마리 기존 유지")
    if skipped:
        print(f"기존 유지 포켓몬: {skipped}")


if __name__ == "__main__":
    main()
