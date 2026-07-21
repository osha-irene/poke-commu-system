import { useEffect, useRef, useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { get, onChildAdded, onChildChanged, onChildRemoved, ref, set } from 'firebase/database';
import { auth, database } from '../../firebase';
import itemsData from '../../data/items.json';
import { getAbilityEnglishName } from '../../utils/abilityUtils';
import { preloadDecodedImage } from '../../utils/imageCache';
import { toMemberSummary, toMemberSummaryMap, toMemberParty, toMemberPartyMap } from '../../utils/memberViewData';
import { DEFAULT_IVS, withNormalizedIVs } from '../../utils/pokemonIndividualValues';
import { fillMissingBaseStats, findPokemonTemplate } from '../../utils/pokemonBaseStats';

// 임시 RTDB 다운로드 측정용 로그. 6GB/일 다운로드 원인을 경로별로 확인하려는 목적이라
// 원인 파악이 끝나면 이 함수와 호출부는 지워도 된다.
const logRtdbDownload = (label, val) => {
  try {
    const bytes = new Blob([JSON.stringify(val ?? null)]).size;
    console.log(`[RTDB 다운로드 측정] ${label}: ${(bytes / 1024).toFixed(1)}KB`);
  } catch {
    // 측정 실패는 무시 - 로깅이 실제 기능에 영향을 주면 안 됨
  }
};

const normalizePokemonArray = (value) => {
  if (!value) return [null, null, null, null, null, null];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    const numericKeys = Object.keys(value).map(Number).filter(Number.isFinite);
    if (numericKeys.length === 0) return [null, null, null, null, null, null];
    const maxIndex = Math.max(...numericKeys);
    return Array.from({ length: Math.max(6, maxIndex + 1) }, (_, i) => value[i] ?? null);
  }
  return value;
};

