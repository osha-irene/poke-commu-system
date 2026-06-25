const INSTANCE = process.env.REACT_APP_MASTODON_INSTANCE || 'https://poketodon.monster';

export const MASTODON_CONFIG = {
  battle: {
    instanceUrl: INSTANCE,
    botAccount:  process.env.REACT_APP_MASTODON_BOT_BATTLE  || '@battlebot@poketodon.monster',
    accessToken: process.env.REACT_APP_MASTODON_TOKEN_BATTLE,
  },
  trade: {
    instanceUrl: INSTANCE,
    botAccount:  process.env.REACT_APP_MASTODON_BOT_TRADE   || '@tradebot@poketodon.monster',
    accessToken: process.env.REACT_APP_MASTODON_TOKEN_TRADE,
  },
  notify: {
    instanceUrl: INSTANCE,
    botAccount:  process.env.REACT_APP_MASTODON_BOT_NOTIFY  || '@notifybot@poketodon.monster',
    accessToken: process.env.REACT_APP_MASTODON_TOKEN_NOTIFY,
  },
  camp: {
    instanceUrl: INSTANCE,
    botAccount:  process.env.REACT_APP_MASTODON_BOT_CAMP    || '@campbot@poketodon.monster',
    accessToken: process.env.REACT_APP_MASTODON_TOKEN_CAMP,
  },
};
