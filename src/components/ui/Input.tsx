import React, { forwardRef, useId } from "react";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: string;
  error?: string;
  size?: "sm" | "md" | "lg";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      size = "md",
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = "",
      id,
      ...props
    },
    ref,
  ) => {
    // ✅ FIX: useId() en vez de Math.random() — ID estable entre renders
    const generatedId = useId();
    const inputId = id || generatedId;

    // ✅ FIX: focus:scale removido — evita saltos de layout en formularios
    const baseStyles =
      "block w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:border-bocado-green disabled:bg-bocado-cream disabled:cursor-not-allowed min-w-0 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-400";

    const sizes = {
      sm: "px-3 py-2 text-sm",
      md: "px-4 py-3 text-base",
      lg: "px-5 py-4 text-lg",
    };

    const hasError = !!error;
    const stateStyles = hasError
      ? "border-red-500 focus:border-red-500 focus:ring-red-200 text-red-900 placeholder:text-red-300 dark:text-red-400 dark:border-red-600 dark:focus:ring-red-900/30"
      : "border-bocado-border focus:border-bocado-green focus:ring-bocado-green/20 placeholder:text-bocado-gray dark:border-gray-600 dark:focus:ring-bocado-green/30";

    const iconPadding = {
      sm: leftIcon ? "pl-9" : rightIcon ? "pr-9" : "",
      md: leftIcon ? "pl-10" : rightIcon ? "pr-10" : "",
      lg: leftIcon ? "pl-12" : rightIcon ? "pr-12" : "",
    };

    const widthClass = fullWidth ? "w-full" : "";

    return (
      <div className={`${widthClass} ${className}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-bocado-dark-gray dark:text-gray-300 mb-2.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 text-bocado-gray pointer-events-none
                ${size === "sm" ? "text-sm" : size === "md" ? "text-base" : "text-lg"}`}
            >
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`${baseStyles} ${sizes[size]} ${stateStyles} ${iconPadding[size]}`}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              helperText || error ? `${inputId}-help` : undefined
            }
            {...props}
          />
          {rightIcon && (
            <div
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-bocado-gray pointer-events-none
                ${size === "sm" ? "text-sm" : size === "md" ? "text-base" : "text-lg"}`}
            >
              {rightIcon}
            </div>
          )}
        </div>
        {(helperText || error) && (
          <p
            id={`${inputId}-help`}
            className={`mt-2 text-sm ${hasError ? "text-red-600 dark:text-red-400" : "text-bocado-dark-gray dark:text-gray-400"}`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;