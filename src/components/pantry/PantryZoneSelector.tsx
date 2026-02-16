// components/pantry/PantryZoneSelector.tsx
import React from 'react';
import { KitchenItem, Zone } from '../../types';
import { UtensilsCrossed } from '../icons';
import { ZONES } from './constants';
import { trackEvent } from '../../firebaseConfig';
import { useTranslation } from '../../contexts/I18nContext';

interface PantryZoneSelectorProps {
  inventory: KitchenItem[];
  onSelectZone: (zone: Zone) => void;
}

export const PantryZoneSelector: React.FC<PantryZoneSelectorProps> = ({ 
  inventory, 
  onSelectZone 
}) => {
  const { t } = useTranslation();
  
  // Helper para traducir nombres de zona
  const translateZone = (zone: Zone): string => {
    const zoneMap: Record<Zone, string> = {
      'Despensa': t('pantryZones.despensa'),
      'Nevera': t('pantryZones.nevera'),
      'Congelador': t('pantryZones.congelador')
    };
    return zoneMap[zone] || zone;
  };

  // Helper para traducir ingredientes
  const translateIngredient = (name: string): string => {
    const ingredientMap: Record<string, string> = {
      'Aceite': 'aceite', 'Aceitunas': 'aceitunas', 'Ajo': 'ajo',
      'Arroz': 'arroz', 'Atún': 'atun', 'Agua': 'agua',
      'Aguacate': 'aguacate', 'Avena': 'avena', 'Azúcar': 'azucar',
      'Brocoli': 'brocoli', 'Café': 'cafe', 'Calabacín': 'calabacin',
      'Camote': 'camote', 'Carne': 'carne', 'Carne Molida': 'carneMolida',
      'Cebolla': 'cebolla', 'Cerveza': 'cerveza', 'Chícharos': 'chicharos',
      'Chocolate': 'chocolate', 'Comino': 'comino', 'Crema': 'crema',
      'Espinaca': 'espinaca', 'Fresas': 'fresas', 'Frijoles': 'frijoles',
      'Frutos Rojos': 'frutosRojos', 'Galletas': 'galletas', 'Harina': 'harina',
      'Helado': 'helado', 'Hielos': 'hielos', 'Huevos': 'huevos',
      'Hummus': 'hummus', 'Jamón': 'jamon', 'Jugo': 'jugo',
      'Leche': 'leche', 'Lechuga': 'lechuga', 'Lentejas': 'lentejas',
      'Limón': 'limon', 'Maíz': 'maiz', 'Mango': 'mango',
      'Mango Cong.': 'mangoCong', 'Mantequilla': 'mantequilla', 'Manzana': 'manzana',
      'Mariscos': 'mariscos', 'Naranja': 'naranja', 'Nueces': 'nueces',
      'Orégano': 'oregano', 'Pan': 'pan', 'Pan Cong.': 'panCong',
      'Papa': 'papa', 'Papas Cong.': 'papasCong', 'Papas Fritas': 'papasFritas',
      'Pasta': 'pasta', 'Pepino': 'pepino', 'Pescado': 'pescado',
      'Pimienta': 'pimienta', 'Pimiento': 'pimiento', 'Plátano': 'platano',
      'Pollo': 'pollo', 'Pollo Cong.': 'polloCong', 'Queso': 'queso',
      'Refresco': 'refresco', 'Sal': 'sal', 'Salchichas': 'salchichas',
      'Sandía': 'sandia', 'Sardinas': 'sardinas', 'Té': 'te',
      'Tomate': 'tomate', 'Tomate Frito': 'tomateFrito', 'Uvas': 'uvas',
      'Verduras Cong.': 'verdurasCong', 'Vinagre': 'vinagre', 'Vino': 'vino',
      'Yogur': 'yogur', 'Zanahoria': 'zanahoria'
    };
    
    const key = ingredientMap[name];
    return key ? t(`ingredients.${key}`) : name;
  };
  
  const urgentItems = inventory.filter(i => 
    i.freshness === 'expired' || i.freshness === 'soon'
  );

  const getBadgeCount = (zone: Zone) => 
    inventory.filter(i => i.zone === zone && (i.freshness === 'expired' || i.freshness === 'soon')).length;

  const handleSelectZone = (zone: Zone) => {
    trackEvent('pantry_zone_selected', { zone });
    onSelectZone(zone);
  };

  return (
    <div className="flex-1 px-4 pt-4 pb-24 overflow-y-auto">
      <div className="flex items-center justify-center gap-2 mb-1">
        <UtensilsCrossed className="w-7 h-7 text-bocado-dark-green" />
        <h1 className="text-xl font-bold text-bocado-dark-green">{t('pantry.title')}</h1>
      </div>
      <p className="text-center text-bocado-gray text-sm mb-6">{t('pantry.subtitle')}</p>

      <div className="space-y-3">
        {(Object.keys(ZONES) as Zone[]).map(zone => (
          <button
            key={zone}
            onClick={() => handleSelectZone(zone)}
            className={`w-full relative p-5 rounded-2xl border transition-all duration-200 active:scale-[0.98] shadow-sm ${ZONES[zone].color}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{ZONES[zone].emoji}</span>
                <span className="text-lg font-bold text-bocado-text">{translateZone(zone)}</span>
              </div>
              <div className="text-xl text-bocado-gray">›</div>
            </div>
            {getBadgeCount(zone) > 0 && (
              <div className="absolute top-3 right-3 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-2xs shadow-md animate-pulse">
                {getBadgeCount(zone)}
              </div>
            )}
          </button>
        ))}
      </div>

      {urgentItems.length > 0 && (
        <div className="mt-6 bg-white border border-red-100 rounded-2xl p-3 shadow-bocado">
          <div className="flex items-center gap-2 mb-2 border-b border-red-50 pb-2">
            <span className="text-base">{t('pantry.urgentBadge')}</span>
            <h3 className="text-2xs font-bold text-red-500 uppercase tracking-wide">{t('pantry.urgentTitle')}</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {urgentItems.slice(0, 5).map(item => (
              <div key={item.id} className="flex flex-col items-center min-w-[50px]">
                <div className={`w-8 h-8 flex items-center justify-center rounded-full border ${
                  item.freshness === 'fresh' ? 'border-green-400/50 bg-green-50/30' :
                  item.freshness === 'soon' ? 'border-yellow-400/50 bg-yellow-50/30' :
                  'border-red-500/50 bg-red-50/30'
                }`}>
                  <span className="text-base">{item.emoji}</span>
                </div>
                <span className="text-2xs text-bocado-dark-gray truncate w-full text-center mt-1">{translateIngredient(item.name)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
