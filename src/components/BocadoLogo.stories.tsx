import type { Meta, StoryObj } from "@storybook/react";
import BocadoLogo from "./BocadoLogo";

const meta: Meta<typeof BocadoLogo> = {
  title: "Bocado/BocadoLogo",
  component: BocadoLogo,
  tags: ["autodocs"],
  argTypes: {
    className: {
      control: "text",
      description: "Additional CSS classes to customize the size",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Official Bocado AI logo component. Renders an image loaded from an external URL.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof BocadoLogo>;

// ✅ FIX: Default usa w-40 — tamaño más usado en la app (HomeScreen, LoginScreen)
export const Default: Story = {
  args: {
    className: "w-40",
  },
  parameters: {
    docs: {
      description: {
        story: "Default size as used in most screens (w-40).",
      },
    },
  },
};

export const Small: Story = {
  args: {
    className: "w-16",
  },
  parameters: {
    docs: {
      description: {
        story: "Small logo, useful for compact headers.",
      },
    },
  },
};

export const Medium: Story = {
  args: {
    className: "w-32",
  },
  parameters: {
    docs: {
      description: {
        story: "Medium logo, recommended for most use cases.",
      },
    },
  },
};

export const Large: Story = {
  args: {
    className: "w-48",
  },
  parameters: {
    docs: {
      description: {
        story: "Large logo, ideal for welcome or login screens.",
      },
    },
  },
};

export const ExtraLarge: Story = {
  args: {
    className: "w-64",
  },
  parameters: {
    docs: {
      description: {
        story: "Extra large logo for splash screens.",
      },
    },
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-6">
      {[
        { className: "w-16",  label: "Small (w-16)"       },
        { className: "w-32",  label: "Medium (w-32)"      },
        { className: "w-40",  label: "Default (w-40)"     },
        { className: "w-48",  label: "Large (w-48)"       },
        { className: "w-64",  label: "Extra Large (w-64)" },
      ].map(({ className, label }) => (
        <div key={className} className="flex items-center gap-4">
          <BocadoLogo className={className} />
          <span className="text-sm text-bocado-dark-gray">{label}</span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All available logo sizes side by side.",
      },
    },
  },
};