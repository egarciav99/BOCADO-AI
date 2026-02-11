import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Variante visual de la tarjeta */
  variant?: 'default' | 'outlined' | 'elevated';
  /** Espaciado interno */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Radio del borde */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Habilitar hover effect */
  hover?: boolean;
  /** Contenido de la tarjeta */
  children: React.ReactNode;
}

/**
 * Componente Card - Contenedor versátil para agrupar contenido
 * 
 * @example
 * <Card variant="elevated" padding="lg">
 *   <h3>Título</h3>
 *   <p>Contenido de la tarjeta</p>
 * </Card>
 */
export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  rounded = 'xl',
  hover = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'bg-white transition-all duration-200';
  
  const variants = {
    default: 'border border-bocado-border',
    outlined: 'border-2 border-bocado-green',
    elevated: 'shadow-bocado border border-transparent',
  };
  
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const roundedStyles = {
    none: '',
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
  };

  const hoverStyles = hover 
    ? 'cursor-pointer hover:shadow-bocado-lg hover:-translate-y-1' 
    : '';

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${roundedStyles[rounded]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Subcomponentes para estructurar el contenido de la tarjeta

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '', ...props }) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '', ...props }) => (
  <h3 className={`text-lg font-bold text-bocado-text ${className}`} {...props}>
    {children}
  </h3>
);

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className = '', ...props }) => (
  <p className={`text-sm text-bocado-dark-gray mt-1 ${className}`} {...props}>
    {children}
  </p>
);

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '', ...props }) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '', ...props }) => (
  <div className={`mt-4 pt-4 border-t border-bocado-border flex items-center gap-3 ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
