import React, { useState } from 'react';
import { 
  Home, 
  UtensilsCrossed, 
  Clock, 
  ChefHat, 
  Sparkles, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import BocadoLogo from './BocadoLogo';

interface RecommendationScreenProps {
  user: any;
  onPlanGenerated: (id: string) => void; 
}

export const RecommendationScreen: React.FC<RecommendationScreenProps> = ({ 
  user, 
  onPlanGenerated 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<'En casa' | 'Fuera'>('En casa');
  const [mealType, setMealType] = useState('Almuerzo');
  const [time, setTime] = useState('30');
  const [cravings, setCravings] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    const payload = {
      userId: user.uid,
      type: location,
      mealType,
      cookingTime: location === 'En casa' ? parseInt(time) : 0,
      cravings: cravings.trim() || 'Ninguno',
      userProfile: {
        firstName: user.displayName?.split(' ')[0] || 'Usuario',
        dislikedFoods: user.dislikedFoods || [],
        allergies: user.allergies || [],
        dietaryGoals: user.dietaryGoals || 'Balanceado'
      }
    };

    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Error al conectar con el motor de IA');
      const result = await response.json();
      onPlanGenerated(result.id || 'new-plan');

    } catch (err: any) {
      setError(err.message || 'No se pudo generar el plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 animate-fade-in flex flex-col min-h-[calc(100vh-40px)] max-w-lg mx-auto">
      
      <div className="text-center mb-2">
        <BocadoLogo className="w-40 -my-8 mx-auto"/>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-bocado-dark-green tracking-tight">
          ¿Qué comeremos hoy?
        </h1>
        <p className="text-bocado-gray font-medium mt-1">
          Personalizado para tu perfil nutricional
        </p>
      </div>

      <div className="space-y-8 overflow-y-auto no-scrollbar pb-24">
        
        {/* Selector de Ubicación con VERDE BOCADO */}
        <section>
          <label className="text-[11px] font-black text-gray-400 uppercase tracking-[2px] mb-4 block">
            ¿DÓNDE PREFIERES?
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setLocation('En casa')}
              className={`group flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all duration-300 ${
                location === 'En casa' 
                ? 'border-bocado-green bg-green-50 text-bocado-green shadow-md shadow-green-100' 
                : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
              }`}
            >
              <Home size={32} className="mb-2" />
              <span className="font-bold text-lg">En Casa</span>
            </button>
            <button
              onClick={() => setLocation('Fuera')}
              className={`group flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all duration-300 ${
                location === 'Fuera' 
                ? 'border-bocado-green bg-green-50 text-bocado-green shadow-md shadow-green-100' 
                : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
              }`}
            >
              <UtensilsCrossed size={32} className="mb-2" />
              <span className="font-bold text-lg">Fuera</span>
            </button>
          </div>
        </section>

        {/* Tipo de comida */}
        <section>
          <label className="text-sm font-bold text-gray-700 mb-3 block">Tipo de comida</label>
          <div className="flex flex-wrap gap-2">
            {['Desayuno', 'Almuerzo', 'Cena', 'Snack'].map((type) => (
              <button
                key={type}
                onClick={() => setMealType(type)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                  mealType === type 
                  ? 'bg-bocado-dark-green text-white shadow-lg' 
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </section>

        {location === 'En casa' && (
          <section className="animate-fade-in">
            <label className="text-sm font-bold text-gray-700 mb-3 block flex items-center gap-2">
              <Clock size={18} className="text-bocado-gray" /> Tiempo disponible
            </label>
            <select 
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-4 bg-gray-50 border-none rounded-2xl text-gray-700 font-bold focus:ring-2 focus:ring-bocado-green outline-none appearance-none cursor-pointer"
            >
              <option value="15">Rápido (15 min)</option>
              <option value="30">Estándar (30 min)</option>
              <option value="60">Con calma (60+ min)</option>
            </select>
          </section>
        )}

        <section>
          <label className="text-sm font-bold text-gray-700 mb-3 block flex items-center gap-2">
            <Sparkles size={18} className="text-bocado-green-light" /> Antojos <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={cravings}
            onChange={(e) => setCravings(e.target.value)}
            placeholder="Ej: Pasta, algo ligero..."
            className="w-full p-4 bg-gray-50 border-none rounded-2xl text-gray-700 focus:ring-2 focus:ring-bocado-green outline-none min-h-[120px] resize-none font-medium"
          />
        </section>
      </div>

      <div className="mt-auto pt-4">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`w-full py-5 rounded-2xl font-black text-white shadow-xl shadow-green-100 flex items-center justify-center gap-3 transition-all active:scale-[0.95] ${
            loading ? 'bg-gray-300' : 'bg-bocado-green hover:bg-bocado-dark-green'
          }`}
        >
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-3 border-white border-t-transparent" />
              <span>Cocinando...</span>
            </div>
          ) : (
            <>
              <ChefHat size={22} />
              <span className="text-lg">Generar Recomendación</span>
              <ChevronRight size={22} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};