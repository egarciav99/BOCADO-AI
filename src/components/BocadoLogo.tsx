import React, { useState } from "react";

const BocadoLogo: React.FC<{ className?: string }> = ({ className }) => {
  // ✅ FIX: fallback si la imagen no carga
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <span
        className={`font-bold text-bocado-green inline-block ${className ?? ""}`}
        aria-label="Bocado"
      >
        Bocado
      </span>
    );
  }

  return (
    <img
      src="/Bocado-logo.png"
      // ✅ FIX: alt neutral — nombre del producto
      alt="Bocado"
      className={`h-auto object-contain ${className ?? ""}`}
      onError={() => setImgError(true)}
    />
  );
};

export default BocadoLogo;
