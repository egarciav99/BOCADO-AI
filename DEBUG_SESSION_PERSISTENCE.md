# 🔍 Guía de Debugging - Persistencia de Sesiones

## Pasos para diagnosticar por qué se cierra la sesión:

### 1️⃣ Abre la consola del navegador
- **En navegador web**: `F12` o `Cmd + Option + I` (Mac)
- **En PWA instalada**: Botón derecho → Inspeccionar

### 2️⃣ Copia la sesión actual
Cuando la app carga, verás logs como estos:

```
═══════ AUTH STARTUP DEBUG ═══════
🔐 Auth State: STARTUP
Firebase Keys: ["firebase:authUser:AIzaSy..."]
Has Auth Token: true
LocalStorage Size: 45230 bytes
SessionStorage Size: 1204 bytes

🔑 Token Storage: { valid: true, details: "Valid token for user@example.com" }
📊 Token Diagnostics: { 
  hasTokens: true, 
  tokenKeys: [...], 
  offlineDataExists: true, 
  lastRefresh: 1710412800000 
}
🔒 Private Mode: NO
```

### 3️⃣ Comparte esta información
**Copia y pégame TODOS estos datos de la consola:**

```
- Firebase Keys encontradas
- Has Auth Token (true/false)
- Token Storage status
- Private Mode (YES/NO)
- LocalStorage Size
```

### 4️⃣ Pasos para reproducir el problema

1. Inicia sesión normalmente
2. Cierra completamente la app/navegador
3. Reabre la app
4. **Antes de hacer nada más**, abre la consola (`F12`)
5. Copia los logs del "AUTH STARTUP DEBUG"
6. Dime: ¿aparece `Has Auth Token: true` o `Has Auth Token: false`?

---

## 🎯 Qué significan los resultados

| Escenario | Causa probable | Solución |
|-----------|---|---|
| `Has Auth Token: false` | localStorage se está limpiando | Verificar si usas modo incógnito |
| `Valid token: false` | Token está corrupto | Necesito ver el contenido exacto |
| `Private Mode: YES` | Modo incógnito/privado | No soporta persistencia nativa |
| `Valid token: true` + Sin sesión | Firebase no restaura | Problema en configuración de persistence |

---

## 📋 Información adicional a verificar

Ejecuta esto en la consola del navegador:

```javascript
// Ver todos los datos en localStorage relacionados con auth
Object.keys(localStorage)
  .filter(k => k.includes('firebase') || k.includes('bocado') || k.includes('auth'))
  .forEach(k => console.log(k, '=', localStorage.getItem(k)?.substring(0, 100)))

// Ver tamaño total
console.log('LocalStorage size:', JSON.stringify(localStorage).length, 'bytes')

// Ver si estamos en modo privado
fetch('/dev/null').then(() => console.log('NOT private mode')).catch(() => console.log('PRIVATE MODE DETECTED'))
```

---

## 🚀 Soluciones según lo que encuentres

### Si está en modo incógnito:
La persistencia no funciona en navegadores en modo incógnito. Necesitaremos usar `sessionStorage` como fallback.

### Si localStorage se limpia:
Algo en tu navegador o extensión está limpiando datos. Comprueba:
- ¿Usas alguna extensión de limpieza (Privacy Badger, etc)?
- ¿El navegador tiene opción de "limpiar datos al cerrar"?

### Si el token está presente pero Firebase no lo usa:
Es un problema de configuración de Firebase Auth persistence.

---

## 📞 Cuándo hayas recopilado la info

Comparte:
1. Los logs de la consola (copia/pega todo el grupo "AUTH STARTUP DEBUG")
2. El resultado de los comandos `Object.keys(localStorage)`
3. Qué navegador/dispositivo estás usando
