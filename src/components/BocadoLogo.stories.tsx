import type { Meta, StoryObj } from '@storybook/react';
import BocadoLogo from './BocadoLogo';

const meta: Meta<typeof BocadoLogo> = {
  title: 'Bocado/BocadoLogo',
  component: BocadoLogo,
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Clases CSS adicionales para personalizar el tamaño',
    },
  },
  parameters: {
    docs: {
      description: {
        component: 'Componente que muestra el logo oficial de Bocado AI. Utiliza una imagen cargada desde URL externa.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof BocadoLogo>;

export const Default: Story = {
  args: {
    className: 'w-32',
  },
};

export const Small: Story = {
  args: {
    className: 'w-16',
  },
  parameters: {
    docs: {
      description: {
        story: 'Logo en tamaño pequeño, útil para headers compactos.',
      },
    },
  },
};

export const Medium: Story = {
  args: {
    className: 'w-32',
  },
  parameters: {
    docs: {
      description: {
        story: 'Logo en tamaño medio, tamaño recomendado para la mayoría de usos.',
      },
    },
  },
};

export const Large: Story = {
  args: {
    className: 'w-48',
  },
  parameters: {
    docs: {
      description: {
        story: 'Logo en tamaño grande, ideal para pantallas de bienvenida o login.',
      },
    },
  },
};

export const ExtraLarge: Story = {
  args: {
    className: 'w-64',
  },
  parameters: {
    docs: {
      description: {
        story: 'Logo en tamaño extra grande para pantallas splash.',
      },
    },
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <div className="flex items-center gap-4">
        <BocadoLogo className="w-16" />
        <span className="text-sm text-bocado-dark-gray">Small (w-16)</span>
      </div>
      <div className="flex items-center gap-4">
        <BocadoLogo className="w-32" />
        <span className="text-sm text-bocado-dark-gray">Medium (w-32)</span>
      </div>
      <div className="flex items-center gap-4">
        <BocadoLogo className="w-48" />
        <span className="text-sm text-bocado-dark-gray">Large (w-48)</span>
      </div>
      <div className="flex items-center gap-4">
        <BocadoLogo className="w-64" />
        <span className="text-sm text-bocado-dark-gray">Extra Large (w-64)</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Todos los tamaños disponibles del logo de Bocado.',
      },
    },
  },
};
