# ✅ Implementación: Rate Limiting Distribuido V2

## 📁 Archivos Creados/Modificados

```
api/
├── recommend.ts              # ✅ Actualizado - Usa nuevo rate limiter
└── utils/
    ├── rateLimit.ts          # 🆕 Nuevo - Lógica de rate limiting atómico
    └── README.md             # 🆕 Nuevo - Documentación

src/
├── hooks/
│   └── useRateLimit.ts       # 🆕 Nuevo - Hook React para frontend
└── components/
    └── RecommendationScreen.tsx  # ✅ Actualizado - Muestra rate limit UI
```

## 🎯 Cambios Clave

### 1. Backend: Transacciones Atómicas

**Antes (V1):**
```typescript
// Race condition: 2 instancias pueden pasar al mismo tiempo
const recentSnap = await db.collection('user_interactions')
  .where('userId', '==', userId)
  .get();
// ... verificación ...
```

**Después (V2):**
```typescript
// Transacción atómica garantiza consistencia
return await this.db.runTransaction<RateLimitResult>(async (t) => {
  const doc = await t.get(counterRef);
  // ... verificación dentro de transacción ...
  t.set(counterRef, newRecord, { merge: true });
});
```

### 2. Frontend: Feedback Visual

- Botón muestra tiempo restante cuando hay rate limit
- Contador de requests restantes en los últimos 10 min
- Indicador visual amarillo cuando hay espera

### 3. API: Endpoint de Status

```bash
GET /api/recommend?userId=xxx
```

Respuesta:
```json
{
  "requestsInWindow": 2,
  "canRequest": true,
  "nextAvailableIn": 0,
  "remainingRequests": 3
}
```

## 📊 Beneficios de la Implementación

| Métrica | V1 | V2 | Mejora |
|---------|-----|-----|--------|
| Race Conditions | ✅ Sí | ❌ No | 100% |
| Lecturas/check | 2-10 | 1 | 80% menos |
| Consistencia | Eventual | Fuerte | Atómica |
| User Experience | Error 429 sorpresa | Indicador previo | Mejor |

## 🧪 Testing Manual

### 1. Verificar rate limit básico
```bash
# Hacer 6 requests rápidas
for i in {1..6}; do
  curl -X POST https://tu-api.vercel.app/api/recommend \
    -H "Content-Type: application/json" \
    -d '{"userId":"test123","type":"En casa","mealType":"Desayuno"}'
  echo ""
done
```

**Esperado:**
- Requests 1-5: Éxito (200)
- Request 6: Rate limit (429) con `retryAfter`

### 2. Verificar endpoint de status
```bash
curl "https://tu-api.vercel.app/api/recommend?userId=test123"
```

**Esperado:**
```json
{
  "requestsInWindow": 5,
  "canRequest": false,
  "nextAvailableIn": 45
}
```

### 3. Verificar cleanup de procesos atascados
```bash
# Iniciar request y cancelarla a los 5 segundos
curl -X POST ... &
sleep 5 && kill $!

# Intentar nuevo request inmediatamente
curl -X POST ...
```

**Esperado:** Segunda request debe funcionar (proceso anterior marcado como atascado y limpiado)

## 📈 Monitoreo Recomendado

Agregar en `rateLimit.ts`:
```typescript
// Log estructurado para análisis
console.log(JSON.stringify({
  event: 'rate_limit_check',
  userId,
  allowed: result.allowed,
  requestsInWindow: validRequests.length,
  timestamp: new Date().toISOString()
}));
```

Métricas a seguir:
1. **Rate limit hits/day** - Ajustar límites si es muy alto/bajo
2. **Stuck process cleanups/day** - Detectar problemas de timeout
3. **Tiempo promedio de procesamiento** - Ajustar `stuckThresholdMs`

## 🔒 Seguridad

- ✅ Transacciones atómicas evitan bypass del rate limit
- ✅ Fail-open: Si Firestore falla, permite request (evita bloqueos totales)
- ✅ User ID siempre validado antes de operaciones

## 🚀 Deployment Checklist

- [ ] Deploy a staging
- [ ] Probar rate limit con 10+ requests seguidas
- [ ] Verificar que el cleanup de stuck processes funciona
- [ ] Probar el endpoint GET de status
- [ ] Verificar que el frontend muestra el indicador correctamente
- [ ] Deploy a producción
- [ ] Monitorear logs por 24h

## 📝 Notas

- **Backwards compatible:** El endpoint POST mantiene la misma interfaz
- **Migración gradual:** La colección `rate_limit_v2` se crea automáticamente
- **Limpieza automática:** Los documentos antiguos se pueden eliminar con TTL si es necesario
