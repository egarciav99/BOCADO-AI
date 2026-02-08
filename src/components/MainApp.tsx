import React, { useState, useEffect } from 'react';
import BottomTabBar, { Tab } from './BottomTabBar';
import RecommendationScreen from './RecommendationScreen';
import PantryScreen from './PantryScreen';
import ProfileScreen from './ProfileScreen';
import SavedRecipesScreen from './SavedRecipesScreen';
import SavedRestaurantsScreen from './SavedRestaurantsScreen';
import TutorialModal from './TutorialModal';
import ErrorBoundary from './ErrorBoundary';
import { auth, trackEvent } from '../firebaseConfig';
import { updateProfile } from 'firebase/auth';
import { useAuthStore } from '../stores/authStore';
import { useUserProfile } from '../hooks/useUser';

interface MainAppProps {
  onPlanGenerated: (id: string) => void;
  showTutorial?: boolean;
  onTutorialFinished: () => void;
  onLogoutComplete: () => void;
}

const MainApp: React.FC<MainAppProps> = ({ 
  onPlanGenerated, 
  showTutorial = false, 
  onTutorialFinished, 
  onLogoutComplete 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('recommendation');
  const [isTutorialOpen, setIsTutorialOpen] = useState(showTutorial);
  
  const { user, isLoading, isAuthenticated } = useAuthStore();
  useUserProfile(user?.uid);

  const userName = user?.displayName?.split(' ')[0] || '';
  const userUid = user?.uid || null;

  useEffect(() => {
    trackEvent('tab_changed', { tab_name: activeTab });
  }, [activeTab]);

  const handleTutorialClose = () => {
    trackEvent('tutorial_closed');
    setIsTutorialOpen(false);
    onTutorialFinished(); 
  };

  const handleLogout = async () => {
    try {
      trackEvent('logout_started', { userId: userUid });
      await auth.signOut();
      onLogoutComplete();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      trackEvent('logout_error');
    }
  };
  
  const handleProfileUpdate = async (newFirstName: string) => {
    if (user) {
      try {
        await updateProfile(user, {
          displayName: `${newFirstName} ${user.displayName?.split(' ').slice(1).join(' ') || ''}`
        });
        useAuthStore.getState().setUser(user);
        trackEvent('display_name_updated');
      } catch (error) {
        console.error("Error actualizando nombre:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-bocado-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-bocado-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-bocado-green font-bold animate-pulse">Sincronizando Bocado...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated || !userUid) return null;

  return (
    // ✅ h-screen y overflow-hidden para contener todo
    <div className="h-screen w-full flex flex-col bg-bocado-background overflow-hidden relative">
      
      {isTutorialOpen && (
        <TutorialModal onClose={handleTutorialClose} userName={userName} />
      )}

      {/* Contenido scrolleable con padding bottom generoso para la barra flotante */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth pb-28">
        <div className="max-w-md mx-auto min-h-full">
          <ErrorBoundary>
            {activeTab === 'recommendation' && (
              <RecommendationScreen 
                key={userUid}
                userName={userName}
                onPlanGenerated={onPlanGenerated}
              />
            )}
            {activeTab === 'pantry' && (
              <div className="p-4 animate-fade-in">
                <PantryScreen userUid={userUid} />
              </div>
            )}
            {activeTab === 'saved' && (
              <div className="p-4 animate-fade-in">
                <SavedRecipesScreen />
              </div>
            )}
            {activeTab === 'restaurants' && (
              <div className="p-4 animate-fade-in">
                <SavedRestaurantsScreen />
              </div>
            )}
            {activeTab === 'profile' && (
              <div className="p-4 animate-fade-in">
                <ProfileScreen 
                  userUid={userUid}
                  onLogout={handleLogout}
                  onProfileUpdate={handleProfileUpdate}
                />
              </div>
            )}
          </ErrorBoundary>
        </div>
      </main>

      {/* ✅ BottomTabBar fuera del scroll, siempre visible */}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default MainApp;