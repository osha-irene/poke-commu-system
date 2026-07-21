import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { database } from '../../firebase';
import { normalizeCaughtPokemonArray } from '../../utils/normalizeCaughtParty';

// 멤버/NPC 상세를 실제로 열어봤을 때만 그 한 명의 caughtPokemon(포켓몬 전체 상세: IV/EV/
// 기술 등, 용량이 큼)을 구독한다. 예전에는 memberParty에 전 회원의 caughtPokemon이 항상
// 실시간으로 실려서, 멤버/NPC 탭을 열어둔 모두에게 "아무나" 포켓몬을 잡거나 파티를 바꿀
// 때마다 그 전체가 재전송됐는데, 실제로 화면에 필요한 건 "지금 열어본 그 한 명"뿐이라
// 구독 범위를 그만큼으로 좁혔다. memberId가 바뀌거나 detail이 닫히면(active=false) 즉시
// 구독을 해제한다.
export const useMemberCaughtPokemon = (memberId, allPokemonData, active = true) => {
  const [caughtPokemon, setCaughtPokemon] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!memberId || !active) {
      setCaughtPokemon(null);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    const caughtRef = ref(database, `members/${memberId}/caughtPokemon`);
    const unsub = onValue(caughtRef, (snapshot) => {
      setCaughtPokemon(normalizeCaughtPokemonArray(snapshot.val(), allPokemonData));
      setIsLoading(false);
    }, (error) => {
      console.error('Member caughtPokemon load failed:', error);
      setCaughtPokemon([]);
      setIsLoading(false);
    });

    return () => unsub();
  }, [memberId, active, allPokemonData]);

  return { caughtPokemon, isLoading };
};
