import React from "react";

const BocadoLogo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <img
      src="/Bocado-logo.png"
      alt="Bocado IA Logo"
      className={`h-auto object-contain ${className || ""}`}
    />
  );
};

export default BocadoLogo;
