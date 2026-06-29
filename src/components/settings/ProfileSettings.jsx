// src/components/settings/ProfileSettings.jsx

import { useState, useEffect } from 'react';
import { User, Link } from 'lucide-react';
import { getDatabase, ref, get, set } from 'firebase/database';

function ProfileSettings({ trainer }) {  // ← props로 trainer 받기
  const [mastodonAccount, setMastodonAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 기존 마스토돈 계정 불러오기
  useEffect(() => {
    const loadMastodonAccount = async () => {
    if (!trainer?.id) return;
    
    try {
      const db = getDatabase();
      const accountRef = ref(db, `members/${trainer.id}/mastodonAccount`);
      const snapshot = await get(accountRef);
      
      if (snapshot.exists()) {
        setMastodonAccount(snapshot.val());
      }
    } catch (error) {
      console.error('마스토돈 계정 불러오기 실패:', error);
    }
    };

    loadMastodonAccount();
  }, [trainer]);

  const linkMastodonAccount = async () => {
    if (!mastodonAccount.trim()) {
      setMessage('마스토돈 계정을 입력해주세요!');
      return;
    }

    // 형식 검증: @username@instance.domain
    if (!mastodonAccount.match(/@[\w]+@[\w.]+/)) {
      setMessage('올바른 형식이 아니에요! 예: @username@poketodon.monster');
      return;
    }

    setLoading(true);
    try {
      const db = getDatabase();
      const accountRef = ref(db, `members/${trainer.id}/mastodonAccount`);
      await set(accountRef, mastodonAccount);
      
      setMessage('✅ 마스토돈 계정이 연결되었어요!');
    } catch (error) {
      console.error('연결 실패:', error);
      setMessage('❌ 연결에 실패했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold">프로필 설정</h2>
        </div>

        <div className="space-y-4">
          {/* 마스토돈 계정 연결 */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Link className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-semibold">마스토돈 계정 연결</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              캠핑 시스템을 사용하려면 마스토돈 계정을 연결해야 해요.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  마스토돈 계정
                </label>
                <input
                  type="text"
                  placeholder="@username@poketodon.monster"
                  value={mastodonAccount}
                  onChange={(e) => setMastodonAccount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  형식: @사용자명@서버주소
                </p>
              </div>

              <button
                onClick={linkMastodonAccount}
                disabled={loading}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '연결 중...' : '연결하기'}
              </button>

              {message && (
                <div className={`p-3 rounded-lg text-sm ${
                  message.includes('✅') 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {message}
                </div>
              )}
            </div>
          </div>

          {/* 안내사항 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📌 사용 방법</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>마스토돈 계정을 위 형식으로 입력하세요</li>
              <li>연결하기 버튼을 클릭하세요</li>
              <li>마스토돈에서 봇을 멘션해 캠핑을 진행하세요</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
