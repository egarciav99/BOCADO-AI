import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";
import { Mail, Lock, Eye, Search, User } from "lucide-react";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Tamaño del input",
    },
    type: {
      control: "select",
      options: ["text", "password", "email", "number", "tel", "search"],
      description: "Tipo de input HTML",
    },
    disabled: {
      control: "boolean",
      description: "Estado deshabilitado",
    },
    fullWidth: {
      control: "boolean",
      description: "Ancho completo",
    },
    label: {
      control: "text",
      description: "Etiqueta del campo",
    },
    placeholder: {
      control: "text",
      description: "Texto placeholder",
    },
    helperText: {
      control: "text",
      description: "Texto de ayuda",
    },
    error: {
      control: "text",
      description: "Mensaje de error",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Componente Input para captura de datos de texto. Soporta etiquetas, iconos, estados de error y múltiples tamaños.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: "Escribe algo...",
    size: "md",
  },
};

export const WithLabel: Story = {
  args: {
    label: "Correo electrónico",
    placeholder: "ejemplo@correo.com",
    type: "email",
    size: "md",
  },
};

export const WithHelperText: Story = {
  args: {
    label: "Nombre de usuario",
    placeholder: "@usuario",
    helperText: "Este nombre será visible para otros usuarios.",
    size: "md",
  },
};

export const WithError: Story = {
  args: {
    label: "Contraseña",
    placeholder: "••••••••",
    type: "password",
    error: "La contraseña debe tener al menos 8 caracteres.",
    size: "md",
  },
};

export const Disabled: Story = {
  args: {
    label: "Campo deshabilitado",
    placeholder: "No se puede editar",
    disabled: true,
    size: "md",
  },
};

export const Small: Story = {
  args: {
    label: "Tamaño pequeño",
    placeholder: "Input sm",
    size: "sm",
  },
};

export const Medium: Story = {
  args: {
    label: "Tamaño medio",
    placeholder: "Input md",
    size: "md",
  },
};

export const Large: Story = {
  args: {
    label: "Tamaño grande",
    placeholder: "Input lg",
    size: "lg",
  },
};

export const WithLeftIcon: Story = {
  args: {
    label: "Email",
    placeholder: "tu@email.com",
    type: "email",
    leftIcon: <Mail size={20} />,
    size: "md",
  },
};

export const WithRightIcon: Story = {
  args: {
    label: "Contraseña",
    placeholder: "••••••••",
    type: "password",
    rightIcon: <Eye size={20} />,
    size: "md",
  },
};

export const WithBothIcons: Story = {
  args: {
    label: "Buscar",
    placeholder: "Buscar recetas...",
    leftIcon: <Search size={20} />,
    rightIcon: <span className="text-xs">⌘K</span>,
    size: "md",
  },
};

export const FullWidth: Story = {
  args: {
    label: "Ancho completo",
    placeholder: "Este input ocupa todo el ancho disponible",
    fullWidth: true,
    size: "md",
  },
  parameters: {
    layout: "fullscreen",
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-sm">
      <Input size="sm" placeholder="Small input" label="Small" />
      <Input size="md" placeholder="Medium input" label="Medium" />
      <Input size="lg" placeholder="Large input" label="Large" />
    </div>
  ),
};

export const LoginForm: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-sm">
      <Input
        label="Email"
        type="email"
        placeholder="tu@email.com"
        leftIcon={<Mail size={20} />}
        fullWidth
      />
      <Input
        label="Contraseña"
        type="password"
        placeholder="••••••••"
        leftIcon={<Lock size={20} />}
        rightIcon={<Eye size={20} />}
        fullWidth
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Ejemplo de formulario de login con iconos.",
      },
    },
  },
};

export const StatesShowcase: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-sm">
      <Input label="Estado normal" placeholder="Input normal" />
      <Input
        label="Con helper"
        placeholder="Input con ayuda"
        helperText="Texto de ayuda adicional"
      />
      <Input
        label="Con error"
        placeholder="Input con error"
        error="Este campo es requerido"
      />
      <Input label="Deshabilitado" placeholder="No editable" disabled />
    </div>
  ),
};
