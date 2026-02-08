// stores/authStore.ts - V2: Minimalista, solo estado de sesión
// 
// PRINCIPIO: Este store solo maneja el estado de AUTENTICACIÓN.
// Los datos del PERFIL vienen de TanStack Query (useUserProfile).
// NO duplicar datos entre Zustand y React Query.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from 'firebase/auth';
import { setAnalyticsUser } from '../firebaseConfig';

/**
 * Estado de autenticación - SOLO información de sesión
 * NO incluye: email, nombre, preferencias, etc.
 * Eso viene del perfil vía TanStack Query
 */
interface AuthState {
  // Estado de sesión
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Estado inicial
      user: null,
      isAuthenticated: false,
      isLoading: true,
      
      setUser: (user) => {
        // Sincronizar con Analytics
        if (user?.uid) {
          setAnalyticsUser(user.uid);
        } else {
          setAnalyticsUser(null);
        }
        
        set({ 
          user, 
          isAuthenticated: !!user,
          isLoading: false,
        });
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      logout: () => {
        setAnalyticsUser(null);
        set({ 
          user: null, 
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: 'bocado-auth-v2',
      // Solo persistir estado de sesión, NO datos del user
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================
// SELECTORES TIPADOS (para usar en componentes)
// ============================================

/**
 * Selector para obtener solo el UID del usuario
 * Uso: const uid = useAuthStore(selectUserUid);
 */
export const selectUserUid = (state: AuthState) => state.user?.uid;

/**
 * Selector para verificar si está autenticado
 * Uso: const isAuth = useAuthStore(selectIsAuthenticated);
 */
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;

/**
 * Selector para obtener el estado de carga
 * Uso: const isLoading = useAuthStore(selectIsLoading);
 */
export const selectIsLoading = (state: AuthState) => state.isLoading;
