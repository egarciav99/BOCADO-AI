import React, { useRef, useEffect, useState } from "react";
import { PORTION_OPTIONS } from "../utils/portionScaler";
import { Users, ChevronRight } from "lucide-react";
import { useTranslation } from "../contexts/I18nContext";

interface PortionSelectorProps {
  value: number;
  onChange: (value: number) => void;
  baseServings?: number;
  className?: string;
}

/**
 * Selector de porciones amigable para escalar recetas
 * Muestra opciones visuales con emojis de personas
 */
const PortionSelector: React.FC<PortionSelectorProps> = ({
  value,
  onChange,
  baseServings = 2,
  className = "",
}) => {
  const { t } = useTranslation();
  const selectedOption =
    PORTION_OPTIONS.find((opt) => opt.value === value) || PORTION_OPTIONS[1]; // Default 2 personas

  // ✅ FIX #5: Scroll indicator state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  // Check if content is scrollable on mount
  useEffect(() => {
    const checkScrollable = () => {
      if (scrollRef.current) {
        const { scrollWidth, clientWidth } = scrollRef.current;
        setShowScrollHint(scrollWidth > clientWidth);
      }
    };

    checkScrollable();
    window.addEventListener("resize", checkScrollable);
    return () => window.removeEventListener("resize", checkScrollable);
  }, []);

  return (
    <div className={`bg-bocado-cream rounded-2xl p-3 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-bocado-green" />
          <span className="text-base font-bold text-bocado-dark-gray">
            {t("portions.title")}
          </span>
        </div>
        <span className="text-sm text-bocado-gray">
          {t("portions.baseRecipe", { baseServings })}
        </span>
      </div>

      {/* Selector horizontal con opciones comunes */}
      {/* ✅ FIX #5: Improved scroll behavior for mobile */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory"
          style={{
            // Prevent scroll bounce/propagation to parent on iOS
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            // Better touch handling
            touchAction: "pan-x",
            // Ensure momentum scrolling works properly
            scrollbarWidth: "none",
          }}
          onScroll={() => setShowScrollHint(false)}
        >
          {PORTION_OPTIONS.slice(0, 6).map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`
                flex flex-col items-center min-w-[60px] py-2 px-3 rounded-xl
                transition-all duration-200 active:scale-95 shrink-0 snap-center
                ${
                  value === option.value
                    ? "bg-bocado-green text-white shadow-md"
                    : "bg-white text-bocado-dark-gray hover:bg-bocado-green/10"
                }
              `}
              style={{
                // ✅ Better touch target - prevents accidental scrolling
                minHeight: "44px",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <span className="text-lg mb-0.5">{option.icon}</span>
              <span className="text-2xs font-bold whitespace-nowrap">
                {option.value}
              </span>
            </button>
          ))}
        </div>

        {/* ✅ Scroll hint indicator (shows on mobile if content overflows) */}
        {showScrollHint && (
          <div
            className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-bocado-cream to-transparent pointer-events-none flex items-center justify-end pr-1 animate-pulse"
            style={{ paddingBottom: "4px" }}
          >
            <ChevronRight className="w-4 h-4 text-bocado-green" />
          </div>
        )}
      </div>

      {/* Opción personalizada (8+) */}
      <div className="mt-2 pt-2 border-t border-bocado-border/30">
        <div className="flex items-center justify-between">
          <span className="text-sm text-bocado-gray">
            {t("portions.moreOptions")}
          </span>
          <div className="flex gap-2">
            {PORTION_OPTIONS.slice(6).map((option) => (
              <button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-bold
                  transition-all duration-200 active:scale-95
                  ${
                    value === option.value
                      ? "bg-bocado-green text-white"
                      : "bg-white text-bocado-dark-gray hover:bg-bocado-green/10"
                  }
                `}
              >
                {option.value} 🎉
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortionSelector;
