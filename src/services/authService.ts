import { auth, db } from "../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  linkWithPopup,
  unlink,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { FormData, UserProfile } from "../types";
import { separateUserData } from "../utils/profileSanitizer";
import { cleanForFirestore } from "../utils/cleanForFirestore";
import { UserProfileSchema, validateOrThrow } from "../schemas/validation";
import { ErrorHandler } from "../utils/ErrorHandler";

export const registerUser = async (
  formData: FormData,
): Promise<{ uid: string }> => {
  try {
    const { auth: authData, profile } = separateUserData(formData);

    // 1. Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      authData.email,
      authData.password!,
    );

    const user = userCredential.user;
    const uid = user.uid;

    // 2. Actualizar displayName en Auth
    const displayName = `${authData.firstName} ${authData.lastName}`;
    await updateProfile(user, { displayName });

    // 3. Guardar SOLO datos de perfil en Firestore (SIN email, SIN nombres)
    const userProfile: UserProfile = {
      uid,
      ...profile,
      createdAt: serverTimestamp() as UserProfile["createdAt"],
      updatedAt: serverTimestamp() as UserProfile["updatedAt"],
    };

    // Validar antes de escribir
    validateOrThrow(UserProfileSchema, userProfile, 'User Profile Validation');

    await setDoc(doc(db, "users", uid), cleanForFirestore(userProfile));

    return { uid };
  } catch (error) {
    const standardError = ErrorHandler.normalizeError(error, 'AUTH_FAILED', { context: 'registration' });
    console.error("[AuthService] Registration failed:", standardError);
    throw new Error(
      `No se pudo crear la cuenta. ${standardError.message}. Intenta de nuevo.`,
    );
  }
};

/**
 * Inicia sesión con Google
 * Si es un usuario nuevo, retorna isNewUser: true para que complete el perfil
 */
export const signInWithGoogle = async (): Promise<{
  uid: string;
  isNewUser: boolean;
  email: string | null;
}> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });

    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Verificar si el usuario ya tiene perfil en Firestore
    let userDoc;
    try {
      userDoc = await getDoc(doc(db, "users", user.uid));
    } catch (docError) {
      console.warn("[AuthService] Failed to check user profile, assuming new user:", docError);
      userDoc = null;
    }

    const isNewUser = !userDoc || !userDoc.exists();

    // Si es usuario nuevo, crear un perfil básico (se completará después)
    if (isNewUser) {
      const basicProfile: Partial<UserProfile> = {
        uid: user.uid,
        emailVerified: user.emailVerified,
        createdAt: serverTimestamp() as UserProfile["createdAt"],
        updatedAt: serverTimestamp() as UserProfile["updatedAt"],
      };

      try {
        // Validar antes de escribir
        validateOrThrow(UserProfileSchema, basicProfile, 'Basic Profile Creation');
        await setDoc(doc(db, "users", user.uid), cleanForFirestore(basicProfile));
      } catch (profileError) {
        const profileErr = ErrorHandler.normalizeError(profileError, 'FIRESTORE_WRITE_FAILED', { step: 'basic_profile' });
        console.error("[AuthService] Failed to create basic profile:", profileErr);
        // No bloquear el login si falla crear el perfil básico
      }
    }

    return {
      uid: user.uid,
      isNewUser,
      email: user.email,
    };
  } catch (error) {
    const standardError = ErrorHandler.normalizeError(error, 'AUTH_FAILED', { context: 'google_signin' });
    console.error("[AuthService] Google Sign In failed:", standardError);
    throw new Error(`No se pudo iniciar sesión con Google. ${standardError.message}. Intenta de nuevo.`);
  }
};

/**
 * Detecta qué proveedores de autenticación tiene conectados el usuario
 */
export const getUserProviders = (user: User): string[] => {
  return user.providerData.map((provider) => provider.providerId);
};

/**
 * Verifica si el usuario tiene un proveedor específico
 */
export const hasProvider = (user: User, providerId: string): boolean => {
  return getUserProviders(user).includes(providerId);
};

/**
 * Reautentica al usuario con Google
 */
export const reauthenticateWithGoogle = async (user: User): Promise<void> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });

    await reauthenticateWithPopup(user, provider);
  } catch (error) {
    const standardError = ErrorHandler.normalizeError(error, 'AUTH_FAILED', { context: 'reauthentication' });
    console.error("[AuthService] Reauthentication failed:", standardError);
    throw new Error(`No se pudo reautenticar. ${standardError.message}. Intenta de nuevo.`);
  }
};

/**
 * Linkea la cuenta actual con Google
 */
export const linkGoogleAccount = async (user: User): Promise<void> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });

    await linkWithPopup(user, provider);
  } catch (error) {
    const standardError = ErrorHandler.normalizeError(error, 'AUTH_FAILED', { context: 'google_linking' });
    console.error("[AuthService] Google account linking failed:", standardError);
    throw new Error(`No se pudo vincular la cuenta de Google. ${standardError.message}. Intenta de nuevo.`);
  }
};

/**
 * Desvincula Google de la cuenta
 */
export const unlinkGoogleAccount = async (user: User): Promise<void> => {
  try {
    await unlink(user, "google.com");
  } catch (error) {
    const standardError = ErrorHandler.normalizeError(error, 'AUTH_FAILED', { context: 'google_unlinking' });
    console.error("[AuthService] Google account unlinking failed:", standardError);
    throw new Error(`No se pudo desvincular Google. ${standardError.message}. Intenta de nuevo.`);
  }
};
