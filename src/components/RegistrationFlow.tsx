// ⚠️ IMPORTANTE - INTERNACIONALIZACIÓN:
// Este componente GUARDA datos en Firebase. Los datos SIEMPRE deben estar en ESPAÑOL.
// - formData contiene valores en español de constants.ts
// - NO uses t() para traducir valores que se guardan
// - Solo traduce la UI (títulos, botones, mensajes)
// Ver: docs/i18n-architecture.md

import React, { useState, useCallback, useEffect } from "react";
import { useProfileDraftStore } from "../stores/profileDraftStore";
import { FormData, UserProfile } from "../types";
import ProgressBar from "./ProgressBar";
import Step1 from "./form-steps/Step1";
import Step2 from "./form-steps/Step2";
import Step3 from "./form-steps/Step3";
import { db, auth, trackEvent } from "../firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { separateUserData } from "../utils/profileSanitizer";
import { logger } from "../utils/logger";
import {
  searchCities,
  getPlaceDetails,
  PlacePrediction,
} from "../services/mapsService";
import { useTranslation } from "../contexts/I18nContext";
import { cleanForFirestore } from "../utils/cleanForFirestore";

// ✅ CORRECCIÓN ERRORES 2305: Asegúrate que en userSchema.ts
// los nombres coincidan exactamente (ej. userStep1Schema o step1Schema)
import { step1Schema, step2Schema, step3Schema } from "../schemas/userSchema";

const TOTAL_STEPS = 3;

interface RegistrationFlowProps {
  onRegistrationComplete: () => void;
  onGoHome: () => void;
  isGoogleUser?: boolean; // ✅ Bug 6: usuario que ya se autenticó con Google
}

