import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Plus, ArrowRight, Trash2 } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
      description: 'Variante visual del botón',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Tamaño del botón',
    },
    isLoading: {
      control: 'boolean',
      description: 'Mostrar estado de carga',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Ancho completo',
    },
    disabled: {
      control: 'boolean',
      description: 'Estado deshabilitado',
    },
    onClick: {
      action: 'clicked',
      description: 'Función llamada al hacer click',
    },
  },
  parameters: {
    docs: {
      description: {
        component: 'Componente de botón principal para la aplicación Bocado. Soporta múltiples variantes, tamaños y estados.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Button',
    variant: 'primary',
    size: 'md',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Button',
    variant: 'secondary',
    size: 'md',
  },
};

export const Outline: Story = {
  args: {
    children: 'Button',
    variant: 'outline',
    size: 'md',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Button',
    variant: 'ghost',
    size: 'md',
  },
};

export const Danger: Story = {
  args: {
    children: 'Eliminar',
    variant: 'danger',
    size: 'md',
  },
};

export const Loading: Story = {
  args: {
    children: 'Cargando...',
    variant: 'primary',
    isLoading: true,
    size: 'md',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Deshabilitado',
    variant: 'primary',
    disabled: true,
    size: 'md',
  },
};

export const Small: Story = {
  args: {
    children: 'Pequeño',
    variant: 'primary',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    children: 'Grande',
    variant: 'primary',
    size: 'lg',
  },
};

export const FullWidth: Story = {
  args: {
    children: 'Ancho Completo',
    variant: 'primary',
    fullWidth: true,
    size: 'md',
  },
  parameters: {
    docs: {
      description: {
        story: 'Botón que ocupa el 100% del ancho disponible.',
      },
    },
  },
};

export const WithLeftIcon: Story = {
  args: {
    children: 'Agregar',
    variant: 'primary',
    leftIcon: <Plus size={18} />,
    size: 'md',
  },
};

export const WithRightIcon: Story = {
  args: {
    children: 'Continuar',
    variant: 'primary',
    rightIcon: <ArrowRight size={18} />,
    size: 'md',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">
        <Trash2 size={18} className="mr-2" />
        Danger
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Todas las variantes de botones disponibles.',
      },
    },
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Todos los tamaños de botones disponibles.',
      },
    },
  },
};
