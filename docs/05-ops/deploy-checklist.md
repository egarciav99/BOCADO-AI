# ✅ Deploy Checklist

## Pre-deploy (Local)

- [ ] Tests pasan: `npm test`
- [ ] Build exitoso: `npm run build`
- [ ] No errores de TypeScript
- [ ] Revisar cambios en `git diff`
- [ ] Actualizar `CHANGELOG.md` si aplica

## Variables de Entorno

| Variable | Local | Prod | Verificado |
|----------|-------|------|------------|
| `VITE_FIREBASE_API_KEY` | ✅ | ✅ | ☐ |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | ✅ | ☐ |
| `GEMINI_API_KEY` | ✅ | ✅ | ☐ |
| `VITE_GMAPS_API_KEY` | - | - | ☐ |

## Checklist por Tipo de Cambio

### Nueva Feature
- [ ] Feature flag si es necesario
- [ ] Analytics events agregados
- [ ] Documentación actualizada
- [ ] Test de integración

### Bug Fix
- [ ] Test que reproduce el bug
- [ ] Fix verificado localmente
- [ ] Regresión testeado

### Cambio de DB
- [ ] Migración script (si aplica)
- [ ] Backup de datos
- [ ] Reglas de seguridad actualizadas
- [ ] Índices actualizados en `firestore.indexes.json`

## Deploy (Vercel)

1. `git push origin main`
2. Esperar build en Vercel Dashboard
3. Verificar Preview URL
4. Smoke test en Preview:
   - [ ] Login funciona
   - [ ] Generar receta funciona
   - [ ] Guardar receta funciona
5. Promover a Production

## Post-deploy

- [ ] Verificar Vercel Analytics
- [ ] Verificar Firebase Console (errores)
- [ ] Anunciar en equipo (si aplica)
- [ ] Monitorear por 30 min

## Rollback

Si hay problemas:
```bash
# Revertir commit
 git revert HEAD
 git push origin main

# O usar Vercel Dashboard → Production → Redeploy (versión anterior)
```
