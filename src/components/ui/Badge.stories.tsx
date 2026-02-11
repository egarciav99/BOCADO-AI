import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'success', 'warning', 'danger', 'info'],
      description: 'Variante de color del badge',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Tamaño del badge',
    },
    style: {
      control: 'select',
      options: ['filled', 'outlined', 'soft'],
      description: 'Estilo visual del badge',
    },
    dot: {
      control: 'boolean',
      description: 'Mostrar punto indicador',
    },
  },
  parameters: {
    docs: {
      description: {
        component: 'Componente Badge para mostrar etiquetas, estados y categorías. Soporta múltiples variantes de color, tamaños y estilos visuales.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Badge',
    variant: 'default',
    size: 'md',
    style: 'filled',
  },
};

export const Primary: Story = {
  args: {
    children: 'Primary',
    variant: 'primary',
    size: 'md',
    style: 'filled',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
    size: 'md',
    style: 'filled',
  },
};

export const Success: Story = {
  args: {
    children: 'Éxito',
    variant: 'success',
    size: 'md',
    style: 'filled',
  },
};

export const Warning: Story = {
  args: {
    children: 'Advertencia',
    variant: 'warning',
    size: 'md',
    style: 'filled',
  },
};

export const Danger: Story = {
  args: {
    children: 'Error',
    variant: 'danger',
    size: 'md',
    style: 'filled',
  },
};

export const Info: Story = {
  args: {
    children: 'Información',
    variant: 'info',
    size: 'md',
    style: 'filled',
  },
};

export const WithDot: Story = {
  args: {
    children: 'Nuevo',
    variant: 'primary',
    size: 'md',
    style: 'filled',
    dot: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Badge con punto indicador para destacar estado activo o nuevos elementos.',
      },
    },
  },
};

export const OutlinedStyle: Story = {
  args: {
    children: 'Outlined',
    variant: 'primary',
    size: 'md',
    style: 'outlined',
  },
};

export const SoftStyle: Story = {
  args: {
    children: 'Soft',
    variant: 'primary',
    size: 'md',
    style: 'soft',
  },
};

export const Small: Story = {
  args: {
    children: 'Small',
    variant: 'primary',
    size: 'sm',
    style: 'filled',
  },
};

export const Large: Story = {
  args: {
    children: 'Large',
    variant: 'primary',
    size: 'lg',
    style: 'filled',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  ),
};

export const AllStyles: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Badge variant="primary" style="filled">Filled</Badge>
        <Badge variant="success" style="filled">Filled</Badge>
        <Badge variant="warning" style="filled">Filled</Badge>
        <Badge variant="danger" style="filled">Filled</Badge>
      </div>
      <div className="flex flex-wrap gap-3">
        <Badge variant="primary" style="outlined">Outlined</Badge>
        <Badge variant="success" style="outlined">Outlined</Badge>
        <Badge variant="warning" style="outlined">Outlined</Badge>
        <Badge variant="danger" style="outlined">Outlined</Badge>
      </div>
      <div className="flex flex-wrap gap-3">
        <Badge variant="primary" style="soft">Soft</Badge>
        <Badge variant="success" style="soft">Soft</Badge>
        <Badge variant="warning" style="soft">Soft</Badge>
        <Badge variant="danger" style="soft">Soft</Badge>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comparación de los tres estilos visuales: filled, outlined y soft.',
      },
    },
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="success" dot>En línea</Badge>
      <Badge variant="warning">Pendiente</Badge>
      <Badge variant="danger">Cancelado</Badge>
      <Badge variant="info">En progreso</Badge>
      <Badge variant="secondary">Borrador</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Ejemplos de badges para indicar diferentes estados.',
      },
    },
  },
};

export const BocadoBranded: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Badge variant="primary">Bocado Green</Badge>
        <Badge variant="primary" style="outlined">Outlined</Badge>
        <Badge variant="primary" style="soft">Soft</Badge>
      </div>
      <div className="flex flex-wrap gap-3">
        <Badge variant="secondary">Bocado Cream</Badge>
        <Badge variant="default">Bocado Gray</Badge>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Badges usando los colores de marca de Bocado.',
      },
    },
  },
};
