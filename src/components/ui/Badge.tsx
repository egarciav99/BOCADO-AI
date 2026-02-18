import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Variante visual del badge */
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "info";
  /** Tamaño del badge */
  size?: "sm" | "md" | "lg";
  /** Estilo visual */
  style?: "filled" | "outlined" | "soft";
  /** Mostrar punto indicador */
  dot?: boolean;
  /** Contenido del badge */
  children: React.ReactNode;
}

/**
 * Componente Badge - Etiqueta visual para estados y categorías
 *
 * @example
 * <Badge variant="success">Activo</Badge>
 * <Badge variant="primary" dot>Nuevo</Badge>
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "md",
  style = "filled",
  dot = false,
  className = "",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center font-bold rounded-full transition-colors";

  const variants = {
    default: {
      filled: "bg-bocado-dark-gray text-white",
      outlined: "border-2 border-bocado-dark-gray text-bocado-dark-gray",
      soft: "bg-bocado-gray/20 text-bocado-dark-gray",
    },
    primary: {
      filled: "bg-bocado-green text-white",
      outlined: "border-2 border-bocado-green text-bocado-green",
      soft: "bg-bocado-green/10 text-bocado-green",
    },
    secondary: {
      filled: "bg-bocado-cream text-bocado-dark-gray",
      outlined: "border-2 border-bocado-border text-bocado-dark-gray",
      soft: "bg-bocado-cream text-bocado-dark-gray",
    },
    success: {
      filled: "bg-green-500 text-white",
      outlined: "border-2 border-green-500 text-green-600",
      soft: "bg-green-100 text-green-700",
    },
    warning: {
      filled: "bg-amber-500 text-white",
      outlined: "border-2 border-amber-500 text-amber-600",
      soft: "bg-amber-100 text-amber-700",
    },
    danger: {
      filled: "bg-red-500 text-white",
      outlined: "border-2 border-red-500 text-red-600",
      soft: "bg-red-100 text-red-700",
    },
    info: {
      filled: "bg-blue-500 text-white",
      outlined: "border-2 border-blue-500 text-blue-600",
      soft: "bg-blue-100 text-blue-700",
    },
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  const dotColors = {
    default: "bg-white",
    primary: "bg-white",
    secondary: "bg-bocado-dark-gray",
    success: "bg-white",
    warning: "bg-white",
    danger: "bg-white",
    info: "bg-white",
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant][style]} ${sizes[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
