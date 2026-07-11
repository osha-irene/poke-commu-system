import { useEffect, useRef, useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { get, onChildAdded, onChildChanged, onChildRemoved, ref, set } from 'firebase/database';
import { auth, database } from '../../firebase';
import itemsData from '../../data/items.json';
import { getAbilityEnglishName } from '../../utils/abilityUtils';
import { preloadDecodedImage } from '../../utils/imageCache';
import { toMemberViewDataMap } from '../../utils/memberViewData';
import { DEFAULT_IVS, withNormalizedIVs } from '../../utils/pokemonIndividualValues';
import { fillMissingBaseStats, findPokemonTemplate } from '../../utils/pokemonBaseStats';

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

export const useMembers = (allPokemonData, loadFullMembers = false) => {
  const [members, setMembers] = useState({});
  const [memberViewMembers, setMemberViewMembers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const seededMemberViewDataRef = useRef(false);
  const memberViewMembersRef = useRef({});

  useEffect(() => {
    memberViewMembersRef.current = memberViewMembers;
  }, [memberViewMembers]);

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
          abilityEn: getAbilityEnglishName(pokemon.ability) || pokemon.abilityEn || template.abilitiesEn?.[0] || null
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
          await set(ref(database, 'memberViewData'), toMemberViewDataMap(createdMembers));
          return;
        }

        const normalized = normalizeMembers(snapshot.val());
        Object.values(normalized).forEach((member) => {
          preloadDecodedImage(member?.profileImageThumb);
          preloadDecodedImage(member?.profileImage);
          preloadDecodedImage(member?.profileImageFull);
          preloadDecodedImage(member?.profileImageUrl);
        });

        setMembers((prev) => (
          JSON.stringify(prev) === JSON.stringify(normalized) ? prev : normalized
        ));

        const nextMemberViewData = toMemberViewDataMap(normalized);
        if (JSON.stringify(memberViewMembersRef.current) !== JSON.stringify(nextMemberViewData)) {
          await set(ref(database, 'memberViewData'), nextMemberViewData);
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
        await set(ref(database, `memberViewData/${snapshot.key}`), toMemberViewDataMap({ [snapshot.key]: normalizedMember })[snapshot.key]);
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
        await set(ref(database, `memberViewData/${snapshot.key}`), null);
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

  useEffect(() => {
    const viewRef = ref(database, 'memberViewData');
    let isInitialLoad = true;

    const normalizeMemberViewEntry = (userId, member = {}) => ({
      ...member,
      id: userId,
      caughtPokemon: normalizePokemonArray(member.caughtPokemon),
      partnerPokemon: withNormalizedIVs(member.partnerPokemon, DEFAULT_IVS)
    });

    get(viewRef)
      .then(async (snapshot) => {
        if (!snapshot.exists()) {
          setMemberViewMembers({});
          if (!seededMemberViewDataRef.current) {
            seededMemberViewDataRef.current = true;
            const membersSnapshot = await get(ref(database, 'members'));
            if (membersSnapshot.exists()) {
              const nextMemberViewData = toMemberViewDataMap(membersSnapshot.val());
              await set(ref(database, 'memberViewData'), nextMemberViewData);
              const normalized = {};
              Object.keys(nextMemberViewData).forEach((userId) => {
                normalized[userId] = normalizeMemberViewEntry(userId, nextMemberViewData[userId] || {});
              });
              setMemberViewMembers(normalized);
            }
          }
          return;
        }

        const data = snapshot.val();
        const normalized = {};
        Object.keys(data).forEach((userId) => {
          normalized[userId] = normalizeMemberViewEntry(userId, data[userId] || {});
        });

        setMemberViewMembers(normalized);
      })
      .catch((error) => {
        seededMemberViewDataRef.current = false;
        console.error('Member view data listener failed:', error);
        setMemberViewMembers({});
      })
      .finally(() => {
        isInitialLoad = false;
        setIsLoading(false);
      });

    const upsertMemberView = (snapshot) => {
      if (isInitialLoad || !snapshot.exists()) return;
      const nextMember = normalizeMemberViewEntry(snapshot.key, snapshot.val() || {});
      setMemberViewMembers(prev => ({
        ...prev,
        [snapshot.key]: nextMember
      }));
    };

    const unsubAdded = onChildAdded(viewRef, upsertMemberView);
    const unsubChanged = onChildChanged(viewRef, upsertMemberView);
    const unsubRemoved = onChildRemoved(viewRef, (snapshot) => {
      if (isInitialLoad) return;
      setMemberViewMembers(prev => {
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

  useEffect(() => {
    if (!loadFullMembers) return;
    if (seededMemberViewDataRef.current) return;
    if (Object.keys(memberViewMembers).length > 0) return;
    if (Object.keys(members).length === 0) return;

    seededMemberViewDataRef.current = true;
    set(ref(database, 'memberViewData'), toMemberViewDataMap(members)).catch((error) => {
      seededMemberViewDataRef.current = false;
      console.error('Member view data seed failed:', error);
    });
  }, [loadFullMembers, members, memberViewMembers]);

  const effectiveMemberViewMembers = Object.keys(memberViewMembers).length > 0
    ? memberViewMembers
    : toMemberViewDataMap(members);

  return {
    members,
    memberViewMembers: effectiveMemberViewMembers,
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
