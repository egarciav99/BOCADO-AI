# Rate Limiting Distribuido V2

## 🎯 Problema Resuelto

El rate limiting anterior tenía **race conditions** cuando múltiples instancias serverless verificaban simultáneamente. Con 10,000 usuarios, un usuario podía disparar 5-10 requests antes de que el primero se registrara.

## ✅ Solución

Usamos **transacciones atómicas de Firestore** que garantizan:
- ✅ Consistencia entre múltiples instancias serverless
- ✅ Una sola lectura/escritura por verificación (más eficiente)
- ✅ Auto-cleanup de procesos atascados
- ✅ Ventana deslizante de requests

## 📊 Comparación de Costos

| Métrica | V1 (Antiguo) | V2 (Nuevo) | Ahorro |
|---------|-------------|-----------|--------|
| Lecturas por check | 2-10+ (query + scan) | 1 (transacción) | ~80% |
| Escrituras por proceso | 2-3 | 1-2 | ~40% |
| Race conditions | Sí | No | 100% |

## 🔧 Uso

### En el Backend (API)

```typescript
import { rateLimiter } from './utils/rateLimit';

// Verificar rate limit
const check = await rateLimiter.checkRateLimit(userId);
if (!check.allowed) {
  return res.status(429).json({ 
    error: check.error,
    retryAfter: check.secondsLeft 
  });
}

// Proceso exitoso
await rateLimiter.completeProcess(userId);

// Proceso fallido (no cuenta para rate limit)
await rateLimiter.failProcess(userId, errorMessage);
```

### En el Frontend

```typescript
// Verificar status antes de permitir click
const checkRateLimit = async () => {
  const response = await fetch(`/api/recommend?userId=${userId}`);
  const status = await response.json();
  
  if (!status.canRequest) {
    const seconds = status.nextAvailableIn;
    showToast(`Espera ${seconds} segundos...`);
    return false;
  }
  return true;
};
```

## 🔍 Debugging

### Ver estado de un usuario
```bash
curl "https://tu-api.vercel.app/api/recommend?userId=USER_ID"
```

Respuesta:
```json
{
  "requestsInWindow": 2,
  "canRequest": true,
  "nextAvailableAt": 1707345600000,
  "nextAvailableIn": 15
}
```

### Reset manual (para soporte)
```typescript
import { rateLimiter } from './utils/rateLimit';

// Limpiar todos los límites de un usuario
await rateLimiter.resetUser(userId);
```

## ⚙️ Configuración

```typescript
import { DistributedRateLimiter } from './utils/rateLimit';

const customLimiter = new DistributedRateLimiter({
  windowMs: 10 * 60 * 1000,      // 10 minutos
  maxRequests: 5,                 // 5 requests por ventana
  cooldownMs: 30 * 1000,          // 30 segundos entre requests
  stuckThresholdMs: 2 * 60 * 1000 // 2 minutos para cleanup
});
```

## 🗂️ Estructura de Datos en Firestore

```
rate_limit_v2/{userId}
├── requests: [1707345600000, 1707345660000, ...]  // Timestamps
├── currentProcess: {
│     startedAt: 1707345720000,
│     interactionId: "proc_1707345720000"
│   }
├── updatedAt: Timestamp
└── metadata: {
      cleanedAt: Timestamp,
      cleanReason: "stuck_timeout",
      lastError: {...}
    }
```

## 🚨 Migración desde V1

1. Desplegar nuevo código
2. El sistema funciona en paralelo (no afecta user_interactions existentes)
3. Opcional: Migrar datos antiguos si es necesario mantener histórico exacto
4. Después de 24h, eliminar lógica V1 del código

## 📈 Monitoreo

Recomendado: Agregar logs estructurados para:
- Rate limit hits (para ajustar límites)
- Stuck process cleanups (para detectar problemas)
- Tiempo promedio de procesamiento
