import { profileCache, pantryCache, ingredientsCache, getCachedWithFallback } from "../utils/cache";
import { safeLog } from "../utils/shared-logic";
import { searchFatSecretIngredients } from "../utils/fatsecret";
import { PantryItem, FirestoreIngredient } from "./recommendation-scorer";

export interface UserProfile {
    userId: string;
    eatingHabit?: string;
    age?: number | string;
    sex?: string;
    gender?: string;
    weight?: string;
    height?: string;
    activityLevel?: string;
    activityFrequency?: string;
    nutritionalGoal?: string;
    diseases?: string[];
    allergies?: string[];
    otherAllergies?: string;
    dislikedFoods?: string[];
    cookingAffinity?: string;
    city?: string;
    country?: string;
    location?: { lat: number; lng: number };
    locationEnabled?: boolean;
    [key: string]: any;
}

/**
 * 🛠️ Servicio de datos con cache integrado para la API de recomendaciones.
 */
export class RecommendationDataService {
    constructor(private db: any) { }

    /**
     * Obtiene perfil del usuario con cache en memoria (TTL: 10m)
     */
    async getUserProfile(userId: string): Promise<UserProfile> {
        const cached = profileCache.get<UserProfile>(userId);
        if (cached) {
            safeLog("log", `[Cache] Profile HIT: ${userId.substring(0, 8)}...`);
            return cached;
        }

        safeLog("log", `[Cache] Profile MISS: fetching from Firestore ${userId.substring(0, 8)}...`);
        const userSnap = await this.db.collection("users").doc(userId).get();
        if (!userSnap.exists) {
            throw new Error("Usuario no encontrado");
        }

        const profile = userSnap.data() as UserProfile;
        profileCache.set(userId, profile);
        return profile;
    }

    /**
     * Obtiene items de despensa con cache en memoria (TTL: 5m)
     */
    async getPantryItems(userId: string): Promise<PantryItem[]> {
        const cached = pantryCache.get<PantryItem[]>(userId);
        if (cached) {
            safeLog("log", `[Cache] Pantry HIT: ${userId.substring(0, 8)}...`);
            return cached;
        }

        try {
            safeLog("log", `[Cache] Pantry MISS: fetching from Firestore ${userId.substring(0, 8)}...`);
            const pantryDoc = await this.db.collection("user_pantry").doc(userId).get();
            const pantryData = pantryDoc.exists ? pantryDoc.data() : null;

            const items: PantryItem[] =
                pantryData?.items && Array.isArray(pantryData.items)
                    ? pantryData.items
                        .map((item: any) => ({
                            name: item.name || "",
                            freshness: item.freshness || "fresh",
                        }))
                        .filter((i: PantryItem) => i.name)
                    : [];

            pantryCache.set(userId, items);
            return items;
        } catch (error) {
            safeLog("warn", "[Cache] Pantry fetch failed, using empty array:", error);
            return [];
        }
    }

    /**
     * Obtiene todos los ingredientes disponibles con cache global (TTL: 1h)
     */
    async getAllIngredients(): Promise<FirestoreIngredient[]> {
        return getCachedWithFallback(
            ingredientsCache,
            "global_ingredients_list",
            async () => {
                try {
                    const localSnap = await this.db
                        .collection("ingredients")
                        .limit(1000)
                        .get();

                    if (!localSnap.empty) {
                        safeLog("log", `[Ingredients] Fetched ${localSnap.size} from Firestore`);
                        return localSnap.docs.map((doc: any) => ({
                            id: doc.id,
                            ...doc.data(),
                        } as FirestoreIngredient));
                    }

                    // Fallback a FatSecret si no hay ingredientes locales
                    if (process.env.FATSECRET_KEY && process.env.FATSECRET_SECRET) {
                        const fatsecretResults = await searchFatSecretIngredients("*", 500);
                        if (fatsecretResults?.length > 0) {
                            return fatsecretResults.map((fs: any) => ({
                                id: `fs_${fs.food_id}`,
                                name: fs.food_name,
                                category: fs.food_type || "Generic",
                                regional: { es: fs.food_name, mx: fs.food_name },
                            }));
                        }
                    }

                    return [];
                } catch (error) {
                    safeLog("error", "[Ingredients] Error loading", error);
                    return [];
                }
            }
        );
    }
}
