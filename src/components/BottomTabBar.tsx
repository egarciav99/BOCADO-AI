import React from 'react';
import { RestaurantIcon } from './icons/RestaurantIcon';
import { UserIcon } from './icons/UserIcon';
import { BookIcon } from './icons/BookIcon';
import { LocationIcon } from './icons/LocationIcon';
import { HomeIcon } from './icons/HomeIcon';

export type Tab = 'recommendation' | 'pantry' | 'saved' | 'restaurants' | 'profile';

interface BottomTabBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabChange }) => {
  
  const renderTabButton = (id: Tab, label: string, Icon: React.FC<React.SVGProps<SVGSVGElement>>) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => onTabChange(id)}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 pb-safe ${
          isActive ? 'text-bocado-green' : 'text-bocado-gray hover:text-bocado-dark-gray'
        }`}
      >
        <Icon 
          className={`w-6 h-6 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} 
          strokeWidth={isActive ? 2.5 : 1.5}
        />
        <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    // ✅ CAMBIO: De absolute a fixed + glassmorphism flotante
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe">
      {/* Container con efecto Spotify: glassmorphism, sombra hacia arriba, redondeado */}
      <div className="mx-auto max-w-md bg-white/85 backdrop-blur-xl border border-white/50 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] rounded-3xl mb-4 overflow-hidden">
        {/* Tu estructura interna exactamente igual */}
        <div className="h-20 flex justify-between items-center px-2">
          
          {/* IZQUIERDA */}
          <div className="flex flex-1 justify-around">
            {renderTabButton('saved', 'Recetas', BookIcon)}
            {renderTabButton('restaurants', 'Lugares', LocationIcon)}
          </div>

          {/* CENTRO (INICIO) */}
          <div className="flex-shrink-0 mx-2 relative -top-5">
            <button
              onClick={() => onTabChange('recommendation')}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-bocado border-4 border-bocado-background transition-all duration-200 ${
                activeTab === 'recommendation' 
                  ? 'bg-bocado-green text-white scale-110' 
                  : 'bg-white text-bocado-gray hover:text-bocado-green'
              }`}
            >
              <HomeIcon className="w-7 h-7" />
            </button>
            <span className={`absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-[10px] font-bold ${
              activeTab === 'recommendation' ? 'text-bocado-green' : 'text-bocado-gray'
            }`}>
              Inicio
            </span>
          </div>

          {/* DERECHA */}
          <div className="flex flex-1 justify-around">
            {renderTabButton('pantry', 'Mi Cocina', RestaurantIcon)}
            {renderTabButton('profile', 'Perfil', UserIcon)}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default BottomTabBar;