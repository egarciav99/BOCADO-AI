import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FormData } from '../types';

// Tipo extendido del store
interface ProfileState extends FormData {
  isHydrated: boolean;
  isDirty: boolean;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  updateProfile: (data: Partial<FormData>) => void;
  setProfile: (data: FormData) => void;
  clearProfile: () => void;
  markDirty: (dirty: boolean) => void;
}

// Solo los datos del formulario (sin estado del store)
const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  gender: '',
  age: '',
  weight: '',
  height: '',
  country: '',
  city: '',
  email: '',
  password: '',
  confirmPassword: '',
  diseases: [],
  allergies: [],
  otherAllergies: '',
  eatingHabit: '',
  activityLevel: '',
  otherActivityLevel: '',
  activityFrequency: '',
  nutritionalGoal: [],
  cookingAffinity: '',
  dislikedFoods: [],
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      ...initialFormData,
      isHydrated: false,
      isDirty: false,
      updateField: (field, value) => set((state) => ({ 
        ...state, 
        [field]: value,
        isDirty: true 
      })),
      updateProfile: (data) => set((state) => ({ 
        ...state, 
        ...data,
        isDirty: true 
      })),
      setProfile: (data) => set({ ...data, isHydrated: true, isDirty: false }),
      clearProfile: () => set({ ...initialFormData, isHydrated: true, isDirty: false }),
      markDirty: (dirty) => set({ isDirty: dirty }),
    }),
    {
      name: 'bocado-form-draft',
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    }
  )
);