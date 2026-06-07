import { MASTODON_CONFIG } from '../../config/mastodon.config';

/**
 * 마스토돈 API 클라이언트
 * 기본적인 API 통신 처리
 */
export class MastodonClient {
  constructor() {
    this.instanceUrl = MASTODON_CONFIG.instanceUrl;
    this.accessToken = MASTODON_CONFIG.accessToken;
  }

  /**
   * 마스토돈 API 호출 (공통 메서드)
   */
  async fetchAPI(endpoint, options = {}) {
    const url = `${this.instanceUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`Mastodon API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Mastodon API 호출 실패:', error);
      throw error;
    }
  }

  /**
   * 멘션 확인 (봇 계정으로 온 멘션 가져오기)
   */
  async getMentions(sinceId = null) {
    const params = new URLSearchParams({
      limit: '20'
    });
    
    if (sinceId) {
      params.append('since_id', sinceId);
    }

    return await this.fetchAPI(`/api/v1/notifications?${params}`);
  }

  /**
   * 답글 작성
   */
  async replyToStatus(statusId, content, visibility = 'unlisted') {
    return await this.fetchAPI('/api/v1/statuses', {
      method: 'POST',
      body: JSON.stringify({
        status: content,
        in_reply_to_id: statusId,
        visibility
      })
    });
  }

  /**
   * 계정 정보 확인
   */
  async verifyCredentials() {
    return await this.fetchAPI('/api/v1/accounts/verify_credentials');
  }

  /**
   * 사용자 검색
   */
  async searchAccount(query) {
    return await this.fetchAPI(`/api/v1/accounts/search?q=${encodeURIComponent(query)}&limit=1`);
  }
}