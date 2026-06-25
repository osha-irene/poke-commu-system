import { MASTODON_CONFIG } from '../../config/mastodon.config';

export class MastodonClient {
  constructor(config) {
    this.instanceUrl = config.instanceUrl;
    this.accessToken = config.accessToken;
    this.botAccount  = config.botAccount;
  }

  async fetchAPI(endpoint, options = {}) {
    const url = `${this.instanceUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      throw new Error(`Mastodon API Error: ${response.status}`);
    }
    return response.json();
  }

  async getMentions(sinceId = null) {
    const params = new URLSearchParams({ limit: '20' });
    if (sinceId) params.append('since_id', sinceId);
    return this.fetchAPI(`/api/v1/notifications?${params}`);
  }

  async replyToStatus(statusId, content, visibility = 'unlisted') {
    return this.fetchAPI('/api/v1/statuses', {
      method: 'POST',
      body: JSON.stringify({ status: content, in_reply_to_id: statusId, visibility }),
    });
  }

  async postStatus(content, visibility = 'public') {
    return this.fetchAPI('/api/v1/statuses', {
      method: 'POST',
      body: JSON.stringify({ status: content, visibility }),
    });
  }

  async verifyCredentials() {
    return this.fetchAPI('/api/v1/accounts/verify_credentials');
  }

  async searchAccount(query) {
    return this.fetchAPI(`/api/v1/accounts/search?q=${encodeURIComponent(query)}&limit=1`);
  }
}

export const battleClient = new MastodonClient(MASTODON_CONFIG.battle);
export const tradeClient  = new MastodonClient(MASTODON_CONFIG.trade);
export const notifyClient = new MastodonClient(MASTODON_CONFIG.notify);
export const campClient   = new MastodonClient(MASTODON_CONFIG.camp);
