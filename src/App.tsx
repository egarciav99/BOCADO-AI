import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import HomeScreen from './components/HomeScreen';
import RegistrationFlow from './components/RegistrationFlow';
import ConfirmationScreen from './components/ConfirmationScreen';
import LoginScreen from './components/LoginScreen';
import PermissionsScreen from './components/PermissionsScreen';
import PlanScreen from './components/PlanScreen';
import MainApp from './components/MainApp';

export type AppScreen = 'home' | 'register' | 'confirmation' | 'login' | 'recommendation' | 'permissions' | 'plan';

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [planId, setPlanId] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentScreen('recommendation');
      } else {
        setCurrentScreen('home');
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bocado-cream">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-bocado-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-bocado-green font-bold animate-pulse">Cargando Bocado...</p>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'permissions':
        return <PermissionsScreen onAccept={() => setCurrentScreen('register')} onGoHome={() => setCurrentScreen('home')} />;
      case 'register':
        return <RegistrationFlow 
                  onRegistrationComplete={() => {
                    setIsNewUser(true);
                    setCurrentScreen('recommendation');
                  }} 
                  onGoHome={() => setCurrentScreen('home')} 
               />;
      case 'confirmation':
        return <ConfirmationScreen onGoHome={() => setCurrentScreen('home')} />;
      case 'login':
        return <LoginScreen 
                  onLoginSuccess={() => {
                    setIsNewUser(false);
                    setCurrentScreen('recommendation');
                  }} 
                  onGoHome={() => setCurrentScreen('home')} 
               />;
      case 'recommendation':
        return <MainApp 
                  showTutorial={isNewUser}
                  onPlanGenerated={(id) => {
                    setPlanId(id);
                    setCurrentScreen('plan');
                  }}
                  onTutorialFinished={() => setIsNewUser(false)}
                  onLogoutComplete={() => setCurrentScreen('home')}
               />;
      case 'plan':
        return <PlanScreen planId={planId!} onStartNewPlan={() => {
          setPlanId(null);
          setCurrentScreen('recommendation');
        }} />;
      case 'home':
      default:
        return <HomeScreen 
                  onStartRegistration={() => setCurrentScreen('permissions')} 
                  onGoToApp={() => setCurrentScreen('recommendation')} 
                  onGoToLogin={() => setCurrentScreen('login')}
                />;
    }
  };

  return (
    <div className="min-h-screen bg-bocado-cream flex justify-center items-start md:items-center md:p-8">
      {/* Contenedor que simula un móvil en desktop */}
      <div className="w-full min-h-screen bg-bocado-background 
                      md:max-w-[480px] md:max-h-[900px] md:min-h-[800px]
                      md:rounded-[2.5rem] md:shadow-bocado-lg 
                      md:border-8 md:border-white
                      overflow-hidden relative flex flex-col">
        {renderScreen()}
      </div>
    </div>
  );
}

export default App;