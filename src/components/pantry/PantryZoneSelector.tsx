// components/pantry/PantryZoneSelector.tsx
import React from 'react';
import { KitchenItem, Zone } from '../../types';
import { RestaurantIcon } from '../icons/RestaurantIcon';
import { ZONES } from './constants';
import { trackEvent } from '../../firebaseConfig';

interface PantryZoneSelectorProps {
  inventory: KitchenItem[];
  onSelectZone: (zone: Zone) => void;
}

export const PantryZoneSelector: React.FC<PantryZoneSelectorProps> = ({ 
  inventory, 
  onSelectZone 
}) => {
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
        <RestaurantIcon className="w-7 h-7 text-bocado-dark-green" />
        <h1 className="text-xl font-bold text-bocado-dark-green">Mi Cocina</h1>
      </div>
      <p className="text-center text-bocado-gray text-xs mb-6">Control de ingredientes</p>

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
                <span className="text-lg font-bold text-bocado-text">{ZONES[zone].label}</span>
              </div>
              <div className="text-xl text-bocado-gray">›</div>
            </div>
            {getBadgeCount(zone) > 0 && (
              <div className="absolute top-3 right-3 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md animate-pulse">
                {getBadgeCount(zone)}
              </div>
            )}
          </button>
        ))}
      </div>

      {urgentItems.length > 0 && (
        <div className="mt-6 bg-white border border-red-100 rounded-2xl p-3 shadow-bocado">
          <div className="flex items-center gap-2 mb-2 border-b border-red-50 pb-2">
            <span className="text-base">🚨</span>
            <h3 className="text-[10px] font-bold text-red-500 uppercase tracking-wide">Por caducar</h3>
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
                <span className="text-[9px] text-bocado-dark-gray truncate w-full text-center mt-1">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
