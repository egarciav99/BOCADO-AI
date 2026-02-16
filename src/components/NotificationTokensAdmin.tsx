import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, trackEvent } from '../firebaseConfig';
import { logger } from '../utils/logger';
import { Bell } from './icons';

interface NotificationTokensAdminProps {
  userUid: string;
  onBack: () => void;
}

interface TokenRecord {
  id: string;
  token: string;
  userAgent?: string;
  timezone?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface SettingsRecord {
  timezone?: string;
  hasToken?: boolean;
  tokenUpdatedAt?: any;
  lastActiveAt?: any;
  pendingRatingsCount?: number;
  reminders?: Array<{ id: string; enabled?: boolean }>;
}

const formatTimestamp = (value: any): string => {
  if (!value) return '-';
  try {
    const date = value.toDate ? value.toDate() : new Date(value);
    return date.toLocaleString('es');
  } catch {
    return '-';
  }
};

const maskToken = (token: string): string => {
  if (token.length <= 16) return token;
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
};

const NotificationTokensAdmin: React.FC<NotificationTokensAdminProps> = ({ userUid, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsRecord | null>(null);
  const [tokens, setTokens] = useState<TokenRecord[]>([]);

  const loadData = useCallback(async () => {
    if (!userUid) return;
    setLoading(true);
    setError(null);

    try {
      const settingsRef = doc(db, 'notification_settings', userUid);
      const settingsSnap = await getDoc(settingsRef);
      setSettings(settingsSnap.exists() ? (settingsSnap.data() as SettingsRecord) : null);

      const tokensRef = collection(db, 'notification_settings', userUid, 'tokens');
      const tokensSnap = await getDocs(tokensRef);
      const tokenItems = tokensSnap.docs.map(docSnap => {
        const data = docSnap.data() as TokenRecord;
        return {
          id: docSnap.id,
          token: data.token || docSnap.id,
          userAgent: data.userAgent,
          timezone: data.timezone,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });

      tokenItems.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const bTime = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setTokens(tokenItems);
      trackEvent('notification_tokens_admin_loaded', { count: tokenItems.length });
    } catch (err) {
      logger.error('Error cargando tokens de notificaciones:', err);
      setError('No se pudieron cargar los tokens.');
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const enabledCount = useMemo(() => {
    return settings?.reminders?.filter(r => r.enabled).length || 0;
  }, [settings]);

  const handleDeleteToken = async (tokenId: string) => {
    try {
      await deleteDoc(doc(db, 'notification_settings', userUid, 'tokens', tokenId));
      setTokens(prev => prev.filter(t => t.id !== tokenId));
      trackEvent('notification_token_deleted');
    } catch (err) {
      logger.error('Error eliminando token:', err);
      setError('No se pudo eliminar el token.');
    }
  };

  const handleCopyToken = async (tokenValue: string) => {
    try {
      await navigator.clipboard.writeText(tokenValue);
      trackEvent('notification_token_copied');
    } catch {
      setError('No se pudo copiar el token.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-bocado-green/10 p-2 rounded-full">
            <Bell className="w-4 h-4 text-bocado-green" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-bocado-dark-green">Admin: Tokens FCM</h2>
            <p className="text-xs text-bocado-gray">Tokens y estado de recordatorios</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="text-xs bg-bocado-background text-bocado-dark-gray font-bold px-3 py-1.5 rounded-full hover:bg-bocado-border active:scale-95 transition-all"
        >
          Volver
        </button>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
          {error}
        </div>
      )}

      <div className="mb-4 p-4 rounded-xl border border-bocado-border bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-bocado-gray uppercase tracking-wide">Resumen</h3>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs font-semibold text-bocado-green hover:text-bocado-dark-green disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-bocado-dark-gray">
          <div>
            <p className="text-bocado-gray">Zona horaria</p>
            <p className="font-semibold">{settings?.timezone || '-'}</p>
          </div>
          <div>
            <p className="text-bocado-gray">Recordatorios activos</p>
            <p className="font-semibold">{enabledCount}</p>
          </div>
          <div>
            <p className="text-bocado-gray">Token actualizado</p>
            <p className="font-semibold">{formatTimestamp(settings?.tokenUpdatedAt)}</p>
          </div>
          <div>
            <p className="text-bocado-gray">Ultima actividad</p>
            <p className="font-semibold">{formatTimestamp(settings?.lastActiveAt)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {tokens.length === 0 && !loading && (
          <div className="p-4 text-xs text-bocado-gray bg-bocado-background rounded-xl border border-bocado-border">
            No hay tokens registrados para este usuario.
          </div>
        )}

        {tokens.map(token => (
          <div key={token.id} className="p-4 rounded-xl border border-bocado-border bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-bocado-gray mb-1">Token</p>
                <p className="text-xs font-mono text-bocado-dark-gray break-all">
                  {maskToken(token.token)}
                </p>
                <div className="mt-2 text-2xs text-bocado-gray space-y-1">
                  <p>Zona horaria: {token.timezone || '-'}</p>
                  <p>Actualizado: {formatTimestamp(token.updatedAt || token.createdAt)}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleCopyToken(token.token)}
                  className="text-2xs font-semibold text-bocado-green hover:text-bocado-dark-green"
                >
                  Copiar
                </button>
                <button
                  onClick={() => handleDeleteToken(token.id)}
                  className="text-2xs font-semibold text-red-600 hover:text-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationTokensAdmin;
