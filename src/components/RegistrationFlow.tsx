import React, { useState, useCallback, useEffect } from 'react';
import { FormData } from '../types'; 
import ProgressBar from './ProgressBar';
import Step1 from './form-steps/Step1';
import Step2 from './form-steps/Step2';
import { db, auth } from '../firebaseConfig'; 
import { doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { sanitizeProfileData } from '../utils/profileSanitizer'; 
import { env } from '../environment/env';

const TOTAL_STEPS = 2;

const getInitialState = (): FormData => {
  const savedData = localStorage.getItem('bocado-form');
  if (savedData) {
    const data = JSON.parse(savedData);
    return {
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      gender: data.gender || '',
      age: data.age || '',
      country: data.country || '',
      city: data.city || '',
      email: data.email || '',
      password: '',
      confirmPassword: '',
      diseases: Array.isArray(data.diseases) ? data.diseases : [],
      allergies: Array.isArray(data.allergies) ? data.allergies : [],
      otherAllergies: data.otherAllergies || '',
      eatingHabit: data.eatingHabit || '',
      activityLevel: data.activityLevel || '',
      otherActivityLevel: data.otherActivityLevel || '',
      activityFrequency: data.activityFrequency || '',
      nutritionalGoal: Array.isArray(data.nutritionalGoal) ? data.nutritionalGoal : [],
      cookingAffinity: data.cookingAffinity || '',
      dislikedFoods: Array.isArray(data.dislikedFoods) ? data.dislikedFoods : [],
    };
  }
  return {
    firstName: '', lastName: '', gender: '', age: '', country: '', city: '', email: '',
    password: '', confirmPassword: '', diseases: [], allergies: [], otherAllergies: '',
    eatingHabit: '', activityLevel: '', otherActivityLevel: '', activityFrequency: '',
    nutritionalGoal: [], cookingAffinity: '', dislikedFoods: [],
  };
};

interface RegistrationFlowProps {
  onRegistrationComplete: () => void;
  onGoHome: () => void;
}

const RegistrationFlow: React.FC<RegistrationFlowProps> = ({ onRegistrationComplete, onGoHome }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(getInitialState());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  // --- ESTADOS PARA BÚSQUEDA DINÁMICA DE CIUDADES ---
  const [cityOptions, setCityOptions] = useState<any[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);

  useEffect(() => {
    localStorage.setItem('bocado-form', JSON.stringify(formData));
  }, [formData]);

  // --- FUNCIÓN DE BÚSQUEDA GEONAMES (API EXTERNA) ---
  const fetchCities = async (query: string) => {
    if (query.trim().length < 3) {
        setCityOptions([]);
        return;
    }
    
    setIsSearchingCity(true);
    try {
        // Normalizamos el código de país a mayúsculas
        const countryCode = (formData.country || 'MX').toUpperCase(); 
        const username = env.api.geonamesUsername; 
        
        const res = await fetch(
            `https://secure.geonames.org/searchJSON?name_startsWith=${encodeURIComponent(query)}&country=${countryCode}&maxRows=10&username=${username}`
        );
        
        const data = await res.json();

        if (data.status) {
          console.error("GeoNames API Status Error:", data.status.message);
          return;
        }

        setCityOptions(data.geonames || []);
    } catch (error) {
        console.error("Error en fetchCities:", error);
    } finally {
        setIsSearchingCity(false);
    }
  };
  
  const validateStep = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    setSubmissionError('');

    if (currentStep === 1) {
        if (!formData.firstName) newErrors.firstName = 'Nombre requerido';
        if (!formData.lastName) newErrors.lastName = 'Apellido requerido';
        if (!formData.gender) newErrors.gender = 'Selecciona tu género';
        if (!formData.age) newErrors.age = 'Edad requerida';
        if (!formData.country || formData.country.length !== 2) newErrors.country = 'Usa código ISO (ej: MX, ES)';
        if (!formData.city) newErrors.city = 'Busca y selecciona tu ciudad';
        if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';
        if (!formData.password || formData.password.length < 8) newErrors.password = 'Mínimo 8 caracteres';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'No coinciden';
        if (!formData.cookingAffinity) newErrors.cookingAffinity = 'Campo requerido';
    } else if (currentStep === 2) {
        if (formData.nutritionalGoal.length === 0) newErrors.nutritionalGoal = 'Selecciona un objetivo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, formData]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setSubmissionError('');
  
    try {
      // 1. Registro en Backend (Vercel)
      const response = await fetch(env.api.registerUserUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
  
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Error en registro");
  
      // 2. Autenticación en Firebase Client
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password!);
      
      // 3. Obtener perfil completo de Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  
      if (userDoc.exists()) {
        const fullProfileData = sanitizeProfileData({
          ...userDoc.data(),
          email: userCredential.user.email,
          uid: userCredential.user.uid
        });
        
        localStorage.setItem('bocado-profile-data', JSON.stringify(fullProfileData));
        localStorage.removeItem('bocado-form');
        onRegistrationComplete();
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      setSubmissionError(error.message.includes("auth/") ? "Error de credenciales" : "No pudimos crear tu cuenta");
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = async () => {
    if (await validateStep()) {
      if (currentStep < TOTAL_STEPS) setCurrentStep(currentStep + 1);
      else await handleSubmit();
    }
  };

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg w-full max-w-2xl mx-auto transition-all duration-500">
      <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      
      <div className="mt-8">
        {currentStep === 1 ? (
          <Step1 
            data={formData} 
            updateData={updateFormData} 
            errors={errors} 
            cityOptions={cityOptions}
            isSearchingCity={isSearchingCity}
            onSearchCity={fetchCities}
            onClearCityOptions={() => setCityOptions([])}
          />
        ) : (
          <Step2 data={formData} updateData={updateFormData} errors={errors} />
        )}
        {submissionError && <p className="text-red-500 text-sm mt-4 text-center font-medium">{submissionError}</p>}
      </div>

      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={() => setCurrentStep(prev => prev - 1)}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${currentStep === 1 ? 'invisible' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          disabled={isLoading}
        >
          Anterior
        </button>
        
        <button
          onClick={nextStep}
          className="bg-bocado-green text-white font-bold py-3 px-10 rounded-full shadow-lg hover:brightness-95 active:scale-95 transition-all disabled:bg-gray-300 disabled:shadow-none"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Procesando...</span>
            </div>
          ) : (
            currentStep === TOTAL_STEPS ? 'Finalizar' : 'Siguiente'
          )}
        </button>
      </div>

      <div className="mt-6 text-center">
        {!isLoading && (
          <button onClick={onGoHome} className="text-sm text-bocado-green font-semibold hover:underline decoration-2 underline-offset-4">
              Volver al inicio
          </button>
        )}
      </div>
    </div>
  );
};

export default RegistrationFlow;