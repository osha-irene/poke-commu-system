import { MASTODON_HOST, MASTODON_INSTANCE_URL } from './mastodonDomain';

const INSTANCE = process.env.REACT_APP_MASTODON_INSTANCE || MASTODON_INSTANCE_URL;

export const MASTODON_CONFIG = {
  battle: {
    instanceUrl: INSTANCE,
    botAccount:  process.env.REACT_APP_MASTODON_BOT_BATTLE  || `@battlebot@${MASTODON_HOST}`,
    accessToken: process.env.REACT_APP_MASTODON_TOKEN_BATTLE,
  },
  trade: {
    instanceUrl: INSTANCE,
    botAccount:  process.env.REACT_APP_MASTODON_BOT_TRADE   || `@tradebot@${MASTODON_HOST}`,
    accessToken: process.env.REACT_APP_MASTODON_TOKEN_TRADE,
  },
  notify: {
    instanceUrl: INSTANCE,
    botAccount:  process.env.REACT_APP_MASTODON_BOT_NOTIFY  || `@notifybot@${MASTODON_HOST}`,
    accessToken: process.env.REACT_APP_MASTODON_TOKEN_NOTIFY,
  },
  camp: {
    instanceUrl: INSTANCE,
    botAccount:  process.env.REACT_APP_MASTODON_BOT_CAMP    || `@campbot@${MASTODON_HOST}`,
    accessToken: process.env.REACT_APP_MASTODON_TOKEN_CAMP,
  },
};
