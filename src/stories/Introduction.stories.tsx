import type { Meta } from "@storybook/react";

const meta: Meta = {
  title: "Introducción/Bienvenido",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Bienvenido al Design System de Bocado AI",
      },
    },
  },
};

export default meta;

export const Bienvenido = () => (
  <div
    className="p-8 max-w-4xl mx-auto"
    style={{ fontFamily: "Verdana, Geneva, sans-serif" }}
  >
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-[#316559] mb-4">
        🍽️ Bocado AI - Design System
      </h1>
      <p className="text-lg text-[#374F59]">
        Bienvenido al <strong>Design System de Bocado AI</strong>, la guía de
        componentes UI para nuestra aplicación de nutrición inteligente.
      </p>
    </div>

    <section className="mb-8">
      <h2 className="text-xl font-bold text-[#316559] mb-4">
        ¿Qué es Storybook?
      </h2>
      <p className="text-[#374F59] mb-4">
        Storybook es una herramienta de desarrollo que nos permite:
      </p>
      <ul className="list-disc list-inside space-y-2 text-[#374F59] ml-4">
        <li>
          📚 <strong>Documentar</strong> componentes de forma aislada
        </li>
        <li>
          🎨 <strong>Visualizar</strong> diferentes estados y variantes
        </li>
        <li>
          🧪 <strong>Probar</strong> componentes interactivamente
        </li>
        <li>
          ♿ <strong>Verificar</strong> accesibilidad (addon a11y)
        </li>
        <li>
          🔧 <strong>Desarrollar</strong> componentes sin depender de la app
          completa
        </li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-xl font-bold text-[#316559] mb-4">
        Paleta de Colores
      </h2>
      <p className="text-[#374F59] mb-4">
        Nuestro design system utiliza los siguientes colores de marca:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#E8E6E1]">
          <div className="w-12 h-12 rounded-lg bg-[#316559]"></div>
          <div>
            <p className="font-bold text-[#374F59]">Bocado Green</p>
            <p className="text-sm text-[#9DB3C1]">
              #316559 - Botones primarios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#E8E6E1]">
          <div className="w-12 h-12 rounded-lg bg-[#6E9277]"></div>
          <div>
            <p className="font-bold text-[#374F59]">Bocado Green Light</p>
            <p className="text-sm text-[#9DB3C1]">#6E9277 - Hover states</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#E8E6E1]">
          <div className="w-12 h-12 rounded-lg bg-[#2C4F40]"></div>
          <div>
            <p className="font-bold text-[#374F59]">Bocado Dark Green</p>
            <p className="text-sm text-[#9DB3C1]">
              #2C4F40 - Elementos destacados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#E8E6E1]">
          <div className="w-12 h-12 rounded-lg bg-[#9DB3C1]"></div>
          <div>
            <p className="font-bold text-[#374F59]">Bocado Gray</p>
            <p className="text-sm text-[#9DB3C1]">
              #9DB3C1 - Textos secundarios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#E8E6E1]">
          <div className="w-12 h-12 rounded-lg bg-[#374F59]"></div>
          <div>
            <p className="font-bold text-[#374F59]">Bocado Dark Gray</p>
            <p className="text-sm text-[#9DB3C1]">
              #374F59 - Textos principales
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#E8E6E1]">
          <div className="w-12 h-12 rounded-lg bg-[#F9F7F2] border border-[#E8E6E1]"></div>
          <div>
            <p className="font-bold text-[#374F59]">Bocado Background</p>
            <p className="text-sm text-[#9DB3C1]">#F9F7F2 - Fondo de la app</p>
          </div>
        </div>
      </div>
    </section>

    <section className="mb-8">
      <h2 className="text-xl font-bold text-[#316559] mb-4">
        Estructura de Componentes
      </h2>

      <h3 className="text-lg font-bold text-[#316559] mt-6 mb-2">
        UI Components
      </h3>
      <p className="text-[#374F59] mb-2">
        Componentes base reutilizables en{" "}
        <code className="bg-[#F5F3EE] px-2 py-1 rounded">
          src/components/ui/
        </code>
        :
      </p>
      <ul className="list-disc list-inside space-y-1 text-[#374F59] ml-4">
        <li>
          <strong>Button</strong> - Botones con múltiples variantes y estados
        </li>
        <li>
          <strong>Card</strong> - Contenedores de contenido
        </li>
        <li>
          <strong>Input</strong> - Campos de entrada de texto
        </li>
        <li>
          <strong>Badge</strong> - Etiquetas y estados
        </li>
      </ul>

      <h3 className="text-lg font-bold text-[#316559] mt-6 mb-2">
        Bocado Components
      </h3>
      <p className="text-[#374F59] mb-2">
        Componentes específicos del negocio:
      </p>
      <ul className="list-disc list-inside space-y-1 text-[#374F59] ml-4">
        <li>
          <strong>BocadoLogo</strong> - Logo oficial de la app
        </li>
        <li>
          <strong>ProgressBar</strong> - Barra de progreso multi-paso
        </li>
        <li>
          <strong>MealCard</strong> - Tarjeta de comida
        </li>
        <li>
          <strong>BottomTabBar</strong> - Navegación inferior
        </li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-xl font-bold text-[#316559] mb-4">
        Cómo usar Storybook
      </h2>

      <h3 className="text-lg font-bold text-[#316559] mt-4 mb-2">Navegación</h3>
      <ol className="list-decimal list-inside space-y-1 text-[#374F59] ml-4">
        <li>Usa el menú lateral para explorar componentes</li>
        <li>Cada componente tiene su propia &quot;story&quot; con variantes</li>
        <li>
          La pestaña <strong>Docs</strong> muestra documentación detallada
        </li>
        <li>
          La pestaña <strong>Canvas</strong> permite interactuar con el
          componente
        </li>
      </ol>

      <h3 className="text-lg font-bold text-[#316559] mt-4 mb-2">
        Controles Interactivos
      </h3>
      <p className="text-[#374F59] ml-4">
        En el panel <strong>Controls</strong> puedes cambiar props en tiempo
        real, ver cómo responde el componente y copiar configuraciones.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-xl font-bold text-[#316559] mb-4">
        Guía de Contribución
      </h2>

      <h3 className="text-lg font-bold text-[#316559] mt-4 mb-2">
        Agregar un nuevo componente
      </h3>
      <ol className="list-decimal list-inside space-y-1 text-[#374F59] ml-4">
        <li>
          Crea el componente en{" "}
          <code className="bg-[#F5F3EE] px-2 py-1 rounded">
            src/components/ui/
          </code>{" "}
          o{" "}
          <code className="bg-[#F5F3EE] px-2 py-1 rounded">
            src/components/
          </code>
        </li>
        <li>
          Crea el archivo de stories{" "}
          <code className="bg-[#F5F3EE] px-2 py-1 rounded">.stories.tsx</code>{" "}
          junto al componente
        </li>
        <li>Usa JSDoc para documentar props</li>
        <li>
          Agrega{" "}
          <code className="bg-[#F5F3EE] px-2 py-1 rounded">
            tags: [&apos;autodocs&apos;]
          </code>{" "}
          para generación automática
        </li>
      </ol>

      <h3 className="text-lg font-bold text-[#316559] mt-4 mb-2">
        Mejores Prácticas
      </h3>
      <ul className="list-disc list-inside space-y-1 text-[#374F59] ml-4">
        <li>✅ Documenta todas las props con JSDoc</li>
        <li>✅ Crea stories para todos los estados importantes</li>
        <li>✅ Usa nombres descriptivos para las stories</li>
        <li>✅ Incluye ejemplos de uso real</li>
        <li>✅ Verifica accesibilidad con el addon a11y</li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-xl font-bold text-[#316559] mb-4">
        Scripts Disponibles
      </h2>
      <pre className="bg-[#F5F3EE] p-4 rounded-lg overflow-x-auto">
        <code className="text-sm text-[#374F59]">
          {`# Iniciar Storybook en desarrollo
npm run storybook

# Construir Storybook para producción
npm run build-storybook`}
        </code>
      </pre>
    </section>

    <footer className="mt-8 pt-6 border-t border-[#E8E6E1]">
      <p className="text-center text-[#316559] font-bold">
        💚 Bocado AI - Nutrición inteligente personalizada
      </p>
    </footer>
  </div>
);
