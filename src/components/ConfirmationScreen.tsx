import React from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface ConfirmationScreenProps {
  onGoHome: () => void;
}

const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({ onGoHome }) => {
  return (
    <div className="min-h-full flex items-center justify-center px-6 py-12 pt-safe pb-safe">
      <div className="text-center flex flex-col items-center justify-center space-y-6 bg-white p-8 sm:p-10 rounded-3xl shadow-bocado w-full max-w-sm animate-fade-in">
        
        <CheckCircleIcon className="w-16 h-16 sm:w-20 sm:h-20 text-bocado-green"/>
        
        <h1 className="text-xl sm:text-2xl font-bold text-bocado-dark-green leading-tight">
          ¡Gracias por registrarte en Bocado!
        </h1>
        
        <p className="text-base text-bocado-dark-gray">
          Pronto conocerás las mejores opciones pensadas para ti.
        </p>
        
        <button
          onClick={onGoHome}
          className="w-full bg-bocado-green text-white font-bold py-4 px-8 rounded-full text-base shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all mt-4"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
};

export default ConfirmationScreen;
