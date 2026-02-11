import type { Preview } from '@storybook/react';
import '../src/index.css'; // Importar estilos globales de Tailwind

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'bocado',
      values: [
        { name: 'bocado', value: '#F9F7F2' },
        { name: 'white', value: '#ffffff' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
    a11y: {
      // 'todo' - mostrar violaciones de accesibilidad solo en la UI
      // 'error' - fallar CI en violaciones de accesibilidad
      // 'off' - saltar chequeos de accesibilidad
      test: 'todo',
    },
  },
};

export default preview;