// memberSummary: 이름/프로필/요약 등 가벼운 필드 - 모든 로그인 유저에게 항상 실시간 구독됨.
// memberParty: caughtPokemon/partnerPokemon(스탯·기술·IV 등 상세) - 용량이 커서
// 멤버/NPC 탭을 보고 있는 클라이언트만(loadPartyDetails=true) 구독한다. 이렇게 나누지 않으면
// 누군가 포켓몬을 잡거나 파티를 바꿀 때마다 접속자 전원에게 그 상세 데이터가 재전송된다.
export const useMembers = (allPokemonData, loadFullMembers = false, loadPartyDetails = false) => {
  const [members, setMembers] = useState({});
  const [memberSummaries, setMemberSummaries] = useState({});
  const [memberParties, setMemberParties] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const seededMemberViewDataRef = useRef(false);
  const memberSummariesRef = useRef({});
  const memberPartiesRef = useRef({});

  useEffect(() => {
    memberSummariesRef.current = memberSummaries;
  }, [memberSummaries]);

  useEffect(() => {
    memberPartiesRef.current = memberParties;
  }, [memberParties]);

  useEffect(() => {
    if (!loadFullMembers) {
      return undefined;
    }

    const normalizeMemberEntry = (userId, member = {}) => {
      const caughtPokemon = normalizePokemonArray(member.caughtPokemon).map((pokemon) => {
        if (!pokemon) return pokemon;

        const template = findPokemonTemplate(pokemon, allPokemonData);
        if (!template) return withNormalizedIVs(pokemon, DEFAULT_IVS);

        return withNormalizedIVs(fillMissingBaseStats({
          ...pokemon,
          nameEn: pokemon.nameEn || template.nameEn,
          // abilityEn is the canonical saved value. Falling back to the localized
          // ability first could resurrect the pre-patch ability in admin views.
          abilityEn: pokemon.abilityEn || getAbilityEnglishName(pokemon.ability) || template.abilitiesEn?.[0] || null
        }, template), DEFAULT_IVS);
      });

      return {
        ...member,
        id: userId,
        caughtPokemon,
        partnerPokemon: withNormalizedIVs(member.partnerPokemon, DEFAULT_IVS)
      };
    };

    const normalizeMembers = (rawMembers = {}) => {
      const normalized = {};
      Object.keys(rawMembers).forEach((userId) => {
        normalized[userId] = normalizeMemberEntry(userId, rawMembers[userId] || {});
      });
      return normalized;
    };

    const membersRef = ref(database, 'members');
    let isInitialLoad = true;

    get(membersRef)
      .then(async (snapshot) => {
        if (!snapshot.exists()) {
          const createdMembers = await createInitialMembersWithAuth();
          setMembers(createdMembers);
          await set(ref(database, 'memberSummary'), toMemberSummaryMap(createdMembers));
          await set(ref(database, 'memberParty'), toMemberPartyMap(createdMembers));
          return;
        }

        const normalized = normalizeMembers(snapshot.val());
        logRtdbDownload('members (전체 최초 로드)', snapshot.val());
        Object.values(normalized).forEach((member) => {
          preloadDecodedImage(member?.profileImageThumb);
          preloadDecodedImage(member?.profileImage);
          preloadDecodedImage(member?.profileImageFull);
          preloadDecodedImage(member?.profileImageUrl);
        });

        setMembers((prev) => (
          JSON.stringify(prev) === JSON.stringify(normalized) ? prev : normalized
        ));

        const nextSummary = toMemberSummaryMap(normalized);
        if (JSON.stringify(memberSummariesRef.current) !== JSON.stringify(nextSummary)) {
          await set(ref(database, 'memberSummary'), nextSummary);
        }

        const nextParty = toMemberPartyMap(normalized);
        if (JSON.stringify(memberPartiesRef.current) !== JSON.stringify(nextParty)) {
          await set(ref(database, 'memberParty'), nextParty);
        }
      })
      .catch((error) => {
        console.error('Member data load failed:', error);
        setMembers({});
      })
      .finally(() => {
        isInitialLoad = false;
        setIsLoading(false);
      });

    const upsertMember = async (snapshot) => {
      if (isInitialLoad || !snapshot.exists()) return;
      logRtdbDownload(`members/${snapshot.key} (변경분 재전송)`, snapshot.val());
      const normalizedMember = normalizeMemberEntry(snapshot.key, snapshot.val() || {});
      preloadDecodedImage(normalizedMember?.profileImageThumb);
      preloadDecodedImage(normalizedMember?.profileImage);
      preloadDecodedImage(normalizedMember?.profileImageFull);
      preloadDecodedImage(normalizedMember?.profileImageUrl);
      setMembers(prev => ({
        ...prev,
        [snapshot.key]: normalizedMember
      }));
      try {
        await set(ref(database, `memberSummary/${snapshot.key}`), toMemberSummary(normalizedMember, snapshot.key));
        await set(ref(database, `memberParty/${snapshot.key}`), toMemberParty(normalizedMember, snapshot.key));
      } catch (error) {
        console.error('Member view data sync failed:', error);
      }
    };

    const unsubAdded = onChildAdded(membersRef, upsertMember);
    const unsubChanged = onChildChanged(membersRef, upsertMember);
    const unsubRemoved = onChildRemoved(membersRef, async (snapshot) => {
      if (isInitialLoad) return;
      setMembers(prev => {
        const next = { ...prev };
        delete next[snapshot.key];
        return next;
      });
      try {
        await set(ref(database, `memberSummary/${snapshot.key}`), null);
        await set(ref(database, `memberParty/${snapshot.key}`), null);
      } catch (error) {
        console.error('Member view data remove failed:', error);
      }
    });

    return () => {
      unsubAdded();
      unsubChanged();
      unsubRemoved();
    };
  }, [allPokemonData, loadFullMembers]);

  // 가벼운 요약 - 모든 로그인 유저에게 항상 구독
  useEffect(() => {
    const summaryRef = ref(database, 'memberSummary');
    let isInitialLoad = true;

    const normalizeSummaryEntry = (userId, member = {}) => ({
      ...member,
      id: userId
    });

    get(summaryRef)
      .then(async (snapshot) => {
        if (!snapshot.exists()) {
          setMemberSummaries({});
          if (!seededMemberViewDataRef.current) {
            seededMemberViewDataRef.current = true;
            const membersSnapshot = await get(ref(database, 'members'));
            if (membersSnapshot.exists()) {
              const rawMembers = membersSnapshot.val();
              const nextSummary = toMemberSummaryMap(rawMembers);
              const nextParty = toMemberPartyMap(rawMembers);
              await set(ref(database, 'memberSummary'), nextSummary);
              await set(ref(database, 'memberParty'), nextParty);
              const normalized = {};
              Object.keys(nextSummary).forEach((userId) => {
                normalized[userId] = normalizeSummaryEntry(userId, nextSummary[userId] || {});
              });
              setMemberSummaries(normalized);
            }
          }
          return;
        }

        const data = snapshot.val();
        logRtdbDownload('memberSummary (전체 최초 로드)', data);
        const normalized = {};
        Object.keys(data).forEach((userId) => {
          normalized[userId] = normalizeSummaryEntry(userId, data[userId] || {});
        });

        setMemberSummaries(normalized);
      })
      .catch((error) => {
        seededMemberViewDataRef.current = false;
        console.error('Member summary listener failed:', error);
        setMemberSummaries({});
      })
      .finally(() => {
        isInitialLoad = false;
        setIsLoading(false);
      });

    const upsertSummary = (snapshot) => {
      if (isInitialLoad || !snapshot.exists()) return;
      logRtdbDownload(`memberSummary/${snapshot.key} (변경분 재전송)`, snapshot.val());
      const nextMember = normalizeSummaryEntry(snapshot.key, snapshot.val() || {});
      setMemberSummaries(prev => ({
        ...prev,
        [snapshot.key]: nextMember
      }));
    };

    const unsubAdded = onChildAdded(summaryRef, upsertSummary);
    const unsubChanged = onChildChanged(summaryRef, upsertSummary);
    const unsubRemoved = onChildRemoved(summaryRef, (snapshot) => {
      if (isInitialLoad) return;
      setMemberSummaries(prev => {
        const next = { ...prev };
        delete next[snapshot.key];
        return next;
      });
    });

    return () => {
      unsubAdded();
      unsubChanged();
      unsubRemoved();
    };
  }, []);

  // 무거운 파티 상세 - 멤버/NPC 탭을 보고 있을 때만(loadPartyDetails=true) 구독
  useEffect(() => {
    if (!loadPartyDetails) {
      setMemberParties({});
      return undefined;
    }

    const partyRef = ref(database, 'memberParty');
    let isInitialLoad = true;

    const normalizePartyEntry = (userId, member = {}) => ({
      ...member,
      id: userId,
      caughtPokemon: normalizePokemonArray(member.caughtPokemon),
      partnerPokemon: withNormalizedIVs(member.partnerPokemon, DEFAULT_IVS)
    });

    get(partyRef)
      .then((snapshot) => {
        if (!snapshot.exists()) {
          setMemberParties({});
          return;
        }

        const data = snapshot.val();
        logRtdbDownload('memberParty (전체 최초 로드)', data);
        const normalized = {};
        Object.keys(data).forEach((userId) => {
          normalized[userId] = normalizePartyEntry(userId, data[userId] || {});
        });

        setMemberParties(normalized);
      })
      .catch((error) => {
        console.error('Member party listener failed:', error);
        setMemberParties({});
      })
      .finally(() => {
        isInitialLoad = false;
      });

    const upsertParty = (snapshot) => {
      if (isInitialLoad || !snapshot.exists()) return;
      logRtdbDownload(`memberParty/${snapshot.key} (변경분 재전송)`, snapshot.val());
      const nextMember = normalizePartyEntry(snapshot.key, snapshot.val() || {});
      setMemberParties(prev => ({
        ...prev,
        [snapshot.key]: nextMember
      }));
    };

    const unsubAdded = onChildAdded(partyRef, upsertParty);
    const unsubChanged = onChildChanged(partyRef, upsertParty);
    const unsubRemoved = onChildRemoved(partyRef, (snapshot) => {
      if (isInitialLoad) return;
      setMemberParties(prev => {
        const next = { ...prev };
        delete next[snapshot.key];
        return next;
      });
    });

    return () => {
      unsubAdded();
      unsubChanged();
      unsubRemoved();
    };
  }, [loadPartyDetails]);

  useEffect(() => {
    if (!loadFullMembers) return;
    if (seededMemberViewDataRef.current) return;
    if (Object.keys(memberSummaries).length > 0) return;
    if (Object.keys(members).length === 0) return;

    seededMemberViewDataRef.current = true;
    Promise.all([
      set(ref(database, 'memberSummary'), toMemberSummaryMap(members)),
      set(ref(database, 'memberParty'), toMemberPartyMap(members)),
    ]).catch((error) => {
      seededMemberViewDataRef.current = false;
      console.error('Member view data seed failed:', error);
    });
  }, [loadFullMembers, members, memberSummaries]);

  const effectiveMemberSummaries = Object.keys(memberSummaries).length > 0
    ? memberSummaries
    : toMemberSummaryMap(members);

  const effectiveMemberParties = loadPartyDetails
    ? (Object.keys(memberParties).length > 0 ? memberParties : toMemberPartyMap(members))
    : {};

  const memberViewMembers = {};
  Object.keys(effectiveMemberSummaries).forEach((id) => {
    memberViewMembers[id] = {
      ...effectiveMemberSummaries[id],
      ...(effectiveMemberParties[id] || {})
    };
  });

  return {
    members,
    memberViewMembers,
    setMembers,
    isLoading
  };
};

