// 마스토돈 설정 (환경변수로 관리 권장)
export const MASTODON_CONFIG = {
  instanceUrl: 'https://poketodon.monster',
  botAccount: '@pokemonbot@poketodon.monster',
  accessToken: process.env.REACT_APP_MASTODON_TOKEN, // .env 파일에서 관리
  
  // 명령어 패턴
  commands: {
    camping: {
      trigger: '[캠핑]',
      aliases: ['캠핑', 'camping']
    }
  }
};