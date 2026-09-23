class qae {
    constructor() {
        this.dex = Eh, this.gens = new qX(Eh), this.currentGen = this.gens.get(9), this.localMoves = this._indexLocalData(tn.moves, ["id", "nameEn", "name"]), this.localAbilities = this._indexLocalData(yQ.abilities, ["id", "nameEn", "name"]), this.localSpecies = this._indexLocalData(fQ, ["nameEn", "name"]), this.localItems = this._indexLocalData(Kh.items || Kh, ["nameEn", "name"])
    }
    normalizeKey(t) {
        return String(t || "").toLowerCase().replace(/[\s_\-'.:]/g, "").replace(/[^\p{L}\p{N}]/gu, "")
    }
    _indexLocalData(t, s) {
        const a = {};
        return t.forEach(r => {
            s.forEach(i => {
                const n = this.normalizeKey(r[i]);
                n && (a[n] = r)
            })
        }), a
    }
    setGeneration(t) {
        return this.currentGen = this.gens.get(t), this.currentGen
    }
    resolveSpeciesName(t) {
        const s = this.normalizeKey(t),
            a = this.localSpecies[s];
        return a != null && a.nameEn ? this.normalizeKey(a.nameEn) : s
    }
    getMove(t) {
        if (!t) return null;
        const s = this.normalizeKey(t),
            a = this.localMoves[s],
            r = (a == null ? void 0 : a.nameEn) || (a == null ? void 0 : a.id) || t,
            i = this.currentGen.moves.get(this.normalizeKey(r));
        return i ? {
            id: i.id,
            name: (a == null ? void 0 : a.name) || i.name,
            nameEn: i.name,
            nameKo: (a == null ? void 0 : a.name) || i.name,
            type: i.type,
            category: i.category,
            basePower: i.basePower,
            accuracy: i.accuracy === !0 ? 100 : i.accuracy,
            alwaysHit: i.accuracy === !0,
            hasCrashDamage: i.hasCrashDamage || !1,
            pp: i.pp,
            priority: i.priority,
            target: i.target,
            flags: i.flags || {},
            secondary: i.secondary,
            secondaryChance: i.secondaryChance,
            self: i.self,
            critRatio: i.critRatio || 1,
            willCrit: i.willCrit || !1,
            recoil: i.recoil,
            mindBlownRecoil: i.mindBlownRecoil || !1,
            drain: i.drain,
            heal: i.heal,
            multihit: i.multihit,
            ignoreDefensive: i.ignoreDefensive || !1,
            ignoreEvasion: i.ignoreEvasion || !1,
            ignoreAbility: i.ignoreAbility || !1,
            breaksProtect: i.breaksProtect || !1,
            volatileStatus: i.volatileStatus,
            status: i.status,
            boosts: i.boosts,
            weather: i.weather,
            terrain: i.terrain,
            sideCondition: i.sideCondition,
            pseudoWeather: i.pseudoWeather,
            isZ: i.isZ || !1,
            isMax: i.isMax || !1,
            description: (a == null ? void 0 : a.description) || i.desc || "",
            shortDesc: i.shortDesc || ""
        } : (console.warn(`[showdownIntegration] 기술을 찾을 수 없음(쇼다운 데이터 없음): ${t}`), null)
    }
    getAbility(t) {
        if (!t) return null;
        const s = this.normalizeKey(t),
            a = this.localAbilities[s],
            r = (a == null ? void 0 : a.nameEn) || (a == null ? void 0 : a.id) || t,
            i = this.currentGen.abilities.get(this.normalizeKey(r));
        return i ? {
            id: i.id,
            name: (a == null ? void 0 : a.name) || i.name,
            nameEn: i.name,
            nameKo: (a == null ? void 0 : a.name) || i.name
        } : (console.warn(`[showdownIntegration] 특성을 찾을 수 없음(쇼다운 데이터 없음): ${t}`), null)
    }
    getItem(t) {
        if (!t) return null;
        const s = this.normalizeKey(t),
            a = this.localItems[s],
            r = (a == null ? void 0 : a.nameEn) || t,
            i = this.currentGen.items.get(this.normalizeKey(r));
        return i ? {
            id: i.id,
            name: i.name,
            nameEn: i.name,
            nameKo: (a == null ? void 0 : a.name) || i.name
        } : (console.warn(`[showdownIntegration] 도구를 찾을 수 없음(쇼다운 데이터 없음): ${t}`), null)
    }
    getSpecies(t) {
        if (!t) return null;
        const s = this.resolveSpeciesName(t),
            a = this.dex.species.get(s);
        if (!a) return console.warn(`[showdownIntegration] 포켓몬을 찾을 수 없음: ${t}`), null;
        const r = this.localSpecies[this.normalizeKey(t)];
        return {
            id: s,
            name: (r == null ? void 0 : r.name) || a.name,
            nameEn: a.name,
            baseStats: a.baseStats,
            types: a.types,
            abilities: a.abilities
        }
    }
    getTypeEffectiveness(t, s) {
        if (!t || !s || s.length === 0) return 1;
        let a = 1;
        return s.forEach(r => {
            const i = this.dex.types.get(r);
            if (!i) return;
            const n = i.damageTaken[t];
            n === 1 ? a *= 2 : n === 2 ? a *= .5 : n === 3 && (a *= 0)
        }), a
    }
    createCalcPokemon(t, s = 9) {
        var a, r;
        try {
            const i = t.nature ? t.nature.charAt(0).toUpperCase() + t.nature.slice(1).toLowerCase() : "Hardy",
                n = {
                    baseStats: t.baseStats || {
                        hp: 100,
                        atk: 100,
                        def: 100,
                        spa: 100,
                        spd: 100,
                        spe: 100
                    },
                    types: t.types && t.types.length ? t.types : ["Normal"]
                },
                o = t.ability ? (a = this.getAbility(t.ability)) == null ? void 0 : a.nameEn : void 0,
                l = t.item ? (r = this.getItem(t.item)) == null ? void 0 : r.name : void 0;
            return new Tt.Pokemon(s, "bulbasaur", {
                level: t.level || 50,
                ability: o,
                item: l || "",
                nature: i,
                gender: t.gender || void 0,
                ivs: t.ivs || {
                    hp: 31,
                    atk: 31,
                    def: 31,
                    spa: 31,
                    spd: 31,
                    spe: 31
                },
                evs: t.evs || {
                    hp: 0,
                    atk: 0,
                    def: 0,
                    spa: 0,
                    spd: 0,
                    spe: 0
                },
                boosts: t.boosts || {
                    atk: 0,
                    def: 0,
                    spa: 0,
                    spd: 0,
                    spe: 0
                },
                status: t.status || "",
                curHP: t.currentHP,
                teraType: t.teraType || void 0,
                overrides: n
            })
        } catch (i) {
            return console.error("[showdownIntegration] Pokemon 생성 실패:", i), new Tt.Pokemon(s, "ditto", {
                level: t.level || 50,
                nature: "Hardy",
                ivs: {
                    hp: 31,
                    atk: 31,
                    def: 31,
                    spa: 31,
                    spd: 31,
                    spe: 31
                },
                evs: {
                    hp: 0,
                    atk: 0,
                    def: 0,
                    spa: 0,
                    spd: 0,
                    spe: 0
                }
            })
        }
    }
    createCalcMove(t, s = {}) {
        try {
            let a = this.normalizeKey(t);
            const r = this.getMove(a);
            return r || (console.warn(`[showdownIntegration] 기술을 찾을 수 없음: ${a}, tackle로 대체`), a = "tackle"), new Tt.Move(this.currentGen.num, (r == null ? void 0 : r.nameEn) || (r == null ? void 0 : r.id) || a, {
                ability: s.ability,
                item: s.item,
                useZ: (r == null ? void 0 : r.isZ) || !1,
                useMax: (r == null ? void 0 : r.isMax) || !1,
                isCrit: s.isCrit || !1,
                hits: s.hits || (r != null && r.multihit ? Array.isArray(r.multihit) ? r.multihit[1] : r.multihit : 1)
            })
        } catch (a) {
            return console.error("[showdownIntegration] Move 생성 실패:", a), new Tt.Move(this.currentGen.num, "tackle", {})
        }
    }
    createField(t = {}) {
        return new Tt.Field({
            gameType: t.gameType || "Singles",
            weather: t.weather,
            terrain: t.terrain,
            attackerSide: new Tt.Side(t.attackerSide || {}),
            defenderSide: new Tt.Side(t.defenderSide || {})
        })
    }
    calculateDamage(t, s, a, r = {}, i = {}) {
        const n = i.generation || 9,
            o = this.getMove(a);
        if (o && (!o.basePower || o.basePower === 0)) return {
            damage: 0,
            damageRange: null,
            desc: "",
            koChance: null,
            moveData: o
        };
        try {
            const l = this.createCalcPokemon(t, n),
                p = this.createCalcPokemon(s, n),
                c = this.createCalcMove(a, i),
                h = this.createField(r),
                d = Tt.calculate(n, l, p, c, h);
            return {
                damage: d.damage,
                damageRange: typeof d.range == "function" ? d.range() : null,
                desc: typeof d.desc == "function" ? d.desc() : "",
                koChance: typeof d.kochance == "function" ? d.kochance() : null,
                moveData: this.getMove(a)
            }
        } catch (l) {
            return /damage\[damage\.length - 1\] === 0/.test(l.message || "") ? console.warn(`[showdownIntegration] ${a}: 데미지 0 (타입 무효 등)`) : console.error("[showdownIntegration] 데미지 계산 오류:", l), {
                error: l.message || "알 수 없는 오류",
                damage: 0,
                moveName: a,
                moveData: this.getMove(a)
            }
        }
    }
}
const xe = new qae;

function Jae(e, t, s, a) {
    return e === 1 ? 1 : Math.floor((2 * e + t + Math.floor(s / 4)) * a / 100) + a + 10
}

function ap(e, t, s, a) {
    return Math.floor((2 * e + t + Math.floor(s / 4)) * a / 100) + 5
}
const mr = {
        adamant: [1.1, 1, .9, 1, 1],
        brave: [1.1, 1, .9, 1, .9],
        lonely: [1.1, .9, 1, 1, 1],
        naughty: [1.1, 1, 1, .9, 1],
        bold: [.9, 1.1, 1, 1, 1],
        impish: [1, 1.1, .9, 1, 1],
        lax: [1, 1.1, 1, .9, 1],
        relaxed: [1, 1.1, 1, 1, .9],
        modest: [.9, 1, 1.1, 1, 1],
        mild: [1, .9, 1.1, 1, 1],
        rash: [1, 1, 1.1, .9, 1],
        quiet: [1, 1, 1.1, 1, .9],
        calm: [.9, 1, 1, 1.1, 1],
        gentle: [1, .9, 1, 1.1, 1],
        careful: [1, 1, .9, 1.1, 1],
        sassy: [1, 1, 1, 1.1, .9],
        timid: [.9, 1, 1, 1, 1.1],
        hasty: [1, .9, 1, 1, 1.1],
        jolly: [1, 1, .9, 1, 1.1],
        naive: [1, 1, 1, .9, 1.1],
        serious: [1, 1, 1, 1, 1],
        docile: [1, 1, 1, 1, 1],
        bashful: [1, 1, 1, 1, 1],
        quirky: [1, 1, 1, 1, 1],
        hardy: [1, 1, 1, 1, 1]
    },
    _ae = {
        "-6": 2 / 8,
        "-5": 2 / 7,
        "-4": 2 / 6,
        "-3": 2 / 5,
        "-2": 2 / 4,
        "-1": 2 / 3,
        0: 1,
        1: 3 / 2,
        2: 4 / 2,
        3: 5 / 2,
        4: 6 / 2,
        5: 7 / 2,
        6: 8 / 2
    };

function bQ(e, t) {
    const s = _ae[Math.max(-6, Math.min(6, t)).toString()];
    return Math.floor(e * s)
}
const sn = {
        철벽: [{
            id: "ironwall",
            name: "철통 방어",
            desc: "3턴 동안 같은 조 아군 전체 방어/특수방어 1.5배"
        }, {
            id: "guard",
            name: "뒤는 맡기라고",
            desc: "이번 턴 보스의 공격 대상을 자신으로 고정해 대신 받아낸다"
        }],
        칼춤: [{
            id: "pumpup",
            name: "힘내라 힘",
            desc: "3턴 동안 자신의 공격/특수공격 1.5배"
        }, {
            id: "finisher",
            name: "끝내버려",
            desc: "다음 턴 자신의 물리/특수공격이 3배가 되지만, 그 턴이 끝나면 1턴 행동 불가 (마지막 라운드에는 사용 불가)"
        }],
        도우미: [{
            id: "healcry",
            name: "치유의 함성",
            desc: "같은 조 아군 전체 체력을 최대 체력의 50%만큼 회복 (회복봉인 상태는 제외)"
        }, {
            id: "cleanse",
            name: "만전 태세",
            desc: "같은 조 아군 전체의 상태이상·헤롱헤롱·도발·앵콜·트집·회복봉인·사슬묶기를 회복 (혼란/씨뿌리기/조이기는 제외)"
        }]
    },
    $ae = Object.keys(sn),
    rp = 2;

function Xae(e, t) {
    return (sn[e] || []).find(s => s.id === t) || null
}
const kQ = {
        atk: "공격",
        def: "방어",
        spa: "특수공격",
        spd: "특수방어",
        spe: "스피드",
        accuracy: "명중률",
        evasion: "회피율"
    },
    Za = {
        brn: "화상",
        psn: "독",
        tox: "맹독",
        par: "마비",
        slp: "잠듦",
        frz: "얼음"
    };

function Zh(e) {
    return ap(e.baseStats.spe, e.ivs.spe, e.evs.spe, e.level)
}
const Qae = 4;

function Yae(e) {
    var r;
    if (!e) return 0;
    const t = ap(e.baseStats.spe, e.ivs.spe, e.evs.spe, e.level),
        s = mr[String(e.nature || "hardy").toLowerCase()] || mr.hardy;
    let a = Math.floor(t * s[Qae]);
    return a = bQ(a, ((r = e.boosts) == null ? void 0 : r.spe) || 0), e.status === "par" && (a = Math.floor(a * .5)), Math.max(1, a)
}

function ere(e) {
    if (!e) return [];
    const t = e.participants.filter(Boolean).map(s => ({
        key: `p-${s.id}`,
        label: s.nickname,
        speed: Zh(s),
        fainted: s.fainted,
        isBoss: !1
    }));
    return t.push({
        key: "boss",
        label: e.boss.nickname,
        speed: Zh(e.boss),
        fainted: e.boss.fainted,
        isBoss: !0
    }), t.sort((s, a) => a.speed - s.speed)
}
const tre = new Set(["baton-pass", "shed-tail", "disable", "imprison", "encore", "torment", "ally-switch", "after-you", "quash", "trick", "switcheroo", "guard-split", "power-split", "follow-me", "rage-powder", "healing-wish", "lunar-dance", "memento", "tar-shot", "super-fang", "seismic-toss", "night-shade", "dragon-rage", "sonic-boom", "doodle", "gastro-acid", "worry-seed", "skill-swap", "explosion", "self-destruct", "final-gambit", "magic-powder", "soak", "forests-curse", "trick-or-treat", "perish-song", "destiny-bond", "fissure", "guillotine", "horn-drill", "sheer-cold"]);

function ip(e) {
    return tre.has(e)
}
const PQ = 5,
    vQ = 5,
    sre = 5,
    are = {
        raindance: "Rain",
        sunnyday: "Sun",
        sandstorm: "Sand",
        snowscape: "Snow",
        chillyreception: "Snow",
        hail: "Hail"
    },
    rre = {
        electricterrain: "Electric",
        grassyterrain: "Grassy",
        mistyterrain: "Misty",
        psychicterrain: "Psychic"
    },
    pa = {
        Rain: {
            name: "비",
            set: "비가 내리기 시작했다!",
            end: "비가 그쳤다!"
        },
        Sun: {
            name: "쨍쨍햇살",
            set: "햇살이 강해졌다!",
            end: "햇살이 원래대로 돌아왔다!"
        },
        Sand: {
            name: "모래바람",
            set: "모래바람이 불기 시작했다!",
            end: "모래바람이 가라앉았다!"
        },
        Snow: {
            name: "설경",
            set: "눈이 내리기 시작했다!",
            end: "눈이 그쳤다!"
        },
        Hail: {
            name: "싸라기눈",
            set: "싸라기눈이 내리기 시작했다!",
            end: "싸라기눈이 그쳤다!"
        }
    },
    ire = {
        Sand: ["Rock", "Ground", "Steel"],
        Hail: ["Ice"]
    },
    dr = {
        Electric: {
            name: "일렉트릭필드",
            set: "발밑에 전기가 흐르기 시작했다!",
            end: "일렉트릭필드가 사라졌다!"
        },
        Grassy: {
            name: "그래스필드",
            set: "발밑에 풀이 무성해졌다!",
            end: "그래스필드가 사라졌다!"
        },
        Misty: {
            name: "미스트필드",
            set: "발밑에 안개가 자욱이 꼈다!",
            end: "미스트필드가 사라졌다!"
        },
        Psychic: {
            name: "사이코필드",
            set: "발밑이 이상해졌다!",
            end: "사이코필드가 사라졌다!"
        }
    },
    gr = {
        tailwind: {
            name: "순풍",
            turns: 4,
            set: "순풍이 불기 시작했다!",
            end: "순풍이 멈췄다!"
        },
        reflect: {
            name: "리플렉터",
            turns: 5,
            set: "반사벽이 생겨났다!",
            end: "반사벽이 사라졌다!"
        },
        lightscreen: {
            name: "빛의장막",
            turns: 5,
            set: "빛의장막이 생겨났다!",
            end: "빛의장막이 사라졌다!"
        },
        auroraveil: {
            name: "오로라베일",
            turns: 5,
            set: "오로라베일이 생겨났다!",
            end: "오로라베일이 사라졌다!"
        },
        safeguard: {
            name: "신비의부적",
            turns: 5,
            set: "신비의 부적에 둘러싸였다!",
            end: "신비의 부적의 효과가 사라졌다!"
        },
        mist: {
            name: "하얀안개",
            turns: 5,
            set: "하얀 안개에 둘러싸였다!",
            end: "하얀 안개가 걷혔다!"
        }
    },
    Or = e => String(e || "").toLowerCase().replace(/[^a-z]/g, "");

function np() {
    return {
        weather: "",
        weatherTurns: 0,
        terrain: "",
        terrainTurns: 0,
        trickRoomTurns: 0,
        gravityTurns: 0
    }
}

function op() {
    return {
        boss: {},
        teams: {}
    }
}

function bt(e) {
    return e.field || np()
}

function vr(e) {
    return e.sideConditions || op()
}

function SQ(e) {
    return e && e.isParticipant ? e.team || "" : "boss"
}

function Qo(e, t) {
    const s = vr(e),
        a = SQ(t);
    return (a === "boss" ? s.boss : s.teams[a]) || {}
}

function wQ(e) {
    return bt(e).trickRoomTurns > 0
}

function nre(e, t) {
    return (Qo(e, t).tailwind || 0) > 0
}

function UQ(e) {
    if (!e) return null;
    const t = {},
        s = are[Or(e.weather)];
    s && (t.weather = s);
    const a = rre[Or(e.terrain)];
    return a && (t.terrain = a), Or(e.pseudoWeather) === "trickroom" && (t.trickRoom = !0), Or(e.pseudoWeather) === "gravity" && (t.gravity = !0), e.sideCondition && gr[e.sideCondition] && (t.sideCondition = e.sideCondition), Object.keys(t).length ? t : null
}

function ore(e) {
    return UQ(e) != null
}

function AQ(e, t, s, a, r) {
    if (!s) return {
        field: e,
        sideConditions: t,
        lines: []
    };
    const i = p => r ? r(a, p) : null,
        n = [],
        o = {
            ...e
        },
        l = {
            boss: {
                ...t.boss
            },
            teams: {
                ...t.teams
            }
        };
    if (s.weather && (o.weather = s.weather, o.weatherTurns = i("weather") || PQ, n.push(pa[s.weather].set)), s.terrain && (o.terrain = s.terrain, o.terrainTurns = i("terrain") || vQ, n.push(dr[s.terrain].set)), s.trickRoom && (o.trickRoomTurns > 0 ? (o.trickRoomTurns = 0, n.push("묘한 공간이 원래대로 돌아왔다!")) : (o.trickRoomTurns = sre, n.push("묘한 공간이 만들어졌다!"))), s.gravity && (o.gravityTurns = 5, n.push("중력이 강해졌다!")), s.sideCondition) {
        const p = SQ(a),
            c = p === "boss" ? {
                ...l.boss
            } : {
                ...l.teams[p] || {}
            };
        if ((c[s.sideCondition] || 0) > 0) n.push("하지만 실패했다!");
        else {
            const h = ["reflect", "lightscreen", "auroraveil"].includes(s.sideCondition) ? i("screen") : null;
            c[s.sideCondition] = h || gr[s.sideCondition].turns, n.push(gr[s.sideCondition].set)
        }
        p === "boss" ? l.boss = c : l.teams = {
            ...l.teams,
            [p]: c
        }
    }
    return {
        field: o,
        sideConditions: l,
        lines: n
    }
}

function lre(e) {
    return bt(e).gravityTurns > 0
}

function ys(e, t, s) {
    const a = bt(e),
        r = Qo(e, t),
        i = Qo(e, s);
    return {
        weather: a.weather || void 0,
        terrain: a.terrain || void 0,
        attackerTailwind: (r.tailwind || 0) > 0,
        defenderReflect: (i.reflect || 0) > 0,
        defenderLightScreen: (i.lightscreen || 0) > 0,
        defenderAuroraVeil: (i.auroraveil || 0) > 0,
        defenderSafeguard: (i.safeguard || 0) > 0,
        defenderMist: (i.mist || 0) > 0
    }
}

function pre(e, t) {
    if (!e || e.fainted || !t) return {
        entity: e,
        lines: []
    };
    if (t !== "Sand" && t !== "Hail") return {
        entity: e,
        lines: []
    };
    const s = ire[t] || [];
    if ((e.types || []).some(o => s.includes(o))) return {
        entity: e,
        lines: []
    };
    const a = Math.max(1, Math.floor((e.formulaMaxHP || e.maxHP) / 16)),
        r = Math.max(0, e.currentHP - a),
        i = r <= 0,
        n = [`${e.nickname}은(는) ${pa[t].name}에 휘말렸다! (-${a})${i?` — ${e.nickname} 기절`:""}`];
    return {
        entity: {
            ...e,
            currentHP: r,
            fainted: i
        },
        lines: n
    }
}

function hre(e, t) {
    if (!e || e.fainted || t !== "Grassy") return {
        entity: e,
        lines: []
    };
    if (e.healBlockTurns > 0 || e.currentHP >= e.maxHP) return {
        entity: e,
        lines: []
    };
    const s = Math.max(1, Math.floor((e.formulaMaxHP || e.maxHP) / 16)),
        a = Math.min(e.maxHP, e.currentHP + s);
    return {
        entity: {
            ...e,
            currentHP: a
        },
        lines: [`${e.nickname}은(는) 그래스필드의 효과로 체력을 회복했다! (+${a-e.currentHP})`]
    }
}

function cre(e, t) {
    const s = {
            ...e
        },
        a = [];
    s.weatherTurns > 0 && (s.weatherTurns -= 1, s.weatherTurns === 0 && (pa[s.weather] && a.push(pa[s.weather].end), s.weather = "")), s.terrainTurns > 0 && (s.terrainTurns -= 1, s.terrainTurns === 0 && (dr[s.terrain] && a.push(dr[s.terrain].end), s.terrain = "")), s.trickRoomTurns > 0 && (s.trickRoomTurns -= 1, s.trickRoomTurns === 0 && a.push("묘한 공간이 원래대로 돌아왔다.")), s.gravityTurns > 0 && (s.gravityTurns -= 1, s.gravityTurns === 0 && a.push("중력이 원래대로 돌아왔다."));
    const r = (n, o) => {
            const l = {
                ...n
            };
            return Object.keys(l).forEach(p => {
                var c;
                l[p] > 0 && (l[p] -= 1, l[p] === 0 && (delete l[p], a.push(`${o} 진영의 ${((c=gr[p])==null?void 0:c.end)||`${p} 효과가 사라졌다!`}`)))
            }), l
        },
        i = {
            boss: r(t.boss, "보스"),
            teams: Object.fromEntries(Object.entries(t.teams).map(([n, o]) => [n, r(o, n ? `${n}조` : "참가자")]))
        };
    return {
        field: s,
        sideConditions: i,
        lines: a
    }
}

function DQ(e) {
    const t = bt(e),
        s = vr(e),
        a = [];
    t.weather && a.push({
        text: `${pa[t.weather].name} ${t.weatherTurns}T`
    }), t.terrain && a.push({
        text: `${dr[t.terrain].name} ${t.terrainTurns}T`
    }), t.trickRoomTurns > 0 && a.push({
        text: `트릭룸 ${t.trickRoomTurns}T`
    }), t.gravityTurns > 0 && a.push({
        text: `중력 ${t.gravityTurns}T`
    });
    const r = (i, n) => Object.entries(i).forEach(([o, l]) => {
        var p;
        l > 0 && a.push({
            text: `${n} ${((p=gr[o])==null?void 0:p.name)||o} ${l}T`
        })
    });
    return r(s.boss, "보스"), Object.entries(s.teams).forEach(([i, n]) => r(n, i ? `${i}조` : "참가자")), a
}
const jn = new Map;

function EQ(e, t) {
    var r, i;
    if (!t) return "";
    const s = `${e}:${t}`;
    if (jn.has(s)) return jn.get(s);
    const a = e === "ability" ? ((r = xe.getAbility(t)) == null ? void 0 : r.id) || String(t).toLowerCase().replace(/[^a-z0-9]/g, "") : ((i = xe.getItem(t)) == null ? void 0 : i.id) || String(t).toLowerCase().replace(/[^a-z0-9]/g, "");
    return jn.set(s, a), a
}

function re(e) {
    return e ? EQ("ability", e.ability) : ""
}

function ze(e) {
    return e ? EQ("item", e.item) : ""
}
const mre = (e, t) => (e.types || []).includes(t),
    dre = e => e.currentHP >= e.maxHP,
    gre = new Set(["comatose", "purifyingsalt"]),
    ure = {
        slp: new Set(["insomnia", "vitalspirit", "sweetveil"]),
        par: new Set(["limber"]),
        psn: new Set(["immunity", "pastelveil"]),
        tox: new Set(["immunity", "pastelveil"]),
        brn: new Set(["waterveil", "waterbubble", "thermalexchange"]),
        frz: new Set(["magmaarmor"])
    };

function TQ(e, t, s) {
    const a = re(e);
    return a ? gre.has(a) || a === "leafguard" && s && bt(s).weather === "Sun" ? !0 : a === "flowergift" ? !1 : (ure[t] || new Set).has(a) : !1
}

function yre(e) {
    return re(e) === "innerfocus"
}

function fre(e) {
    return re(e) === "owntempo"
}

function bre(e) {
    return ["oblivious", "aromaveil"].includes(re(e))
}

function kre(e) {
    return ["oblivious", "aromaveil"].includes(re(e))
}

function FQ(e, t, s) {
    if (!e || !t) return 0;
    const a = re(e);
    let r = 0;
    return a === "prankster" && t.category === "Status" && (r += 1), a === "galewings" && t.type === "Flying" && dre(e) && (r += 1), a === "triage" && t.flags && t.flags.heal && (r += 3), t.id === "grassyglide" && s && bt(s).terrain === "Grassy" && (r += 1), r
}

function Pre(e) {
    return re(e) === "stall" || ["laggingtail", "fullincense"].includes(ze(e))
}

function vre(e) {
    return ze(e) === "quickclaw" ? .2 : re(e) === "quickdraw" ? .3 : 0
}

function Sre(e, t) {
    const s = e && e.multihit;
    if (!Array.isArray(s)) return null;
    const [a, r] = s;
    return a === r ? a : re(t) === "skilllink" || ze(t) === "loadeddice" ? r : a === 2 && r === 5 ? [2, 2, 3, 3, 4, 5][Math.floor(Math.random() * 6)] : a + Math.floor(Math.random() * (r - a + 1))
}

function wre(e, t) {
    if (!e || e.fainted) return {
        delta: 0,
        lines: []
    };
    const s = e.formulaMaxHP || e.maxHP,
        a = re(e),
        r = ze(e),
        i = bt(t).weather,
        n = [];
    let o = 0;
    return e.aquaRing && (o += Math.floor(s / 16), n.push(`${e.nickname}은(는) 아쿠아링으로 체력을 회복했다!`)), e.ingrain && (o += Math.floor(s / 16), n.push(`${e.nickname}은(는) 뿌리로 체력을 흡수했다!`)), a === "poisonheal" && (e.status === "psn" || e.status === "tox") ? (o += Math.floor(s / 8), n.push(`${e.nickname}은(는) 포이즌힐로 체력을 회복했다!`)) : a === "raindish" && i === "Rain" ? (o += Math.floor(s / 16), n.push(`${e.nickname}은(는) 비받이로 체력을 회복했다!`)) : a === "icebody" && (i === "Hail" || i === "Snow") ? (o += Math.floor(s / 16), n.push(`${e.nickname}은(는) 아이스바디로 체력을 회복했다!`)) : a === "dryskin" ? i === "Rain" ? (o += Math.floor(s / 8), n.push(`${e.nickname}은(는) 건조피부로 체력을 회복했다!`)) : i === "Sun" && (o -= Math.floor(s / 8), n.push(`${e.nickname}은(는) 건조피부로 체력이 줄었다!`)) : a === "solarpower" && i === "Sun" && (o -= Math.floor(s / 8), n.push(`${e.nickname}은(는) 태양의힘으로 체력이 줄었다!`)), r === "leftovers" ? (o += Math.floor(s / 16), n.push(`${e.nickname}은(는) 먹다남은음식으로 체력을 회복했다!`)) : r === "blacksludge" ? mre(e, "Poison") ? (o += Math.floor(s / 16), n.push(`${e.nickname}은(는) 검은해감으로 체력을 회복했다!`)) : (o -= Math.floor(s / 8), n.push(`${e.nickname}은(는) 검은해감으로 체력이 줄었다!`)) : r === "stickybarb" && (o -= Math.floor(s / 8), n.push(`${e.nickname}은(는) 끈적끈적바늘로 체력이 줄었다!`)), {
        delta: o,
        lines: n
    }
}

function Ure(e) {
    if (!e || e.fainted || e.status) return null;
    const t = ze(e);
    return t === "flameorb" ? {
        status: "brn",
        line: `${e.nickname}은(는) 화염구슬로 화상을 입었다!`
    } : t === "toxicorb" ? {
        status: "tox",
        line: `${e.nickname}은(는) 맹독구슬로 맹독 상태가 되었다!`
    } : null
}

function Are(e) {
    return re(e) === "poisonheal" && (e.status === "psn" || e.status === "tox")
}
const Vh = {
        drought: "Sun",
        orichalcumpulse: "Sun",
        drizzle: "Rain",
        sandstream: "Sand",
        snowwarning: "Snow"
    },
    qh = {
        electricsurge: "Electric",
        hadronengine: "Electric",
        grassysurge: "Grassy",
        mistysurge: "Misty",
        psychicsurge: "Psychic"
    };

function Dre(e) {
    const t = re(e),
        s = {};
    return Vh[t] && (s.weather = Vh[t]), qh[t] && (s.terrain = qh[t]), s
}

function Ere(e) {
    return re(e) === "intimidate"
}

function Tre(e, t, s) {
    if (!e || e.currentHP <= 0) return {
        survive: !1
    };
    if (t < e.currentHP) return {
        survive: !1
    };
    const a = re(e),
        r = ze(e);
    return e.enduringThisRound ? {
        survive: !0,
        line: `${e.nickname}은(는) 버텼다!`
    } : a === "sturdy" && s ? {
        survive: !0,
        line: `${e.nickname}은(는) 옹골참으로 버텼다!`
    } : r === "focussash" && s ? {
        survive: !0,
        line: `${e.nickname}은(는) 기합의띠로 버텼다!`,
        consumesItem: !0
    } : r === "focusband" && Math.random() < .1 ? {
        survive: !0,
        line: `${e.nickname}은(는) 기합의머리띠로 버텼다!`
    } : {
        survive: !1
    }
}

function Jh(e) {
    return ["moldbreaker", "teravolt", "turboblaze", "myceliummight"].includes(re(e))
}

function Fre(e) {
    return re(e) === "serenegrace"
}

function Ire(e) {
    return re(e) === "magicbounce"
}

function Rre(e) {
    return re(e) === "speedboost"
}

function Gre(e, t, s, a, r) {
    const i = re(e),
        n = r ? "" : re(t);
    if (i === "noguard" || n === "noguard") return {
        alwaysHit: !0,
        multiplier: 1
    };
    let o = 1;
    return i === "compoundeyes" && (o *= 1.3), i === "victorystar" && (o *= 1.1), i === "hustle" && s && s.category === "Physical" && (o *= .8), n === "sandveil" && a === "Sand" && (o *= .8), n === "snowcloak" && (a === "Hail" || a === "Snow") && (o *= .8), {
        alwaysHit: !1,
        multiplier: o
    }
}

function _h(e, t) {
    if (re(e) === "longreach") return !0;
    const s = ze(e);
    return !!(s === "protectivepads" || s === "punchingglove" && t && t.flags && t.flags.punch)
}
const Nre = {
    static: {
        status: "par",
        chance: 30,
        label: "정전기"
    },
    flamebody: {
        status: "brn",
        chance: 30,
        label: "불꽃몸"
    },
    poisonpoint: {
        status: "psn",
        chance: 30,
        label: "독가시"
    },
    cutecharm: {
        attract: !0,
        chance: 30,
        label: "매혹의바디"
    }
};

function xre(e, t, s, a, r, i, n, o) {
    const l = [];
    let p = null,
        c = null;
    const h = o ? "" : re(e),
        d = ze(e),
        m = e.formulaMaxHP || e.maxHP,
        g = R => p = {
            ...p || {},
            ...R
        },
        P = R => c = {
            ...c || {},
            ...R
        };
    if (a > 0 && r && !i) {
        const R = Nre[h];
        if (R && Math.random() * 100 < R.chance && !t.status && (R.attract ? t.gender && e.gender && t.gender !== e.gender && (g({
                attractActive: !0
            }), l.push(`${t.nickname}은(는) ${R.label}으로 헤롱헤롱해졌다!`)) : (g({
                status: R.status
            }), l.push(`${t.nickname}은(는) ${R.label}으로 ${R.status==="par"?"마비":R.status==="brn"?"화상":"독"} 상태가 되었다!`))), h === "effectspore" && !t.status && Math.random() < .3) {
            const b = ["psn", "par", "slp"][Math.floor(Math.random() * 3)];
            g({
                status: b,
                ...b === "slp" ? {
                    sleepTurns: 1 + Math.floor(Math.random() * 3)
                } : {}
            }), l.push(`${t.nickname}은(는) 포자에 당했다!`)
        }
        if (h === "roughskin" || h === "ironbarbs") {
            const b = Math.max(1, Math.floor(m / 8));
            g({
                _chip: (p && p._chip ? p._chip : 0) + b
            }), l.push(`${t.nickname}은(는) ${h==="roughskin"?"까칠한피부":"철가시"}에 상처를 입었다!`)
        }
        if ((h === "gooey" || h === "tanglinghair") && (g({
                boosts: {
                    ...(p == null ? void 0 : p.boosts) || {},
                    spe: -1
                }
            }), l.push(`${t.nickname}의 스피드가 떨어졌다!`)), d === "rockyhelmet") {
            const b = Math.max(1, Math.floor((t.formulaMaxHP || t.maxHP) / 6));
            g({
                _chip: (p && p._chip ? p._chip : 0) + b
            }), l.push(`${t.nickname}은(는) 까칠한바위에 상처를 입었다!`)
        }
    }
    return a > 0 && !i && (h === "stamina" ? (P({
        boosts: {
            ...(c == null ? void 0 : c.boosts) || {},
            def: 1
        }
    }), l.push(`${e.nickname}의 지구력으로 방어가 올랐다!`)) : h === "weakarmor" && s.category === "Physical" ? (P({
        boosts: {
            ...(c == null ? void 0 : c.boosts) || {},
            def: -1,
            spe: 2
        }
    }), l.push(`${e.nickname}의 무른껍질이 발동했다!`)) : h === "justified" && s.type === "Dark" ? (P({
        boosts: {
            ...(c == null ? void 0 : c.boosts) || {},
            atk: 1
        }
    }), l.push(`${e.nickname}의 정의의마음으로 공격이 올랐다!`)) : h === "rattled" && ["Bug", "Dark", "Ghost"].includes(s.type) ? (P({
        boosts: {
            ...(c == null ? void 0 : c.boosts) || {},
            spe: 1
        }
    }), l.push(`${e.nickname}의 겁쟁이로 스피드가 올랐다!`)) : h === "steamengine" && ["Fire", "Water"].includes(s.type) ? (P({
        boosts: {
            ...(c == null ? void 0 : c.boosts) || {},
            spe: 6
        }
    }), l.push(`${e.nickname}의 증기기관으로 스피드가 크게 올랐다!`)) : h === "watercompaction" && s.type === "Water" ? (P({
        boosts: {
            ...(c == null ? void 0 : c.boosts) || {},
            def: 2
        }
    }), l.push(`${e.nickname}의 수압으로 방어가 크게 올랐다!`)) : h === "thermalexchange" && s.type === "Fire" && (P({
        boosts: {
            ...(c == null ? void 0 : c.boosts) || {},
            atk: 1
        }
    }), l.push(`${e.nickname}의 열교환으로 공격이 올랐다!`))), a > 0 && h === "angerpoint" && s._wasCrit && (P({
        boosts: {
            ...(c == null ? void 0 : c.boosts) || {},
            atk: 6
        }
    }), l.push(`${e.nickname}의 분노가 폭발했다!`)), a > 0 && n && d === "weaknesspolicy" && !i && (P({
        boosts: {
            ...(c == null ? void 0 : c.boosts) || {},
            atk: 2,
            spa: 2
        },
        item: ""
    }), l.push(`${e.nickname}의 약점보험이 발동했다!`)), {
        attackerPatch: p,
        defenderPatch: c,
        lines: l
    }
}

function Hre(e) {
    const t = re(e);
    if (t === "moxie" || t === "chillingneigh" || t === "asoneglastrier") return {
        boosts: {
            atk: 1
        },
        label: "자기과신"
    };
    if (t === "grimneigh" || t === "asonespectrier") return {
        boosts: {
            spa: 1
        },
        label: "검은외침"
    };
    if (t === "beastboost") {
        const s = e.baseStats || {};
        return {
            boosts: {
                [
                    ["atk", "spa", "def", "spd", "spe"].reduce((r, i) => (s[i] || 0) > (s[r] || 0) ? i : r, "atk")
                ]: 1
            },
            label: "비스트부스트"
        }
    }
    return t === "battlebond" ? {
        boosts: {
            atk: 1,
            spa: 1,
            spe: 1
        },
        label: "유대변화"
    } : null
}

function Mre(e, t) {
    const s = re(e),
        a = (e.maxHP || 1) / 2;
    if (t > a && e.currentHP <= a && e.currentHP > 0) {
        if (s === "berserk") return {
            boosts: {
                spa: 1
            },
            label: "벌서크"
        };
        if (s === "angershell") return {
            boosts: {
                atk: 1,
                spa: 1,
                spe: 1,
                def: -1,
                spd: -1
            },
            label: "분노의껍질"
        }
    }
    return null
}

function jre(e) {
    return Rre(e) ? {
        boosts: {
            spe: 1
        },
        label: "가속"
    } : null
}

function Cre(e, t) {
    return ["kingsrock", "razorfang"].includes(ze(e)) && t && t.basePower && !(t.secondary && t.secondary.volatileStatus === "flinch")
}

function Bre(e) {
    return ze(e) === "shellbell"
}

function Lre(e) {
    return ze(e) === "bigroot" ? 1.3 : 1
}

function $h(e) {
    return re(e) === "shielddust" || ze(e) === "covertcloak"
}

function zre(e) {
    return re(e) === "shielddust" ? "방진" : "반짝가루망토"
}

function Ore(e) {
    return ["clearbody", "whitesmoke", "fullmetalbody", "hypercutter", "keeneye", "bigpecks", "illuminate"].includes(re(e)) || ze(e) === "clearamulet"
}

function Wre(e) {
    return re(e) === "contrary"
}

function Kre(e) {
    return re(e) === "simple"
}

function Zre(e) {
    const t = re(e);
    return t === "defiant" ? {
        atk: 2
    } : t === "competitive" ? {
        spa: 2
    } : null
}

function IQ(e, t) {
    const s = ze(e);
    return t === "screen" && s === "lightclay" || t === "terrain" && s === "terrainextender" || t === "weather" && (s === "damprock" || s === "heatrock" || s === "smoothrock" || s === "icyrock") ? 8 : null
}
const Fe = e => e && e.id ? String(e.id).toLowerCase().replace(/[^a-z0-9]/g, "") : "";

function Vre(e) {
    return !!(e && e.flags && e.flags.charge)
}
const qre = {
    skullbash: {
        def: 1
    },
    skyattack: {},
    meteorbeam: {
        spa: 1
    },
    electroshot: {
        spa: 1
    }
};

function Jre(e) {
    return qre[Fe(e)] || null
}

function _re(e, t) {
    const s = Fe(t);
    return s === "solarbeam" || s === "solarblade" ? `${e.nickname}은(는) 빛을 흡수했다!` : s === "fly" || s === "bounce" ? `${e.nickname}은(는) 하늘 높이 날아올랐다!` : s === "dig" ? `${e.nickname}은(는) 땅속으로 파고들었다!` : s === "dive" ? `${e.nickname}은(는) 물속으로 잠수했다!` : s === "phantomforce" || s === "shadowforce" ? `${e.nickname}은(는) 모습을 감췄다!` : s === "meteorbeam" || s === "electroshot" ? `${e.nickname}은(는) 힘을 모으기 시작했다!` : `${e.nickname}은(는) 힘을 모으고 있다!`
}

function $re(e, t, s) {
    const a = Fe(e);
    return (a === "solarbeam" || a === "solarblade") && s === "Sun" ? "weather" : Fe({
        id: t.item
    }) === "powerherb" || String(t.item || "").replace(/\s/g, "") === "powerherb" ? "item" : null
}

function Xre(e) {
    return !!(e && (e.flags && e.flags.recharge || e.self && e.self.volatileStatus === "mustrecharge"))
}
const Qre = new Set(["protect", "detect", "kingsshield", "spikyshield", "banefulbunker", "obstruct", "silktrap", "burningbulwark", "maxguard"]),
    RQ = "endure",
    Xh = "wideguard",
    Qh = "quickguard";

function Yre(e) {
    return Qre.has(Fe(e)) || Fe(e) === RQ
}

function eie(e) {
    return !!(e && (e.breaksProtect || Fe(e) === "feint"))
}

function tie(e, t) {
    switch (e) {
        case "kingsshield":
            return {
                boosts: {
                    atk: -1
                }, line: `${t.nickname}의 공격이 떨어졌다!`
            };
        case "spikyshield":
        case "banefulbunker":
            return e === "spikyshield" ? {
                chip: 1 / 8,
                line: `${t.nickname}은(는) 가시에 찔렸다!`
            } : {
                status: "psn",
                line: `${t.nickname}은(는) 독에 당했다!`
            };
        case "burningbulwark":
            return {
                status: "brn", line: `${t.nickname}은(는) 화상을 입었다!`
            };
        case "obstruct":
            return {
                boosts: {
                    def: -2
                }, line: `${t.nickname}의 방어가 크게 떨어졌다!`
            };
        case "silktrap":
            return {
                boosts: {
                    spe: -1
                }, line: `${t.nickname}의 스피드가 떨어졌다!`
            };
        default:
            return null
    }
}

function Yh(e, t, s) {
    switch (Fe(e)) {
        case "seismictoss":
        case "nightshade":
            return t.level || 50;
        case "dragonrage":
            return 40;
        case "sonicboom":
            return 20;
        case "superfang":
        case "naturesmadness":
        case "ruination":
            return Math.max(1, Math.floor(s.currentHP / 2));
        case "guardianofalola":
            return Math.max(1, Math.floor(s.currentHP * 3 / 4));
        case "endeavor":
            return Math.max(0, s.currentHP - t.currentHP);
        case "finalgambit":
            return t.currentHP;
        default:
            return null
    }
}

function ec(e) {
    return !!(e && e.ohko)
}

function sie(e, t) {
    return (t.level || 50) > (e.level || 50) ? 0 : 30 + ((e.level || 50) - (t.level || 50))
}
const aie = {
    counter: "physical",
    mirrorcoat: "special",
    metalburst: "any",
    comeuppance: "any"
};

function tc(e) {
    return aie[Fe(e)] || null
}

function rie(e, t, s, a = {}) {
    const r = Fe(e),
        i = t.status;
    switch (r) {
        case "facade":
            return i === "brn" || i === "psn" || i === "tox" || i === "par" ? 2 : 1;
        case "hex":
        case "infernalparade":
        case "barbbarrage":
            return s.status ? 2 : 1;
        case "brine":
            return s.currentHP * 2 <= s.maxHP ? 2 : 1;
        case "venoshock":
        case "wakeupslap":
            return r === "venoshock" ? s.status === "psn" || s.status === "tox" ? 2 : 1 : s.status === "slp" ? 2 : 1;
        case "boltbeak":
        case "fishiousrend":
            return a.attackerFirst ? 2 : 1;
        case "payback":
            return a.defenderActed ? 2 : 1;
        case "assurance":
            return a.defenderDamagedThisRound ? 2 : 1;
        case "avalanche":
        case "revenge":
            return a.attackerDamagedThisRound ? 2 : 1;
        case "stompingtantrum":
            return t.lastMoveFailed ? 2 : 1;
        case "retaliate":
            return a.allyFaintedLastRound ? 2 : 1;
        default:
            return 1
    }
}

function iie(e) {
    return ["fakeout", "firstimpression", "matblock"].includes(Fe(e))
}

function nie(e) {
    return !!(e && e.flags && e.flags.futuremove)
}

function oie(e) {
    return Fe(e) === "wish"
}

function lie(e) {
    return Fe(e) === "haze"
}

function pie(e) {
    return ["aromatherapy", "healbell"].includes(Fe(e))
}

function hie(e) {
    return !!(e && !e.basePower && e.flags && e.flags.reflectable)
}
const cie = {
    clearsmog: "reset-target",
    topsyturvy: "invert-target",
    psychup: "copy-target",
    spectralthief: "steal-target",
    strengthsap: "sap-atk"
};

function Ea(e) {
    return cie[Fe(e)] || null
}

function mie(e) {
    const t = Fe(e);
    return t === "burnup" ? "Fire" : t === "doubleshock" ? "Electric" : null
}

function sc(e) {
    return ["thousandarrows", "smackdown"].includes(Fe(e))
}
const die = new Set(["flamewheel", "sacredfire", "flareblitz", "fusionflare", "scald", "steameruption", "burnup", "pyroball", "matchagotcha"]);

function Yo(e, t) {
    const s = Yae(t);
    return nre(e, t) ? s * 2 : s
}

function GQ(e) {
    return !!e && (e.target === "allAdjacent" || e.target === "allAdjacentFoes")
}

function gie(e) {
    return !!e && e.target === "allAdjacent"
}
const lp = 5.5,
    uie = {
        hp: 100,
        atk: 100,
        def: 100,
        spa: 100,
        spd: 100,
        spe: 100
    },
    ac = {
        hp: 31,
        atk: 31,
        def: 31,
        spa: 31,
        spd: 31,
        spe: 31
    },
    yie = {
        hp: 0,
        atk: 0,
        def: 0,
        spa: 0,
        spd: 0,
        spe: 0
    },
    Fs = {
        atk: 0,
        def: 0,
        spa: 0,
        spd: 0,
        spe: 0
    },
    fie = ["atk", "def", "spa", "spd"];

function rc(e) {
    var c, h;
    const t = "position" in e,
        s = t ? ac : e.ivs || ac,
        a = e.evs || yie,
        r = t ? 50 : e.level || 50,
        i = e.baseStats || uie,
        n = e.types && e.types.length ? e.types : ["Normal"],
        o = Jae(i.hp, s.hp, a.hp, r),
        l = !t && Number(e.hpMultiplier) > 0 ? Number(e.hpMultiplier) : 1,
        p = Math.max(1, Math.round(o * l));
    return {
        ...e,
        ...t ? {
            nature: "hardy",
            item: "",
            ability: ""
        } : {},
        isParticipant: t,
        nickname: ((c = e.nickname) == null ? void 0 : c.trim()) || ((h = e.position) == null ? void 0 : h.trim()) || "이름없음",
        baseStats: i,
        types: n,
        ivs: s,
        evs: a,
        level: r,
        moves: (e.moves || []).filter(Boolean),
        baseMaxHP: o,
        maxHP: p,
        formulaMaxHP: o,
        currentHP: p,
        fainted: !1,
        boosts: {
            ...Fs
        },
        buffTimers: {},
        status: "",
        toxicCounter: 0,
        sleepTurns: 0,
        drowsyTurns: 0,
        aquaRing: !1,
        ingrain: !1,
        lastMoveId: null,
        confusionTurns: 0,
        leechSeed: null,
        bindTurns: 0,
        tauntTurns: 0,
        encoreTurns: 0,
        encoreMove: null,
        tormentActive: !1,
        healBlockTurns: 0,
        attractActive: !1,
        disableTurns: 0,
        disableMove: null,
        flinched: !1,
        chargingMove: null,
        mustRecharge: !1,
        substitute: null,
        protectedThisRound: null,
        protectStreak: 0,
        enduringThisRound: !1,
        damagedThisRound: !1,
        lastDamageTaken: null,
        lastMoveFailed: !1,
        hasActedEver: !1,
        redirectActive: !1,
        pendingFinisher: !1,
        finisherTimer: 0,
        mustSkipTurn: !1,
        cheerUsed: 0
    }
}

function ni(e) {
    if (e == null) return 0;
    if (!Array.isArray(e)) return Math.max(0, Math.round(e));
    const t = Array.isArray(e[0]) ? e.flat() : e;
    return t.length === 0 ? 0 : Math.round(t.reduce((s, a) => s + a, 0) / t.length)
}
const bie = {
    1: 1 / 24,
    2: 1 / 8,
    3: 1 / 2,
    4: 1
};

function kie(e) {
    const t = Math.min(4, Math.max(1, e || 1));
    return Math.random() < (bie[t] ?? 1 / 24)
}
const Pie = [3 / 9, 3 / 8, 3 / 7, 3 / 6, 3 / 5, 3 / 4, 1, 4 / 3, 5 / 3, 2, 7 / 3, 8 / 3, 3];

function vie(e, t, s) {
    if (e === "blizzard") return s === "Snow" || s === "Hail" ? !0 : t;
    if (e === "thunder" || e === "hurricane") {
        if (s === "Rain") return !0;
        if (s === "Sun") return 50
    }
    return t
}

function Sie(e, t, s, a, r, i) {
    var g, P;
    if (e.alwaysHit || e.accuracy == null) return !0;
    const n = vie(e.id, e.accuracy, r);
    if (n === !0) return !0;
    const o = Gre(t, s, e, r, i);
    if (o.alwaysHit) return !0;
    const l = ((g = t.boosts) == null ? void 0 : g.accuracy) || 0,
        p = e.ignoreEvasion ? 0 : ((P = s.boosts) == null ? void 0 : P.evasion) || 0,
        c = NQ(l - p),
        h = Pie[c + 6];
    let d = n;
    a && (d = d * (5 / 3));
    const m = Math.min(100, d * h * o.multiplier);
    return Math.random() * 100 < m
}

function St(e, t) {
    return t > 0 ? e <= 0 ? "0%" : `${Math.max(1,Math.min(100,Math.round(e/t*100)))}%` : `${e}`
}

function NQ(e) {
    return Math.max(-6, Math.min(6, e))
}
const wie = {
    atk: 0,
    def: 1,
    spa: 2,
    spd: 3,
    spe: 4
};

function Uie(e, t) {
    var i;
    const s = ap(e.baseStats[t], e.ivs[t], e.evs[t], e.level),
        a = (mr[String(e.nature || "hardy").toLowerCase()] || mr.hardy)[wie[t]];
    let r = Math.floor(s * a);
    return r = bQ(r, ((i = e.boosts) == null ? void 0 : i[t]) || 0), r
}

function ve(e, t, s = {}) {
    let a = {
        ...t
    };
    if (Wre(e) && (a = Object.fromEntries(Object.entries(a).map(([i, n]) => [i, -n]))), Kre(e) && (a = Object.fromEntries(Object.entries(a).map(([i, n]) => [i, n * 2]))), s.fromOpponent && Object.values(a).some(i => i < 0))
        if (Ore(e)) s.lines && s.lines.push(`${e.nickname}은(는) 특성으로 능력이 떨어지지 않는다!`), a = Object.fromEntries(Object.entries(a).filter(([, i]) => i > 0));
        else {
            const i = Zre(e);
            i && (Object.entries(i).forEach(([n, o]) => a[n] = (a[n] || 0) + o), s.lines && s.lines.push(`${e.nickname}의 특성으로 능력이 크게 올랐다!`))
        } const r = {
        ...e.boosts
    };
    return Object.entries(a).forEach(([i, n]) => {
        n && (r[i] = NQ((r[i] || 0) + n))
    }), {
        ...e,
        boosts: r
    }
}

function ic(e, t, s) {
    const a = {
            ...e.boosts
        },
        r = {
            ...e.buffTimers
        };
    return Object.entries(t).forEach(([i, n]) => {
        a[i] = n, r[i] = s
    }), {
        ...e,
        boosts: a,
        buffTimers: r
    }
}

function Wt(e, t) {
    return Object.entries(t).filter(([, s]) => s).map(([s, a]) => `${e}의 ${kQ[s]||s}이(가) ${a>0?"올랐다":"떨어졌다"}!`)
}

function xQ(e, t) {
    if (!e || e.fainted) return {
        entity: e,
        lines: []
    };
    if (e.healBlockTurns > 0) return {
        entity: e,
        lines: [`${e.nickname}은(는) 회복 봉인 상태라 회복할 수 없다!`]
    };
    const s = Array.isArray(t) ? t[0] / t[1] : t;
    if (!(s > 0)) return {
        entity: e,
        lines: []
    };
    const a = Math.max(1, Math.round(e.maxHP * s)),
        r = Math.min(e.maxHP, e.currentHP + a),
        i = r - e.currentHP;
    if (i <= 0) return {
        entity: e,
        lines: [`${e.nickname}은(는) 이미 HP가 가득하다!`]
    };
    const n = Math.round(i / e.maxHP * 100),
        o = `${e.nickname}의 HP가 ${n}% 회복했다! (+${i}, 현재 HP ${St(r,e.maxHP)})`;
    return {
        entity: {
            ...e,
            currentHP: r
        },
        lines: [o]
    }
}

function Aie(e, t) {
    return !!(e === "brn" && t.includes("Fire") || (e === "psn" || e === "tox") && (t.includes("Poison") || t.includes("Steel")) || e === "frz" && t.includes("Ice"))
}

function Wr(e, t, s, a) {
    return Aie(t, e.types || []) ? `${e.nickname}에게는 효과가 없다!` : !a && TQ(e, t, s) ? `${e.nickname}은(는) 특성으로 상태이상에 걸리지 않는다!` : null
}

function Hs(e, t) {
    const s = {
        status: t,
        toxicCounter: t === "tox" ? 1 : 0
    };
    return t === "slp" && (s.sleepTurns = 1 + Math.floor(Math.random() * 3)), {
        ...e,
        ...s
    }
}

function Ta(e, t, s, a) {
    if (!e || e.fainted || !t) return e;
    switch (t) {
        case "confusion":
            return e.confusionTurns > 0 ? e : fre(e) ? (s.push(`${e.nickname}은(는) 마이페이스로 혼란에 빠지지 않는다!`), e) : (s.push(`${e.nickname}은(는) 혼란에 빠졌다!`), {
                ...e,
                confusionTurns: 1 + Math.floor(Math.random() * 4)
            });
        case "flinch":
            return e.flinched ? e : yre(e) ? (s.push(`${e.nickname}은(는) 정신력으로 풀죽지 않는다!`), e) : (s.push(`${e.nickname}은(는) 풀죽었다!`), {
                ...e,
                flinched: !0
            });
        case "yawn":
            return e.status || e.drowsyTurns > 0 || TQ(e, "slp") ? e : (s.push(`${e.nickname}은(는) 하품을 했다!`), {
                ...e,
                drowsyTurns: 2
            });
        case "aquaring":
            return e.aquaRing ? e : (s.push(`${e.nickname}은(는) 아쿠아링을 둘렀다!`), {
                ...e,
                aquaRing: !0
            });
        case "substitute": {
            if (e.substitute) return s.push(`${e.nickname}은(는) 이미 분신이 있다!`), e;
            const r = Math.floor(e.maxHP / 4);
            return e.currentHP <= r ? (s.push(`${e.nickname}은(는) HP가 부족해 분신을 만들 수 없다!`), e) : (s.push(`${e.nickname}은(는) 분신을 만들었다!`), {
                ...e,
                currentHP: e.currentHP - r,
                substitute: {
                    hp: r
                }
            })
        }
        case "ingrain":
            return e.ingrain ? e : (s.push(`${e.nickname}은(는) 땅에 뿌리를 내렸다!`), {
                ...e,
                ingrain: !0
            });
        case "leechseed":
            return e.leechSeed || (e.types || []).includes("Grass") ? e : (s.push(`${e.nickname}에게 씨앗이 심어졌다!`), {
                ...e,
                leechSeed: {
                    sourceIsBoss: !a.isParticipant,
                    sourceId: a.isParticipant ? a.id : null
                }
            });
        case "partiallytrapped":
            return e.bindTurns > 0 ? e : (s.push(`${e.nickname}은(는) 조여져 빠져나갈 수 없게 되었다!`), {
                ...e,
                bindTurns: 4 + Math.floor(Math.random() * 2)
            });
        case "taunt":
            return e.tauntTurns > 0 ? e : kre(e) ? (s.push(`${e.nickname}에게는 효과가 없다!`), e) : (s.push(`${e.nickname}은(는) 도발에 걸렸다!`), {
                ...e,
                tauntTurns: 3
            });
        case "encore":
            return e.encoreTurns > 0 || !e.lastMoveId ? e : (s.push(`${e.nickname}에게 앵콜이 걸렸다!`), {
                ...e,
                encoreTurns: 3,
                encoreMove: e.lastMoveId
            });
        case "torment":
            return e.tormentActive ? e : (s.push(`${e.nickname}은(는) 트집이 났다!`), {
                ...e,
                tormentActive: !0
            });
        case "healblock":
            return e.healBlockTurns > 0 ? e : (s.push(`${e.nickname}은(는) 회복 봉인 상태가 되었다!`), {
                ...e,
                healBlockTurns: 5
            });
        case "disable":
            return e.disableTurns > 0 || !e.lastMoveId ? e : (s.push(`${e.nickname}의 기술이 사슬묶였다!`), {
                ...e,
                disableTurns: 4,
                disableMove: e.lastMoveId
            });
        default:
            return e
    }
}

function fs(e, t, s, a = {}) {
    var I, x;
    const r = xe.getMove(s),
        i = r ? kie(r.critRatio) : !1,
        n = a.field || {},
        o = {
            gameType: "Singles",
            weather: n.weather || void 0,
            terrain: n.terrain || void 0,
            attackerSide: {
                isTailwind: !!n.attackerTailwind
            },
            defenderSide: {
                isReflect: !!n.defenderReflect,
                isLightScreen: !!n.defenderLightScreen,
                isAuroraVeil: !!n.defenderAuroraVeil
            }
        },
        l = r || xe.getMove(s),
        p = Sre(l, e),
        c = xe.calculateDamage(e, t, s, o, {
            ability: e.ability,
            item: e.item,
            isCrit: i,
            hits: p || void 0
        });
    if (!c.moveData) return {
        attacker: e,
        defender: t,
        lines: [`${e.nickname}의 ${s} 사용 실패 (기술을 찾을 수 없음)`]
    };
    const h = c.moveData;
    h._wasCrit = i;
    const d = [`${e.nickname}의 ${h.name}!`];
    let m = {
            ...e,
            lastMoveId: h.id,
            hasActedEver: !0,
            lastMoveFailed: !1
        },
        g = t;
    const P = a.roundNum || 1,
        R = Jh(e) || !!a.ignoreAbility;
    if (Vre(h))
        if (m.chargingMove === h.id) m = {
            ...m,
            chargingMove: null
        };
        else {
            const A = $re(h, m, n.weather);
            if (!A) {
                const N = Jre(h);
                return N && (m = ve(m, N)), d.push(_re(m, h)), N && d.push(...Wt(m.nickname, N)), {
                    attacker: {
                        ...m,
                        chargingMove: h.id
                    },
                    defender: g,
                    lines: d
                }
            }
            A === "item" && (m = {
                ...m,
                item: ""
            }, d.push(`${m.nickname}은(는) 파워허브로 곧바로 공격했다!`))
        } if (iie(h) && P > 1) return d.push(`${m.nickname}의 ${h.name}은(는) 지금은 통하지 않는다!`), {
        attacker: {
            ...m,
            lastMoveFailed: !0
        },
        defender: g,
        lines: d
    };
    if (!(h.target === "self" || h.target === "allies" || h.target === "allySide") && g.protectedThisRound && !eie(h)) {
        const A = g.protectedThisRound.type;
        if (A === "wideguard" ? GQ(h) : A === "quickguard" ? (h.priority || 0) > 0 : !0) {
            if (d.push(`${g.nickname}은(는) 방어했다!`), h.flags && h.flags.contact && !_h(m, h) && h.basePower) {
                const C = tie(A, m);
                if (C) {
                    if (C.chip) {
                        const Z = Math.max(1, Math.floor((m.formulaMaxHP || m.maxHP) * C.chip)),
                            Q = Math.max(0, m.currentHP - Z);
                        m = {
                            ...m,
                            currentHP: Q,
                            fainted: Q <= 0
                        }
                    }
                    C.status && !m.status && !Wr(m, C.status, a.state, R) && (m = Hs(m, C.status)), C.boosts && (m = ve(m, C.boosts, {
                        fromOpponent: !0,
                        lines: d
                    })), d.push(C.line)
                }
            }
            return {
                attacker: m,
                defender: g,
                lines: d
            }
        }
    }
    if (!(h.target === "self" || h.target === "allies" || h.target === "allySide") && g.substitute && !(h.flags && (h.flags.sound || h.flags.bypasssub))) {
        if (h.category !== "Status") {
            const A = Yh(h, m, g);
            let N;
            if (ec(h)) N = g.substitute.hp;
            else if (A != null) N = A;
            else {
                const C = ni(c.damage);
                N = a.isSpread ? Math.floor(C * .75) : C
            }
            const O = g.substitute.hp - N;
            return O <= 0 ? (g = {
                ...g,
                substitute: null
            }, d.push(`${g.nickname}의 분신이 사라졌다!`)) : (g = {
                ...g,
                substitute: {
                    hp: O
                }
            }, d.push(`${g.nickname}의 분신이 공격을 받아냈다!`)), {
                attacker: m,
                defender: g,
                lines: d,
                damage: 0
            }
        }
        return d.push(`${g.nickname}의 분신에 가로막혔다!`), {
            attacker: m,
            defender: g,
            lines: d
        }
    }
    const b = UQ(h),
        u = !!b || h.target === "self" || h.target === "allies" || h.target === "allySide",
        y = t.types && t.types.length ? t.types : ["Normal"],
        f = a.state ? lre(a.state) : !1,
        k = (f || t.grounded || sc(h)) && h.type === "Ground" ? y.filter(A => A !== "Flying") : y;
    let U = u ? 1 : xe.getTypeEffectiveness(h.type, k.length ? k : ["Normal"]);
    !u && h.id === "freezedry" && y.includes("Water") && (U *= 4), !u && !Jh(e) && re(e) === "scrappy" && (h.type === "Normal" || h.type === "Fighting") && y.includes("Ghost") && U === 0 && (U = xe.getTypeEffectiveness(h.type, y.filter(A => A !== "Ghost")));
    const G = h.category !== "Status";
    if (!u) {
        if (G && U === 0) return d.push(`${t.nickname}에게는 통하지 않았다!`), {
            attacker: m,
            defender: t,
            lines: d
        };
        if (!G) {
            if (h.id === "thunderwave" && y.includes("Ground")) return d.push(`${t.nickname}에게는 통하지 않았다!`), {
                attacker: m,
                defender: t,
                lines: d
            };
            if (h.flags && h.flags.powder && y.includes("Grass")) return d.push(`${t.nickname}에게는 효과가 없다! (풀 타입)`), {
                attacker: m,
                defender: t,
                lines: d
            }
        }
    }
    if (!u && !Sie(h, m, t, f, n.weather, R)) {
        if (d.push(`${m.nickname}의 공격이 빗나갔다!`), h.mindBlownRecoil) {
            const A = Math.max(1, Math.ceil(m.maxHP / 2)),
                N = Math.max(0, m.currentHP - A),
                O = N <= 0;
            d.push(`${m.nickname}은(는) 반동으로 최대 HP의 절반을 잃었다! (-${A}, 현재 HP ${St(N,m.maxHP)})`), O && d.push(`${m.nickname}은(는) 쓰러졌다!`), m = {
                ...m,
                currentHP: N,
                fainted: O
            }
        }
        if (h.hasCrashDamage && h.basePower) {
            const A = ni(c.damage),
                N = Math.floor((t.maxHP || A) / 2),
                O = Math.max(1, Math.min(Math.floor(A / 2), N)),
                C = Math.max(0, m.currentHP - O),
                Z = C <= 0;
            d.push(`${m.nickname}은(는) 추락 피해를 입었다! (-${O}, 현재 HP ${St(C,m.maxHP)})`), Z && d.push(`${m.nickname}은(는) 쓰러졌다!`), m = {
                ...m,
                currentHP: C,
                fainted: Z
            }
        }
        return {
            attacker: m,
            defender: t,
            lines: d
        }
    }
    if (h.id === "attract") {
        const A = e.gender,
            N = t.gender;
        return bre(t) ? d.push(`${t.nickname}은(는) 둔감으로 헤롱헤롱해지지 않는다!`) : !A || !N || A === N ? d.push(`${t.nickname}에게는 효과가 없다!`) : (g = {
            ...t,
            attractActive: !0
        }, d.push(`${t.nickname}은(는) ${e.nickname}에게 반했다!`)), {
            attacker: m,
            defender: g,
            lines: d
        }
    }
    const D = tc(h);
    if (D) {
        const A = m.lastDamageTaken;
        if (!(A && (D === "any" || D === "physical" && A.category === "Physical" || D === "special" && A.category === "Special"))) return d.push(`${m.nickname}의 ${h.name}은(는) 실패했다!`), {
            attacker: {
                ...m,
                lastMoveFailed: !0
            },
            defender: t,
            lines: d
        };
        const O = Math.min(t.currentHP, Math.max(1, Math.floor(A.amount * (D === "any" ? 1.5 : 2)))),
            C = Math.max(0, t.currentHP - O);
        return g = {
            ...t,
            currentHP: C,
            fainted: C <= 0,
            damagedThisRound: !0
        }, d.push(`${t.nickname}에게 ${O}의 피해로 되받아쳤다! (HP ${St(C,t.maxHP)})`), C <= 0 && d.push(`${t.nickname}은(는) 쓰러졌다!`), {
            attacker: m,
            defender: g,
            lines: d,
            damage: O
        }
    }
    if (!G) {
        if (b) return {
            attacker: m,
            defender: g,
            lines: d,
            fieldEffects: b
        };
        if (Yre(h) || h.id === Xh || h.id === Qh) {
            const N = m.protectStreak || 0;
            if (!(N === 0 || Math.random() < Math.pow(1 / 3, N))) return d.push(`${m.nickname}은(는) 방어에 실패했다!`), {
                attacker: {
                    ...m,
                    protectStreak: 0,
                    lastMoveFailed: !0
                },
                defender: g,
                lines: d
            };
            if (h.id === RQ) return d.push(`${m.nickname}은(는) 버틸 준비를 했다!`), {
                attacker: {
                    ...m,
                    enduringThisRound: !0,
                    protectStreak: N + 1
                },
                defender: g,
                lines: d
            };
            const C = h.id === Xh ? "wideguard" : h.id === Qh ? "quickguard" : h.id;
            return d.push(`${m.nickname}은(는) 방어 태세를 취했다!`), {
                attacker: {
                    ...m,
                    protectedThisRound: {
                        type: C
                    },
                    protectStreak: N + 1
                },
                defender: g,
                lines: d,
                sideProtect: C === "wideguard" || C === "quickguard" ? {
                    type: C
                } : null
            }
        }
        if (!R && Ire(g) && hie(h) && !(h.target === "self" || h.target === "allies" || h.target === "allySide")) return d.push(`${g.nickname}은(는) 매직미러로 ${h.name}을(를) 되돌렸다!`), h.boosts && (m = ve(m, h.boosts, {
            fromOpponent: !0,
            lines: d
        })), h.status && !m.status && !Wr(m, h.status, a.state, R) && (m = Hs(m, h.status), d.push(`${m.nickname}은(는) ${Za[h.status]||h.status} 상태가 되었다!`)), h.volatileStatus && (m = Ta(m, h.volatileStatus, d, g)), {
            attacker: m,
            defender: g,
            lines: d
        };
        if (lie(h)) return d.push("모든 포켓몬의 능력 변화가 사라졌다!"), {
            attacker: {
                ...m,
                boosts: {
                    ...Fs
                }
            },
            defender: g,
            lines: d,
            hazeAll: !0
        };
        if (pie(h)) return d.push("상쾌한 향기가 감돈다!"), {
            attacker: {
                ...m,
                status: "",
                toxicCounter: 0,
                sleepTurns: 0
            },
            defender: g,
            lines: d,
            partyCure: !0
        };
        if (nie(h)) return d.push(`${m.nickname}은(는) 미래를 향해 힘을 보냈다!`), {
            attacker: m,
            defender: g,
            lines: d,
            futureMove: {
                moveId: h.id
            }
        };
        if (oie(h)) return d.push(`${m.nickname}은(는) 소원을 빌었다!`), {
            attacker: m,
            defender: g,
            lines: d,
            wish: {
                heal: Math.floor(m.maxHP / 2)
            }
        };
        if (Ea(h) === "sap-atk") {
            const N = Uie(g, "atk");
            if (g = ve(g, {
                    atk: -1
                }, {
                    fromOpponent: !0,
                    lines: d
                }), d.push(`${g.nickname}의 공격이 떨어졌다!`), m.healBlockTurns > 0) d.push(`${m.nickname}은(는) 회복 봉인 상태다!`);
            else {
                const O = Math.min(m.maxHP, m.currentHP + Math.max(1, N));
                O > m.currentHP && d.push(`${m.nickname}의 HP가 회복됐다! (+${O-m.currentHP})`), m = {
                    ...m,
                    currentHP: O
                }
            }
            return {
                attacker: m,
                defender: g,
                lines: d
            }
        }
        if (Ea(h) === "copy-target") return d.push(`${m.nickname}은(는) ${g.nickname}의 능력 변화를 복사했다!`), {
            attacker: {
                ...m,
                boosts: {
                    ...g.boosts
                }
            },
            defender: g,
            lines: d
        };
        if (Ea(h) === "invert-target") {
            const N = Object.fromEntries(Object.entries(g.boosts || {}).map(([O, C]) => [O, -C]));
            return d.push(`${g.nickname}의 능력 변화가 뒤집혔다!`), {
                attacker: m,
                defender: {
                    ...g,
                    boosts: N
                },
                lines: d
            }
        }
        if (h.boosts)
            if (h.target === "self") m = ve(m, h.boosts), d.push(...Wt(m.nickname, h.boosts));
            else if (n.defenderMist && Object.values(h.boosts).some(N => N < 0)) {
            const N = Object.fromEntries(Object.entries(h.boosts).filter(([, O]) => O > 0));
            d.push(`${g.nickname}은(는) 하얀 안개에 보호받아 능력이 떨어지지 않는다!`), Object.keys(N).length && (g = ve(g, N), d.push(...Wt(g.nickname, N)))
        } else g = ve(g, h.boosts, {
            fromOpponent: !0,
            lines: d
        }), d.push(...Wt(g.nickname, h.boosts));
        if (h.status) {
            const N = Wr(g, h.status, a.state, R);
            h.target !== "self" && n.defenderSafeguard ? d.push(`${g.nickname}은(는) 신비의 부적에 보호받고 있다!`) : g.status ? d.push(`${g.nickname}에게는 효과가 없다! (이미 상태이상)`) : N ? d.push(N) : (g = Hs(g, h.status), d.push(`${g.nickname}은(는) ${Za[h.status]||h.status} 상태가 되었다!`))
        }
        if (h.volatileStatus && (h.target === "self" ? m = Ta(m, h.volatileStatus, d, m) : h.volatileStatus === "confusion" && n.defenderSafeguard ? d.push(`${g.nickname}은(는) 신비의 부적에 보호받고 있다!`) : g = Ta(g, h.volatileStatus, d, m)), h.heal) {
            const N = xQ(m, h.heal);
            m = N.entity, d.push(...N.lines)
        }
        let A = !1;
        return h.id === "rest" && (A = !0, m.healBlockTurns > 0 ? d.push(`${m.nickname}은(는) 회복 봉인 상태라 잠들 수 없다!`) : m.currentHP >= m.maxHP ? d.push(`${m.nickname}은(는) 이미 HP가 가득하다!`) : (m = {
            ...m,
            currentHP: m.maxHP,
            status: "slp",
            sleepTurns: 2,
            toxicCounter: 0
        }, d.push(`${m.nickname}은(는) 잠들어서 체력을 모두 회복했다!`))), !A && !h.boosts && !h.status && !h.volatileStatus && !h.heal && d.push(`${t.nickname}에게는 별다른 효과가 없었다.`), {
            attacker: m,
            defender: g,
            lines: d
        }
    }
    if (c.error) return d.push(`${t.nickname}에게는 효과가 없었다...`), {
        attacker: m,
        defender: t,
        lines: d
    };
    i && d.push("급소에 맞았다!"), U > 1 ? d.push("효과가 굉장했다!") : U < 1 && d.push("효과가 별로인 듯하다...");
    let v = !1,
        S;
    const H = Yh(h, m, t),
        B = tc(h);
    if (ec(h)) {
        const A = sie(m, t);
        if (A <= 0 || Math.random() * 100 >= A) return d.push(`${m.nickname}의 공격이 빗나갔다!`), {
            attacker: {
                ...m,
                lastMoveFailed: !0
            },
            defender: t,
            lines: d
        };
        S = t.currentHP, d.push("일격필살!")
    } else if (H != null) {
        if (S = Math.min(t.currentHP, Math.max(0, H)), h.id === "finalgambit" && (v = !0), S === 0) return d.push(`${t.nickname}에게는 효과가 없었다...`), {
            attacker: m,
            defender: t,
            lines: d
        }
    } else if (B) {
        const A = m.lastDamageTaken;
        if (!(A && (B === "any" || B === "physical" && A.category === "Physical" || B === "special" && A.category === "Special"))) return d.push(`${m.nickname}의 ${h.name}은(는) 실패했다!`), {
            attacker: {
                ...m,
                lastMoveFailed: !0
            },
            defender: t,
            lines: d
        };
        S = Math.min(t.currentHP, Math.max(1, Math.floor(A.amount * (B === "any" ? 1.5 : 2))))
    } else {
        const A = ni(c.damage);
        S = a.isSpread ? Math.floor(A * .75) : A;
        const N = rie(h, m, t, {
            attackerFirst: a.attackerFirst,
            defenderActed: a.defenderActed,
            defenderDamagedThisRound: t.damagedThisRound,
            attackerDamagedThisRound: m.damagedThisRound,
            allyFaintedLastRound: a.allyFaintedLastRound
        });
        N !== 1 && (S = Math.round(S * N)), S = Math.min(t.currentHP, S)
    }
    const M = Tre(t, S, t.currentHP >= t.maxHP);
    M.survive && (S = t.currentHP - 1);
    const z = Math.max(0, t.currentHP - S),
        L = z <= 0;
    if (g = {
            ...t,
            currentHP: z,
            fainted: L
        }, M.survive && M.consumesItem && (g.item = ""), !L && t.status === "frz" && h.type === "Fire" && S > 0 && (g.status = "", d.push(`${t.nickname}의 얼음이 녹았다!`)), d.push(`${t.nickname}에게 피해를 입혔다! (HP ${St(z,t.maxHP)})`), M.survive && d.push(M.line), L && d.push(`${t.nickname}은(는) 쓰러졌다!`), g = {
            ...g,
            damagedThisRound: !0,
            lastDamageTaken: {
                amount: S,
                category: h.category
            }
        }, Ea(h) === "reset-target" && !L && (g = {
            ...g,
            boosts: {
                ...Fs
            }
        }, d.push(`${g.nickname}의 능력 변화가 사라졌다!`)), Ea(h) === "steal-target") {
        const A = Object.fromEntries(Object.entries(g.boosts || {}).filter(([, N]) => N > 0));
        if (Object.keys(A).length) {
            m = ve(m, A);
            const N = {
                ...g.boosts
            };
            Object.keys(A).forEach(O => N[O] = 0), g = {
                ...g,
                boosts: N
            }, d.push(`${m.nickname}은(는) ${g.nickname}의 능력 변화를 빼앗았다!`)
        }
    }
    sc(h) && (g.types || []).includes("Flying") && (d.push(`${g.nickname}은(는) 땅으로 떨어졌다!`), g = {
        ...g,
        grounded: !0
    });
    const j = h.flags && h.flags.contact && !_h(m, h),
        F = xre(g, m, h, S, j, L, U > 1, R);
    if (F.attackerPatch) {
        const A = F.attackerPatch;
        if (A._chip) {
            const N = Math.max(0, m.currentHP - A._chip);
            m = {
                ...m,
                currentHP: N,
                fainted: N <= 0
            }
        }
        A.status && !m.status && (m = Hs(m, A.status)), A.attractActive && (m = {
            ...m,
            attractActive: !0
        }), A.boosts && (m = ve(m, A.boosts, {
            fromOpponent: !0,
            lines: d
        }))
    }
    if (F.defenderPatch) {
        const A = F.defenderPatch;
        A.boosts && (g = ve(g, A.boosts)), A.item !== void 0 && (g = {
            ...g,
            item: A.item
        })
    }
    if (d.push(...F.lines), !L && Cre(m, h) && Math.random() < .1 && (g = Ta(g, "flinch", d, m)), S > 0 && Bre(m) && m.healBlockTurns <= 0) {
        const A = Math.max(1, Math.floor(S / 8)),
            N = Math.min(m.maxHP, m.currentHP + A);
        N > m.currentHP && (d.push(`${m.nickname}은(는) 조가비방울로 체력을 회복했다! (+${N-m.currentHP})`), m = {
            ...m,
            currentHP: N
        })
    }
    if (L) {
        const A = Hre(m);
        A && (m = ve(m, A.boosts), d.push(`${m.nickname}의 ${A.label}(으)로 능력이 올랐다!`))
    } else {
        const A = Mre(g, t.currentHP);
        A && (g = ve(g, A.boosts), d.push(`${g.nickname}의 ${A.label}이(가) 발동했다!`))
    }
    Xre(h) && (m = {
        ...m,
        mustRecharge: !0
    });
    const T = mie(h);
    if (T && (m.types || []).includes(T) && S > 0 && (m = {
            ...m,
            types: m.types.filter(A => A !== T)
        }, d.push(`${m.nickname}은(는) ${T} 타입을 잃었다!`)), v && (m = {
            ...m,
            currentHP: 0,
            fainted: !0
        }, d.push(`${m.nickname}은(는) 쓰러졌다!`)), h.drain && S > 0)
        if (m.healBlockTurns > 0) d.push(`${m.nickname}은(는) 회복 봉인 상태라 흡수할 수 없다!`);
        else {
            const [A, N] = h.drain, O = Math.max(1, Math.round(S * A * Lre(m) / N)), C = Math.min(m.maxHP, m.currentHP + O), Z = C - m.currentHP;
            if (Z > 0) {
                const Q = Math.round(Z / m.maxHP * 100);
                d.push(`${m.nickname}은(는) 체력을 흡수했다! HP가 ${Q}% 회복했다! (+${Z}, 현재 HP ${St(C,m.maxHP)})`), m = {
                    ...m,
                    currentHP: C
                }
            }
        } if (h.recoil && S > 0) {
        const [A, N] = h.recoil, O = Math.max(1, Math.round(S * A / N)), C = Math.max(0, m.currentHP - O), Z = C <= 0;
        d.push(`${m.nickname}은(는) 반동으로 피해를 입었다! (-${O}, 현재 HP ${St(C,m.maxHP)})`), Z && d.push(`${m.nickname}은(는) 쓰러졌다!`), m = {
            ...m,
            currentHP: C,
            fainted: Z
        }
    }
    if (h.mindBlownRecoil) {
        const A = Math.max(1, Math.ceil(m.maxHP / 2)),
            N = Math.max(0, m.currentHP - A),
            O = N <= 0;
        d.push(`${m.nickname}은(는) 반동으로 최대 HP의 절반을 잃었다! (-${A}, 현재 HP ${St(N,m.maxHP)})`), O && d.push(`${m.nickname}은(는) 쓰러졌다!`), m = {
            ...m,
            currentHP: N,
            fainted: O
        }
    }
    if ((I = h.self) != null && I.boosts) {
        const A = h.self.chance ?? 100;
        Math.random() * 100 < A && (m = ve(m, h.self.boosts), d.push(...Wt(m.nickname, h.self.boosts)))
    }
    if (h.secondary && !L && $h(g) && d.push(`${g.nickname}은(는) ${zre(g)}(으)로 부가효과를 막았다!`), h.secondary && !L && !$h(g)) {
        let A = h.secondary.chance ?? 100;
        if (Fre(m) && (A = Math.min(100, A * 2)), Math.random() * 100 < A) {
            if ((x = h.secondary.self) != null && x.boosts && (m = ve(m, h.secondary.self.boosts), d.push(...Wt(m.nickname, h.secondary.self.boosts))), h.secondary.boosts)
                if (n.defenderMist && Object.values(h.secondary.boosts).some(N => N < 0)) {
                    const N = Object.fromEntries(Object.entries(h.secondary.boosts).filter(([, O]) => O > 0));
                    d.push(`${g.nickname}은(는) 하얀 안개에 보호받아 능력이 떨어지지 않는다!`), Object.keys(N).length && (g = ve(g, N), d.push(...Wt(g.nickname, N)))
                } else g = ve(g, h.secondary.boosts, {
                    fromOpponent: !0,
                    lines: d
                }), d.push(...Wt(g.nickname, h.secondary.boosts));
            h.secondary.status && (n.defenderSafeguard ? d.push(`${g.nickname}은(는) 신비의 부적에 보호받고 있다!`) : !g.status && !Wr(g, h.secondary.status, a.state, R) && (g = Hs(g, h.secondary.status), d.push(`${g.nickname}은(는) ${Za[h.secondary.status]||h.secondary.status} 상태가 되었다!`))), h.secondary.volatileStatus && (h.secondary.volatileStatus === "confusion" && n.defenderSafeguard ? d.push(`${g.nickname}은(는) 신비의 부적에 보호받고 있다!`) : g = Ta(g, h.secondary.volatileStatus, d, m))
        }
    }
    return {
        attacker: m,
        defender: g,
        lines: d,
        damage: S
    }
}

function nc(e) {
    if (!e || e.fainted || !e.status) return {
        entity: e,
        lines: []
    };
    if (Are(e)) {
        const o = e.status === "tox" ? (e.toxicCounter || 0) + 1 : e.toxicCounter;
        return {
            entity: {
                ...e,
                toxicCounter: o
            },
            lines: []
        }
    }
    const t = e.formulaMaxHP || e.maxHP;
    let s = 0;
    if (e.status === "brn") s = Math.max(1, Math.floor(t / 16));
    else if (e.status === "psn") s = Math.max(1, Math.floor(t / 8));
    else if (e.status === "tox") s = Math.max(1, Math.floor(t * ((e.toxicCounter || 0) + 1) / 16));
    else return {
        entity: e,
        lines: []
    };
    const a = e.status === "tox" ? (e.toxicCounter || 0) + 1 : e.toxicCounter,
        r = Math.max(0, e.currentHP - s),
        i = r <= 0,
        n = [`${e.nickname}은(는) ${Za[e.status]||e.status}(으)로 피해를 입었다! (HP ${St(r,e.maxHP)})${i?` — ${e.nickname} 기절`:""}`];
    return {
        entity: {
            ...e,
            currentHP: r,
            toxicCounter: a,
            fainted: i
        },
        lines: n
    }
}

function HQ(e) {
    if (!e || e.fainted) return {
        entity: e,
        lines: []
    };
    const t = [];
    let s = e.currentHP,
        a = e.fainted,
        r = e.bindTurns || 0;
    if (r > 0) {
        const P = Math.max(1, Math.floor((e.formulaMaxHP || e.maxHP) / 8));
        s = Math.max(0, s - P), a = s <= 0, t.push(`${e.nickname}은(는) 조임 데미지를 입었다! (-${P})`), a && t.push(`${e.nickname}은(는) 쓰러졌다!`), r -= 1, r <= 0 && !a && t.push(`${e.nickname}의 조이기가 풀렸다!`)
    }
    const i = Math.max(0, (e.tauntTurns || 0) - 1);
    let n = e.encoreTurns || 0,
        o = e.encoreMove;
    n > 0 && (n -= 1, n <= 0 && (o = null, a || t.push(`${e.nickname}의 앵콜이 풀렸다!`)));
    const l = Math.max(0, (e.healBlockTurns || 0) - 1);
    let p = e.disableTurns || 0,
        c = e.disableMove;
    p > 0 && (p -= 1, p <= 0 && (c = null));
    let h = e.status,
        d = e.sleepTurns || 0;
    h === "slp" && d > 0 && (d -= 1, d <= 0 && !a && (h = "", t.push(`${e.nickname}은(는) 눈을 떴다!`)));
    let m = e.drowsyTurns || 0;
    m > 0 && (m -= 1, m <= 0 && !h && !a && (h = "slp", d = 1 + Math.floor(Math.random() * 3), t.push(`${e.nickname}은(는) 잠들어 버렸다!`)));
    let g = {
        ...e,
        currentHP: s,
        fainted: a,
        bindTurns: r,
        tauntTurns: i,
        encoreTurns: n,
        encoreMove: o,
        healBlockTurns: l,
        disableTurns: p,
        disableMove: c,
        drowsyTurns: m,
        status: h,
        sleepTurns: d,
        flinched: !1,
        protectedThisRound: null,
        protectStreak: e.protectedThisRound ? e.protectStreak : 0,
        enduringThisRound: !1,
        damagedThisRound: !1,
        lastDamageTaken: null
    };
    if (!a) {
        const P = jre(g);
        if (P && (g = ve(g, P.boosts), t.push(`${g.nickname}의 ${P.label}(으)로 스피드가 올랐다!`)), ze(g) === "whiteherb" && Object.values(g.boosts || {}).some(R => R < 0)) {
            const R = {
                ...g.boosts
            };
            Object.keys(R).forEach(b => R[b] = Math.max(0, R[b])), g = {
                ...g,
                boosts: R,
                item: ""
            }, t.push(`${g.nickname}은(는) 하얀허브로 능력을 되돌렸다!`)
        }
    }
    return {
        entity: g,
        lines: t
    }
}

function Die(e) {
    if (!e) return {
        participant: e,
        logs: []
    };
    const t = {
            ...e.boosts || {}
        },
        s = {
            ...e.buffTimers || {}
        };
    let a = e.pendingFinisher,
        r = e.finisherTimer || 0,
        i = !1;
    const n = [];
    fie.forEach(p => {
        s[p] > 0 && (s[p] -= 1, s[p] <= 0 && (t[p] = 0, s[p] = 0))
    }), r > 0 ? (r -= 1, r <= 0 && (t.atk = 0, t.spa = 0, i = !0, n.push(`${e.nickname}은(는) 반동으로 이번 턴 행동할 수 없다!`))) : a && (t.atk = 4, t.spa = 4, r = 1, a = !1, n.push(`${e.nickname}의 힘이 폭발한다! (물리/특수공격 3배)`));
    const o = {
            ...e,
            boosts: t,
            buffTimers: s,
            pendingFinisher: a,
            finisherTimer: r,
            mustSkipTurn: i,
            redirectActive: !1
        },
        l = HQ(o);
    return {
        participant: l.entity,
        logs: [...n, ...l.lines]
    }
}

function Eie(e, t) {
    let s = e,
        a = t;
    const r = [];
    if (s.leechSeed && !s.fainted) {
        const i = Math.max(1, Math.floor((s.formulaMaxHP || s.maxHP) / 8)),
            n = Math.max(0, s.currentHP - i),
            o = n <= 0;
        r.push(`${s.nickname}은(는) 씨뿌리기로 체력을 빨렸다! (-${i})`), o && r.push(`${s.nickname}은(는) 쓰러졌다!`);
        const l = s.leechSeed.sourceId;
        if (s = {
                ...s,
                currentHP: n,
                fainted: o
            }, l != null) {
            const p = a.findIndex(c => c && c.id === l && !c.fainted);
            if (p !== -1) {
                const c = a[p],
                    h = Math.min(c.maxHP, c.currentHP + i);
                h > c.currentHP && r.push(`${c.nickname}은(는) 체력을 흡수했다! (+${h-c.currentHP})`), a = a.map((d, m) => m === p ? {
                    ...d,
                    currentHP: h
                } : d)
            }
        }
    }
    return a = a.map(i => {
        if (!i || i.fainted || !i.leechSeed) return i;
        const n = Math.max(1, Math.floor((i.formulaMaxHP || i.maxHP) / 8)),
            o = Math.max(0, i.currentHP - n),
            l = o <= 0;
        if (r.push(`${i.nickname}은(는) 씨뿌리기로 체력을 빨렸다! (-${n})`), l && r.push(`${i.nickname}은(는) 쓰러졌다!`), i.leechSeed.sourceIsBoss && !s.fainted) {
            const p = Math.min(s.maxHP, s.currentHP + n);
            p > s.currentHP && r.push(`${s.nickname}은(는) 체력을 흡수했다! (+${p-s.currentHP})`), s = {
                ...s,
                currentHP: p
            }
        }
        return {
            ...i,
            currentHP: o,
            fainted: l
        }
    }), {
        boss: s,
        participants: a,
        lines: r
    }
}

function el(e, t, s, a) {
    if (!t) return e;
    let r = e;
    const i = s && s.isParticipant ? s.team || "" : null,
        n = o => o && !o.fainted && (i === null ? !o.isParticipant : (o.team || "") === i);
    return t.hazeAll && (r = {
        ...r,
        boss: {
            ...r.boss,
            boosts: {
                ...Fs
            },
            buffTimers: {}
        },
        participants: r.participants.map(o => o && {
            ...o,
            boosts: {
                ...Fs
            },
            buffTimers: {}
        })
    }), t.partyCure && (r = i === null ? {
        ...r,
        boss: {
            ...r.boss,
            status: "",
            toxicCounter: 0,
            sleepTurns: 0
        }
    } : {
        ...r,
        participants: r.participants.map(o => n(o) ? {
            ...o,
            status: "",
            toxicCounter: 0,
            sleepTurns: 0
        } : o)
    }), t.sideProtect && i !== null && (r = {
        ...r,
        participants: r.participants.map(o => n(o) ? {
            ...o,
            protectedThisRound: {
                type: t.sideProtect.type
            }
        } : o)
    }), t.wish && (r = {
        ...r,
        pendingWish: {
            team: i || "",
            boss: i === null,
            heal: t.wish.heal,
            turns: 1
        }
    }), t.futureMove && s && (r = {
        ...r,
        pendingFutureSight: {
            targetBoss: i !== null,
            turns: 2,
            moveId: t.futureMove.moveId,
            snapshot: {
                baseStats: s.baseStats,
                ivs: s.ivs,
                evs: s.evs,
                level: s.level,
                nature: s.nature,
                types: s.types,
                boosts: {
                    ...s.boosts
                },
                ability: s.ability,
                item: s.item,
                nickname: s.nickname
            }
        }
    }), r
}

function Tie(e) {
    if (e.status !== "ongoing") return e;
    const t = e.round + 1;
    let s = [...e.log];
    const a = nc(e.boss);
    let r = a.entity;
    s.push(...a.lines.map(b => ({
        round: t,
        phase: "status",
        text: b
    })));
    let i = e.participants.map(b => {
        if (!b) return b;
        const u = nc(b);
        return s.push(...u.lines.map(y => ({
            round: t,
            phase: "status",
            text: y
        }))), u.entity
    });
    const n = bt(e),
        o = b => {
            if (!b) return b;
            let u = b;
            const y = pre(u, n.weather);
            s.push(...y.lines.map(E => ({
                round: t,
                phase: "status",
                text: E
            }))), u = y.entity;
            const f = hre(u, n.terrain);
            if (s.push(...f.lines.map(E => ({
                    round: t,
                    phase: "status",
                    text: E
                }))), u = f.entity, !u.fainted) {
                const E = wre(u, e);
                if (E.delta) {
                    const U = Math.max(0, Math.min(u.maxHP, u.currentHP + E.delta));
                    if (U !== u.currentHP) {
                        const G = U <= 0;
                        u = {
                            ...u,
                            currentHP: U,
                            fainted: G
                        }, s.push(...E.lines.map(D => ({
                            round: t,
                            phase: "status",
                            text: D
                        })), ...G ? [{
                            round: t,
                            phase: "status",
                            text: `${u.nickname}은(는) 쓰러졌다!`
                        }] : [])
                    }
                }
                const k = Ure(u);
                k && (u = Hs(u, k.status), s.push({
                    round: t,
                    phase: "status",
                    text: k.line
                }))
            }
            return u
        };
    r = o(r), i = i.map(o);
    let l = e.pendingWish || null;
    if (l && (l = {
            ...l,
            turns: l.turns - 1
        }, l.turns <= 0)) {
        const b = y => y && !y.fainted && y.currentHP < y.maxHP && (l.boss ? !y.isParticipant : (y.team || "") === l.team),
            u = y => {
                if (!b(y)) return y;
                const f = Math.min(y.maxHP, y.currentHP + l.heal);
                return s.push({
                    round: t,
                    phase: "status",
                    text: `${y.nickname}의 소원이 이루어졌다! (+${f-y.currentHP})`
                }), {
                    ...y,
                    currentHP: f
                }
            };
        l.boss ? r = u(r) : i = i.map(u), l = null
    }
    let p = e.pendingFutureSight || null;
    if (p && (p = {
            ...p,
            turns: p.turns - 1
        }, p.turns <= 0 && p.targetBoss && !r.fainted)) {
        const b = {
                ...p.snapshot,
                currentHP: 1,
                maxHP: 999,
                fainted: !1
            },
            u = xe.calculateDamage(b, r, p.moveId, {}, {}),
            y = Math.min(r.currentHP, ni(u.damage)),
            f = Math.max(0, r.currentHP - y);
        s.push({
            round: t,
            phase: "status",
            text: `미래에서 보낸 공격이 ${r.nickname}을(를) 덮쳤다! (-${y})`
        }), r = {
            ...r,
            currentHP: f,
            fainted: f <= 0
        }, p = null
    }
    if (s.push({
            round: t,
            phase: "end",
            text: `--- ${t}라운드 종료 (보스 HP ${St(r.currentHP,r.maxHP)}) ---`
        }), r.currentHP <= 0) return {
        ...e,
        boss: r,
        participants: i,
        round: t,
        status: "win",
        log: s
    };
    if (!i.some(b => b && !b.fainted)) return {
        ...e,
        boss: r,
        participants: i,
        round: t,
        status: "loss",
        log: s
    };
    if (t >= (e.maxRounds || 6)) return {
        ...e,
        boss: r,
        participants: i,
        round: t,
        status: "timeout",
        log: s
    };
    const c = t + 1,
        h = i.map(b => Die(b));
    i = h.map(b => b.participant);
    const d = h.flatMap(b => b.logs),
        m = HQ(r);
    r = m.entity;
    const g = Eie(r, i);
    r = g.boss, i = g.participants;
    const P = cre(bt(e), vr(e));
    s.push({
        round: c,
        phase: "start",
        text: `--- ${c}라운드 시작 ---`
    }), s = [...s, ...d.map(b => ({
        round: c,
        phase: "status",
        text: b
    })), ...m.lines.map(b => ({
        round: c,
        phase: "status",
        text: b
    })), ...g.lines.map(b => ({
        round: c,
        phase: "status",
        text: b
    })), ...P.lines.map(b => ({
        round: c,
        phase: "status",
        text: b
    }))];
    const R = i.filter(b => b && !b.fainted && b.mustSkipTurn).map(b => b.id);
    return R.forEach(b => {
        const u = i.find(y => y && y.id === b);
        u && s.push({
            round: c,
            phase: "status",
            text: `${u.nickname}은(는) 이번 턴 행동할 수 없다!`
        })
    }), {
        ...e,
        boss: r,
        participants: i,
        field: P.field,
        sideConditions: P.sideConditions,
        pendingWish: l,
        pendingFutureSight: p,
        round: t,
        status: "ongoing",
        actedParticipantIds: R,
        log: s
    }
}

function MQ(e, t) {
    const s = [];
    let a = e;
    if (a.flinched) return s.push(`${a.nickname}은(는) 풀죽어서 움직일 수 없다!`), {
        attacker: {
            ...a,
            flinched: !1
        },
        canAct: !1,
        lines: s
    };
    if (a.mustRecharge) return s.push(`${a.nickname}은(는) 반동으로 움직일 수 없다! (재충전)`), {
        attacker: {
            ...a,
            mustRecharge: !1
        },
        canAct: !1,
        lines: s
    };
    if (a.status === "slp") return s.push(`${a.nickname}은(는) 쿨쿨 잠들어 있다.`), {
        attacker: a,
        canAct: !1,
        lines: s
    };
    if (a.status === "frz") {
        const r = t ? xe.getMove(t) : null;
        if (r && die.has(r.id)) s.push(`${a.nickname}의 얼음이 ${r.name}(으)로 녹았다!`), a = {
            ...a,
            status: ""
        };
        else if (Math.random() < .2) s.push(`${a.nickname}의 얼음이 녹았다!`), a = {
            ...a,
            status: ""
        };
        else return s.push(`${a.nickname}은(는) 얼어붙어서 움직일 수 없다!`), {
            attacker: a,
            canAct: !1,
            lines: s
        }
    }
    if (a.attractActive && Math.random() < .5) return s.push(`${a.nickname}은(는) 헤롱헤롱해서 움직일 수 없었다!`), {
        attacker: a,
        canAct: !1,
        lines: s
    };
    if (a.confusionTurns > 0) {
        const r = a.confusionTurns - 1;
        if (a = {
                ...a,
                confusionTurns: r
            }, r <= 0 && s.push(`${a.nickname}의 혼란이 풀렸다!`), Math.random() < 1 / 3) {
            const i = a.formulaMaxHP || a.maxHP,
                n = Math.max(1, Math.floor(i / 8)),
                o = Math.max(0, a.currentHP - n),
                l = o <= 0;
            return s.push(`${a.nickname}은(는) 혼란으로 자신을 공격했다! (-${n})`), l && s.push(`${a.nickname}은(는) 쓰러졌다!`), a = {
                ...a,
                currentHP: o,
                fainted: l
            }, {
                attacker: a,
                canAct: !1,
                lines: s
            }
        }
    }
    return a.status === "par" && Math.random() < .25 ? (s.push(`${a.nickname}은(는) 몸이 저려서 움직일 수 없다!`), {
        attacker: a,
        canAct: !1,
        lines: s
    }) : {
        attacker: a,
        canAct: !0,
        lines: s
    }
}

function Fie(e, t, s) {
    const a = [];
    return e.encoreTurns > 0 && e.encoreMove ? (e.encoreMove !== s.id && a.push(`${e.nickname}은(는) 앵콜 상태라 ${s.name} 대신 이전 기술을 사용한다!`), {
        blocked: !1,
        finalMoveId: e.encoreMove,
        lines: a
    }) : e.disableTurns > 0 && e.disableMove === s.id ? (a.push(`${e.nickname}의 ${s.name}은(는) 사슬묶여 사용할 수 없다!`), {
        blocked: !0,
        finalMoveId: t,
        lines: a
    }) : e.tauntTurns > 0 && s.category === "Status" ? (a.push(`${e.nickname}은(는) 도발에 걸려 변화기술을 사용할 수 없다!`), {
        blocked: !0,
        finalMoveId: t,
        lines: a
    }) : e.tormentActive && e.lastMoveId && e.lastMoveId === s.id ? (a.push(`${e.nickname}은(는) 트집 때문에 같은 기술을 연속으로 사용할 수 없다!`), {
        blocked: !0,
        finalMoveId: t,
        lines: a
    }) : {
        blocked: !1,
        finalMoveId: t,
        lines: a
    }
}

function jQ(e, t, s, a) {
    if (e.status !== "ongoing" || !s || t == null || e.actedParticipantIds.includes(t)) return e;
    const r = e.participants.findIndex(P => P && P.id === t && !P.fainted);
    if (r === -1) return e;
    const i = e.round + 1,
        n = xe.getMove(s);
    if (n && ip(n.id)) return {
        ...e,
        log: [...e.log, {
            round: i,
            phase: "participant",
            text: `${e.participants[r].nickname}은(는) ${n.name}을(를) 레이드에서 사용할 수 없다!`
        }]
    };
    const o = MQ(e.participants[r], s);
    let l = e.participants.map((P, R) => R === r ? o.attacker : P),
        p = [...e.log, ...o.lines.map(P => ({
            round: i,
            phase: "participant",
            text: P
        }))];
    if (!o.canAct) return {
        ...e,
        participants: l,
        actedParticipantIds: [...e.actedParticipantIds, t],
        log: p
    };
    let c = s;
    if (n) {
        const P = Fie(l[r], s, n);
        if (p = [...p, ...P.lines.map(R => ({
                round: i,
                phase: "participant",
                text: R
            }))], P.blocked) return {
            ...e,
            participants: l,
            actedParticipantIds: [...e.actedParticipantIds, t],
            log: p
        };
        c = P.finalMoveId
    }
    l[r].chargingMove && (c = l[r].chargingMove, p = [...p, {
        round: i,
        phase: "participant",
        text: `${l[r].nickname}은(는) 모아둔 힘을 발산한다!`
    }]);
    const h = a != null ? l.findIndex(P => P && P.id === a && !P.fainted) : -1;
    if (h !== -1) {
        const P = fs(l[r], l[h], c, {
                state: e,
                field: ys(e, l[r], l[h])
            }),
            R = h === r ? {
                ...P.defender,
                lastMoveId: P.attacker.lastMoveId
            } : P.defender;
        l = l.map((u, y) => y === h ? R : y === r ? P.attacker : u), p = [...p, ...P.lines.map(u => ({
            round: i,
            phase: "participant",
            text: u
        }))];
        const b = {
            ...e,
            participants: l,
            actedParticipantIds: [...e.actedParticipantIds, t],
            log: p
        };
        return l.some(u => u && !u.fainted) ? b : {
            ...b,
            status: "loss",
            log: [...p, {
                round: i,
                phase: "end",
                text: `--- ${i}라운드 종료 (참가자 전멸) ---`
            }]
        }
    }
    if (n && (n.target === "self" || n.target === "allies" || n.target === "allySide" || ore(n))) {
        const P = l[r],
            R = fs(P, P, c, {
                state: e,
                field: ys(e, P, e.boss)
            });
        let b = R.lines;
        l = l.map((f, E) => E === r ? R.attacker : f);
        const u = AQ(bt(e), vr(e), R.fieldEffects, l[r], IQ);
        if (b = [...b, ...u.lines], n.target === "allies" && n.heal) {
            const f = l[r],
                E = k => k && k.id !== f.id && !k.fainted && (k.team || "") === (f.team || "");
            l = l.map(k => {
                if (!E(k)) return k;
                const U = xQ(k, n.heal);
                return b = [...b, ...U.lines], U.entity
            })
        }
        p = [...p, ...b.map(f => ({
            round: i,
            phase: "participant",
            text: f
        }))];
        let y = {
            ...e,
            participants: l,
            field: u.field,
            sideConditions: u.sideConditions,
            actedParticipantIds: [...e.actedParticipantIds, t],
            log: p
        };
        return y = el(y, R, y.participants[r]), l = y.participants, l.some(f => f && !f.fainted) ? y : {
            ...y,
            status: "loss",
            log: [...p, {
                round: i,
                phase: "end",
                text: `--- ${i}라운드 종료 (참가자 전멸) ---`
            }]
        }
    }
    if (gie(n)) {
        const P = l[r],
            R = l.map((k, U) => k && !k.fainted && U !== r && (k.team || "") === (P.team || "") ? U : -1).filter(k => k !== -1),
            b = 1 + R.length > 1,
            u = fs(P, e.boss, c, {
                state: e,
                isSpread: b,
                field: ys(e, P, e.boss)
            });
        let y = u.defender;
        l = l.map((k, U) => U === r ? u.attacker : k);
        let f = [...u.lines];
        for (const k of R) {
            if (l[k].fainted) continue;
            const U = fs(l[r], l[k], c, {
                state: e,
                isSpread: b,
                field: ys(e, l[r], l[k])
            });
            l[k] = U.defender, f = [...f, ...U.lines]
        }
        p = [...p, ...f.map(k => ({
            round: i,
            phase: "participant",
            text: k
        }))];
        const E = {
            ...e,
            boss: y,
            participants: l,
            actedParticipantIds: [...e.actedParticipantIds, t],
            log: p
        };
        return y.currentHP <= 0 ? {
            ...E,
            status: "win",
            log: [...p, {
                round: i,
                phase: "end",
                text: `--- ${i}라운드 종료 (보스 HP 0%) ---`
            }]
        } : l.some(k => k && !k.fainted) ? E : {
            ...E,
            status: "loss",
            log: [...p, {
                round: i,
                phase: "end",
                text: `--- ${i}라운드 종료 (참가자 전멸) ---`
            }]
        }
    }
    const d = fs(l[r], e.boss, c, {
        state: e,
        roundNum: i,
        attackerFirst: !0,
        field: ys(e, l[r], e.boss)
    });
    let m = d.defender;
    l = l.map((P, R) => R === r ? d.attacker : P), p = [...p, ...d.lines.map(P => ({
        round: i,
        phase: "participant",
        text: P
    }))];
    let g = {
        ...e,
        boss: m,
        participants: l,
        actedParticipantIds: [...e.actedParticipantIds, t],
        log: p
    };
    return g = el(g, d, g.participants[r]), m = g.boss, m.currentHP <= 0 ? {
        ...g,
        status: "win",
        log: [...p, {
            round: i,
            phase: "end",
            text: `--- ${i}라운드 종료 (보스 HP 0%) ---`
        }]
    } : g
}

function CQ(e, t, s) {
    if (e.status !== "ongoing" || !t || s == null) return e;
    const a = e.round + 1;
    e.boss.chargingMove && (t = e.boss.chargingMove);
    const r = xe.getMove(t),
        i = MQ(e.boss, t);
    if (!i.canAct) return {
        ...e,
        boss: i.attacker,
        log: [...e.log, ...i.lines.map(y => ({
            round: a,
            phase: "boss",
            text: y
        }))]
    };
    const n = i.attacker,
        o = i.lines.map(y => ({
            round: a,
            phase: "boss",
            text: y
        }));
    if (GQ(r)) {
        const y = e.participants.map((v, S) => v && !v.fainted ? S : -1).filter(v => v !== -1);
        if (y.length === 0) return e;
        let f = n,
            E = [...e.participants],
            k = [];
        const U = y.length > 1;
        for (const v of y) {
            if (E[v].fainted) continue;
            const S = fs(f, E[v], t, {
                state: e,
                isSpread: U,
                field: ys(e, f, E[v])
            });
            f = S.attacker, E[v] = S.defender, k = [...k, ...S.lines]
        }
        const G = [...e.log, ...o, ...k.map(v => ({
                round: a,
                phase: "boss",
                text: v
            }))],
            D = {
                ...e,
                boss: f,
                participants: E,
                log: G
            };
        return E.some(v => v && !v.fainted) ? D : {
            ...D,
            status: "loss",
            log: [...G, {
                round: a,
                phase: "end",
                text: `--- ${a}라운드 종료 (참가자 전멸) ---`
            }]
        }
    }
    const l = e.participants.filter(y => y && !y.fainted && y.redirectActive),
        p = s !== "random" ? e.participants.find(y => y && String(y.id) === String(s)) : null,
        c = l.length === 0 ? null : p && l.find(y => (y.team || "") === (p.team || "")) || l[0];
    let h = s;
    if (c) h = c.id;
    else if (s === "random") {
        const y = e.participants.filter(f => f && !f.fainted);
        if (y.length === 0) return e;
        h = y[Math.floor(Math.random() * y.length)].id
    }
    const d = e.participants.findIndex(y => y && y.id === h && !y.fainted);
    if (d === -1) return e;
    const m = fs(n, e.participants[d], t, {
            state: e,
            roundNum: a,
            attackerFirst: !0,
            defenderActed: e.actedParticipantIds.includes(e.participants[d].id),
            field: ys(e, n, e.participants[d])
        }),
        g = m.attacker;
    let P = e.participants.map((y, f) => f === d ? m.defender : y);
    c && (P = P.map(y => y && y.id === c.id ? {
        ...y,
        redirectActive: !1
    } : y));
    const R = AQ(bt(e), vr(e), m.fieldEffects, e.boss, IQ),
        b = [...e.log, ...o, ...m.lines.map(y => ({
            round: a,
            phase: "boss",
            text: y
        })), ...R.lines.map(y => ({
            round: a,
            phase: "boss",
            text: y
        }))];
    let u = {
        ...e,
        boss: g,
        participants: P,
        field: R.field,
        sideConditions: R.sideConditions,
        log: b
    };
    return u = el(u, m, g), P = u.participants, P.some(y => y && !y.fainted) ? u : {
        ...u,
        status: "loss",
        log: [...b, {
            round: a,
            phase: "end",
            text: `--- ${a}라운드 종료 (참가자 전멸) ---`
        }]
    }
}

function Iie(e, t = {}) {
    if (!e || e.status !== "ongoing") return e;
    const s = (t.participantActions || []).filter(c => c && c.participantId != null),
        a = (t.bossActions || []).filter(c => c && c.moveId);
    if (s.length === 0 && a.length === 0) return e;
    const r = e.round + 1,
        i = [],
        n = (c, h, d, m, g) => {
            const P = h.kind === "cheer" ? null : xe.getMove(h.moveId),
                R = h.kind === "cheer" ? lp : ((P == null ? void 0 : P.priority) ?? 0) + FQ(d, P, e),
                b = h.kind === "cheer" ? 0 : vre(d),
                u = b > 0 && Math.random() < b,
                y = h.kind !== "cheer" && Pre(d);
            i.push({
                type: c,
                act: h,
                name: m,
                priority: R,
                speed: Yo(e, d),
                first: u,
                last: y,
                roll: Math.random(),
                seq: g
            })
        };
    s.forEach((c, h) => {
        const d = e.participants.find(m => m && m.id === c.participantId);
        d && n("participant", c, d, d.nickname, h)
    }), a.forEach((c, h) => n("boss", c, e.boss, e.boss.nickname, h));
    const o = wQ(e);
    i.sort((c, h) => h.priority - c.priority || (h.first ? 1 : 0) - (c.first ? 1 : 0) || (c.last ? 1 : 0) - (h.last ? 1 : 0) || (o ? c.speed - h.speed : h.speed - c.speed) || c.roll - h.roll);
    let l = e;
    const p = (c, h) => {
        l = {
            ...l,
            log: [...l.log, {
                round: r,
                phase: "participant",
                text: `${c}은(는) ${h?`${h} `:""}행동할 수 없었다!`
            }]
        }
    };
    for (const c of i) {
        if (l.status !== "ongoing") break;
        if (c.type === "boss") {
            const {
                moveId: u,
                targetId: y
            } = c.act;
            l = CQ(l, u, y === "random" ? "random" : Number(y));
            continue
        }
        const {
            participantId: h,
            kind: d,
            moveId: m,
            cheerId: g,
            targetParticipantId: P
        } = c.act, R = l.participants.find(u => u && u.id === h);
        if (!R || R.fainted) {
            p(c.name, "쓰러져서");
            continue
        }
        if (l.actedParticipantIds.includes(h)) {
            R.mustSkipTurn && p(c.name, "반동으로");
            continue
        }
        const b = l;
        l = d === "cheer" ? BQ(l, h, g) : jQ(l, h, m, P), l === b && !l.actedParticipantIds.includes(h) && p(c.name, "")
    }
    return l = {
        ...l,
        boss: l.boss.flinched ? {
            ...l.boss,
            flinched: !1
        } : l.boss,
        participants: l.participants.map(c => c && c.flinched ? {
            ...c,
            flinched: !1
        } : c)
    }, l
}

function BQ(e, t, s) {
    if (e.status !== "ongoing" || !s || t == null || e.actedParticipantIds.includes(t)) return e;
    const a = e.participants.findIndex(h => h && h.id === t && !h.fainted);
    if (a === -1) return e;
    const r = e.participants[a];
    if ((r.cheerUsed || 0) >= rp) return e;
    const i = Xae(r.position, s);
    if (!i || s === "finisher" && e.round + 1 >= (e.maxRounds || 100)) return e;
    const n = e.round + 1;
    let o = e.participants;
    const l = [`${r.nickname}의 ${i.name}!`],
        p = h => (h.team || "") === (r.team || "");
    switch (s) {
        case "ironwall":
            o = o.map(h => h && !h.fainted && p(h) ? ic(h, {
                def: 1,
                spd: 1
            }, 3) : h), l.push(`${r.team?`${r.team}조`:"같은 조"} 아군의 방어/특수방어가 상승했다!`);
            break;
        case "guard":
            o = o.map((h, d) => d === a ? {
                ...h,
                redirectActive: !0
            } : h), l.push(`${r.nickname}이(가) 이번 턴 공격을 대신 받아낸다!`);
            break;
        case "pumpup":
            o = o.map((h, d) => d === a ? ic(h, {
                atk: 1,
                spa: 1
            }, 3) : h), l.push(`${r.nickname}의 공격/특수공격이 상승했다!`);
            break;
        case "finisher":
            o = o.map((h, d) => d === a ? {
                ...h,
                pendingFinisher: !0
            } : h), l.push(`${r.nickname}이(가) 다음 턴을 위해 힘을 모은다!`);
            break;
        case "healcry":
            o = o.map(h => h && !h.fainted && p(h) ? {
                ...h,
                currentHP: h.healBlockTurns > 0 ? h.currentHP : Math.min(h.maxHP, h.currentHP + Math.round(h.maxHP * .5))
            } : h), l.push(`${r.team?`${r.team}조`:"같은 조"} 아군의 체력을 회복했다! (회복 봉인 상태인 아군은 제외)`);
            break;
        case "cleanse":
            o = o.map(h => h && !h.fainted && p(h) ? {
                ...h,
                status: "",
                toxicCounter: 0,
                tauntTurns: 0,
                encoreTurns: 0,
                encoreMove: null,
                tormentActive: !1,
                healBlockTurns: 0,
                attractActive: !1,
                disableTurns: 0,
                disableMove: null
            } : h), l.push(`${r.team?`${r.team}조`:"같은 조"} 아군의 상태이상·헤롱헤롱·도발·앵콜·트집·회복봉인·사슬묶기를 회복했다! (혼란/씨뿌리기/조이기는 대상 외)`);
            break;
        default:
            return e
    }
    o = o.map((h, d) => d === a ? {
        ...h,
        cheerUsed: (h.cheerUsed || 0) + 1
    } : h);
    const c = [...e.log, ...l.map(h => ({
        round: n,
        phase: "participant",
        text: h
    }))];
    return {
        ...e,
        participants: o,
        actedParticipantIds: [...e.actedParticipantIds, t],
        log: c
    }
}

function Rie(e) {
    if (e.status !== "ongoing") return e;
    const t = e.round + 1,
        s = {
            ...e.boss,
            boosts: {
                ...Fs
            },
            buffTimers: {}
        },
        a = e.participants.map(i => i && {
            ...i,
            boosts: {
                ...Fs
            },
            buffTimers: {}
        }),
        r = {
            round: t,
            phase: "boss",
            text: `${e.boss.nickname}이(가) 필드의 모든 랭크 변화를 원래대로 되돌렸다! (턴 소모 없음)`
        };
    return {
        ...e,
        boss: s,
        participants: a,
        log: [...e.log, r]
    }
}

function Gie(e) {
    if (e.status !== "ongoing") return e;
    const t = e.round + 1;
    return {
        ...e,
        field: np(),
        sideConditions: op(),
        log: [...e.log, {
            round: t,
            phase: "boss",
            text: "날씨·필드·사이드 효과가 모두 사라졌다! (턴 소모 없음)"
        }]
    }
}

function Nie(e) {
    if (e.status !== "ongoing") return e;
    const t = e.round + 1,
        s = {
            ...e.boss,
            status: "",
            toxicCounter: 0,
            tauntTurns: 0,
            encoreTurns: 0,
            encoreMove: null,
            tormentActive: !1,
            healBlockTurns: 0,
            attractActive: !1,
            disableTurns: 0,
            disableMove: null
        },
        a = {
            round: t,
            phase: "boss",
            text: `${e.boss.nickname}이(가) 자신의 상태이상을 모두 회복했다! (턴 소모 없음)`
        };
    return {
        ...e,
        boss: s,
        log: [...e.log, a]
    }
}

function xie({
    boss: e,
    participants: t,
    maxRounds: s = 6
}) {
    const a = rc(e);
    let r = t.map(l => l && l.position && l.position.trim() ? rc(l) : null);
    const i = [{
            round: 1,
            phase: "start",
            text: "--- 1라운드 시작 ---"
        }],
        n = np(),
        o = Dre(a);
    return o.weather && (n.weather = o.weather, n.weatherTurns = PQ, i.push({
        round: 1,
        phase: "status",
        text: `${a.nickname}의 특성으로 ${pa[o.weather].name} 상태가 되었다!`
    })), o.terrain && (n.terrain = o.terrain, n.terrainTurns = vQ, i.push({
        round: 1,
        phase: "status",
        text: `${a.nickname}의 특성으로 ${dr[o.terrain].name}가 펼쳐졌다!`
    })), Ere(a) && (r = r.map(l => l && ve(l, {
        atk: -1
    })), i.push({
        round: 1,
        phase: "status",
        text: `${a.nickname}의 위협으로 참가자 전원의 공격이 떨어졌다!`
    })), {
        boss: a,
        participants: r,
        round: 0,
        status: "ongoing",
        maxRounds: s,
        field: n,
        sideConditions: op(),
        log: i,
        actedParticipantIds: []
    }
}
const Hie = [{
        position: "철벽",
        nickname: "펑크",
        pokemon: "부르르룸",
        types: ["Steel", "Poison"]
    }, {
        position: "철벽",
        nickname: "삐낭시에 ",
        pokemon: "픽시",
        types: ["Fairy"]
    }, {
        position: "철벽",
        nickname: "네온",
        pokemon: "저리더프",
        types: ["Electric"]
    }, {
        position: "철벽",
        nickname: "실트",
        pokemon: "토오",
        types: ["Poison", "Ground"]
    }, {
        position: "철벽",
        nickname: "타이드",
        pokemon: "누오",
        types: ["Water", "Ground"]
    }, {
        position: "칼춤",
        nickname: "더트",
        pokemon: "루가루암(황혼)",
        types: ["Rock"]
    }, {
        position: "칼춤",
        nickname: "금채",
        pokemon: "모아머",
        types: ["Bug", "Grass"]
    }, {
        position: "칼춤",
        nickname: "댕이",
        pokemon: "대검귀",
        types: ["Water", "Dark"]
    }, {
        position: "칼춤",
        nickname: "수이",
        pokemon: "포푸니크",
        types: ["Fighting", "Poison"]
    }, {
        position: "칼춤",
        nickname: "마노",
        pokemon: "번치코",
        types: ["Fire", "Fighting"]
    }, {
        position: "칼춤",
        nickname: "너울",
        pokemon: "엠페르트",
        types: ["Water", "Steel"]
    }, {
        position: "칼춤",
        nickname: "총 군",
        pokemon: "창파나이트",
        types: ["Fighting"]
    }, {
        position: "칼춤",
        nickname: "가넷",
        pokemon: "라우드본",
        types: ["Fire", "Ghost"]
    }, {
        position: "칼춤",
        nickname: "로토무",
        pokemon: "로토무",
        types: ["Electric", "Ghost"]
    }, {
        position: "칼춤",
        nickname: "마루",
        pokemon: "바랜드",
        types: ["Normal"]
    }, {
        position: "칼춤",
        nickname: "만치닐",
        pokemon: "초염몽",
        types: ["Fire", "Fighting"]
    }, {
        position: "도우미",
        nickname: "꼬마",
        pokemon: "부스터",
        types: ["Fire"]
    }, {
        position: "도우미",
        nickname: "프레이즈",
        pokemon: "가디안",
        types: ["Psychic", "Fairy"]
    }, {
        position: "도우미",
        nickname: "바보",
        pokemon: "오롱털",
        types: ["Dark", "Fairy"]
    }],
    Js = 24,
    LQ = "raid-calculator-draft-v3",
    Mie = {
        hp: 31,
        atk: 31,
        def: 31,
        spa: 31,
        spd: 31,
        spe: 31
    },
    zQ = {
        hp: 0,
        atk: 0,
        def: 0,
        spa: 0,
        spd: 0,
        spe: 0
    },
    jie = {
        hp: 100,
        atk: 100,
        def: 100,
        spa: 100,
        spd: 100,
        spe: 100
    };

function Kr(e) {
    return {
        id: e,
        nickname: "",
        pokemon: "",
        position: "",
        gender: "",
        teraType: "",
        types: ["Normal"],
        evs: {
            ...zQ
        },
        moves: ["", "", "", ""]
    }
}

function Cie() {
    return {
        nickname: "보스",
        types: ["Normal"],
        baseStats: {
            ...jie
        },
        level: 50,
        nature: "hardy",
        ability: "",
        item: "",
        gender: "",
        teraType: "",
        ivs: {
            ...Mie
        },
        evs: {
            ...zQ
        },
        hpMultiplier: 1,
        moves: ["", "", "", ""],
        actionsPerRound: 2
    }
}

function Bie() {
    try {
        const e = localStorage.getItem(LQ);
        if (!e) return null;
        const t = JSON.parse(e);
        return !t || typeof t != "object" ? null : t
    } catch {
        return null
    }
}

function Lie() {
    const e = Bie(),
        [t, s] = X.useState((e == null ? void 0 : e.boss) || Cie()),
        [a, r] = X.useState(e != null && e.participants && e.participants.length === Js ? e.participants : Array.from({
            length: Js
        }, (T, I) => Kr(I))),
        [i, n] = X.useState((e == null ? void 0 : e.maxRounds) || 6),
        [o, l] = X.useState(""),
        [p, c] = X.useState(null),
        [h, d] = X.useState({
            participants: {},
            boss: []
        }),
        m = X.useCallback(() => d({
            participants: {},
            boss: []
        }), []);
    X.useEffect(() => {
        const T = JSON.stringify({
            boss: t,
            participants: a,
            maxRounds: i
        });
        localStorage.setItem(LQ, T)
    }, [t, a, i]);
    const g = X.useCallback(T => {
            s(I => ({
                ...I,
                ...T
            }))
        }, []),
        P = X.useCallback((T, I) => {
            r(x => x.map(A => A.id === T ? {
                ...A,
                ...I
            } : A))
        }, []),
        R = X.useCallback(T => {
            r(I => I.map(x => x.id === T ? Kr(T) : x))
        }, []),
        b = X.useCallback(T => {
            const x = Math.max(3, Number(T) || 5) - 2,
                A = a.filter(J => J.position === "철벽").map(J => J.id),
                N = a.filter(J => J.position === "도우미").map(J => J.id),
                O = a.filter(J => J.position === "칼춤").map(J => J.id),
                C = Math.min(A.length, N.length, Math.floor(O.length / x)),
                Z = new Map;
            for (let J = 0; J < C; J += 1) {
                const ee = String(J + 1);
                Z.set(A[J], ee), Z.set(N[J], ee);
                for (let Et = 0; Et < x; Et += 1) Z.set(O[J * x + Et], ee)
            }
            r(J => J.map(ee => ({
                ...ee,
                team: Z.get(ee.id) || ""
            })));
            const Q = C > 0 ? C * (2 + x) : 0,
                Y = A.length + N.length + O.length;
            return {
                teamCount: C,
                leftoverCount: Y - Q
            }
        }, [a]),
        u = X.useCallback(() => {
            r(Array.from({
                length: Js
            }, (T, I) => {
                const x = Hie[I];
                return x ? {
                    ...Kr(I),
                    nickname: x.nickname,
                    pokemon: x.pokemon,
                    position: x.position,
                    types: x.types
                } : Kr(I)
            }))
        }, []),
        y = X.useCallback(() => {
            const T = o ? a.filter(I => String(I.team || "") === String(o)) : a;
            c(xie({
                boss: t,
                participants: T,
                maxRounds: i
            })), m()
        }, [t, a, i, o, m]),
        f = X.useCallback(() => {
            c(null), m()
        }, [m]),
        E = X.useCallback((T, I, x) => {
            c(A => A && jQ(A, T, I, x))
        }, []),
        k = X.useCallback((T, I) => {
            c(x => x && CQ(x, T, I))
        }, []),
        U = X.useCallback((T, I) => {
            c(x => x && BQ(x, T, I))
        }, []),
        G = X.useCallback(() => {
            c(T => T && Tie(T)), m()
        }, [m]),
        D = X.useCallback((T, I) => {
            d(x => ({
                ...x,
                participants: {
                    ...x.participants,
                    [T]: I
                }
            }))
        }, []),
        v = X.useCallback(T => {
            d(I => {
                const x = {
                    ...I.participants
                };
                return delete x[T], {
                    ...I,
                    participants: x
                }
            })
        }, []),
        S = X.useCallback(T => {
            d(I => ({
                ...I,
                boss: [...I.boss, T]
            }))
        }, []),
        H = X.useCallback(T => {
            d(I => ({
                ...I,
                boss: I.boss.filter((x, A) => A !== T)
            }))
        }, []),
        B = X.useCallback(() => {
            c(T => {
                if (!T) return T;
                const I = Object.entries(h.participants).map(([x, A]) => ({
                    participantId: Number(x),
                    ...A
                }));
                return Iie(T, {
                    participantActions: I,
                    bossActions: h.boss
                })
            }), m()
        }, [h, m]),
        M = X.useCallback(() => {
            c(T => T && Rie(T))
        }, []),
        z = X.useCallback(() => {
            c(T => T && Gie(T))
        }, []),
        L = X.useCallback(() => {
            c(T => T && Nie(T))
        }, []),
        j = X.useCallback(() => {
            const T = JSON.stringify({
                    boss: t,
                    participants: a,
                    maxRounds: i
                }, null, 2),
                I = new Blob([T], {
                    type: "application/json"
                }),
                x = URL.createObjectURL(I),
                A = document.createElement("a");
            A.href = x, A.download = `raid-setup-${new Date().toISOString().slice(0,10)}.json`, A.click(), URL.revokeObjectURL(x)
        }, [t, a, i]),
        F = X.useCallback(T => {
            try {
                const I = JSON.parse(T);
                return I.boss && s(I.boss), Array.isArray(I.participants) && I.participants.length === Js && r(I.participants), I.maxRounds && n(I.maxRounds), c(null), {
                    ok: !0
                }
            } catch (I) {
                return {
                    ok: !1,
                    error: I.message
                }
            }
        }, []);
    return {
        boss: t,
        updateBoss: g,
        participants: a,
        updateParticipant: P,
        clearParticipant: R,
        autoAssignTeams: b,
        loadDefaultRoster: u,
        maxRounds: i,
        setMaxRounds: n,
        selectedTeam: o,
        setSelectedTeam: l,
        battle: p,
        startBattle: y,
        resetBattle: f,
        runParticipantAction: E,
        runBossAction: k,
        runCheer: U,
        runEndRound: G,
        runResetFieldBoosts: M,
        runClearFieldConditions: z,
        runCureBossStatus: L,
        queue: h,
        queueParticipantAction: D,
        unqueueParticipantAction: v,
        queueBossAction: S,
        unqueueBossAction: H,
        runResolveQueue: B,
        clearQueue: m,
        exportDraft: j,
        importDraft: F
    }
}
const Ni = [{
        en: "Normal",
        ko: "노말"
    }, {
        en: "Fire",
        ko: "불꽃"
    }, {
        en: "Water",
        ko: "물"
    }, {
        en: "Electric",
        ko: "전기"
    }, {
        en: "Grass",
        ko: "풀"
    }, {
        en: "Ice",
        ko: "얼음"
    }, {
        en: "Fighting",
        ko: "격투"
    }, {
        en: "Poison",
        ko: "독"
    }, {
        en: "Ground",
        ko: "땅"
    }, {
        en: "Flying",
        ko: "비행"
    }, {
        en: "Psychic",
        ko: "에스퍼"
    }, {
        en: "Bug",
        ko: "벌레"
    }, {
        en: "Rock",
        ko: "바위"
    }, {
        en: "Ghost",
        ko: "고스트"
    }, {
        en: "Dragon",
        ko: "드래곤"
    }, {
        en: "Dark",
        ko: "악"
    }, {
        en: "Steel",
        ko: "강철"
    }, {
        en: "Fairy",
        ko: "페어리"
    }],
    OQ = ["hp", "atk", "def", "spa", "spd", "spe"];

function Cn(e) {
    return OQ.map(t => (e == null ? void 0 : e[t]) ?? 0).join(",")
}

function zie(e, t) {
    const s = e.split(",").map(r => parseInt(r.trim(), 10));
    if (s.length !== 6 || s.some(r => Number.isNaN(r))) return t;
    const a = {};
    return OQ.forEach((r, i) => {
        a[r] = s[i]
    }), a
}

function Bn({
    value: e,
    onChange: t,
    disabled: s,
    className: a,
    title: r
}) {
    const [i, n] = X.useState(Cn(e));
    X.useEffect(() => {
        n(Cn(e))
    }, [e]);

    function o(p) {
        const c = p.target.value;
        n(c);
        const h = zie(c, null);
        h && t(h)
    }

    function l() {
        n(Cn(e))
    }
    return w.jsx("input", {
        className: a,
        title: r,
        value: i,
        disabled: s,
        onChange: o,
        onBlur: l
    })
}
const Oie = Object.keys(mr);

function Wie({
    boss: e,
    onChange: t,
    disabled: s
}) {
    const [a, r] = e.types && e.types.length ? e.types : ["Normal"];

    function i(l, p) {
        const c = [a, r].filter(Boolean);
        l === 0 ? c[0] = p : p ? c[1] = p : c.length = 1, t({
            types: c.filter(Boolean)
        })
    }

    function n(l, p) {
        const c = [...e.moves && e.moves.length ? e.moves : ["", "", "", ""]];
        c[l] = p, t({
            moves: c
        })
    }
    const o = e.moves && e.moves.length ? e.moves : ["", "", "", ""];
    return w.jsxs("section", {
        className: "panel boss-panel",
        children: [w.jsx("h2", {
            children: "보스"
        }), w.jsxs("div", {
            className: "field-grid",
            children: [w.jsxs("label", {
                children: ["이름", w.jsx("input", {
                    value: e.nickname,
                    disabled: s,
                    onChange: l => t({
                        nickname: l.target.value
                    })
                })]
            }), w.jsxs("label", {
                children: ["레벨", w.jsx("input", {
                    type: "number",
                    min: "1",
                    max: "100",
                    value: e.level,
                    disabled: s,
                    onChange: l => t({
                        level: Number(l.target.value) || 1
                    })
                })]
            }), w.jsxs("label", {
                children: ["성격", w.jsx("select", {
                    value: e.nature,
                    disabled: s,
                    onChange: l => t({
                        nature: l.target.value
                    }),
                    children: Oie.map(l => w.jsx("option", {
                        value: l,
                        children: l
                    }, l))
                })]
            }), w.jsxs("label", {
                children: ["성별", w.jsxs("select", {
                    value: e.gender || "",
                    disabled: s,
                    onChange: l => t({
                        gender: l.target.value
                    }),
                    children: [w.jsx("option", {
                        value: "",
                        children: "성별 불명"
                    }), w.jsx("option", {
                        value: "M",
                        children: "수컷"
                    }), w.jsx("option", {
                        value: "F",
                        children: "암컷"
                    })]
                })]
            }), w.jsxs("label", {
                children: ["특성", w.jsx("input", {
                    list: "ability-options",
                    value: e.ability,
                    disabled: s,
                    onChange: l => t({
                        ability: l.target.value
                    })
                })]
            }), w.jsxs("label", {
                children: ["도구", w.jsx("input", {
                    value: e.item,
                    disabled: s,
                    onChange: l => t({
                        item: l.target.value
                    })
                })]
            }), w.jsxs("label", {
                children: ["타입", w.jsxs("div", {
                    className: "type-select-pair",
                    children: [w.jsx("select", {
                        value: a,
                        disabled: s,
                        onChange: l => i(0, l.target.value),
                        children: Ni.map(l => w.jsx("option", {
                            value: l.en,
                            children: l.ko
                        }, l.en))
                    }), w.jsxs("select", {
                        value: r || "",
                        disabled: s,
                        onChange: l => i(1, l.target.value),
                        children: [w.jsx("option", {
                            value: "",
                            children: "-"
                        }), Ni.map(l => w.jsx("option", {
                            value: l.en,
                            children: l.ko
                        }, l.en))]
                    })]
                })]
            }), w.jsxs("label", {
                children: ["체력 배수 (종족값/레벨로 계산한 체력에 곱함)", w.jsx("input", {
                    type: "number",
                    min: "0.1",
                    step: "0.1",
                    value: e.hpMultiplier,
                    disabled: s,
                    onChange: l => t({
                        hpMultiplier: l.target.value
                    })
                })]
            }), w.jsxs("label", {
                className: "span-2",
                children: ["종족값 (HP,공격,방어,특공,특방,스피드)", w.jsx(Bn, {
                    value: e.baseStats,
                    disabled: s,
                    onChange: l => t({
                        baseStats: l
                    })
                })]
            }), w.jsxs("label", {
                className: "span-2",
                children: ["개체값 (위와 동일 순서)", w.jsx(Bn, {
                    value: e.ivs,
                    disabled: s,
                    onChange: l => t({
                        ivs: l
                    })
                })]
            }), w.jsxs("label", {
                className: "span-2",
                children: ["노력치 (위와 동일 순서)", w.jsx(Bn, {
                    value: e.evs,
                    disabled: s,
                    onChange: l => t({
                        evs: l
                    })
                })]
            }), w.jsxs("label", {
                children: ["한 턴당 기본 행동 횟수 (참고용, 실제 실행 횟수는 자유)", w.jsx("input", {
                    type: "number",
                    min: "0",
                    max: "10",
                    value: e.actionsPerRound,
                    disabled: s,
                    onChange: l => t({
                        actionsPerRound: Number(l.target.value) || 0
                    })
                })]
            })]
        }), w.jsx("div", {
            className: "field-grid boss-moves-grid",
            children: o.map((l, p) => w.jsxs("label", {
                children: ["기술 ", p + 1, w.jsx("input", {
                    list: "move-options",
                    value: l,
                    disabled: s,
                    onChange: c => n(p, c.target.value)
                })]
            }, p))
        })]
    })
}
const Kie = fQ.map(e => e.name).filter(Boolean),
    Zie = tn.moves.map(e => e.name).filter(Boolean),
    Vie = yQ.abilities.map(e => e.name).filter(Boolean),
    qie = tn.moves.filter(e => !ip(e.id)).map(e => e.name).filter(Boolean);
new Set(tn.moves.filter(e => ip(e.id)).map(e => e.name));

function Jie({
    value: e,
    onChange: t,
    disabled: s,
    className: a
}) {
    const [r, i] = X.useState(String(e ?? 0));
    X.useEffect(() => {
        i(String(e ?? 0))
    }, [e]);

    function n(l) {
        const p = l.target.value;
        if (i(p), p === "") return;
        const c = Number(p);
        Number.isNaN(c) || t(c)
    }

    function o() {
        (r === "" || Number.isNaN(Number(r))) && i(String(e ?? 0))
    }
    return w.jsx("input", {
        className: a,
        type: "text",
        inputMode: "numeric",
        value: r,
        disabled: s,
        onChange: n,
        onBlur: o
    })
}
const oc = [
        ["hp", "H"],
        ["atk", "A"],
        ["def", "B"],
        ["spa", "C"],
        ["spd", "D"],
        ["spe", "S"]
    ],
    lc = 508,
    _ie = 252;

function $ie({
    participant: e,
    onChange: t,
    onClear: s,
    disabled: a,
    alt: r,
    rowColor: i
}) {
    const n = e,
        o = n.id + 1,
        [l, p] = n.types && n.types.length ? n.types : ["Normal"],
        c = n.moves && n.moves.length ? n.moves : ["", "", "", ""],
        h = oc.reduce((P, [R]) => {
            var b;
            return P + (Number((b = n.evs) == null ? void 0 : b[R]) || 0)
        }, 0),
        d = h > lc;

    function m(P, R) {
        const b = [l, p].filter(Boolean);
        P === 0 ? b[0] = R : R ? b[1] = R : b.length = 1, t({
            types: b.filter(Boolean)
        })
    }

    function g(P, R) {
        const b = [...c];
        b[P] = R, t({
            moves: b
        })
    }
    return w.jsxs(w.Fragment, {
        children: [w.jsxs("tr", {
            className: `participant-row-main ${r?"row-alt":""} ${n.fainted?"row-fainted":""}`,
            style: i && i !== "transparent" ? {
                backgroundColor: i
            } : void 0,
            children: [w.jsx("td", {
                className: "col-index",
                rowSpan: 2,
                children: o
            }), w.jsx("td", {
                children: w.jsx("input", {
                    value: n.nickname,
                    placeholder: `참가자${o}`,
                    disabled: a,
                    onChange: P => t({
                        nickname: P.target.value
                    })
                })
            }), w.jsx("td", {
                children: w.jsx("input", {
                    list: "species-options",
                    value: n.pokemon || "",
                    placeholder: "포켓몬",
                    disabled: a,
                    onChange: P => t({
                        pokemon: P.target.value
                    })
                })
            }), w.jsx("td", {
                rowSpan: 2,
                children: w.jsx("button", {
                    type: "button",
                    disabled: a,
                    onClick: s,
                    children: "지우기"
                })
            })]
        }), w.jsx("tr", {
            className: `participant-row-moves ${r?"row-alt":""} ${n.fainted?"row-fainted":""}`,
            style: i && i !== "transparent" ? {
                backgroundColor: i
            } : void 0,
            children: w.jsx("td", {
                colSpan: 2,
                className: "moves-row-cell",
                children: w.jsxs("div", {
                    className: "participant-detail-lines",
                    children: [w.jsxs("div", {
                        className: "detail-line",
                        children: [w.jsx("span", {
                            className: "moves-row-label",
                            children: "조"
                        }), w.jsx("input", {
                            className: "col-narrow",
                            value: n.team || "",
                            placeholder: "조",
                            disabled: a,
                            onChange: P => t({
                                team: P.target.value
                            })
                        }), w.jsx("span", {
                            className: "moves-row-label",
                            children: "포지션"
                        }), w.jsxs("select", {
                            className: "position-select-sm",
                            value: n.position,
                            disabled: a,
                            onChange: P => t({
                                position: P.target.value
                            }),
                            children: [w.jsx("option", {
                                value: "",
                                children: "포지션 선택"
                            }), $ae.map(P => w.jsx("option", {
                                value: P,
                                children: P
                            }, P))]
                        }), w.jsx("span", {
                            className: "moves-row-label",
                            children: "성별"
                        }), w.jsxs("select", {
                            className: "gender-select-sm",
                            value: n.gender || "",
                            disabled: a,
                            onChange: P => t({
                                gender: P.target.value
                            }),
                            children: [w.jsx("option", {
                                value: "",
                                children: "불명"
                            }), w.jsx("option", {
                                value: "M",
                                children: "수컷"
                            }), w.jsx("option", {
                                value: "F",
                                children: "암컷"
                            })]
                        }), w.jsx("span", {
                            className: "moves-row-label",
                            children: "타입"
                        }), w.jsxs("div", {
                            className: "type-select-pair",
                            children: [w.jsx("select", {
                                value: l,
                                disabled: a,
                                onChange: P => m(0, P.target.value),
                                children: Ni.map(P => w.jsx("option", {
                                    value: P.en,
                                    children: P.ko
                                }, P.en))
                            }), w.jsxs("select", {
                                value: p || "",
                                disabled: a,
                                onChange: P => m(1, P.target.value),
                                children: [w.jsx("option", {
                                    value: "",
                                    children: "-"
                                }), Ni.map(P => w.jsx("option", {
                                    value: P.en,
                                    children: P.ko
                                }, P.en))]
                            })]
                        })]
                    }), w.jsxs("div", {
                        className: "detail-line",
                        children: [w.jsx("span", {
                            className: "moves-row-label",
                            children: "노력치"
                        }), oc.map(([P, R]) => {
                            var b, u;
                            return w.jsxs("label", {
                                className: "ev-stat-box",
                                children: [w.jsx("span", {
                                    className: "ev-stat-initial",
                                    children: R
                                }), w.jsx(Jie, {
                                    className: `ev-stat-input ${(Number((b=n.evs)==null?void 0:b[P])||0)>_ie?"ev-total-over":""}`,
                                    value: ((u = n.evs) == null ? void 0 : u[P]) ?? 0,
                                    disabled: a,
                                    onChange: y => t({
                                        evs: {
                                            ...n.evs,
                                            [P]: y
                                        }
                                    })
                                })]
                            }, P)
                        }), w.jsxs("span", {
                            className: `ev-total-inline ${d?"ev-total-over":""}`,
                            children: [h, "/", lc]
                        })]
                    }), w.jsxs("div", {
                        className: "detail-line",
                        children: [w.jsx("span", {
                            className: "moves-row-label",
                            children: "기술"
                        }), c.map((P, R) => w.jsx("input", {
                            className: "move-input-sm",
                            list: "participant-move-options",
                            value: P,
                            placeholder: `기술 ${R+1}`,
                            disabled: a,
                            onChange: b => g(R, b.target.value)
                        }, R))]
                    })]
                })
            })
        })]
    })
}
const Ut = "__unassigned__",
    Zr = ["rgba(91, 140, 255, 0.14)", "rgba(63, 206, 110, 0.14)", "rgba(240, 195, 60, 0.14)", "rgba(229, 72, 77, 0.14)", "rgba(201, 166, 255, 0.14)", "rgba(255, 157, 122, 0.14)", "rgba(80, 200, 200, 0.14)", "rgba(255, 121, 198, 0.14)"];

function Xie(e) {
    let t = 0;
    for (let s = 0; s < e.length; s += 1) t = t * 31 + e.charCodeAt(s) | 0;
    return Math.abs(t)
}

function WQ(e) {
    if (!e || e === Ut) return "transparent";
    const t = Number(e),
        s = Number.isFinite(t) ? Math.trunc(t) - 1 : Xie(String(e));
    return Zr[(s % Zr.length + Zr.length) % Zr.length]
}

function xi(e) {
    const t = new Map;
    e.forEach(a => {
        const r = a.team && String(a.team).trim() ? String(a.team).trim() : Ut;
        t.has(r) || t.set(r, []), t.get(r).push(a)
    });
    const s = Array.from(t.keys()).filter(a => a !== Ut).sort((a, r) => Number(a) - Number(r));
    return t.has(Ut) && s.push(Ut), s.map(a => ({
        key: a,
        members: t.get(a)
    }))
}

function Qie(e) {
    const t = e.filter(o => o.position),
        s = t.length,
        a = t.filter(o => o.position === "철벽").length,
        r = t.filter(o => o.position === "칼춤").length,
        i = t.filter(o => o.position === "도우미").length,
        n = [];
    return s > 0 && (a !== 1 && n.push(`철벽 ${a}명(권장 1명)`), i !== 1 && n.push(`도우미 ${i}명(권장 1명)`), (s < 4 || s > 6) && n.push(`총원 ${s}명(권장 4~6명)`)), {
        total: s,
        tankCount: a,
        swordCount: r,
        healerCount: i,
        warnings: n
    }
}

function pc({
    groups: e,
    onUpdate: t,
    onClear: s,
    disabled: a
}) {
    let r = 0;
    return w.jsx("div", {
        className: "table-wrap",
        children: w.jsxs("table", {
            className: "participant-table",
            children: [w.jsx("thead", {
                children: w.jsxs("tr", {
                    children: [w.jsx("th", {
                        children: "#"
                    }), w.jsx("th", {
                        children: "닉네임"
                    }), w.jsx("th", {
                        children: "포켓몬"
                    }), w.jsx("th", {})]
                })
            }), w.jsx("tbody", {
                children: e.map(({
                    key: i,
                    members: n,
                    showHeader: o = !0
                }) => {
                    const l = i === Ut,
                        p = WQ(i),
                        {
                            total: c,
                            tankCount: h,
                            swordCount: d,
                            healerCount: m,
                            warnings: g
                        } = Qie(n);
                    return w.jsxs(X.Fragment, {
                        children: [o && w.jsx("tr", {
                            className: "team-header-row",
                            children: w.jsx("td", {
                                colSpan: 4,
                                children: l ? w.jsxs("span", {
                                    children: ["조 미배정 (", n.length, "자리)"]
                                }) : w.jsxs(w.Fragment, {
                                    children: [w.jsxs("strong", {
                                        children: [i, "조"]
                                    }), c > 0 && w.jsxs("span", {
                                        className: "team-summary",
                                        children: [" ", "· 철벽 ", h, " · 칼춤 ", d, " · 도우미 ", m, " · 총 ", c, "명", " ", g.length > 0 ? w.jsxs("span", {
                                            className: "team-warning",
                                            children: ["⚠ ", g.join(", ")]
                                        }) : w.jsx("span", {
                                            className: "team-ok",
                                            children: "✓ 구성 정상"
                                        })]
                                    })]
                                })
                            })
                        }), n.map(P => {
                            const R = r % 2 === 1;
                            return r += 1, w.jsx($ie, {
                                participant: P,
                                disabled: a,
                                alt: R,
                                rowColor: p,
                                onChange: b => t(P.id, b),
                                onClear: () => s(P.id)
                            }, P.id)
                        })]
                    }, i)
                })
            })]
        })
    })
}

function Yie({
    participants: e,
    onUpdate: t,
    onClear: s,
    disabled: a
}) {
    const r = xi(e);
    let i, n;
    if (r.length > 1) {
        const o = Math.ceil(r.length / 2);
        i = r.slice(0, o), n = r.slice(o)
    } else {
        const o = r.length === 1 ? r[0].key : Ut,
            l = Math.ceil(e.length / 2);
        i = [{
            key: o,
            members: e.slice(0, l),
            showHeader: !1
        }], n = [{
            key: o,
            members: e.slice(l),
            showHeader: !1
        }]
    }
    return w.jsxs("div", {
        className: "participant-tables-grid",
        children: [w.jsx(pc, {
            groups: i,
            onUpdate: t,
            onClear: s,
            disabled: a
        }), n.length > 0 && w.jsx(pc, {
            groups: n,
            onUpdate: t,
            onClear: s,
            disabled: a
        })]
    })
}

function ene(e) {
    const t = new Map;
    return e.forEach(s => {
        const a = s.team && String(s.team).trim() ? String(s.team).trim() : null;
        !a || !s.position || t.set(a, (t.get(a) || 0) + 1)
    }), Array.from(t.entries()).sort((s, a) => Number(s[0]) - Number(a[0])).map(([s, a]) => ({
        team: s,
        count: a
    }))
}

function tne({
    maxRounds: e,
    setMaxRounds: t,
    participants: s,
    selectedTeam: a,
    setSelectedTeam: r,
    battle: i,
    onStart: n,
    onReset: o,
    onExport: l,
    onImportFile: p
}) {
    const c = X.useRef(null),
        h = ene(s || []);

    function d(m) {
        var R;
        const g = (R = m.target.files) == null ? void 0 : R[0];
        if (!g) return;
        const P = new FileReader;
        P.onload = () => p(String(P.result)), P.readAsText(g), m.target.value = ""
    }
    return i ? w.jsx("div", {
        className: "button-row",
        children: w.jsx("button", {
            type: "button",
            onClick: o,
            children: "리셋"
        })
    }) : w.jsxs("section", {
        className: "panel controls-panel",
        children: [w.jsx("h2", {
            children: "전투 컨트롤"
        }), w.jsxs("div", {
            className: "field-grid",
            children: [w.jsxs("label", {
                children: ["최대 라운드 (규칙상 기본 6라운드)", w.jsx("input", {
                    type: "number",
                    min: "1",
                    max: "500",
                    value: e,
                    onChange: m => t(Number(m.target.value) || 6)
                })]
            }), w.jsxs("label", {
                children: ["전투에 참여할 조", w.jsxs("select", {
                    value: a,
                    onChange: m => r(m.target.value),
                    children: [w.jsx("option", {
                        value: "",
                        children: "전체 참가자 (조 구분 없이)"
                    }), h.map(({
                        team: m,
                        count: g
                    }) => w.jsxs("option", {
                        value: m,
                        children: [m, "조 (", g, "명)"]
                    }, m))]
                })]
            })]
        }), a === "" && h.length > 0 && w.jsx("p", {
            className: "hint",
            children: "조를 선택하지 않으면 배정된 조 구분 없이 참가자 전원이 함께 전투에 참여합니다."
        }), w.jsxs("div", {
            className: "button-row",
            children: [w.jsx("button", {
                type: "button",
                className: "btn-primary",
                onClick: n,
                children: "전투 시작"
            }), w.jsx("button", {
                type: "button",
                onClick: l,
                children: "설정 내보내기 (JSON)"
            }), w.jsx("button", {
                type: "button",
                onClick: () => {
                    var m;
                    return (m = c.current) == null ? void 0 : m.click()
                },
                children: "설정 불러오기 (JSON)"
            }), w.jsx("input", {
                ref: c,
                type: "file",
                accept: "application/json",
                hidden: !0,
                onChange: d
            })]
        })]
    })
}
const sne = ["adjacentAlly", "adjacentAllyOrSelf"];

function Vr(e) {
    const t = xe.getMove(e);
    return t ? t.target === "allAdjacent" || t.target === "allAdjacentFoes" ? `${t.name} (범위)` : t.name : e
}

function hc(e, t) {
    var s;
    return ((s = (sn[e] || []).find(a => a.id === t)) == null ? void 0 : s.name) || t
}

function cc(e, t, s) {
    if (!e) return 0;
    if (e.kind === "cheer") return lp;
    const a = xe.getMove(e.moveId);
    return ((a == null ? void 0 : a.priority) ?? 0) + FQ(t, a, s)
}

function ane({
    raid: e
}) {
    var D, v;
    const {
        battle: t,
        queue: s
    } = e, [a, r] = X.useState(null), [i, n] = X.useState(null), [o, l] = X.useState("");
    X.useEffect(() => {
        n(null), l("")
    }, [t == null ? void 0 : t.round]), X.useEffect(() => {
        if (!t || t.status !== "ongoing") return;
        const S = xi(t.participants.filter(Boolean));
        S.length === 1 ? r(H => H === S[0].key ? H : S[0].key) : a && !S.some(H => H.key === a) && r(null)
    }, [t, a]);
    const p = X.useMemo(() => {
            if (!t) return [];
            const S = wQ(t),
                H = [];
            return Object.entries(s.participants).forEach(([B, M]) => {
                const z = t.participants.find(L => L && L.id === Number(B));
                z && H.push({
                    key: `p-${B}`,
                    who: z.nickname,
                    detail: M.kind === "cheer" ? `응원 · ${hc(z.position,M.cheerId)}` : Vr(M.moveId),
                    priority: cc(M, z, t),
                    speed: Yo(t, z),
                    isBoss: !1
                })
            }), s.boss.forEach((B, M) => {
                H.push({
                    key: `b-${M}`,
                    who: t.boss.nickname,
                    detail: Vr(B.moveId),
                    priority: cc(B, t.boss, t),
                    speed: Yo(t, t.boss),
                    isBoss: !0
                })
            }), H.sort((B, M) => M.priority - B.priority || (S ? B.speed - M.speed : M.speed - B.speed)), H.map((B, M) => {
                const z = H[M - 1],
                    L = H[M + 1],
                    j = F => F && F.priority === B.priority && F.speed === B.speed;
                return {
                    ...B,
                    tie: j(z) || j(L)
                }
            })
        }, [t, s]),
        c = X.useMemo(() => t ? DQ(t) : [], [t]);
    if (!t || t.status !== "ongoing") return null;
    const h = t.round + 1,
        d = Math.max(1, Number((D = t.boss) == null ? void 0 : D.actionsPerRound) || 2),
        m = xi(t.participants.filter(Boolean)),
        g = ((v = m.find(S => S.key === a)) == null ? void 0 : v.members) ?? [],
        P = g.filter(S => !S.fainted),
        R = a ? ere({
            ...t,
            participants: g
        }) : [],
        b = i ? xe.getMove(i.moveId) : null,
        u = (b == null ? void 0 : b.target) === "adjacentAllyOrSelf",
        y = Object.keys(s.participants).length + s.boss.length;

    function f(S, H) {
        const B = xe.getMove(H);
        if (B && sne.includes(B.target)) {
            n({
                participantId: S.id,
                moveId: H
            });
            return
        }
        e.queueParticipantAction(S.id, {
            kind: "move",
            moveId: H
        }), n(null)
    }

    function E(S) {
        i && (e.queueParticipantAction(i.participantId, {
            kind: "move",
            moveId: i.moveId,
            targetParticipantId: S
        }), n(null))
    }

    function k(S, H) {
        e.queueParticipantAction(S.id, {
            kind: "cheer",
            cheerId: H
        }), n(null)
    }

    function U(S) {
        !o || s.boss.length >= d || e.queueBossAction({
            moveId: S,
            targetId: o === "random" ? "random" : Number(o)
        })
    }
    const G = (t.boss.moves || []).filter(Boolean);
    return w.jsxs("section", {
        className: "panel planner-panel",
        children: [w.jsxs("h2", {
            children: [h, "라운드 진행 중"]
        }), c.length > 0 && w.jsx("div", {
            className: "turn-order-line",
            title: "현재 걸려 있는 날씨/필드/트릭룸/사이드 컨디션 (남은 턴)",
            children: c.map((S, H) => w.jsxs("span", {
                children: [H > 0 && w.jsx("span", {
                    className: "turn-order-sep",
                    children: "·"
                }), w.jsx("span", {
                    className: "turn-order-entry",
                    children: S.text
                })]
            }, H))
        }), m.length > 1 ? w.jsx("div", {
            className: "round-team-select",
            children: w.jsxs("label", {
                children: ["진행할 조", w.jsxs("select", {
                    value: a ?? "",
                    onChange: S => r(S.target.value || null),
                    children: [w.jsx("option", {
                        value: "",
                        children: "조 선택"
                    }), m.map(S => w.jsxs("option", {
                        value: S.key,
                        children: [S.key === Ut ? "조 미배정" : `${S.key}조`, " (", S.members.length, "명)"]
                    }, S.key))]
                }), a && w.jsx("span", {
                    className: "plan-hint",
                    style: {
                        margin: 0
                    },
                    children: "이후 라운드에도 이 조로 고정됩니다"
                })]
            })
        }) : null, !a && m.length > 1 && w.jsx("p", {
            className: "plan-hint",
            children: "진행할 조를 선택하세요. (한 번 고르면 이후 라운드에도 유지됩니다)"
        }), a && w.jsxs(w.Fragment, {
            children: [w.jsx("div", {
                className: "turn-order-line",
                title: "스피드 참고용(랭크·마비·우선도 미반영). 실제 처리 순서는 아래 '처리 예정 순서'를 따른다.",
                children: R.map((S, H) => w.jsxs("span", {
                    children: [H > 0 && w.jsx("span", {
                        className: "turn-order-sep",
                        children: "-"
                    }), w.jsx("span", {
                        className: `turn-order-entry ${S.isBoss?"turn-order-boss":""} ${S.fainted?"turn-order-fainted":""}`,
                        children: S.label
                    })]
                }, S.key))
            }), w.jsxs("p", {
                className: "plan-hint",
                children: ["기술/응원을 누르면 바로 처리하지 않고 ", w.jsx("b", {
                    children: "예약"
                }), "만 합니다. 참가자·보스 예약을 마친 뒤 아래", w.jsx("b", {
                    children: " “우선도 순으로 일괄 처리” "
                }), "를 누르면 우선도 → 스피드(성격·랭크·마비 반영) → 랜덤(동점) 순으로 한 번에 처리합니다. 응원 우선도는 +", lp, ", 보스는 라운드당 ", d, "번까지 예약할 수 있습니다."]
            }), w.jsxs("div", {
                className: "planner-columns",
                children: [w.jsxs("div", {
                    className: "planner-column",
                    children: [w.jsx("h3", {
                        children: "참가자 예약"
                    }), P.length === 0 && w.jsx("p", {
                        className: "plan-hint",
                        children: "이 조에 행동 가능한 참가자가 없습니다."
                    }), P.map(S => {
                        var F;
                        const H = t.actedParticipantIds.includes(S.id),
                            B = s.participants[S.id],
                            M = sn[S.position] || [],
                            z = rp - (S.cheerUsed || 0),
                            L = (i == null ? void 0 : i.participantId) === S.id,
                            j = P.filter(T => u || T.id !== S.id);
                        return w.jsxs("div", {
                            className: "action-picker",
                            children: [w.jsxs("p", {
                                className: "plan-hint",
                                children: [w.jsx("b", {
                                    children: S.nickname
                                }), S.position ? ` (${S.position})` : ""]
                            }), H ? w.jsx("p", {
                                className: "plan-hint",
                                children: "이번 라운드에 이미 행동했습니다."
                            }) : B ? w.jsxs("div", {
                                className: "button-grid",
                                children: [w.jsxs("span", {
                                    className: "turn-order-entry",
                                    children: ["예약: ", B.kind === "cheer" ? `응원 · ${hc(S.position,B.cheerId)}` : Vr(B.moveId), B.targetParticipantId != null ? ` → ${((F=t.participants.find(T=>T&&T.id===B.targetParticipantId))==null?void 0:F.nickname)||""}` : ""]
                                }), w.jsx("button", {
                                    type: "button",
                                    onClick: () => e.unqueueParticipantAction(S.id),
                                    children: "취소"
                                })]
                            }) : w.jsxs(w.Fragment, {
                                children: [w.jsxs("div", {
                                    className: "button-grid",
                                    children: [(S.moves || []).length === 0 && w.jsx("span", {
                                        className: "plan-hint",
                                        children: "등록된 기술이 없습니다."
                                    }), (S.moves || []).map((T, I) => w.jsx("button", {
                                        type: "button",
                                        className: L && i.moveId === T ? "btn-primary" : void 0,
                                        onClick: () => f(S, T),
                                        children: T
                                    }, I)), M.map(T => w.jsxs("button", {
                                        type: "button",
                                        className: "btn-cheer",
                                        title: T.desc,
                                        disabled: z <= 0,
                                        onClick: () => k(S, T.id),
                                        children: [T.name, " (남은 ", z, ")"]
                                    }, T.id))]
                                }), L && w.jsxs(w.Fragment, {
                                    children: [w.jsxs("p", {
                                        className: "plan-hint",
                                        children: [(b == null ? void 0 : b.name) || i.moveId, "의 대상 선택", u ? " (자신 포함)" : ""]
                                    }), w.jsxs("div", {
                                        className: "button-grid",
                                        children: [j.length === 0 && w.jsx("span", {
                                            className: "plan-hint",
                                            children: "지정할 수 있는 아군이 없습니다."
                                        }), j.map(T => w.jsxs("button", {
                                            type: "button",
                                            onClick: () => E(T.id),
                                            children: [T.nickname, T.id === S.id ? " (자신)" : ""]
                                        }, T.id)), w.jsx("button", {
                                            type: "button",
                                            onClick: () => n(null),
                                            children: "취소"
                                        })]
                                    })]
                                })]
                            })]
                        }, S.id)
                    })]
                }), w.jsxs("div", {
                    className: "planner-column",
                    children: [w.jsxs("h3", {
                        children: ["보스 예약 (", s.boss.length, "/", d, ")"]
                    }), w.jsxs("select", {
                        value: o,
                        onChange: S => l(S.target.value),
                        children: [w.jsx("option", {
                            value: "",
                            children: "대상 선택"
                        }), w.jsx("option", {
                            value: "random",
                            children: "랜덤"
                        }), P.map(S => w.jsx("option", {
                            value: S.id,
                            children: S.nickname
                        }, S.id))]
                    }), w.jsxs("div", {
                        className: "button-grid",
                        children: [G.length === 0 && w.jsx("span", {
                            className: "plan-hint",
                            children: "보스 기술이 등록되지 않았습니다."
                        }), G.map((S, H) => w.jsx("button", {
                            type: "button",
                            disabled: !o || s.boss.length >= d,
                            onClick: () => U(S),
                            children: S
                        }, H))]
                    }), s.boss.length > 0 && w.jsx("div", {
                        className: "button-grid",
                        children: s.boss.map((S, H) => {
                            var M;
                            const B = S.targetId === "random" ? "랜덤" : ((M = t.participants.find(z => z && z.id === S.targetId)) == null ? void 0 : M.nickname) || "?";
                            return w.jsxs("span", {
                                className: "turn-order-entry",
                                children: [Vr(S.moveId), " → ", B, w.jsx("button", {
                                    type: "button",
                                    style: {
                                        marginLeft: 6
                                    },
                                    onClick: () => e.unqueueBossAction(H),
                                    children: "x"
                                })]
                            }, H)
                        })
                    }), w.jsx("p", {
                        className: "plan-hint",
                        children: "무료 행동 (턴 소모 없음, 테라레이드형 · 즉시 반영)"
                    }), w.jsxs("div", {
                        className: "button-grid",
                        children: [w.jsx("button", {
                            type: "button",
                            className: "btn-free-action",
                            onClick: e.runResetFieldBoosts,
                            children: "필드 랭크 초기화"
                        }), w.jsx("button", {
                            type: "button",
                            className: "btn-free-action",
                            onClick: e.runCureBossStatus,
                            children: "자신 상태이상 회복"
                        }), w.jsx("button", {
                            type: "button",
                            className: "btn-free-action",
                            onClick: e.runClearFieldConditions,
                            children: "날씨·필드·사이드 효과 제거"
                        })]
                    })]
                })]
            }), p.length > 0 && w.jsx("div", {
                className: "turn-order-line",
                title: "우선도 → 실효 스피드(성격·랭크·마비) 순. 완전 동점은 처리 시 랜덤.",
                children: p.map((S, H) => w.jsxs("span", {
                    children: [H > 0 && w.jsx("span", {
                        className: "turn-order-sep",
                        children: "-"
                    }), w.jsxs("span", {
                        className: `turn-order-entry ${S.isBoss?"turn-order-boss":""}`,
                        children: [S.who, w.jsxs("span", {
                            className: "plan-hint",
                            style: {
                                margin: "0 0 0 4px",
                                display: "inline"
                            },
                            children: [S.detail, " · 우선도 ", S.priority, " · 속도 ", S.speed, S.tie ? " · 동점(랜덤)" : ""]
                        })]
                    })]
                }, S.key))
            }), w.jsxs("div", {
                className: "round-end-row",
                children: [w.jsx("button", {
                    type: "button",
                    onClick: e.clearQueue,
                    disabled: y === 0,
                    children: "예약 비우기"
                }), w.jsxs("button", {
                    type: "button",
                    className: "btn-primary",
                    onClick: e.runResolveQueue,
                    disabled: y === 0,
                    children: ["우선도 순으로 일괄 처리 (", y, ")"]
                }), w.jsxs("button", {
                    type: "button",
                    className: "btn-primary",
                    onClick: e.runEndRound,
                    children: [h, "라운드 종료하고 다음 라운드로"]
                })]
            })]
        })]
    })
}

function mc({
    current: e,
    max: t,
    label: s
}) {
    const a = t > 0 ? Math.max(0, Math.min(100, e / t * 100)) : 0,
        r = a > 50 ? "hp-high" : a > 20 ? "hp-mid" : "hp-low";
    return w.jsxs("div", {
        className: "hp-bar",
        children: [s && w.jsx("div", {
            className: "hp-bar-label",
            children: s
        }), w.jsx("div", {
            className: "hp-bar-track",
            children: w.jsx("div", {
                className: `hp-bar-fill ${r}`,
                style: {
                    width: `${a}%`
                }
            })
        }), w.jsxs("div", {
            className: "hp-bar-text",
            children: [e, " / ", t]
        })]
    })
}

function rne(e) {
    const t = [];
    if (e.status) {
        const s = Za[e.status] || e.status;
        t.push({
            text: e.status === "slp" && e.sleepTurns > 0 ? `${s} ${e.sleepTurns}` : s,
            kind: "status"
        })
    }
    return e.confusionTurns > 0 && t.push({
        text: "혼란",
        kind: "status"
    }), e.leechSeed && t.push({
        text: "씨뿌리기",
        kind: "status"
    }), e.bindTurns > 0 && t.push({
        text: "조이기",
        kind: "status"
    }), e.tauntTurns > 0 && t.push({
        text: "도발",
        kind: "status"
    }), e.encoreTurns > 0 && t.push({
        text: "앵콜",
        kind: "status"
    }), e.tormentActive && t.push({
        text: "트집",
        kind: "status"
    }), e.healBlockTurns > 0 && t.push({
        text: "회복봉인",
        kind: "status"
    }), e.attractActive && t.push({
        text: "헤롱헤롱",
        kind: "status"
    }), e.disableTurns > 0 && t.push({
        text: "사슬묶임",
        kind: "status"
    }), e.flinched && t.push({
        text: "풀죽음",
        kind: "status"
    }), e.drowsyTurns > 0 && t.push({
        text: "하품",
        kind: "status"
    }), e.aquaRing && t.push({
        text: "아쿠아링"
    }), e.ingrain && t.push({
        text: "뿌리내림"
    }), e.substitute && t.push({
        text: `대타 ${e.substitute.hp}`
    }), e.chargingMove && t.push({
        text: "충전중",
        kind: "status"
    }), e.mustRecharge && t.push({
        text: "재충전",
        kind: "status"
    }), e.protectedThisRound && t.push({
        text: "방어"
    }), e.enduringThisRound && t.push({
        text: "버티기"
    }), Object.entries(e.boosts || {}).forEach(([s, a]) => {
        a && t.push({
            text: `${kQ[s]||s}${a>0?"+":""}${a}`
        })
    }), e.redirectActive && t.push({
        text: "보호중"
    }), e.mustSkipTurn && t.push({
        text: "행동불가"
    }), e.cheerUsed > 0 && t.push({
        text: `응원 ${e.cheerUsed}/${rp}`
    }), t
}

function dc({
    pokemon: e
}) {
    const t = rne(e);
    return t.length === 0 ? null : w.jsx("div", {
        className: "condition-badges",
        children: t.map((s, a) => w.jsx("span", {
            className: `badge ${s.kind==="status"?"badge-status":""}`,
            children: s.text
        }, a))
    })
}

function ine({
    battle: e
}) {
    if (!e) return null;
    const t = xi(e.participants.filter(Boolean)),
        s = DQ(e);
    return w.jsxs("section", {
        className: "panel status-panel",
        children: [w.jsx("h2", {
            children: "전투 현황"
        }), s.length > 0 && w.jsx("div", {
            className: "condition-badges",
            children: s.map((a, r) => w.jsx("span", {
                className: "badge badge-status",
                children: a.text
            }, r))
        }), w.jsx(mc, {
            current: e.boss.currentHP,
            max: e.boss.maxHP,
            label: `보스: ${e.boss.nickname}`
        }), w.jsx(dc, {
            pokemon: e.boss
        }), w.jsx("div", {
            className: "status-team-columns",
            children: t.map(({
                key: a,
                members: r
            }) => w.jsxs("div", {
                className: "status-team-column",
                style: a !== Ut ? {
                    backgroundColor: WQ(a)
                } : void 0,
                children: [t.length > 1 && w.jsx("div", {
                    className: "status-team-label",
                    children: a === Ut ? "조 미배정" : `${a}조`
                }), w.jsx("div", {
                    className: "status-team-members",
                    children: r.map(i => w.jsxs("div", {
                        className: `participant-hp-card ${i.fainted?"fainted":""}`,
                        children: [w.jsx(mc, {
                            current: i.currentHP,
                            max: i.maxHP,
                            label: i.nickname
                        }), w.jsx(dc, {
                            pokemon: i
                        })]
                    }, i.id))
                })]
            }, a))
        })]
    })
}

function nne({
    entries: e
}) {
    const t = X.useRef(null);
    return X.useEffect(() => {
        var s;
        (s = t.current) == null || s.scrollIntoView({
            block: "end"
        })
    }, [e.length]), w.jsxs("section", {
        className: "panel log-panel",
        children: [w.jsx("h2", {
            children: "전투 로그"
        }), w.jsxs("div", {
            className: "battle-log",
            children: [e.length === 0 && w.jsx("div", {
                className: "log-empty",
                children: "아직 로그가 없습니다. 전투를 시작하세요."
            }), e.map((s, a) => w.jsx("div", {
                className: `log-entry log-${s.phase}`,
                children: s.text
            }, a)), w.jsx("div", {
                ref: t
            })]
        })]
    })
}
const one = {
    ongoing: "진행 중",
    win: "참가자 승리 (보스 처치)",
    loss: "보스 승리 (참가자 전멸)",
    timeout: "레이드 실패 (최대 라운드 내 처치 실패)"
};

function lne({
    battle: e
}) {
    const t = e.boss.maxHP - e.boss.currentHP,
        s = e.participants.filter(r => r && r.fainted).length,
        a = e.participants.filter(r => r && !r.fainted).length;
    return w.jsxs("section", {
        className: "panel result-panel",
        children: [w.jsx("h2", {
            children: "결과"
        }), w.jsxs("div", {
            className: "result-grid",
            children: [w.jsxs("div", {
                children: ["상태: ", w.jsx("strong", {
                    children: one[e.status] || e.status
                })]
            }), w.jsxs("div", {
                children: ["진행 라운드: ", e.round]
            }), w.jsxs("div", {
                children: ["보스 누적 데미지: ", t, " / ", e.boss.maxHP]
            }), w.jsxs("div", {
                children: ["기절한 참가자: ", s, "명 · 생존: ", a, "명"]
            })]
        })]
    })
}

function pne() {
    const e = Lie(),
        t = !!e.battle,
        [s, a] = X.useState(5);

    function r(o) {
        const l = e.importDraft(o);
        l.ok || window.alert(`불러오기 실패: ${l.error}`)
    }

    function i() {
        window.confirm("현재 참가자 명단을 고정 명단으로 덮어씁니다. 계속할까요?") && e.loadDefaultRoster()
    }

    function n() {
        const {
            teamCount: o,
            leftoverCount: l
        } = e.autoAssignTeams(s);
        if (o === 0) {
            window.alert("철벽/칼춤/도우미 인원 조합으로 조를 하나도 만들 수 없습니다. 포지션을 먼저 지정해주세요.");
            return
        }
        window.alert(`${o}개 조를 구성했습니다.${l>0?` (조에 못 들어간 인원 ${l}명은 미배정으로 남았습니다)`:""}`)
    }
    return w.jsxs("div", {
        className: "app-shell",
        children: [w.jsxs("header", {
            className: "app-header",
            children: [w.jsx("h1", {
                children: "레이드 데미지 계산기"
            }), w.jsxs("p", {
                className: "app-subtitle",
                children: ["쇼다운 데미지 공식 기반 · 보스 1마리 vs 참가자 최대 ", Js, "명"]
            })]
        }), w.jsxs("div", {
            className: t ? "layout-grid" : "",
            children: [w.jsxs("div", {
                className: "layout-main",
                children: [!t && w.jsxs(w.Fragment, {
                    children: [w.jsx(Wie, {
                        boss: e.boss,
                        onChange: e.updateBoss,
                        disabled: t
                    }), w.jsxs("section", {
                        className: "panel",
                        children: [w.jsxs("h2", {
                            children: ["참가자 (최대 ", Js, "명)"]
                        }), w.jsx("p", {
                            className: "hint",
                            children: '빈 슬롯(포지션 미입력)은 전투에서 자동으로 제외됩니다. 참가자는 레벨 50 · 성격 하드 · 도구 없음 · 종족값 100 · 개체값 31로 고정되고, 노력치(기초 포인트)는 참가자별로 직접 입력합니다(최대 스탯당 252 / 합계 508). 포지션(철벽/칼춤/도우미)을 선택하면 전투 중 응원 스킬을 사용할 수 있습니다. "조" 번호를 매기면 규칙 III장의 철벽1·칼춤3·도우미1(4~6명) 조 구성으로 그룹핑되고, 전투 시작 시 조 단위로 골라 진행할 수 있습니다.'
                        }), w.jsxs("div", {
                            className: "add-row team-tools",
                            children: [w.jsx("button", {
                                type: "button",
                                onClick: i,
                                children: "고정 명단 불러오기"
                            }), w.jsxs("label", {
                                className: "inline-field",
                                children: ["조당 인원", w.jsx("input", {
                                    type: "number",
                                    min: "3",
                                    max: "24",
                                    value: s,
                                    onChange: o => a(Number(o.target.value) || 5)
                                })]
                            }), w.jsx("button", {
                                type: "button",
                                onClick: n,
                                children: "포지션 조합대로 조 자동 배정"
                            })]
                        }), w.jsx("p", {
                            className: "hint",
                            children: "조 자동 배정은 슬롯 순서가 아니라 포지션 조합(철벽1·도우미1·나머지 칼춤) 기준으로 배정합니다. 조합이 안 맞아 남는 인원은 미배정으로 남으니 수동으로 조정하세요."
                        }), w.jsx(Yie, {
                            participants: e.participants,
                            onUpdate: e.updateParticipant,
                            onClear: e.clearParticipant,
                            disabled: t
                        })]
                    })]
                }), w.jsx(tne, {
                    maxRounds: e.maxRounds,
                    setMaxRounds: e.setMaxRounds,
                    participants: e.participants,
                    selectedTeam: e.selectedTeam,
                    setSelectedTeam: e.setSelectedTeam,
                    battle: e.battle,
                    onStart: e.startBattle,
                    onReset: e.resetBattle,
                    onExport: e.exportDraft,
                    onImportFile: r
                }), w.jsx(ane, {
                    raid: e
                }), w.jsx(ine, {
                    battle: e.battle
                }), e.battle && w.jsx(lne, {
                    battle: e.battle
                })]
            }), e.battle && w.jsx("div", {
                className: "layout-side",
                children: w.jsx(nne, {
                    entries: e.battle.log
                })
            })]
        }), w.jsx("datalist", {
            id: "species-options",
            children: Kie.map((o, l) => w.jsx("option", {
                value: o
            }, `${o}-${l}`))
        }), w.jsx("datalist", {
            id: "ability-options",
            children: Vie.map((o, l) => w.jsx("option", {
                value: o
            }, `${o}-${l}`))
        }), w.jsx("datalist", {
            id: "move-options",
            children: Zie.map((o, l) => w.jsx("option", {
                value: o
            }, `${o}-${l}`))
        }), w.jsx("datalist", {
            id: "participant-move-options",
            children: qie.map((o, l) => w.jsx("option", {
                value: o
            }, `${o}-${l}`))
        })]
    })
}
Ln.createRoot(document.getElementById("root")).render(w.jsx(fY.StrictMode, {
    children: w.jsx(pne, {})
