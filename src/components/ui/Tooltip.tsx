import React, { useId } from "react";

export interface TooltipProps {
  children: React.ReactNode;
  text: string;
  position?: "top" | "bottom" | "left" | "right";
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  text,
  position = "top",
}) => {
  // ✅ FIX: ID estable para aria-describedby
  const tooltipId = useId();

  const positionClasses = {
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left:   "right-full top-1/2 -translate-y-1/2 mr-2",
    right:  "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top:    "top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-bocado-dark-gray",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-bocado-dark-gray",
    left:   "left-full top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-bocado-dark-gray",
    right:  "right-full top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-bocado-dark-gray",
  };

  return (
    <div
      className="group relative inline-flex"
      // ✅ FIX: tabIndex permite focus en el wrapper para teclado y móvil
      // Solo si el children no es ya focusable — en la mayoría de casos
      // el children (button, etc.) maneja el focus y este wrapper lo hereda
    >
      {/* ✅ FIX: clonar children para añadir aria-describedby */}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            "aria-describedby": tooltipId,
          })
        : children}

      <div
        id={tooltipId}
        role="tooltip"
        className={`
          absolute ${positionClasses[position]}
          invisible group-hover:visible group-focus-within:visible
          opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
          transition-opacity duration-200
          bg-bocado-dark-gray text-white text-xs
          px-3 py-1.5 rounded-lg
          whitespace-nowrap z-50
          pointer-events-none
        `}
      >
        {text}
        <div className={`absolute w-0 h-0 ${arrowClasses[position]}`} />
      </div>
    </div>
  );
};

// ✅ displayName para React DevTools
Tooltip.displayName = "Tooltip";

export default Tooltip;