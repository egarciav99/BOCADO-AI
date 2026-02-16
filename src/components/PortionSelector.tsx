import React from 'react';
import { PORTION_OPTIONS } from '../utils/portionScaler';
import { Users } from 'lucide-react';
import { useTranslation } from '../contexts/I18nContext';

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
  className = ''
}) => {
  const { t } = useTranslation();
  const selectedOption = PORTION_OPTIONS.find(opt => opt.value === value) || PORTION_OPTIONS[1]; // Default 2 personas

  return (
    <div className={`bg-bocado-cream rounded-2xl p-3 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-bocado-green" />
          <span className="text-base font-bold text-bocado-dark-gray">
            {t('portions.title')}
          </span>
        </div>
        <span className="text-sm text-bocado-gray">
          {t('portions.baseRecipe', { baseServings })}
        </span>
      </div>

      {/* Selector horizontal con opciones comunes */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {PORTION_OPTIONS.slice(0, 6).map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              flex flex-col items-center min-w-[60px] py-2 px-3 rounded-xl
              transition-all duration-200 active:scale-95
              ${value === option.value 
                ? 'bg-bocado-green text-white shadow-md' 
                : 'bg-white text-bocado-dark-gray hover:bg-bocado-green/10'
              }
            `}
          >
            <span className="text-lg mb-0.5">{option.icon}</span>
            <span className="text-2xs font-bold whitespace-nowrap">
              {option.value}
            </span>
          </button>
        ))}
      </div>

      {/* Opción personalizada (8+) */}
      <div className="mt-2 pt-2 border-t border-bocado-border/30">
        <div className="flex items-center justify-between">
          <span className="text-sm text-bocado-gray">{t('portions.moreOptions')}</span>
          <div className="flex gap-2">
            {PORTION_OPTIONS.slice(6).map((option) => (
              <button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-bold
                  transition-all duration-200 active:scale-95
                  ${value === option.value 
                    ? 'bg-bocado-green text-white' 
                    : 'bg-white text-bocado-dark-gray hover:bg-bocado-green/10'
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
