import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useLayoutEffect,
} from "react";
import { FormData, UserProfile } from "../types";
import {
  User,
  Lock,
  Download,
  Trash2,
  AlertTriangle,
  FileText,
  Bell,
} from "./icons";
import Step1 from "./form-steps/Step1";
import Step2 from "./form-steps/Step2";
import Step3 from "./form-steps/Step3";
import NotificationSettings from "./NotificationSettings";
import NotificationTokensAdmin from "./NotificationTokensAdmin";
import { db, auth, trackEvent } from "../firebaseConfig";
import { useDebouncedValue } from "../hooks/useDebounce";
import {
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail,
  sendEmailVerification,
  updateProfile,
  deleteUser,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  linkWithPopup,
  unlink,
} from "firebase/auth";
import {
  sanitizeProfileData,
  separateUserData,
  safeLog,
} from "../utils/profileSanitizer";
import {
  translateDisease,
  translateAllergy,
  translateGoal,
  translateActivityLevel,
  translateActivityFrequency,
  translateCookingAffinity,
  translateGender,
  translateFood,
} from "../utils/profileTranslations";
import { useUserProfile, useUpdateUserProfile } from "../hooks/useUser";
import { useAuthStore } from "../stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { env } from "../environment/env";
import { ADMIN_UIDS } from "../config/featureFlags";
import {
  searchCities,
  getPlaceDetails,
  PlacePrediction,
} from "../services/mapsService";
import { ProfileSkeleton } from "./skeleton";
import { useTranslation } from "../contexts/I18nContext";
import { useTheme } from "../contexts/ThemeContext";
import { useEscapeKey } from "../hooks/useEscapeKey";

interface ProfileScreenProps {
  onLogout?: () => void;
  onProfileUpdate: (fullName: string) => void;
  userUid: string;
}

import { stripLeadingEmoji } from "../utils/emojiUtils";

// Strip registration-time sentinel values so the profile editor starts clean.
// The recommend API uses ["Ninguna"] / ["Ninguno"] as a placeholder when the
// user skips a field at registration. Keeping them in the form would cause
// toggleSelection to append to ["Ninguna"], storing ["Ninguna", "Diabetes"].
const stripSentinels = (arr: string[] | undefined): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (v) => v !== "Ninguna" && v !== "Ninguno" && v !== "Sin especificar",
  );
};

const buildFormData = (
  user: any,
  profile: UserProfile | null | undefined,
): FormData => {
  const nameParts = user?.displayName?.split(" ") || ["", ""];
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return {
    firstName,
    lastName,
    email: user?.email || "",
    password: "",
    confirmPassword: "",
    gender: profile?.gender || "",
    age: profile?.age || "",
    weight: profile?.weight || "",
    height: profile?.height || "",
    country: profile?.country || "",
    city: profile?.city || "",
    // Strip sentinel values — see comment above
    diseases: stripSentinels(profile?.diseases),
    allergies: stripSentinels(profile?.allergies),
    otherAllergies: profile?.otherAllergies || "",
    eatingHabit: profile?.eatingHabit || "",
    activityLevel: profile?.activityLevel || "",
    otherActivityLevel: profile?.otherActivityLevel || "",
    activityFrequency: profile?.activityFrequency || "",
    nutritionalGoal: stripSentinels(profile?.nutritionalGoal),
    cookingAffinity: profile?.cookingAffinity || "",
    dislikedFoods: stripSentinels(profile?.dislikedFoods),
  } as FormData;
};

const InfoSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="mb-4">
    <h3 className="label-base">
      {title}
    </h3>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

