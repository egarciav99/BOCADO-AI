import React, { useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { env } from '../environment/env';
import { FormData } from '../types';
import Step1 from './form-steps/Step1';

const RegistrationFlow: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [cityOptions, setCityOptions] = useState([]);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    gender: '', age: '', country: '', city: '', diet: 'Todo', 
    eatingHabit: 'Todo', cookingAffinity: 'Normal', nutritionalGoal: [], // Corregido a array
    activityLevel: 'Sedentario', otherActivityLevel: '', activityFrequency: '',
    allergies: [] as string[], diseases: [] as string[], dislikedFoods: [] as string[],
    otherAllergies: '', otherDiseases: '', notifications: true
    // Agregamos countryName internamente aunque no esté en el interface estricto
  } as any); 

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCountryChange = (code: string, name: string) => {
    setFormData(prev => ({ 
      ...prev, 
      country: code, 
      countryName: name, // Guardamos el nombre legible
      city: '' 
    }));
  };

  const fetchCities = async (query: string) => {
    if (query.trim().length < 3) return;
    setIsSearchingCity(true);
    try {
      // Usamos el código ISO seleccionado
      const url = `https://secure.geonames.org/searchJSON?name_startsWith=${encodeURIComponent(query)}&country=${formData.country}&maxRows=10&username=${env.api.geonamesUsername}`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error("Error en GeoNames");
      const data = await res.json();
      setCityOptions(data.geonames || []);
    } catch (error) {
      console.error("GeoNames Error:", error);
    } finally {
      setIsSearchingCity(false);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password!);
      
      await updateProfile(userCredential.user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      const userRef = doc(db, 'users', userCredential.user.uid);
      
      // Eliminamos contraseñas antes de guardar en Firestore
      const { password, confirmPassword, ...profileData } = formData;

      const finalData = {
        ...profileData,
        uid: userCredential.user.uid,
        createdAt: serverTimestamp(),
        setupComplete: true
      };

      await setDoc(userRef, finalData);
      localStorage.setItem('bocado-profile-data', JSON.stringify(finalData));
      onComplete();
    } catch (error: any) {
      console.error("Submit Error:", error);
      alert("Error: " + error.message);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      {step === 1 && (
        <Step1 
          data={formData} 
          updateData={updateData}
          onCountryChange={handleCountryChange}
          errors={errors}
          cityOptions={cityOptions}
          isSearchingCity={isSearchingCity}
          onSearchCity={fetchCities}
          onClearCityOptions={() => setCityOptions([])}
        />
      )}
      
      {/* Lógica de navegación de pasos */}
      <div className="mt-8 flex gap-4">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 text-gray-500 font-bold">
            Atrás
          </button>
        )}
        <button 
          onClick={() => step === 4 ? handleFinalSubmit() : setStep(s => s + 1)}
          className="flex-[2] bg-bocado-green text-white py-4 rounded-2xl font-bold shadow-lg"
        >
          {step === 4 ? 'Finalizar' : 'Continuar'}
        </button>
      </div>
    </div>
  );
};

export default RegistrationFlow;