async function createInitialMembersWithAuth() {
  const getInitialInventory = () => {
    const findItem = (searchTerms) => itemsData.items.find((item) => (
      searchTerms.some((term) => {
        const nameEn = item.nameEn?.toLowerCase().replace(/[챕챗]/g, 'e');
        const searchTerm = term.toLowerCase().replace(/[챕챗]/g, 'e');
        return nameEn?.includes(searchTerm) || item.name?.includes(term);
      })
    ));

    const pokeBall = findItem(['poke ball', 'pokeball', '몬스터볼']);
    return [
      {
        itemId: pokeBall?.id || 4,
        name: pokeBall?.name || '몬스터볼',
        count: 15,
        imageUrl: pokeBall?.spriteUrl || 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/poke-ball.png'
      }
    ];
  };

  const initialUsers = [
    {
      email: 'admin@pokemon.com',
      password: 'admin123456',
      data: {
        name: '관리자',
        email: 'admin@pokemon.com',
        isAdmin: true,
        isSuperAdmin: true,
        canManageItems: true,
        dailyWalks: 10,
        maxDailyWalks: 10,
        money: 50000,
        trainerExp: 0,
        lastAttendanceDate: null,
        caughtPokemon: [null, null, null, null, null, null],
        inventory: getInitialInventory()
      }
    },
    {
      email: 'test@pokemon.com',
      password: 'test123456',
      data: {
        name: '테스트유저',
        email: 'test@pokemon.com',
        isAdmin: false,
        isSuperAdmin: false,
        canManageItems: false,
        dailyWalks: 10,
        maxDailyWalks: 10,
        money: 3000,
        trainerExp: 0,
        lastAttendanceDate: null,
        caughtPokemon: [null, null, null, null, null, null],
        inventory: getInitialInventory()
      }
    }
  ];

  const createdMembers = {};

  for (const user of initialUsers) {
    try {
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
      } catch (error) {
        if (error.code !== 'auth/email-already-in-use') throw error;
        userCredential = await signInWithEmailAndPassword(auth, user.email, user.password);
      }
      const uid = userCredential.user.uid;
      await signOut(auth);
      await set(ref(database, `members/${uid}`), user.data);
      createdMembers[uid] = { ...user.data, id: uid };
    } catch (error) {
      console.error(`Initial member creation failed for ${user.email}:`, error);
    }
  }

  return createdMembers;
}
