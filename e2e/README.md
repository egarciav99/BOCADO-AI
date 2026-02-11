# Tests E2E con Playwright

## Requisitos del Sistema

Para correr los tests E2E localmente, necesitas instalar las dependencias del sistema:

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 libgtk-3-0
```

### macOS
```bash
# No requiere dependencias adicionales
```

### Windows
```bash
# No requiere dependencias adicionales
```

### Codespaces / Dev Containers
En entornos de desarrollo en la nube (Codespaces, Gitpod, etc.), los navegadores pueden no funcionar por falta de dependencias del sistema. 

**Soluciones:**
1. **Correr en CI**: Los tests están configurados para correr en GitHub Actions
2. **Usar Docker**: Ver `e2e/docker-compose.yml` (opcional)
3. **Instalar dependencias** (requiere sudo en el entorno):
   ```bash
   sudo apt-get update && sudo apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2
   ```

## Instalación

```bash
# Instalar Playwright y navegadores
npm install
npx playwright install
```

## Comandos

```bash
# Correr todos los tests
npm run test:e2e

# Correr en modo UI (interactivo)
npm run test:e2e:ui

# Correr con navegador visible
npm run test:e2e:headed

# Correr un archivo específico
npx playwright test e2e/auth.spec.ts

# Correr en modo debug
npm run test:e2e:debug

# Ver reporte HTML
npx playwright show-report
```

## Estructura de Tests

```
e2e/
├── auth.spec.ts           # Tests de autenticación
├── recommendation.spec.ts # Tests de recomendaciones
├── profile.spec.ts        # Tests de perfil
├── pantry.spec.ts         # Tests de despensa
├── navigation.spec.ts     # Tests de navegación
├── fixtures.ts            # Fixtures personalizados
├── global-setup.ts        # Setup global
├── global-teardown.ts     # Teardown global
├── utils/
│   ├── auth.ts           # Helpers de autenticación
│   ├── selectors.ts      # Selectores de UI
│   └── test-users.ts     # Generadores de usuarios
└── README.md             # Este archivo
```

## Fixtures Personalizados

Usamos fixtures personalizados para manejar autenticación:

```typescript
import { test, expect } from '../fixtures';

test('usuario autenticado puede ver perfil', async ({ page, authenticatedUser }) => {
  // authenticatedUser ya está logueado
  await page.goto('/profile');
  await expect(page.locator('text=Mi Perfil')).toBeVisible();
});
```

## Selectores

Usamos `data-testid` preferentemente, pero también selectores de texto:

```typescript
// Preferido
await page.click('[data-testid="submit-button"]');

// Alternativa
await page.click('text=Enviar');
```

## CI/CD

Los tests se ejecutan automáticamente en GitHub Actions en cada PR.

Ver `.github/workflows/playwright.yml`

## Troubleshooting

### Error: `libatk-1.0.so.0: cannot open shared object file`
Faltan dependencias del sistema. Instalar:
```bash
sudo apt-get install -y libatk1.0-0 libatk-bridge2.0-0
```

### Error: `Executable doesn't exist`
Instalar navegadores:
```bash
npx playwright install
```

### Tests fallan por timeouts
Aumentar el timeout en `playwright.config.ts`:
```typescript
timeout: 120000, // 2 minutos
```

### Puerto 3000 en uso
Cambiar el puerto en `playwright.config.ts`:
```typescript
webServer: {
  command: 'npm run dev -- --port 3001',
  url: 'http://localhost:3001',
}
```

## Buenas Prácticas

1. **Un test, una función**: Cada test debe verificar una sola cosa
2. **Independencia**: Los tests no deben depender de otros tests
3. **Limpieza**: Usar fixtures para limpiar estado después de tests
4. **Selectores robustos**: Preferir `data-testid` sobre clases CSS
5. **Tiempo de espera explícito**: Evitar `waitForTimeout`, usar `waitForSelector`

## Recursos

- [Documentación de Playwright](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-page)
