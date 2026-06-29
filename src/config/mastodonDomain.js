export const PRODUCTION_MASTODON_HOST = 'originb-pokemon.world';
export const DEV_MASTODON_HOST = 'poketodon.monster';

export const MASTODON_HOST = process.env.NODE_ENV === 'development'
  ? DEV_MASTODON_HOST
  : PRODUCTION_MASTODON_HOST;

export const MASTODON_INSTANCE_URL = `https://${MASTODON_HOST}`;

export const getMastodonUsername = (account = '') => {
  const cleaned = String(account).trim().replace(/^@/, '');
  return cleaned.split('@')[0] || '';
};

export const formatMastodonAccount = (account = '') => {
  const username = getMastodonUsername(account);
  return username ? `@${username}@${MASTODON_HOST}` : '';
};

export const getMastodonProfileUrl = (account = '') => {
  const username = getMastodonUsername(account);
  return username ? `${MASTODON_INSTANCE_URL}/@${username}` : '';
};