const Badge: React.FC<{
  text: string;
  color: "green" | "blue" | "red" | "gray" | "yellow";
  title?: string;
}> = ({ text, color, title }) => {
  const colors = {
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-bocado-background text-bocado-dark-gray",
    yellow: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span
      title={title}
      className={`px-2.5 py-1 text-xs font-medium rounded-full ${colors[color]}`}
    >
      {text}
    </span>
  );
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onLogout,
  onProfileUpdate,
  userUid,
}) => {
  const { t, locale, setLocale } = useTranslation();
  const { theme, setTheme } = useTheme();
  const isAdmin = ADMIN_UIDS.includes(userUid);
  const [viewMode, setViewMode] = useState<
    | "view"
    | "edit"
    | "changePassword"
    | "changeEmail"
    | "exportData"
    | "deleteAccount"
    | "adminNotifications"
  >("view");
  const [showNotificationSettings, setShowNotificationSettings] =
    useState(false);

  const { user } = useAuthStore();
  const updateDisplayName = useAuthStore((state) => state.updateDisplayName);
  const { data: profile, isLoading: isProfileLoading } =
    useUserProfile(userUid);
  const updateProfileMutation = useUpdateUserProfile();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<FormData>(() =>
    buildFormData(user, profile),
  );
  const [initialFormData, setInitialFormData] = useState<FormData>(() =>
    buildFormData(user, profile),
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // Estados para eliminación de cuenta
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportedData, setExportedData] = useState<any>(null);

  // Estados para account linking
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false);
  const [confirmUnlinkGoogle, setConfirmUnlinkGoogle] = useState(false);

  // FIX #6 (ALTA): Estados de loading independientes
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // FIX #15 (ALTA): Unsaved changes warning
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const [cityOptions, setCityOptions] = useState<PlacePrediction[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Ref for timeout cleanup
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  // ✅ ANALÍTICA: Trackeo de entrada a la pantalla
  useEffect(() => {
    trackEvent("profile_screen_view", { userId: userUid });
  }, [userUid]);

  useEffect(() => {
    if (viewMode === "adminNotifications" && !isAdmin) {
      setViewMode("view");
    }
  }, [viewMode, isAdmin]);

  // Sync form data from Firestore — ONLY when in view mode (not while editing)
  // Without this guard, background refetches would overwrite the user's in-progress edits
  useEffect(() => {
    if (viewMode !== "view") return;
    const data = buildFormData(user, profile);
    setFormData(data);
    setInitialFormData(data);
  }, [user, profile, viewMode]);

  // Debounce hook para búsqueda de ciudades - usar hook reutilizable
  const [cityQuery, setCityQuery] = useState("");
  const debouncedCityQuery = useDebouncedValue(cityQuery, { delay: 500 });

  useEffect(() => {
    let isMounted = true;
    
    const fetchCitiesAsync = async () => {
      if (debouncedCityQuery.trim().length >= 3) {
        setIsSearchingCity(true);
        try {
          const countryCode = (formData.country || "MX").toUpperCase();
          const predictions = await searchCities(debouncedCityQuery, countryCode);
          if (isMounted) {
            setCityOptions(predictions);
          }
        } catch (error) {
          if (isMounted) {
            safeLog("error", "Error buscando ciudades", error);
          }
        } finally {
          if (isMounted) {
            setIsSearchingCity(false);
          }
        }
      } else {
        setCityOptions([]);
      }
    };
    
    fetchCitiesAsync();
    
    return () => {
      isMounted = false;
    };
  }, [debouncedCityQuery, formData.country]);

  // Wrapper para mantener compatibilidad con el componente existente
  const handleCitySearch = (query: string) => {
    setCityQuery(query);
  };

  // FIX #7 (ALTA): Helper para limpiar mensajes al cambiar viewMode
  const goToView = useCallback(() => {
    setViewMode("view");
    setSuccessMessage("");
    setError("");
    setShowUnsavedWarning(false);
  }, []);

  // FIX #15 (ALTA): Detectar cambios no guardados
  const hasUnsavedChanges = useMemo(() => {
    if (viewMode !== "edit") return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData, viewMode]);

  // FIX #15 (ALTA): Handler para cancelar edición con warning
  const handleCancelEdit = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      goToView();
    }
  }, [hasUnsavedChanges, goToView]);

  // FIX #15 (ALTA): Confirmar descarte de cambios
  const confirmDiscard = useCallback(() => {
    setShowUnsavedWarning(false);
    setFormData(initialFormData);
    goToView();
  }, [initialFormData, goToView]);

  const handleSaveProfile = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !userUid) {
      setError(t("profile.errors.sessionExpired"));
      return;
    }

    setError("");

    try {
      const { auth: authData, profile: profileData } =
        separateUserData(formData);

      const newDisplayName = `${authData.firstName} ${authData.lastName}`;
      if (currentUser.displayName !== newDisplayName) {
        await updateProfile(currentUser, { displayName: newDisplayName });
        updateDisplayName(newDisplayName);
      }

      // Obtener coordenadas de la ciudad si hay placeId seleccionado
      let location = profile?.location;
      if (selectedPlaceId) {
        try {
          const placeDetails = await getPlaceDetails(selectedPlaceId);
          if (placeDetails) {
            location = {
              lat: placeDetails.lat,
              lng: placeDetails.lng,
            };
          }
        } catch (error) {
          safeLog("warn", "Error obteniendo coordenadas de la ciudad:", error);
        }
      }

      const userProfile: UserProfile = {
        uid: userUid,
        gender: profileData.gender,
        age: profileData.age,
        weight: profileData.weight,
        height: profileData.height,
        country: profileData.country.toUpperCase(),
        city: profileData.city,
        location,
        locationEnabled: profile?.locationEnabled || false,
        // Strip sentinels again before writing — defensive in case any old
        // ["Ninguna"] value leaked through from a cached/stale form state
        diseases: stripSentinels(profileData.diseases),
        allergies: stripSentinels(profileData.allergies),
        otherAllergies: profileData.otherAllergies,
        eatingHabit: profileData.eatingHabit,
        activityLevel: profileData.activityLevel,
        otherActivityLevel: profileData.otherActivityLevel,
        activityFrequency: profileData.activityFrequency,
        nutritionalGoal: stripSentinels(profileData.nutritionalGoal),
        cookingAffinity: profileData.cookingAffinity,
        dislikedFoods: stripSentinels(profileData.dislikedFoods),
        updatedAt: serverTimestamp() as UserProfile["updatedAt"],
      };

      await updateProfileMutation.mutateAsync({
        userId: userUid,
        data: userProfile,
      });
      // The mutation's optimistic update + onSettled invalidation
      // already keep the cache fresh — no manual setQueryData needed here

      // 💰 FINOPS: Invalidar cache del perfil después de actualizarlo
      try {
        await fetch("/api/invalidate-cache", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userUid, type: "profile" }),
        });
      } catch (cacheError) {
        // No crítico - continuar sin cache invalidation
        safeLog("warn", "Failed to invalidate profile cache:", cacheError);
      }

      // ✅ ANALÍTICA: Perfil actualizado correctamente
      trackEvent("profile_update_success", {
        goals: userProfile.nutritionalGoal.join(","),
        has_allergies: userProfile.allergies.length > 0,
      });

      setInitialFormData(formData);
      setViewMode("view");
      setSuccessMessage(t("profile.success.profileUpdated"));
      onProfileUpdate(newDisplayName.trim());

      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      safeLog("error", "Error updating profile:", err);
      // ✅ ANALÍTICA: Error en actualización
      trackEvent("profile_update_error");
      setError(t("profile.errors.saveError"));
    }
  };

  const updateData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Si cambia la ciudad, guardar el placeId para obtener coordenadas después
    if (field === "cityPlaceId") {
      setSelectedPlaceId(value);
    }

    // Si cambia el país, limpiar ciudad y placeId
    if (field === "country") {
      setSelectedPlaceId("");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsChangingPassword(true); // FIX #6 (ALTA)

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError(t("profile.errors.allRequired"));
      setIsChangingPassword(false);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(t("profile.errors.passwordsMismatch"));
      setIsChangingPassword(false);
      return;
    }
    if (newPassword.length < 8) {
      setError(t("profile.errors.minChars"));
      setIsChangingPassword(false);
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      setError(t("profile.errors.sessionExpired"));
      setIsChangingPassword(false);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword,
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      // ✅ ANALÍTICA: Password cambiado
      trackEvent("profile_security_password_changed");

      setSuccessMessage(t("profile.success.passwordUpdated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => goToView(), 2000); // FIX #7 (ALTA)
    } catch (err: any) {
      trackEvent("profile_security_password_error", { code: err.code });
      if (err.code === "auth/wrong-password")
        setError(t("profile.errors.wrongPassword"));
      else setError(t("profile.errors.updateError"));
    } finally {
      setIsChangingPassword(false); // FIX #6 (ALTA)
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsChangingEmail(true); // FIX #6 (ALTA)

    if (!emailPassword || !newEmail) {
      setError(t("profile.errors.allRequired"));
      setIsChangingEmail(false);
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      setError(t("profile.errors.sessionExpiredShort"));
      setIsChangingEmail(false);
      return;
    }

    const normalizedNewEmail = newEmail.toLowerCase().trim();
    if (currentUser.email.toLowerCase() === normalizedNewEmail) {
      setError(t("profile.errors.sameEmail"));
      setIsChangingEmail(false);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        emailPassword,
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updateEmail(currentUser, normalizedNewEmail);

      // ✅ ANALÍTICA: Email cambiado
      trackEvent("profile_security_email_changed");

      const updatedFormData = { ...formData, email: normalizedNewEmail };
      setFormData(updatedFormData);

      await sendEmailVerification(currentUser);
      setSuccessMessage(t("profile.success.emailUpdated"));

      setEmailPassword("");
      setNewEmail("");
      setTimeout(() => goToView(), 4000); // FIX #7 (ALTA)
    } catch (err: any) {
      trackEvent("profile_security_email_error", { code: err.code });
      if (err.code === "auth/wrong-password")
        setError(t("profile.errors.wrongPasswordShort"));
      else if (err.code === "auth/email-already-in-use")
        setError(t("profile.errors.emailInUse"));
      else setError(t("profile.errors.updateError"));
    } finally {
      setIsChangingEmail(false); // FIX #6 (ALTA)
    }
  };

  // ============================================
  // EXPORTAR DATOS DEL USUARIO (GDPR)
  // ============================================

  const handleExportData = async () => {
    setError("");
    setSuccessMessage("");
    setIsExporting(true); // FIX #6 (ALTA)

    try {
      trackEvent("profile_export_data_start");

      // Obtener datos del perfil
      const userDoc = await getDoc(doc(db, "users", userUid));
      const profileData = userDoc.exists() ? userDoc.data() : null;

      // Obtener recetas guardadas
      const savedRecipesQuery = query(
        collection(db, "saved_recipes"),
        where("user_id", "==", userUid),
      );
      const savedRecipesSnap = await getDocs(savedRecipesQuery);
      const savedRecipes = savedRecipesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Obtener restaurantes guardados
      const savedRestaurantsQuery = query(
        collection(db, "saved_restaurants"),
        where("user_id", "==", userUid),
      );
      const savedRestaurantsSnap = await getDocs(savedRestaurantsQuery);
      const savedRestaurants = savedRestaurantsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Obtener historial de feedback
      const feedbackQuery = query(
        collection(db, "user_history"),
        where("userId", "==", userUid),
      );
      const feedbackSnap = await getDocs(feedbackQuery);
      const feedback = feedbackSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // Obtener datos de auth
      const currentUser = auth.currentUser;
      const authData = currentUser
        ? {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          emailVerified: currentUser.emailVerified,
          createdAt: currentUser.metadata.creationTime,
          lastSignInTime: currentUser.metadata.lastSignInTime,
        }
        : null;

      const exportPayload = {
        exportDate: new Date().toISOString(),
        exportVersion: "1.0",
        user: authData,
        profile: profileData,
        savedRecipes,
        savedRestaurants,
        feedback,
      };

      setExportedData(exportPayload);
      trackEvent("profile_export_data_success");
    } catch (err) {
      safeLog("error", "Error exporting data:", err);
      trackEvent("profile_export_data_error");
      setError(t("profile.errors.exportError"));
    } finally {
      setIsExporting(false); // FIX #6 (ALTA)
    }
  };

  const handleDownloadJSON = () => {
    if (!exportedData) return;

    const dataStr = JSON.stringify(exportedData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bocado-datos-${userUid}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    trackEvent("profile_export_data_download");
    setSuccessMessage(t("profile.success.downloadComplete"));
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => setSuccessMessage(""), 3000);
  };

  // ============================================
  // ELIMINAR CUENTA (GDPR - Derecho al olvido)
  // ============================================

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (deleteConfirmText !== "ELIMINAR") {
      setError(t("profile.errors.mustTypeDelete"));
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError(t("profile.errors.sessionExpired"));
      return;
    }

    setIsDeleting(true);

    try {
      trackEvent("profile_delete_account_start");

      // 1. Reautenticar según el proveedor
      const providers = currentUser.providerData.map((p) => p.providerId);
      const hasPassword = providers.includes("password");
      const hasGoogle = providers.includes("google.com");

      if (hasPassword) {
        // Reautenticar con contraseña
        if (!currentUser.email) {
          setError(t("profile.errors.sessionExpired"));
          setIsDeleting(false);
          return;
        }
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          deletePassword,
        );
        await reauthenticateWithCredential(currentUser, credential);
      } else if (hasGoogle) {
        // Reautenticar con Google
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await reauthenticateWithPopup(currentUser, provider);
      }

      // FIX #2 (ALTA): deleteUser se ejecuta primero intencionalmente.
      // Si falla, ningún dato de Firestore se habrá borrado (rollback natural).
      // Si falla Firestore después, el usuario ya no puede autenticarse,
      // lo que es el estado deseado. Los datos huérfanos en Firestore
      // se limpian mediante Cloud Function onUserDelete (pendiente implementar).

      // 2. Eliminar usuario de Firebase Auth PRIMERO
      await deleteUser(currentUser);

      // 3. Eliminar datos de Firestore (usuario ya no existe en Auth)
      // Eliminar perfil
      await deleteDoc(doc(db, "users", userUid));

      // Eliminar recetas guardadas
      const savedRecipesQuery = query(
        collection(db, "saved_recipes"),
        where("user_id", "==", userUid),
      );
      const savedRecipesSnap = await getDocs(savedRecipesQuery);
      const deleteRecipesPromises = savedRecipesSnap.docs.map((d) =>
        deleteDoc(d.ref),
      );
      await Promise.all(deleteRecipesPromises);

      // Eliminar restaurantes guardados
      const savedRestaurantsQuery = query(
        collection(db, "saved_restaurants"),
        where("user_id", "==", userUid),
      );
      const savedRestaurantsSnap = await getDocs(savedRestaurantsQuery);
      const deleteRestaurantsPromises = savedRestaurantsSnap.docs.map((d) =>
        deleteDoc(d.ref),
      );
      await Promise.all(deleteRestaurantsPromises);

      // Eliminar historial de feedback
      const feedbackQuery = query(
        collection(db, "user_history"),
        where("userId", "==", userUid),
      );
      const feedbackSnap = await getDocs(feedbackQuery);
      const deleteFeedbackPromises = feedbackSnap.docs.map((d) =>
        deleteDoc(d.ref),
      );
      await Promise.all(deleteFeedbackPromises);

      trackEvent("profile_delete_account_success");

      // 4. Limpiar sesión
      if (onLogout) {
        onLogout();
      }
    } catch (err: any) {
      safeLog("error", "Error deleting account:", err);
      trackEvent("profile_delete_account_error", { code: err.code });

      if (err.code === "auth/wrong-password") {
        setError(t("profile.errors.wrongPasswordShort"));
      } else if (err.code === "auth/requires-recent-login") {
        setError(t("profile.errors.requiresRecentLogin"));
      } else if (err.code === "auth/popup-closed-by-user") {
        setError(t("profile.errors.popupClosed"));
      } else {
        setError(t("profile.errors.deleteGeneric"));
      }
      setIsDeleting(false);
    }
    // No finally aquí: si se eliminó exitosamente, el usuario ya no existe
    // y onLogout() redirige. Solo limpiamos isDeleting en el catch.
  };

  const handleLinkGoogle = async () => {
    setError("");
    setSuccessMessage("");
    setIsLinkingGoogle(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError(t("profile.errors.sessionExpired"));
        return;
      }

      trackEvent("profile_link_google_start");

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      await linkWithPopup(currentUser, provider);

      trackEvent("profile_link_google_success");
      setSuccessMessage(t("profile.success.googleLinked"));

      // Refrescar el usuario para obtener los proveedores actualizados
      await currentUser.reload();
    } catch (err: any) {
      safeLog("error", "Error linking Google:", err);
      trackEvent("profile_link_google_error", { code: err.code });

      if (err.code === "auth/credential-already-in-use") {
        setError(t("profile.errors.credentialInUse"));
      } else if (err.code === "auth/provider-already-linked") {
        setError(t("profile.errors.providerAlreadyLinked"));
      } else if (err.code === "auth/popup-closed-by-user") {
        setError(t("profile.errors.linkCancelled"));
      } else {
        setError(t("profile.errors.linkGeneric"));
      }
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    setError("");
    setSuccessMessage("");

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError(t("profile.errors.sessionExpired"));
      return;
    }

    const providers = currentUser.providerData.map((p) => p.providerId);

    // No permitir desvincular si es el único método
    if (providers.length <= 1) {
      setError(t("profile.loginMethods.cannotUnlink"));
      return;
    }

    setIsUnlinkingGoogle(true);
    setConfirmUnlinkGoogle(false);

    try {
      trackEvent("profile_unlink_google_start");

      await unlink(currentUser, "google.com");

      trackEvent("profile_unlink_google_success");
      setSuccessMessage(t("profile.success.googleUnlinked"));

      // Refrescar el usuario
      await currentUser.reload();
    } catch (err: any) {
      safeLog("error", "Error unlinking Google:", err);
      trackEvent("profile_unlink_google_error", { code: err.code });

      if (err.code === "auth/no-such-provider") {
        setError(t("profile.errors.noSuchProvider"));
      } else {
        setError(t("profile.errors.unlinkGeneric"));
      }
    } finally {
      setIsUnlinkingGoogle(false);
    }
  };

  const renderPhysicalData = () => {
    const parts: string[] = [];
    if (formData.weight) parts.push(`${formData.weight} kg`);
    if (formData.height) parts.push(`${formData.height} cm`);

    if (parts.length === 0) return null;

    // Calculamos IMC para mostrar solo el número sin etiquetas clínicas
    // que puedan ser desmotivantes para el usuario
    let bmi = null;
    if (formData.weight && formData.height) {
      const w = parseFloat(formData.weight);
      const h = parseInt(formData.height) / 100;
      if (w > 0 && h > 0) {
        bmi = (w / (h * h)).toFixed(1);
      }
    }

    return (
      <InfoSection title={t("profile.view.bodyData")}>
        <Badge text={parts.join(" / ")} color="yellow" />
        {bmi && (
          <Badge
            text={`IMC: ${bmi}`}
            color="gray"
            title="Índice de masa corporal"
          />
        )}
      </InfoSection>
    );
  };

  const renderContent = () => {
    switch (viewMode) {
      case "edit":
        return (
          <div className="flex flex-col h-full animate-fade-in">
            <div className="flex-1 overflow-y-auto space-y-6 pb-24">
              {/* FIX #15 (ALTA): Banner de unsaved changes warning */}
              {showUnsavedWarning && (
                <div
                  role="alert"
                  className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl text-sm"
                >
                  <p className="text-amber-700 dark:text-amber-300 font-medium mb-2">
                    {t("profile.unsavedChangesWarning")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={confirmDiscard}
                      className="text-xs text-red-600 font-bold active:scale-95 transition-transform"
                    >
                      {t("profile.discardChanges")}
                    </button>
                    <button
                      onClick={() => setShowUnsavedWarning(false)}
                      className="text-xs text-bocado-gray font-medium active:scale-95 transition-transform"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              )}

              {/* FIX #9 (ALTA): role="alert" en mensajes de error */}
              {error && (
                <p
                  className="text-red-500 text-xs text-center bg-red-50 p-3 rounded-xl"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <Step1
                data={formData}
                updateData={updateData}
                errors={{}}
                hidePasswordFields={true}
                disableEmail={true}
                cityOptions={cityOptions}
                isSearchingCity={isSearchingCity}
                onSearchCity={handleCitySearch}
                onClearCityOptions={() => setCityOptions([])}
                onCountryChange={(code) => updateData("country", code)}
              />
              <Step2 data={formData} updateData={updateData} errors={{}} />
              <Step3 data={formData} updateData={updateData} errors={{}} />
            </div>

            <div className="bg-white p-4 border-t border-bocado-border flex gap-3 shrink-0">
              <button
                onClick={() => {
                  trackEvent("profile_edit_cancel");
                  handleCancelEdit(); // FIX #15 (ALTA): usar handler con warning
                  setCityOptions([]);
                }}
                className="flex-1 py-3 rounded-xl font-bold bg-bocado-background text-bocado-dark-gray hover:bg-bocado-border active:scale-95 transition-all"
                disabled={updateProfileMutation.isPending}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 bg-bocado-green text-white font-bold py-3 rounded-xl shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all disabled:bg-bocado-gray"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending
                  ? t("common.saving")
                  : t("profile.saveChanges")}
              </button>
            </div>
          </div>
        );

      case "changePassword":
        // FIX #12 (ALTA): Escape key to close dialog
        useEscapeKey(() => goToView());

        return (
          <div
            className="animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title-changePassword"
            tabIndex={-1}
          >
            {/* TODO: añadir useFocusTrap para capturar el foco */}
            <h2
              id="dialog-title-changePassword"
              className="text-lg font-bold text-bocado-dark-green mb-4"
            >
              {t("profile.changePassword")}
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                {/* FIX #11 (ALTA): htmlFor + id */}
                <label
                  htmlFor="profile-current-password"
                  className="label-base text-2xs"
                >
                  {t("profile.currentPassword")}
                </label>
                <input
                  id="profile-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-base"
                  placeholder="••••••••"
                  aria-label={t("profile.currentPassword")}
                  autoComplete="current-password" // FIX #12 (BAJA)
                />
              </div>
              <div>
                <label
                  htmlFor="profile-new-password"
                  className="label-base"
                >
                  {t("profile.newPassword")}
                </label>
                <input
                  id="profile-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-base"
                  placeholder={t("registration.placeholders.password")}
                  aria-label={t("profile.newPassword")}
                  autoComplete="new-password" // FIX #12 (BAJA)
                />
              </div>
              <div>
                <label
                  htmlFor="profile-confirm-password"
                  className="label-base"
                >
                  {t("profile.confirmPassword")}
                </label>
                <input
                  id="profile-confirm-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="input-base"
                  placeholder="••••••••"
                  aria-label={t("profile.confirmPassword")}
                  autoComplete="new-password" // FIX #12 (BAJA)
                />
              </div>
              {/* FIX #9 (ALTA): role="alert" y role="status" */}
              {error && (
                <p
                  className="text-red-500 text-xs text-center bg-red-50 p-2 rounded-lg"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {successMessage && (
                <p
                  className="text-green-600 text-xs text-center bg-green-50 p-2 rounded-lg"
                  role="status"
                >
                  {successMessage}
                </p>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    goToView(); // FIX #7 (ALTA)
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                  }}
                  className="flex-1 py-3 rounded-xl font-bold bg-bocado-background text-bocado-dark-gray hover:bg-bocado-border active:scale-95 transition-all"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword} // FIX #6 (ALTA)
                  className="flex-1 bg-bocado-green text-white font-bold py-3 rounded-xl shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {/* FIX #6 (ALTA): Mostrar spinner durante loading */}
                  {isChangingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />
                      {t("common.saving")}
                    </>
                  ) : (
                    t("profile.update")
                  )}
                </button>
              </div>
            </form>
          </div>
        );

      case "changeEmail":
        // FIX #12 (ALTA): Escape key to close dialog
        useEscapeKey(() => goToView());

        return (
          <div
            className="animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title-changeEmail"
            tabIndex={-1}
          >
            {/* TODO: añadir useFocusTrap para capturar el foco */}
            <h2
              id="dialog-title-changeEmail"
              className="text-xl font-bold text-bocado-dark-green mb-2"
            >
              {t("profile.changeEmail")}
            </h2>
            {/* FIX #13 (BAJA): Nota de verificación ya existe, verificar que mencione "nueva dirección" */}
            <p className="text-sm text-bocado-gray mb-4">
              {t("profile.emailVerificationNote")}
            </p>
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                {/* FIX #11 (ALTA): htmlFor + id */}
                <label
                  htmlFor="profile-email-password"
                  className="label-base text-2xs"
                >
                  {t("profile.currentPassword")}
                </label>
                <input
                  id="profile-email-password"
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  className="input-base"
                  placeholder="••••••••"
                  aria-label={t("profile.currentPassword")}
                  autoComplete="current-password" // FIX #12 (BAJA)
                />
              </div>
              <div>
                <label
                  htmlFor="profile-new-email"
                  className="label-base text-2xs"
                >
                  {t("profile.newEmail")}
                </label>
                <input
                  id="profile-new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input-base"
                  placeholder={t("registration.placeholders.email")}
                  aria-label={t("profile.newEmail")}
                />
              </div>
              {/* FIX #9 (ALTA): role="alert" y role="status" */}
              {error && (
                <p
                  className="text-red-500 text-xs text-center bg-red-50 p-2 rounded-lg"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {successMessage && (
                <p
                  className="text-green-600 text-xs text-center bg-green-50 p-2 rounded-lg"
                  role="status"
                >
                  {successMessage}
                </p>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    goToView(); // FIX #7 (ALTA)
                    setEmailPassword("");
                    setNewEmail("");
                  }}
                  className="flex-1 py-3 rounded-xl font-bold bg-bocado-background text-bocado-dark-gray hover:bg-bocado-border active:scale-95 transition-all"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isChangingEmail} // FIX #6 (ALTA)
                  className="flex-1 bg-bocado-green text-white font-bold py-3 rounded-xl shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {/* FIX #6 (ALTA): Mostrar spinner durante loading */}
                  {isChangingEmail ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />
                      {t("common.saving")}
                    </>
                  ) : (
                    t("profile.change")
                  )}
                </button>
              </div>
            </form>
          </div>
        );

      case "adminNotifications":
        if (!isAdmin) return null;
        return (
          <NotificationTokensAdmin
            userUid={userUid}
            onBack={() => goToView()} // FIX #7 (ALTA)
          />
        );

      case "exportData":
        return (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold text-bocado-dark-green mb-2">
              {t("profile.downloadData")}
            </h2>
            <p className="text-sm text-bocado-gray mb-6">
              {t("profile.deleteDataDesc")}
            </p>

            {!exportedData ? (
              <div className="space-y-4">
                <div className="bg-bocado-background/50 p-4 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-bocado-green mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-bocado-text">
                        {t("profile.whatIncluded")}
                      </p>
                      <ul className="text-xs text-bocado-gray mt-1 space-y-1">
                        <li>• {t("profile.dataIncludes.profile")}</li>
                        <li>• {t("profile.dataIncludes.recipes")}</li>
                        <li>• {t("profile.dataIncludes.restaurants")}</li>
                        <li>• {t("profile.dataIncludes.history")}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* FIX #9 (ALTA): role="alert" en error */}
                {error && (
                  <p
                    className="text-red-500 text-xs text-center bg-red-50 p-2 rounded-lg"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      goToView(); // FIX #7 (ALTA)
                    }}
                    className="flex-1 py-3 rounded-xl font-bold bg-bocado-background text-bocado-dark-gray hover:bg-bocado-border active:scale-95 transition-all"
                  >
                    {t("common.back")}
                  </button>
                  <button
                    onClick={handleExportData}
                    disabled={isExporting} // FIX #6 (ALTA) + FIX #9 (MEDIA)
                    className="flex-1 bg-bocado-green text-white font-bold py-3 rounded-xl shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* FIX #9 (MEDIA): Mostrar spinner durante loading */}
                    {isExporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t("profile.preparing")}
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        {t("profile.prepareData")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <p className="text-sm font-semibold text-green-800">
                      {t("profile.dataReady")}
                    </p>
                  </div>
                  <p className="text-xs text-green-700">
                    {t("profile.exportSections", {
                      count: Object.keys(exportedData).length,
                    })}
                  </p>
                </div>

                {/* FIX #9 (ALTA): role="status" en success */}
                {successMessage && (
                  <p
                    className="text-green-600 text-xs text-center bg-green-50 p-2 rounded-lg"
                    role="status"
                  >
                    {successMessage}
                  </p>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      goToView(); // FIX #7 (ALTA)
                      setExportedData(null);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold bg-bocado-background text-bocado-dark-gray hover:bg-bocado-border active:scale-95 transition-all"
                  >
                    {t("common.close")}
                  </button>
                  <button
                    onClick={handleDownloadJSON}
                    className="flex-1 bg-bocado-green text-white font-bold py-3 rounded-xl shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {t("profile.downloadJSON")}
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case "deleteAccount":
        // FIX #12 (ALTA): Escape key to close dialog
        useEscapeKey(() => goToView());

        return (
          <div
            className="animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title-deleteAccount"
            tabIndex={-1}
          >
            {/* TODO: añadir useFocusTrap para capturar el foco */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2
                id="dialog-title-deleteAccount"
                className="text-xl font-bold text-red-600"
              >
                {t("profile.deleteAccount")}
              </h2>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6">
              <p className="text-sm font-semibold text-red-800 mb-2">
                {t("profile.deleteWarning")}
              </p>
              <p className="text-xs text-red-700">{t("common.deleting")}:</p>
              <ul className="text-xs text-red-700 mt-2 space-y-1 ml-4">
                <li>• {t("profile.deleteIncludes.account")}</li>
                <li>• {t("profile.deleteIncludes.profile")}</li>
                <li>• {t("profile.deleteIncludes.recipes")}</li>
                <li>• {t("profile.deleteIncludes.restaurants")}</li>
                <li>• {t("profile.deleteIncludes.feedback")}</li>
              </ul>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                {/* FIX #8 (MEDIA) + FIX #11 (ALTA): aria-describedby, htmlFor+id */}
                <label
                  htmlFor="profile-delete-confirm"
                  className="block text-2xs font-bold text-bocado-dark-gray mb-1.5 uppercase tracking-wider"
                >
                  {t("profile.deleteConfirmText")}
                </label>
                <input
                  id="profile-delete-confirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="input-base border-red-500 focus:ring-red-200 text-red-900 placeholder:text-red-300 dark:text-red-400 dark:border-red-600"
                  placeholder="ELIMINAR"
                  aria-label={t("profile.deleteConfirmLabel")}
                  aria-describedby="delete-confirm-hint"
                />
                {/* FIX #8 (MEDIA): Hint descriptivo */}
                <p
                  id="delete-confirm-hint"
                  className="text-xs text-red-600 mt-1"
                >
                  {t("profile.deleteConfirmHint")}
                </p>
              </div>

              {/* Solo mostrar campo de contraseña si el usuario tiene autenticación con password */}
              {auth.currentUser?.providerData.some(
                (p) => p.providerId === "password",
              ) && (
                <div>
                  {/* FIX #11 (ALTA): htmlFor + id */}
                  <label
                    htmlFor="profile-delete-password"
                    className="block text-2xs font-bold text-bocado-dark-gray mb-1.5 uppercase tracking-wider"
                  >
                    {t("profile.currentPassword")}
                  </label>
                  <input
                    id="profile-delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="input-base"
                    placeholder="••••••••"
                    aria-label={t("profile.currentPassword")}
                    autoComplete="current-password" // FIX #12 (BAJA)
                  />
                </div>
              )}

              {/* FIX #9 (ALTA): role="alert" en error */}
              {error && (
                <p
                  className="text-red-500 text-xs text-center bg-red-50 p-2 rounded-lg"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    goToView(); // FIX #7 (ALTA)
                    setDeletePassword("");
                    setDeleteConfirmText("");
                  }}
                  className="flex-1 py-3 rounded-xl font-bold bg-bocado-background text-bocado-dark-gray hover:bg-bocado-border active:scale-95 transition-all"
                  disabled={isDeleting}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={
                    isDeleting ||
                    deleteConfirmText !== "ELIMINAR" ||
                    (auth.currentUser?.providerData.some(
                      (p) => p.providerId === "password",
                    ) &&
                      !deletePassword)
                  }
                  className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-red-700 active:scale-95 transition-all disabled:bg-red-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("common.deleting")}
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      {t("profile.deleteAll")}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        );

      case "view":
      default:
        return (
          <div className="space-y-4">
            {/* FIX #9 (ALTA): role="alert" y role="status" */}
            {error && (
              <p
                className="text-red-500 text-xs text-center bg-red-50 p-3 rounded-xl animate-fade-in font-medium"
                role="alert"
              >
                {error}
              </p>
            )}
            {successMessage && (
              <p
                className="text-green-600 text-xs text-center bg-green-50 p-3 rounded-xl animate-fade-in font-medium"
                role="status"
              >
                {successMessage}
              </p>
            )}

            <InfoSection title={t("profile.personalInfo")}>
              {formData.gender && (
                <Badge text={translateGender(formData.gender, t)} color="gray" />
              )}
              {formData.age && (
                <Badge
                  text={`${formData.age}${t("profile.suffixYears")}`}
                  color="gray"
                />
              )}
              {formData.city && formData.country && (
                <Badge
                  text={`${formData.city}, ${formData.country}`}
                  color="gray"
                />
              )}
              {formData.cookingAffinity && (
                <Badge
                  text={`${t("profile.prefixCooking")}${translateCookingAffinity(formData.cookingAffinity, t)}`}
                  color="gray"
                />
              )}
            </InfoSection>

            {renderPhysicalData()}

            <InfoSection title={t("profile.nutritionalGoal")}>
              {formData.nutritionalGoal.length > 0 &&
                formData.nutritionalGoal[0] !== "Sin especificar" ? (
                formData.nutritionalGoal.map((g) => (
                  <Badge key={g} text={translateGoal(g, t)} color="green" />
                ))
              ) : (
                <span className="text-xs text-bocado-gray">
                  {t("profile.noSpecified")}
                </span>
              )}
            </InfoSection>

            <InfoSection title={t("profile.physicalActivity")}>
              {formData.activityLevel ? (
                <Badge
                  text={`${translateActivityLevel(formData.activityLevel, t)}${formData.activityFrequency ? ` (${translateActivityFrequency(formData.activityFrequency, t)})` : ""}`}
                  color="gray"
                />
              ) : (
                <span className="text-xs text-bocado-gray">
                  {t("profile.noSpecified")}
                </span>
              )}
            </InfoSection>

            <InfoSection title={t("profile.health")}>
              {formData.diseases.length > 0 &&
                formData.diseases[0] !== "Ninguna" ? (
                formData.diseases.map((d) => (
                  <Badge key={d} text={translateDisease(d, t)} color="red" />
                ))
              ) : (
                <span className="text-xs text-bocado-gray">
                  {t("profile.noConditions")}
                </span>
              )}
            </InfoSection>

            <InfoSection title={t("profile.allergies")}>
              {formData.allergies.length > 0 &&
                formData.allergies[0] !== "Ninguna" ? (
                <>
                  {formData.allergies.map((a) => (
                    <Badge key={a} text={translateAllergy(a, t)} color="blue" />
                  ))}
                  {formData.otherAllergies && (
                    <Badge text={formData.otherAllergies} color="blue" />
                  )}
                </>
              ) : (
                <span className="text-xs text-bocado-gray">
                  {t("profile.none")}
                </span>
              )}
            </InfoSection>

            <InfoSection title={t("profile.dislikes")}>
              {formData.dislikedFoods.length > 0 &&
                formData.dislikedFoods[0] !== "Ninguno" ? (
                formData.dislikedFoods.map((f) => (
                  <Badge key={f} text={translateFood(f, t)} color="red" />
                ))
              ) : (
                <span className="text-xs text-bocado-gray">
                  {t("profile.noneM")}
                </span>
              )}
            </InfoSection>

            <div className="mt-6 pt-6 border-t border-bocado-border">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-bocado-gray" />
                <h3 className="font-bold text-bocado-dark-green text-2xs uppercase tracking-wider">
                  {t("profile.security")}
                </h3>
              </div>
              <div className="space-y-2">
                {/* Solo mostrar cambio de contraseña si tiene método de password */}
                {auth.currentUser?.providerData.some(
                  (p) => p.providerId === "password",
                ) && (
                    <button
                      onClick={() => {
                        trackEvent("profile_security_mode_change", {
                          mode: "password",
                        });
                        setViewMode("changePassword");
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 bg-bocado-background rounded-xl text-sm font-medium text-bocado-text hover:bg-bocado-border active:scale-95 transition-all"
                    >
                      <span>{t("profile.changePassword")}</span>
                      <span className="text-bocado-gray">›</span>
                    </button>
                  )}
                {/* Solo mostrar cambio de email si tiene método de password */}
                {auth.currentUser?.providerData.some(
                  (p) => p.providerId === "password",
                ) && (
                    <button
                      onClick={() => {
                        trackEvent("profile_security_mode_change", {
                          mode: "email",
                        });
                        setViewMode("changeEmail");
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 bg-bocado-background rounded-xl text-sm font-medium text-bocado-text hover:bg-bocado-border active:scale-95 transition-all"
                    >
                      <span>{t("profile.changeEmail")}</span>
                      <span className="text-bocado-gray">›</span>
                    </button>
                  )}
              </div>
            </div>

            {/* Métodos de inicio de sesión */}
            <div className="mt-6 pt-6 border-t border-bocado-border">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-bocado-gray" />
                <h3 className="font-bold text-bocado-dark-green text-2xs uppercase tracking-wider">
                  {t("profile.loginMethods.title")}
                </h3>
              </div>
              <div className="space-y-3">
                {/* Email/Password */}
                {auth.currentUser?.providerData.some(
                  (p) => p.providerId === "password",
                ) && (
                    <div className="px-4 py-3 bg-bocado-background rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Lock className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-bocado-text">
                              {t("profile.loginMethods.emailPassword")}
                            </p>
                            <p className="text-xs text-bocado-gray">
                              {auth.currentUser?.email}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                          {t("profile.loginMethods.active")}
                        </span>
                      </div>
                    </div>
                  )}

                {/* Google */}
                {auth.currentUser?.providerData.some(
                  (p) => p.providerId === "google.com",
                ) ? (
                  <div className="px-4 py-3 bg-bocado-background rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                              fill="#EA4335"
                              d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"
                            />
                            <path
                              fill="#34A853"
                              d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"
                            />
                            <path
                              fill="#4A90E2"
                              d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-bocado-text">
                            {t("profile.loginMethods.google")}
                          </p>
                          <p className="text-xs text-bocado-gray">
                            {t("profile.loginMethods.connected")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                          {t("profile.loginMethods.active")}
                        </span>
                      </div>
                    </div>
                    {auth.currentUser?.providerData.length > 1 && (
                      confirmUnlinkGoogle ? (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => setConfirmUnlinkGoogle(false)}
                            className="flex-1 py-2 text-xs font-medium text-bocado-gray hover:bg-bocado-background rounded-lg transition-colors"
                          >
                            {t("common.cancel")}
                          </button>
                          <button
                            onClick={handleUnlinkGoogle}
                            disabled={isUnlinkingGoogle}
                            className="flex-1 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isUnlinkingGoogle
                              ? t("profile.loginMethods.unlinking")
                              : t("profile.loginMethods.confirmUnlink")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmUnlinkGoogle(true)}
                          className="w-full mt-2 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          {t("profile.loginMethods.unlinkGoogle")}
                        </button>
                      )
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-3 bg-bocado-background rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                              fill="#9CA3AF"
                              d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"
                            />
                            <path
                              fill="#9CA3AF"
                              d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"
                            />
                            <path
                              fill="#9CA3AF"
                              d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"
                            />
                            <path
                              fill="#9CA3AF"
                              d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-bocado-text">
                            {t("profile.loginMethods.google")}
                          </p>
                          <p className="text-xs text-bocado-gray">
                            {t("profile.loginMethods.notConnected")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleLinkGoogle}
                      disabled={isLinkingGoogle}
                      className="w-full mt-2 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isLinkingGoogle
                        ? t("profile.loginMethods.linking")
                        : t("profile.loginMethods.linkGoogle")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Preferencias */}
            <div className="mt-6 pt-6 border-t border-bocado-border">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-bocado-gray" />
                <h3 className="font-bold text-bocado-dark-green text-2xs uppercase tracking-wider">
                  {t("profile.preferences")}
                </h3>
              </div>
              <div className="space-y-2">
                {/* Selector de Idioma */}
                <div className="px-4 py-3 bg-bocado-background rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-bocado-text">
                      {t("profile.language")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        trackEvent("language_change", {
                          from: locale,
                          to: "es",
                        });
                        setLocale("es");
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${locale === "es"
                        ? "bg-bocado-green text-white"
                        : "bg-white text-bocado-gray hover:bg-bocado-border"
                        }`}
                    >
                      {t("profile.languageES")}
                    </button>
                    <button
                      onClick={() => {
                        trackEvent("language_change", {
                          from: locale,
                          to: "en",
                        });
                        setLocale("en");
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${locale === "en"
                        ? "bg-bocado-green text-white"
                        : "bg-white text-bocado-gray hover:bg-bocado-border"
                        }`}
                    >
                      {t("profile.languageEN")}
                    </button>
                  </div>
                </div>

                {/* Selector de Tema */}
                <div className="px-4 py-3 bg-bocado-background rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-bocado-text">
                      {t("profile.theme")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        trackEvent("theme_change", {
                          from: theme,
                          to: "light",
                        });
                        setTheme("light");
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${theme === "light"
                        ? "bg-bocado-green text-white"
                        : "bg-white text-bocado-gray hover:bg-bocado-border"
                        }`}
                    >
                      {t("profile.themeLight")}
                    </button>
                    <button
                      onClick={() => {
                        trackEvent("theme_change", { from: theme, to: "dark" });
                        setTheme("dark");
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${theme === "dark"
                        ? "bg-bocado-green text-white"
                        : "bg-white text-bocado-gray hover:bg-bocado-border"
                        }`}
                    >
                      {t("profile.themeDark")}
                    </button>
                    <button
                      onClick={() => {
                        trackEvent("theme_change", {
                          from: theme,
                          to: "system",
                        });
                        setTheme("system");
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${theme === "system"
                        ? "bg-bocado-green text-white"
                        : "bg-white text-bocado-gray hover:bg-bocado-border"
                        }`}
                    >
                      {t("profile.themeSystem")}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    trackEvent("profile_notifications_open");
                    setShowNotificationSettings(true);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-bocado-background rounded-xl text-sm font-medium text-bocado-text hover:bg-bocado-border active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-bocado-green" />
                    <span>{t("profile.notificationsDesc")}</span>
                  </div>
                  <span className="text-bocado-gray">›</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      trackEvent("profile_notifications_admin_open");
                      setViewMode("adminNotifications");
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-bocado-background rounded-xl text-sm font-medium text-bocado-text hover:bg-bocado-border active:scale-95 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-bocado-green" />
                      <span>{t("profile.adminTokens")}</span>
                    </div>
                    <span className="text-bocado-gray">›</span>
                  </button>
                )}
              </div>
            </div>

            {/* Privacidad y Datos (GDPR) */}
            <div className="mt-6 pt-6 border-t border-bocado-border">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-bocado-gray" />
                <h3 className="font-bold text-bocado-dark-green text-2xs uppercase tracking-wider">
                  {t("profile.privacy")}
                </h3>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    trackEvent("profile_privacy_mode_change", {
                      mode: "export",
                    });
                    setViewMode("exportData");
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-bocado-background rounded-xl text-sm font-medium text-bocado-text hover:bg-bocado-border active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-bocado-green" />
                    <span>{t("profile.downloadData")}</span>
                  </div>
                  <span className="text-bocado-gray">›</span>
                </button>
                <button
                  onClick={() => {
                    trackEvent("profile_privacy_mode_change", {
                      mode: "delete",
                    });
                    setViewMode("deleteAccount");
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-red-50 rounded-xl text-sm font-medium text-red-600 hover:bg-red-100 active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>{t("profile.deleteAccount")}</span>
                  </div>
                  <span className="text-red-400">›</span>
                </button>
              </div>
            </div>

            {/* Logout */}
            {onLogout && (
              <div className="mt-6 pt-6 border-t border-bocado-border">
                <button
                  onClick={() => {
                    trackEvent("profile_logout_click");
                    onLogout();
                  }}
                  className="w-full py-3 text-red-500 font-bold text-sm hover:bg-red-50 rounded-xl transition-colors active:scale-95"
                >
                  {t("profile.logout")}
                </button>
              </div>
            )}
          </div>
        );
    }
  };

  // Mostrar skeleton mientras carga el perfil
  if (isProfileLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 px-4 pt-2">
        <div className="flex items-center gap-2">
          <div className="bg-bocado-green/10 p-2 rounded-full">
            <User className="w-5 h-5 text-bocado-green" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-bocado-dark-green truncate max-w-[180px]">
              {`${formData.firstName || ""} ${formData.lastName || ""}`.trim() || t("profile.title")}
            </h1>
            <p className="text-xs text-bocado-gray truncate max-w-[150px]">
              {formData.email}
            </p>
          </div>
        </div>
        {viewMode === "view" && (
          <button
            onClick={() => {
              trackEvent("profile_edit_start"); // ✅ Analítica
              setViewMode("edit");
            }}
            className="text-xs bg-bocado-green/10 text-bocado-green font-bold px-3 py-1.5 rounded-full hover:bg-bocado-green/20 active:scale-95 transition-all"
          >
            {t("profile.edit")}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-24 min-h-0">{renderContent()}</div>

      {/* Modal de Notificaciones */}
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
        userUid={userUid}
      />
    </div>
  );
};

export default ProfileScreen;
