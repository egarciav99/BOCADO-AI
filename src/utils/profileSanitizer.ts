import { UserProfile, FormData, AuthData, Gender, ActivityFrequency, CookingAffinity } from "../types";

// Logger seguro que respeta el entorno
export const safeLog = (
  level: "log" | "error" | "warn",
  message: string,
  error?: unknown,
) => {
  const isDev = process.env.NODE_ENV === "development";

  if (error) {
    const errorObj = error as { message?: string };
    const errorMessage = errorObj?.message || String(error);

    // Detectar errores que pueden contener datos sensibles
    const sensitivePatterns = [
      /api[_-]?key/i,
      /token/i,
      /password/i,
      /secret/i,
      /credential/i,
    ];

    const hasSensitiveData = sensitivePatterns.some((pattern) =>
      pattern.test(errorMessage),
    );

    if (hasSensitiveData && !isDev) {
      console[level](message, "[Error sanitizado - ver logs de desarrollo]");
    } else {
      console[level](message, isDev ? error : errorMessage.substring(0, 200));
    }
  } else {
    console[level](message);
  }
};

export const sanitizeProfileData = (data: unknown): UserProfile => {
  // Type guard: verificar que data es un objeto
  if (!data || typeof data !== "object") {
    return {
      uid: "",
      gender: "Hombre",
      age: "10",
      weight: "",
      height: "",
      country: "",
      city: "",
      activityLevel: "Sedentario",
      eatingHabit: "",
      allergies: ["Ninguna"],
      diseases: ["Ninguna"],
      dislikedFoods: ["Ninguno"],
      nutritionalGoal: ["Sin especificar"],
      otherAllergies: "",
      otherActivityLevel: "",
      activityFrequency: "rarely",
      cookingAffinity: "Nunca",
    };
  }

  // Ahora podemos hacer type assertion seguro
  const profile = data as Record<string, unknown>;

  const sanitizeOptionalNumber = (value: unknown): string => {
    if (value === null || value === undefined || value === "") return "";
    const num = parseFloat(String(value));
    return isNaN(num) ? "" : num.toString();
  };

  return {
    uid: String(profile.uid || ""),
    gender: String(profile.gender || "Hombre") as Gender,
    age: String(profile.age || "10"),
    weight: sanitizeOptionalNumber(profile.weight),
    height: sanitizeOptionalNumber(profile.height),
    country: String(profile.country || ""),
    city: String(profile.city || ""),
    activityLevel: String(profile.activityLevel || "Sedentario"),
    eatingHabit: String(profile.eatingHabit || ""),
    allergies:
      Array.isArray(profile.allergies) && profile.allergies.length > 0
        ? profile.allergies.map(String)
        : ["Ninguna"],
    diseases:
      Array.isArray(profile.diseases) && profile.diseases.length > 0
        ? profile.diseases.map(String)
        : ["Ninguna"],
    dislikedFoods:
      Array.isArray(profile.dislikedFoods) && profile.dislikedFoods.length > 0
        ? profile.dislikedFoods.map(String)
        : ["Ninguno"],
    nutritionalGoal:
      Array.isArray(profile.nutritionalGoal) && profile.nutritionalGoal.length > 0
        ? profile.nutritionalGoal.map(String)
        : ["Sin especificar"],
    otherAllergies: String(profile.otherAllergies || ""),
    otherActivityLevel: String(profile.otherActivityLevel || ""),
    activityFrequency: String(profile.activityFrequency || "rarely") as ActivityFrequency,
    cookingAffinity: String(profile.cookingAffinity || "Nunca") as CookingAffinity,
  };
};

// Helper para separar datos de auth vs perfil
export const separateUserData = (
  formData: FormData,
): { auth: AuthData; profile: Omit<UserProfile, "uid"> } => {
  const {
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
    ...profileData
  } = formData;

  return {
    auth: {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    },
    profile: profileData as Omit<UserProfile, "uid">,
  };
};
