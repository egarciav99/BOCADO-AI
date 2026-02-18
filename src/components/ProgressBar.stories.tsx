import type { Meta, StoryObj } from "@storybook/react";
import ProgressBar from "./ProgressBar";

const meta: Meta<typeof ProgressBar> = {
  title: "Bocado/ProgressBar",
  component: ProgressBar,
  tags: ["autodocs"],
  argTypes: {
    currentStep: {
      control: { type: "number", min: 1 },
      description: "Paso actual del progreso",
    },
    totalSteps: {
      control: { type: "number", min: 2 },
      description: "Número total de pasos",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Barra de progreso utilizada en formularios multi-paso. Muestra el paso actual, el porcentaje completado y una barra visual de progreso con los colores de marca de Bocado.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Step1Of4: Story = {
  args: {
    currentStep: 1,
    totalSteps: 4,
  },
  parameters: {
    docs: {
      description: {
        story: "Progreso al inicio del formulario (25% completado).",
      },
    },
  },
};

export const Step2Of4: Story = {
  args: {
    currentStep: 2,
    totalSteps: 4,
  },
  parameters: {
    docs: {
      description: {
        story: "Progreso intermedio (50% completado).",
      },
    },
  },
};

export const Step3Of4: Story = {
  args: {
    currentStep: 3,
    totalSteps: 4,
  },
  parameters: {
    docs: {
      description: {
        story: "Progreso avanzado (75% completado).",
      },
    },
  },
};

export const Step4Of4: Story = {
  args: {
    currentStep: 4,
    totalSteps: 4,
  },
  parameters: {
    docs: {
      description: {
        story: "Progreso completo (100% completado).",
      },
    },
  },
};

export const ThreeSteps: Story = {
  args: {
    currentStep: 2,
    totalSteps: 3,
  },
  parameters: {
    docs: {
      description: {
        story: "Formulario de 3 pasos en el paso intermedio (50% completado).",
      },
    },
  },
};

export const FiveSteps: Story = {
  args: {
    currentStep: 3,
    totalSteps: 5,
  },
  parameters: {
    docs: {
      description: {
        story: "Formulario de 5 pasos en el paso 3 (50% completado).",
      },
    },
  },
};

export const AllStepsProgression: Story = {
  render: () => (
    <div className="flex flex-col gap-8 max-w-md">
      <div>
        <p className="text-sm text-bocado-dark-gray mb-2">Paso 1 de 4</p>
        <ProgressBar currentStep={1} totalSteps={4} />
      </div>
      <div>
        <p className="text-sm text-bocado-dark-gray mb-2">Paso 2 de 4</p>
        <ProgressBar currentStep={2} totalSteps={4} />
      </div>
      <div>
        <p className="text-sm text-bocado-dark-gray mb-2">Paso 3 de 4</p>
        <ProgressBar currentStep={3} totalSteps={4} />
      </div>
      <div>
        <p className="text-sm text-bocado-dark-gray mb-2">Paso 4 de 4</p>
        <ProgressBar currentStep={4} totalSteps={4} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Progresión completa de todos los pasos en un formulario de 4 pasos.",
      },
    },
  },
};

export const DifferentLengths: Story = {
  render: () => (
    <div className="flex flex-col gap-8 max-w-md">
      <div>
        <p className="text-sm text-bocado-dark-gray mb-2">2 pasos (50%)</p>
        <ProgressBar currentStep={1} totalSteps={2} />
      </div>
      <div>
        <p className="text-sm text-bocado-dark-gray mb-2">3 pasos (67%)</p>
        <ProgressBar currentStep={2} totalSteps={3} />
      </div>
      <div>
        <p className="text-sm text-bocado-dark-gray mb-2">5 pasos (40%)</p>
        <ProgressBar currentStep={2} totalSteps={5} />
      </div>
      <div>
        <p className="text-sm text-bocado-dark-gray mb-2">6 pasos (80%)</p>
        <ProgressBar currentStep={5} totalSteps={6} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Comparación de barras de progreso con diferente número de pasos.",
      },
    },
  },
};
