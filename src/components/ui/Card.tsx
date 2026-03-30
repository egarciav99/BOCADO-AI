import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outlined" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
  rounded?: "none" | "sm" | "md" | "lg" | "xl";
  hover?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  padding = "md",
  rounded = "xl",
  hover = false,
  className = "",
  ...props
}) => {
  // ✅ FIX: dark mode en bg, hover sin translate (mobile-first)
  const baseStyles = "bg-white dark:bg-gray-800 transition-all duration-200";

  const variants = {
    default:  "border border-bocado-border dark:border-gray-700",
    outlined: "border-2 border-bocado-green",
    elevated: "shadow-bocado border border-transparent dark:border-gray-700",
  };

  const paddings = {
    none: "",
    sm:   "p-3",
    md:   "p-4",
    lg:   "p-6",
  };

  const roundedStyles = {
    none: "",
    sm:   "rounded-lg",
    md:   "rounded-xl",
    lg:   "rounded-2xl",
    xl:   "rounded-3xl",
  };

  // ✅ FIX: solo sombra en hover, sin translate — funciona bien en móvil y desktop
  const hoverStyles = hover
    ? "cursor-pointer hover:shadow-bocado-lg"
    : "";

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${roundedStyles[rounded]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// ✅ FIX: displayName en todos los subcomponentes
Card.displayName = "Card";

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
);
CardHeader.displayName = "CardHeader";

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  className = "",
  ...props
}) => (
  <h3
    className={`text-lg font-bold text-bocado-text dark:text-gray-100 ${className}`}
    {...props}
  >
    {children}
  </h3>
);
CardTitle.displayName = "CardTitle";

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  children,
  className = "",
  ...props
}) => (
  <p
    className={`text-sm text-bocado-dark-gray dark:text-gray-400 mt-1 ${className}`}
    {...props}
  >
    {children}
  </p>
);
CardDescription.displayName = "CardDescription";

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);
CardContent.displayName = "CardContent";

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = "",
  ...props
}) => (
  <div
    className={`mt-4 pt-4 border-t border-bocado-border dark:border-gray-700 flex items-center gap-3 ${className}`}
    {...props}
  >
    {children}
  </div>
);
CardFooter.displayName = "CardFooter";

export default Card;