const RegistrationFlow: React.FC<RegistrationFlowProps> = ({
  onRegistrationComplete,
  onGoHome,
  isGoogleUser = false,
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  // ✅ Bug 7: checkbox de términos y condiciones (obligatorio en el último paso)
  const [acceptTerms, setAcceptTerms] = useState(false);
  const queryClient = useQueryClient();

  const [cityOptions, setCityOptions] = useState<PlacePrediction[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>("");

  // V2: Usar la estructura anidada del store
  const formData = useProfileDraftStore((state) => state.formData) as FormData;
  const updateField = useProfileDraftStore((state) => state.updateFormField);
  const updateFormData = useProfileDraftStore((state) => state.updateFormData);
  const clearDraft = useProfileDraftStore((state) => state.clearDraft);
  const isHydrated = useProfileDraftStore((state) => state.isHydrated);

  useEffect(() => {
    if (isHydrated) {
      trackEvent("registration_step_view", {
        step_number: currentStep,
        step_name: `step_${currentStep}`,
      });
    }
  }, [currentStep, isHydrated]);

  // ✅ AUDITORÍA: Detectar abandono del registro al desmontar el componente
  const isCompletedRef = React.useRef(false);
  const currentStepRef = React.useRef(currentStep);

  // Keep currentStepRef in sync with currentStep
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // ✅ FIX: cleanup only on unmount (empty dep array)
  // Using currentStep in deps caused this to re-register on every step change,
  // losing the closure and making the abandonment step number stale
  useEffect(() => {
    return () => {
      if (!isCompletedRef.current) {
        trackEvent("registration_abandoned", {
          step_number: currentStepRef.current,
          step_name: `step_${currentStepRef.current}`,
          total_steps: TOTAL_STEPS,
        });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally mount/unmount only

  const validateStep = useCallback(async () => {
    setSubmissionError("");
    let result;

    if (currentStep === 1) {
      if (isGoogleUser) {
        // Para usuarios de Google, validar solo nombre/apellido/género/edad/país/ciudad
        // sin email ni contraseña (ya autenticados)
        const googleStep1Schema = step1Schema.omit({
          email: true,
          password: true,
          confirmPassword: true,
        } as any);
        result = googleStep1Schema.safeParse(formData);
      } else {
        result = step1Schema.safeParse(formData);
      }
    } else if (currentStep === 2) {
      result = step2Schema.safeParse(formData);
    } else if (currentStep === 3) {
      result = step3Schema.safeParse(formData);
    } else {
      return true;
    }

    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      // ✅ CORRECCIÓN ERROR 7006: Tipado explícito para 'issue'
      result.error.issues.forEach((issue: any) => {
        const path = issue.path[0] as string;
        formattedErrors[path] = issue.message;
      });
      setErrors(formattedErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [currentStep, formData, isGoogleUser]);

  const validateStep2 = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    // Validate nutritionalGoal
    if (!formData.nutritionalGoal || formData.nutritionalGoal.length === 0) {
      newErrors.nutritionalGoal = t("common.errors.selectAtLeastOneGoal");
    }
    
    // Validate otherAllergies if "Otro" is selected
    if (formData.allergies?.includes("Otro") && !formData.otherAllergies?.trim()) {
      newErrors.otherAllergies = t("common.errors.specifyAllergy");
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    
    setErrors({});
    return true;
  }, [formData, t]);

  const validateStep3 = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    // Validate activityLevel
    if (!formData.activityLevel) {
      newErrors.activityLevel = t("common.errors.selectActivityLevel");
    }
    
    // Validate activityFrequency (required unless sedentary)
    if (formData.activityLevel && formData.activityLevel !== "🪑 Sedentario" && !formData.activityFrequency) {
      newErrors.activityFrequency = t("common.errors.selectActivityFrequency");
    }
    
    // Validate otherActivityLevel if "Otro" is selected
    if (formData.activityLevel === "Otro" && !formData.otherActivityLevel?.trim()) {
      newErrors.otherActivityLevel = t("common.errors.describeActivityLevel");
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    
    setErrors({});
    return true;
  }, [formData, t]);

  const checkEmailAvailability = useCallback(async (email: string): Promise<boolean> => {
    try {
      setIsCheckingEmail(true);
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.status === 409) {
        setErrors(prev => ({
          ...prev,
          email: t("common.errors.emailAlreadyInUse")
        }));
        return false;
      }

      if (!response.ok) {
        logger.warn("Email check failed with status:", response.status);
        // Don't block registration if check fails for other reasons
        return true;
      }

      return true;
    } catch (error) {
      logger.error("Error checking email availability:", error);
      // Don't block registration if check fails
      return true;
    } finally {
      setIsCheckingEmail(false);
    }
  }, [t]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setSubmissionError("");

    try {
      const { auth: authData, profile } = separateUserData(formData);

      let user;

      if (isGoogleUser) {
        // ✅ Bug 6: usuario de Google ya está autenticado, solo guardar perfil
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setSubmissionError("Sesión de Google no encontrada. Intenta de nuevo.");
          setIsLoading(false);
          return;
        }
        user = currentUser;
        // Actualizar displayName si cambió en el formulario
        const displayName = `${authData.firstName} ${authData.lastName}`;
        if (currentUser.displayName !== displayName) {
          await updateProfile(currentUser, { displayName });
        }
      } else {
        // Flujo estándar: crear usuario con email/password
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          authData.email,
          authData.password!,
        );
        user = userCredential.user;
        // Clear sensitive data immediately after use
        updateFormData({ password: "", confirmPassword: "" });

        const displayName = `${authData.firstName} ${authData.lastName}`;
        await updateProfile(user, { displayName });
      }

      // Obtener coordenadas de la ciudad si hay placeId
      let location = undefined;
      const cityPlaceId = (formData as any).cityPlaceId;

      if (cityPlaceId) {
        try {
          const placeDetails = await getPlaceDetails(cityPlaceId);
          if (placeDetails) {
            location = {
              lat: placeDetails.lat,
              lng: placeDetails.lng,
            };
          }
        } catch (error) {
          logger.warn("Error obteniendo coordenadas de la ciudad:", error);
        }
      }

      const userProfile: UserProfile = {
        uid: user.uid,
        gender: profile.gender,
        age: profile.age,
        weight: profile.weight,
        height: profile.height,
        country: profile.country.toUpperCase(),
        city: profile.city,
        location,
        locationEnabled: false, // El usuario debe activarlo después
        diseases: profile.diseases,
        allergies: profile.allergies,
        otherAllergies: profile.otherAllergies,
        eatingHabit: profile.eatingHabit,
        activityLevel: profile.activityLevel,
        otherActivityLevel: profile.otherActivityLevel,
        activityFrequency: profile.activityFrequency,
        nutritionalGoal: profile.nutritionalGoal,
        cookingAffinity: profile.cookingAffinity,
        dislikedFoods: profile.dislikedFoods,
        emailVerified: false,
        createdAt: serverTimestamp() as UserProfile["createdAt"],
        updatedAt: serverTimestamp() as UserProfile["updatedAt"],
      };

      const cleanedProfile = cleanForFirestore(userProfile);
      await setDoc(doc(db, "users", user.uid), cleanedProfile);

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Perfil guardado para uid:", user.uid.substring(0, 8) + "...");
      }

      queryClient.invalidateQueries({ queryKey: ["userProfile", user.uid] });

      // Solo enviar verificación de email si no es usuario de Google
      // (Google ya verifica emails automáticamente)
      if (!isGoogleUser) {
        await sendEmailVerification(user);
      }

      trackEvent("registration_complete", {
        nutritional_goal: profile.nutritionalGoal.join(", "),
        country: profile.country,
      });

      // ✅ AUDITORÍA: Marcar registro como completado antes de limpiar
      isCompletedRef.current = true;

      clearDraft();

      if (isGoogleUser) {
        // Usuario de Google: no necesita verificar email, ir directo
        onRegistrationComplete();
      } else {
        setRegisteredEmail(authData.email);
        setShowVerificationModal(true);
      }
    } catch (error: any) {
      logger.error("Error en registro:", error);
      trackEvent("registration_failed", {
        error_code: error.code || "unknown_error",
        step: currentStep,
      });

      if (error.code === "auth/email-already-in-use") {
        setSubmissionError(t("common.errors.emailAlreadyInUse"));
        setCurrentStep(1);
      } else {
        setSubmissionError("Error al crear cuenta. Intenta de nuevo.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationComplete = async () => {
    setVerificationError("");
    setIsCheckingVerification(true);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        setVerificationError(t("registrationFlow.verificationSessionExpired") || "Sesión expirada. Por favor, inicia sesión de nuevo.");
        return;
      }
      
      // Reload user to get fresh emailVerified status from Firebase
      await user.reload();
      
      if (!user.emailVerified) {
        trackEvent("registration_email_not_verified_attempt", { userId: user.uid });
        setVerificationError(t("registrationFlow.emailNotVerifiedYet") || "Aún no has verificado tu correo. Revisa tu bandeja de entrada y haz clic en el enlace de verificación.");
        return;
      }
      
      trackEvent("registration_email_verified_success", { userId: user.uid });
      setShowVerificationModal(false);
      onRegistrationComplete();
    } catch (error) {
      logger.error("Error checking email verification", error);
      setVerificationError(t("registrationFlow.verificationCheckError") || "Error al verificar. Intenta de nuevo.");
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    setVerificationError("");
    try {
      const user = auth.currentUser;
      if (user && !user.emailVerified) {
        await sendEmailVerification(user);
        trackEvent("registration_verification_resent", { userId: user.uid });
        setVerificationError(t("registrationFlow.verificationResent") || "Correo de verificación reenviado.");
      }
    } catch (error) {
      logger.error("Error resending verification email", error);
      setVerificationError(t("registrationFlow.resendError") || "Error al reenviar. Intenta en unos minutos.");
    }
  };

  const nextStep = async () => {
    // Check terms acceptance on last step
    if (currentStep === TOTAL_STEPS && !acceptTerms) {
      setSubmissionError(
        t("registrationFlow.mustAcceptTerms") ||
          "Debes aceptar los Términos y Condiciones para continuar.",
      );
      return;
    }

    // Validate current step
    if (currentStep === 1) {
      const isValid = await validateStep();
      if (!isValid) return;

      // Check password confirmation
      if (!isGoogleUser && formData.password !== formData.confirmPassword) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: t("common.errors.passwordsDoNotMatch")
        }));
        return;
      }

      // Check email availability
      if (!isGoogleUser) {
        const emailAvailable = await checkEmailAvailability(formData.email);
        if (!emailAvailable) return;
      }

      setCurrentStep(currentStep + 1);
    } else if (currentStep === 2) {
      const isValid = validateStep2();
      if (!isValid) return;
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 3) {
      const isValid = validateStep3();
      if (!isValid) return;
      await handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setSubmissionError("");
      setCurrentStep(currentStep - 1);
    }
  };

  const updateFormDataFn = (field: keyof FormData, value: any) => {
    updateField(field, value);
  };

  const handleSearchCity = async (query: string) => {
    if (!formData.country || query.length < 2) {
      setCityOptions([]);
      return;
    }
    setIsSearchingCity(true);
    try {
      const predictions = await searchCities(query, formData.country);
      setCityOptions(predictions);
    } catch (error) {
      logger.error("Error buscando ciudades:", error);
      setCityOptions([]);
    } finally {
      setIsSearchingCity(false);
    }
  };

  const handleClearCityOptions = () => setCityOptions([]);

  const handleCountryChange = (code: string) => {
    updateField("country", code);
    updateField("city", "");
    updateField("cityPlaceId", "");
    setSelectedPlaceId("");
  };

  const renderStep = () => {
    const commonProps = {
      data: formData,
      updateData: updateFormDataFn,
      errors,
      setErrors,
    };
    switch (currentStep) {
      case 1:
        return (
          <Step1
            {...commonProps}
            hidePasswordFields={isGoogleUser}
            disableEmail={isGoogleUser}
            cityOptions={cityOptions}
            isSearchingCity={isSearchingCity}
            onSearchCity={handleSearchCity}
            onClearCityOptions={handleClearCityOptions}
            onCountryChange={handleCountryChange}
          />
        );
      case 2:
        return <Step2 {...commonProps} />;
      case 3:
        return <Step3 {...commonProps} />;
      default:
        return null;
    }
  };

  if (!isHydrated) {
    return (
      <div className="min-h-full flex items-center justify-center bg-bocado-cream">
        <div className="w-12 h-12 border-4 border-bocado-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showVerificationModal) {
    return (
      <div className="min-h-full flex items-center justify-center px-4 py-6 pt-safe pb-safe">
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-bocado w-full max-w-sm text-center animate-fade-in">
          <div className="w-14 h-14 bg-bocado-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-bocado-green"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-bocado-dark-green mb-2">
            {t("registrationFlow.verifyEmailTitle")}
          </h2>
          <p className="text-sm text-bocado-gray mb-4">
            {t("registrationFlow.sentTo")}{" "}
            <strong className="text-bocado-text break-all">
              {registeredEmail}
            </strong>
          </p>
          {verificationError && (
            <p className={`text-xs p-3 rounded-xl mb-4 animate-fade-in ${
              verificationError.includes("reenviado") || verificationError.includes("Resent")
                ? "text-bocado-green bg-green-50"
                : "text-red-500 bg-red-50"
            }`}>
              {verificationError}
            </p>
          )}
          <button
            onClick={handleVerificationComplete}
            disabled={isCheckingVerification}
            className="w-full bg-bocado-green text-white font-bold py-3 px-6 rounded-full text-sm shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCheckingVerification ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                {t("registrationFlow.checking") || "Verificando..."}
              </span>
            ) : (
              t("registrationFlow.alreadyVerified")
            )}
          </button>
          <button
            onClick={handleResendVerification}
            disabled={isCheckingVerification}
            className="w-full mt-3 text-bocado-green font-medium py-2 px-6 text-sm hover:underline disabled:opacity-50"
          >
            {t("registrationFlow.resendVerification") || "Reenviar correo de verificación"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col px-4 pt-safe pb-4">
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full min-h-0">
        <div className="mt-4 mb-6">
          <ProgressBar 
            currentStep={currentStep} 
            totalSteps={TOTAL_STEPS}
            isCompleted={isCompletedRef.current}
          />
        </div>

        <div className="flex-1 relative overflow-y-auto no-scrollbar">
          {/* ✅ CORRECCIÓN ERROR 2304: Cambiado 'renderScreen' por 'renderStep' */}
          {renderStep()}
          {submissionError && (
            <p className="text-red-500 text-xs text-center bg-red-50 p-3 rounded-xl mt-4 animate-fade-in">
              {submissionError}
            </p>
          )}
        </div>

        <div className="mt-4 space-y-3 pb-safe">
          {/* ✅ Bug 7: checkbox de Términos y Condiciones — solo en el último paso */}
          {currentStep === TOTAL_STEPS && (
            <label className="flex items-start gap-3 cursor-pointer group px-1">
              <input
                type="checkbox"
                id="accept-terms"
                checked={acceptTerms}
                onChange={(e) => {
                  setAcceptTerms(e.target.checked);
                  if (e.target.checked) setSubmissionError("");
                }}
                className="mt-0.5 w-4 h-4 accent-bocado-green flex-shrink-0 cursor-pointer"
              />
              <span className="text-xs text-bocado-dark-gray dark:text-gray-300 leading-relaxed group-hover:text-bocado-text">
                {t("registrationFlow.termsPrefix") || "Acepto los "}
                <a
                  href="/terminos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bocado-green font-semibold underline hover:text-bocado-dark-green"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("registrationFlow.termsLink") || "Términos y Condiciones"}
                </a>
                {" "}{t("registrationFlow.termsSuffix") || "de uso de BOCADO."}
              </span>
            </label>
          )}

          <div className="flex justify-between gap-3">
            <button
              onClick={prevStep}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${currentStep === 1 ? "invisible" : "bg-bocado-background text-bocado-dark-gray hover:bg-bocado-border active:scale-95"}`}
              disabled={isLoading}
            >
              {t("registrationFlow.previous")}
            </button>
            <button
              data-testid={
                currentStep === TOTAL_STEPS ? "submit-button" : "next-button"
              }
              onClick={nextStep}
              className={`flex-1 bg-bocado-green text-white font-bold py-3 rounded-xl text-sm shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all ${
                currentStep === TOTAL_STEPS && !acceptTerms
                  ? "opacity-50 cursor-not-allowed"
                  : "disabled:bg-bocado-gray disabled:opacity-50"
              }`}
              disabled={isLoading || isCheckingEmail || (currentStep === TOTAL_STEPS && !acceptTerms)}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {t("registrationFlow.creating")}
                </span>
              ) : isCheckingEmail ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {t("registrationFlow.checking") || "Verificando..."}
                </span>
              ) : currentStep === TOTAL_STEPS ? (
                t("registrationFlow.createAccount")
              ) : (
                t("registrationFlow.next")
              )}
            </button>
          </div>
          <button
            onClick={onGoHome}
            className="w-full text-xs text-bocado-gray font-medium hover:text-bocado-dark-gray transition-colors py-2"
            disabled={isLoading}
          >
            {t("registrationFlow.backToHome")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationFlow;
