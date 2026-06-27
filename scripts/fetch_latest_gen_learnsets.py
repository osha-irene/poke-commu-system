"""
9세대 데이터가 없는 포켓몬을 등장한 가장 최신 세대 기준으로 업데이트하는 스크립트
"""
import json
import time
import sys
import urllib.request
import urllib.error

INPUT_FILE = "F:/BOT/poke-commu-system/src/data/moves.json"
OUTPUT_FILE = "F:/BOT/poke-commu-system/src/data/moves.json"

# 최신 세대 순으로 정렬된 버전 그룹 목록
VERSION_GROUP_PRIORITY = [
    "scarlet-violet",                        # Gen 9
    "brilliant-diamond-shining-pearl",       # Gen 8 (BDSP)
    "sword-shield",                          # Gen 8
    "lets-go-pikachu-lets-go-eevee",        # Gen 7 (레츠고)
    "ultra-sun-ultra-moon",                  # Gen 7
    "sun-moon",                              # Gen 7
    "omega-ruby-alpha-sapphire",             # Gen 6
    "x-y",                                   # Gen 6
    "black-2-white-2",                       # Gen 5
    "black-white",                           # Gen 5
    "heartgold-soulsilver",                  # Gen 4
    "platinum",                              # Gen 4
    "diamond-pearl",                         # Gen 4
    "emerald",                               # Gen 3
    "firered-leafgreen",                     # Gen 3
    "ruby-sapphire",                         # Gen 3
    "crystal",                               # Gen 2
    "gold-silver",                           # Gen 2
    "yellow",                                # Gen 1
    "red-blue",                              # Gen 1
]

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


def get_pokemon_learnset_best(pokemon_id):
    """가장 최신 세대 기준으로 리어셋 반환. 사용된 버전 그룹도 같이 반환."""
    url = f"https://pokeapi.co/api/v2/pokemon/{pokemon_id}/"
    data = fetch_json(url)
    if not data:
        return None, None

    # 이 포켓몬이 가진 모든 버전 그룹 수집
    available_vgs = set()
    for move_entry in data.get("moves", []):
        for vgd in move_entry.get("version_group_details", []):
            available_vgs.add(vgd["version_group"]["name"])

    # 우선순위 순으로 가장 최신 버전 그룹 선택
    chosen_vg = None
    for vg in VERSION_GROUP_PRIORITY:
        if vg in available_vgs:
            chosen_vg = vg
            break

    if not chosen_vg:
        return None, None

    level_up = []
    tm = []
    egg = []
    tutor = []
    seen_level_up = {}

    for move_entry in data.get("moves", []):
        move_id = move_entry["move"]["name"]
        for vgd in move_entry.get("version_group_details", []):
            if vgd["version_group"]["name"] != chosen_vg:
                continue
            method = vgd["move_learn_method"]["name"]
            level = vgd.get("level_learned_at", 0)

            if method == LEVEL_UP_METHOD:
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

    for move_id, level in seen_level_up.items():
        level_up.append({"moveId": move_id, "level": level})
    level_up.sort(key=lambda x: (x["level"], x["moveId"]))

    return {
        "levelUpMoves": level_up,
        "tmMoves": tm,
        "eggMoves": egg,
        "tutorMoves": tutor,
    }, chosen_vg


def main():
    print("moves.json 로드 중...")
    with open(INPUT_FILE, encoding="utf-8") as f:
        moves_data = json.load(f)

    learnsets = moves_data.get("pokemonLearnsets", {})

    # 9세대 기준 처리 시 기존 데이터 유지된 포켓몬 식별
    # → levelUpMoves가 비어있거나 데이터가 구버전 형태인 것들
    # 스크립트 1차 실행 때 skipped 목록을 다시 찾기:
    # "9세대 기술 없음" = levelUpMoves가 0개인 것들만 재처리
    # 실제로는 1차 실행에서 기존 유지된 목록을 다시 API로 확인

    # 방법: 모든 포켓몬에 대해 API 호출, 9세대 데이터 없는 것만 최신세대로 처리
    # (이미 9세대로 업데이트된 것은 건드리지 않음)

    # 1차 스크립트가 기존 유지한 포켓몬 = scarlet-violet 데이터가 없는 것들
    # 이를 찾기 위해 백업과 비교하거나 API로 재확인
    # 여기서는 간단하게: levelUpMoves가 있고 tmMoves 중 scarlet-violet 전용 기술
    # (예: tera-blast)이 없는 포켓몬 → 재처리 대상으로 간주하기 어려움
    # → 직접 API로 확인하는 게 가장 정확함

    # 재처리 대상: API에서 scarlet-violet 없는 포켓몬
    all_ids = sorted([int(k) for k in learnsets.keys() if k.isdigit()])
    total = len(all_ids)

    updated_count = 0
    skipped_count = 0
    version_used = {}  # pid -> vg

    for i, pid in enumerate(all_ids):
        learnset, vg = get_pokemon_learnset_best(pid)

        if learnset is None:
            sys.stdout.write(f"\r[{i+1}/{total}] #{pid}: 데이터 없음, 유지\n")
            skipped_count += 1
        elif vg == "scarlet-violet":
            # 이미 9세대로 처리됨, 건드리지 않음
            sys.stdout.write(f"\r[{i+1}/{total}] #{pid} OK (scarlet-violet)      ")
            sys.stdout.flush()
        else:
            has_any = learnset["levelUpMoves"] or learnset["tmMoves"] or learnset["eggMoves"] or learnset["tutorMoves"]
            if has_any:
                learnsets[str(pid)] = learnset
                version_used[pid] = vg
                sys.stdout.write(f"\r[{i+1}/{total}] #{pid} → {vg} 적용\n")
                updated_count += 1
            else:
                sys.stdout.write(f"\r[{i+1}/{total}] #{pid}: 기술 없음, 유지\n")
                skipped_count += 1

        sys.stdout.flush()
        time.sleep(0.15)

        if (i + 1) % 100 == 0:
            moves_data["pokemonLearnsets"] = learnsets
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(moves_data, f, ensure_ascii=False, separators=(",", ":"))
            print(f"  중간 저장 완료 ({i+1}/{total})")

    moves_data["pokemonLearnsets"] = learnsets
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(moves_data, f, ensure_ascii=False, separators=(",", ":"))

    print(f"\n완료! 저장: {OUTPUT_FILE}")
    print(f"추가 업데이트: {updated_count}마리, 건드리지 않음: {skipped_count}마리")
    if version_used:
        # 사용된 버전 그룹 통계
        from collections import Counter
        c = Counter(version_used.values())
        print("사용된 버전 그룹:")
        for vg, cnt in c.most_common():
            print(f"  {vg}: {cnt}마리")


if __name__ == "__main__":
    main()
