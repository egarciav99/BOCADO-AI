# 🔍 Cómo Debuggear tu Sesión - Guía Paso a Paso

## ✅ Nueva Herramienta de Debug

He instalado un **Debug Console** que guarda automáticamente todos los eventos relacionados con la autenticación en el navegador, incluso si los logs normales no se muestran.

---

## 📋 Pasos para usar el Debug Console:

### 1️⃣ Abre la app
- Ve a https://bocado-ai.vercel.app
- Deberías ver un botón **"🔧 Debug"** en la esquina inferior derecha

### 2️⃣ Haz login
- Inicia sesión normalmente

### 3️⃣ Abre el Debug Console
- Haz clic en el botón **"🔧 Debug"** (abajo a la derecha)
- Verás todos los logs guardados

### 4️⃣ Copia los logs (IMPORTANTE)
- Busca los logs que empiezan con:
  - `[APP_STARTUP]` - Cuando arrancó la app
  - `[Session Restored from Firebase]` - Cuando se restauró tu sesión
  - `[No Session Found]` - Si NO encontró sesión

- Ejemplo de lo que verás:
```
[14:23:45] STATE APP_STARTUP
   Data: { timestamp: "2026-03-15...", env: "production" }

[14:23:46] INFO Firebase API Key found
   Data: { projectId: "bocado-ai-..." }

[14:23:47] STATE Session Restored from Firebase
   Data: { uid: "J4kK8...", email: "user@example.com", ... }
```

### 5️⃣ Cierra la app COMPLETAMENTE
- Cierra la pestaña o el navegador
- Espera 10 segundos

### 6️⃣ Reabre la app
- Abre de nuevo https://bocado-ai.vercel.app
- Abre el Debug Console nuevamente

### 7️⃣ Compáralos

**Antes de cerrar (DEBERÍA TENER):**
```
Session Restored from Firebase
uid: "..."
```

**Después de abrir (¿TIENE O NO?)**
- Si ve `Session Restored from Firebase` → ✅ funcionando
- Si ve `No Session Found` → ❌ problema

---

## 📥 Compartir los Logs

### Si quieres compartirme los logs exactos:

1. Click en **"📥 Export"** en el Debug Console
2. Se descarga un archivo `debug-logs.json`
3. Ábrelo con un editor de texto
4. Copia SOLO la parte importante:

```json
[
  {
    "timestamp": 1773614400000,
    "type": "state",
    "message": "APP_STARTUP",
    "data": { ... }
  },
  {
    "timestamp": 1773614401000,
    "type": "state",
    "message": "Session Restored from Firebase",
    "data": { ... }
  }
]
```

---

## 🎯 Qué Significa Cada Log

| Log | Significado |
|-----|-------------|
| `APP_STARTUP` | La app se está iniciando |
| `Firebase API Key found` | Firebase está configurado ✅ |
| `Setting up onAuthStateChanged` | Esperando a Firebase restaurar sesión |
| `Session Restored from Firebase` | ✅ Tu sesión fue restaurada |
| `No Session Found` | ❌ No hay sesión guardada |
| `Auth State Changed Error` | ⚠️ Error en Firebase Auth |

---

## 📞 Qué necesito que me digas

1. **Después de cerrar y reabrir la app:**
   - ¿Ves `Session Restored from Firebase`?
   - O ves `No Session Found`?

2. **En el Debug Console, dime:**
   - ¿Cuántos logs ves en total?
   - ¿Qué es el PRIMER log?
   - ¿Qué es el ÚLTIMO log?

3. **O exporta los logs y comparte el JSON**

---

## 🚀 Si ya está funcionando

¡Excelente! Significa que:
- ✅ Firebase Auth es persistente
- ✅ Tu sesión se mantiene al cerrar la app
- ✅ El token se guarda correctamente

**Próximos pasos:** Podemos desactivar el Debug Console en producción y dejar todo en paz.

---

## 💡 Troubleshooting Rápido

**"No veo el botón 🔧 Debug"**
- Solo aparece en desarrollo (http://localhost:3000)
- En producción necesitas estar en desarrollo mode

**"No hay logs"**
- Abre el Debug Console INMEDIATAMENTE después de recargar la página
- Los logs se generan en los primeros 2 segundos

**"Veo muchos logs de ERROR"**
- Copia TODO y comparte, eso nos dice exactamente qué está mal
