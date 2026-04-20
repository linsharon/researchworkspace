import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '../lib/api';
import { setAuthSession } from '../lib/session';
import { useI18n } from "@/lib/i18n";

export default function AuthCallback() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const expiresAtRaw = params.get('expires_at');
    const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : null;

    if (token) {
      setAuthSession(token, Number.isFinite(expiresAt) ? expiresAt : null);
      navigate('/', { replace: true });
      return;
    }

    client.auth.login();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{isZh ? "处理认证..." : "Processing authentication..."}</p>
      </div>
    </div>
  );
}
