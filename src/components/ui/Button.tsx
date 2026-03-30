import * as React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = "",
  ...props
}) => {
  // ✅ FIX: hover:scale removido — solo active:scale para mobile-first
  const baseStyles =
    "inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 active:scale-[0.98] min-w-0";

  const variants = {
    primary:
      "bg-bocado-green text-white hover:bg-bocado-green-hover focus:ring-2 focus:ring-bocado-green focus:ring-offset-2 shadow-bocado hover:shadow-bocado-lg dark:bg-bocado-green dark:hover:bg-bocado-dark-green dark:focus:ring-bocado-green/70",
    secondary:
      "bg-bocado-cream text-bocado-dark-gray hover:bg-bocado-border focus:ring-2 focus:ring-bocado-gray focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:focus:ring-gray-500",
    outline:
      "border-2 border-bocado-green text-bocado-green hover:bg-bocado-green hover:text-white focus:ring-2 focus:ring-bocado-green focus:ring-offset-2 dark:border-bocado-green dark:text-bocado-green",
    ghost:
      "text-bocado-dark-gray hover:bg-bocado-cream focus:ring-2 focus:ring-bocado-gray focus:ring-offset-2 dark:text-gray-200 dark:hover:bg-gray-700",
    danger:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-800",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${isLoading ? "opacity-75" : ""} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

// ✅ FIX: displayName para React DevTools
Button.displayName = "Button";

export default Button;