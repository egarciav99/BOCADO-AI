import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "info";
  size?: "sm" | "md" | "lg";
  appearance?: "filled" | "outlined" | "soft";
  dot?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "md",
  appearance = "filled",
  dot = false,
  className = "",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center font-bold rounded-full transition-colors";

  const variants = {
    default: {
      filled:   "bg-bocado-dark-gray text-white",
      outlined: "border-2 border-bocado-dark-gray text-bocado-dark-gray",
      soft:     "bg-bocado-gray/20 text-bocado-dark-gray",
    },
    primary: {
      filled:   "bg-bocado-green text-white",
      outlined: "border-2 border-bocado-green text-bocado-green",
      soft:     "bg-bocado-green/10 text-bocado-green",
    },
    secondary: {
      filled:   "bg-bocado-cream text-bocado-dark-gray",
      outlined: "border-2 border-bocado-border text-bocado-dark-gray",
      soft:     "bg-bocado-cream text-bocado-dark-gray",
    },
    success: {
      filled:   "bg-green-500 text-white",
      outlined: "border-2 border-green-500 text-green-600",
      soft:     "bg-green-100 text-green-700",
    },
    warning: {
      filled:   "bg-amber-500 text-white",
      outlined: "border-2 border-amber-500 text-amber-600",
      soft:     "bg-amber-100 text-amber-700",
    },
    danger: {
      filled:   "bg-red-500 text-white",
      outlined: "border-2 border-red-500 text-red-600",
      soft:     "bg-red-100 text-red-700",
    },
    info: {
      filled:   "bg-blue-500 text-white",
      outlined: "border-2 border-blue-500 text-blue-600",
      soft:     "bg-blue-100 text-blue-700",
    },
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  // ✅ FIX: dot color varía según appearance
  // filled → dot blanco (contrasta con fondo de color)
  // outlined / soft → dot del mismo color del texto (contrasta con fondo claro)
  const getDotColor = (): string => {
    if (appearance === "filled") return "bg-white";
    const textColors: Record<string, string> = {
      default:   "bg-bocado-dark-gray",
      primary:   "bg-bocado-green",
      secondary: "bg-bocado-dark-gray",
      success:   "bg-green-600",
      warning:   "bg-amber-600",
      danger:    "bg-red-600",
      info:      "bg-blue-600",
    };
    return textColors[variant];
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant][appearance]} ${sizes[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0 ${getDotColor()}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

// ✅ FIX: displayName para React DevTools
Badge.displayName = "Badge";

export default Badge;