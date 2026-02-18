import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./Card";
import { Button } from "./Button";
import { Info, ArrowRight } from "lucide-react";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outlined", "elevated"],
      description: "Variante visual de la tarjeta",
    },
    padding: {
      control: "select",
      options: ["none", "sm", "md", "lg"],
      description: "Espaciado interno",
    },
    rounded: {
      control: "select",
      options: ["none", "sm", "md", "lg", "xl"],
      description: "Radio del borde",
    },
    hover: {
      control: "boolean",
      description: "Habilitar efecto hover",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Componente Card para agrupar contenido relacionado. Incluye subcomponentes para estructurar el contenido: CardHeader, CardTitle, CardDescription, CardContent y CardFooter.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: "Contenido simple de la tarjeta",
    variant: "default",
    padding: "md",
    rounded: "xl",
  },
};

export const Outlined: Story = {
  args: {
    children: "Tarjeta con borde destacado",
    variant: "outlined",
    padding: "md",
    rounded: "xl",
  },
};

export const Elevated: Story = {
  args: {
    children: "Tarjeta con sombra elevada",
    variant: "elevated",
    padding: "md",
    rounded: "xl",
  },
};

export const WithHover: Story = {
  args: {
    children: "Pasa el mouse sobre esta tarjeta",
    variant: "elevated",
    padding: "md",
    rounded: "xl",
    hover: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Tarjeta interactiva con efecto hover que eleva la tarjeta y aumenta la sombra.",
      },
    },
  },
};

export const CompleteExample: Story = {
  render: () => (
    <Card variant="elevated" padding="lg" className="max-w-md">
      <CardHeader>
        <CardTitle>Título de la Tarjeta</CardTitle>
        <CardDescription>
          Esta es una descripción que proporciona más contexto sobre el
          contenido de la tarjeta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-bocado-text">
          Aquí va el contenido principal de la tarjeta. Puede incluir texto,
          imágenes, formularios o cualquier otro elemento React.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          rightIcon={<ArrowRight size={16} />}
        >
          Continuar
        </Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: "Ejemplo completo utilizando todos los subcomponentes de Card.",
      },
    },
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-sm">
      <Card variant="default">
        <CardTitle>Default</CardTitle>
        <p className="text-sm text-bocado-dark-gray mt-2">
          Borde sutil con fondo blanco
        </p>
      </Card>
      <Card variant="outlined">
        <CardTitle>Outlined</CardTitle>
        <p className="text-sm text-bocado-dark-gray mt-2">
          Borde destacado con color verde
        </p>
      </Card>
      <Card variant="elevated">
        <CardTitle>Elevated</CardTitle>
        <p className="text-sm text-bocado-dark-gray mt-2">
          Sombra suave para destacar
        </p>
      </Card>
    </div>
  ),
};

export const AllPaddings: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-sm">
      <Card padding="none" variant="default">
        <div className="bg-bocado-cream p-2 text-xs">Sin padding (none)</div>
        <p className="p-2">Contenido sin espaciado interno</p>
      </Card>
      <Card padding="sm" variant="default">
        <CardTitle>Small padding</CardTitle>
        <p className="text-sm text-bocado-dark-gray mt-2">
          Espaciado pequeño (p-3)
        </p>
      </Card>
      <Card padding="md" variant="default">
        <CardTitle>Medium padding</CardTitle>
        <p className="text-sm text-bocado-dark-gray mt-2">
          Espaciado medio (p-4)
        </p>
      </Card>
      <Card padding="lg" variant="default">
        <CardTitle>Large padding</CardTitle>
        <p className="text-sm text-bocado-dark-gray mt-2">
          Espaciado grande (p-6)
        </p>
      </Card>
    </div>
  ),
};

export const InfoCard: Story = {
  render: () => (
    <Card variant="outlined" padding="md" className="max-w-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-bocado-green/10 rounded-lg">
          <Info className="w-5 h-5 text-bocado-green" />
        </div>
        <div>
          <CardTitle className="text-base">Información importante</CardTitle>
          <p className="text-sm text-bocado-dark-gray mt-1">
            Utiliza este patrón para mostrar información destacada con un icono.
          </p>
        </div>
      </div>
    </Card>
  ),
};

export const ClickableCard: Story = {
  render: () => (
    <Card
      variant="elevated"
      padding="md"
      hover
      className="max-w-sm cursor-pointer"
      onClick={() => alert("¡Tarjeta clickeada!")}
    >
      <CardTitle>Tarjeta Clickeable</CardTitle>
      <p className="text-sm text-bocado-dark-gray mt-2">
        Esta tarjeta responde a clicks. Pasa el mouse y haz click para ver el
        efecto.
      </p>
    </Card>
  ),
};
