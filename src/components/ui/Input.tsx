import React, { forwardRef } from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Etiqueta del campo */
  label?: string;
  /** Texto de ayuda */
  helperText?: string;
  /** Mensaje de error */
  error?: string;
  /** Tamaño del input */
  size?: 'sm' | 'md' | 'lg';
  /** Icono a la izquierda */
  leftIcon?: React.ReactNode;
  /** Icono a la derecha */
  rightIcon?: React.ReactNode;
  /** Ancho completo */
  fullWidth?: boolean;
}

/**
 * Componente Input - Campo de entrada de texto
 * 
 * @example
 * <Input label="Email" placeholder="ejemplo@correo.com" />
 * <Input label="Contraseña" type="password" error="Contraseña requerida" />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>((
  {
    label,
    helperText,
    error,
    size = 'md',
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    className = '',
    id,
    ...props
  },
  ref
) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseStyles = 'block w-full rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 disabled:bg-bocado-cream disabled:cursor-not-allowed';
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg',
  };

  const hasError = !!error;
  const stateStyles = hasError
    ? 'border-red-500 focus:border-red-500 focus:ring-red-200 text-red-900 placeholder:text-red-300'
    : 'border-bocado-border focus:border-bocado-green focus:ring-bocado-green/20 placeholder:text-bocado-gray';

  const iconPadding = {
    sm: leftIcon ? 'pl-9' : rightIcon ? 'pr-9' : '',
    md: leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '',
    lg: leftIcon ? 'pl-12' : rightIcon ? 'pr-12' : '',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <div className={`${widthClass} ${className}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-bold text-bocado-dark-gray mb-2"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-bocado-gray pointer-events-none
            ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'}`}>
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${baseStyles} ${sizes[size]} ${stateStyles} ${iconPadding[size]}`}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={helperText || error ? `${inputId}-help` : undefined}
          {...props}
        />
        {rightIcon && (
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-bocado-gray pointer-events-none
            ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'}`}>
            {rightIcon}
          </div>
        )}
      </div>
      {(helperText || error) && (
        <p 
          id={`${inputId}-help`}
          className={`mt-2 text-sm ${hasError ? 'text-red-600' : 'text-bocado-dark-gray'}`}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
