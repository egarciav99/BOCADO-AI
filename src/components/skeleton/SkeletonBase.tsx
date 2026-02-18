import React from "react";

export interface SkeletonBaseProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

/**
 * Componente base para Skeleton Screens
 * Proporciona animación pulse y variantes de forma
 */
export const SkeletonBase: React.FC<SkeletonBaseProps> = ({
  className = "",
  variant = "text",
  width,
  height,
}) => {
  const baseClasses = "bg-gray-200 animate-pulse";

  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  const styles: React.CSSProperties = {
    width: width,
    height: height,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={styles}
      aria-hidden="true"
    />
  );
};

export default SkeletonBase;
