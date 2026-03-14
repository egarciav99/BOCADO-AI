import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db, auth, trackEvent } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  getDoc,
  DocumentSnapshot,
} from "firebase/firestore";
import { Plan, Meal } from "../types";
import MealCard from "./MealCard";
import BottomTabBar, { Tab } from "./BottomTabBar";
import { useTranslation } from "../contexts/I18nContext";

interface PlanScreenProps {
  planId: string;
  onStartNewPlan: () => void;
  onNavigateTab?: (tab: Tab) => void;
}

// --- PROCESAMIENTO DE RECETAS (EN CASA) ---
const processFirestoreDoc = (doc: DocumentSnapshot): Plan | null => {
  try {
    const data = doc.data();
    if (!data) return null;
    const interactionId = data.interaction_id || data.user_interactions;
    const rawDate = data.fecha_creacion || data.createdAt;
    let recipesArray: any[] = [];
    let greeting = data.saludo_personalizado || "Aquí tienes tu plan";

    if (data.receta && Array.isArray(data.receta.recetas)) {
      recipesArray = data.receta.recetas;
      if (data.saludo_personalizado) greeting = data.saludo_personalizado;
    } else if (Array.isArray(data.recetas)) {
      recipesArray = data.recetas;
    }
    if (recipesArray.length === 0) return null;

    const meals: Meal[] = recipesArray.map((rec: any, index: number) => ({
      mealType: `Opción ${index + 1}`,
      recipe: {
        title: rec.titulo ?? rec.nombre ?? "Receta",
        time: rec.tiempo_estimado ?? rec.tiempo_preparacion ?? "N/A",
        difficulty: rec.dificultad ?? "N/A",
        calories: rec.macros_por_porcion?.kcal ?? rec.kcal ?? "N/A",
        savingsMatch: rec.coincidencia_despensa ?? "Ninguno",
        ingredients: Array.isArray(rec.ingredientes) ? rec.ingredientes : [],
        instructions: Array.isArray(rec.pasos_preparacion)
          ? rec.pasos_preparacion
          : Array.isArray(rec.instrucciones)
            ? rec.instrucciones
            : [],
        // Macros completos
        protein_g: rec.macros_por_porcion?.proteinas_g,
        carbs_g: rec.macros_por_porcion?.carbohidratos_g,
        fat_g: rec.macros_por_porcion?.grasas_g,
      },
    }));

    return {
      planTitle: "Recetas Sugeridas",
      greeting,
      meals,
      _id: doc.id,
      _createdAt: rawDate,
      interaction_id: interactionId,
    };
  } catch (e) {
    return null;
  }
};

// --- PROCESAMIENTO DE RESTAURANTES (FUERA) ---
const processRecommendationDoc = (doc: DocumentSnapshot): Plan | null => {
  try {
    const data = doc.data();
    if (!data) return null;
    // ✅ FIX: Usar ?? para preservar valores falsy válidos
    const interactionId = data.interaction_id ?? data.user_interactions;
    const rawDate = data.fecha_creacion ?? data.createdAt;

    let items =
      data.recomendaciones?.recomendaciones ?? data.recomendaciones ?? [];
    let greeting = data.saludo_personalizado ?? "Opciones fuera de casa";
    if (!Array.isArray(items) || items.length === 0) return null;

    const meals: Meal[] = items.map((rec: any, index: number) => ({
      mealType: `Sugerencia ${index + 1}`,
      recipe: {
        title: rec.nombre_restaurante ?? rec.nombre ?? "Restaurante",
        cuisine: rec.tipo_comida ?? rec.cuisine ?? rec.tipo ?? "Gastronomía",
        time: "N/A",
        difficulty: "Restaurante",
        calories: "N/A",
        savingsMatch: "Ninguno",

        // Campos separados para restaurantes
        link_maps: rec.link_maps ?? null,
        direccion_aproximada: rec.direccion_aproximada ?? null,
        plato_sugerido: rec.plato_sugerido ?? null,
        por_que_es_bueno: rec.por_que_es_bueno ?? null,
        hack_saludable: rec.hack_saludable ?? null,

        // Arrays vacíos para restaurantes
        ingredients: [],
        instructions: [],
      },
    }));

    return {
      planTitle: "Lugares Recomendados",
      greeting,
      meals,
      _id: doc.id,
      _createdAt: rawDate,
      interaction_id: interactionId,
    };
  } catch (e) {
    return null;
  }
};

// --- HELPER: Retry con delay para fallback query ---
const retryQuery = async (
  fn: () => Promise<any>,
  maxRetries: number = 2,
  delayMs: number = 500,
): Promise<any> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  return null;
};

// --- HOOK DE CONSULTA ---
const usePlanQuery = (
  planId: string | undefined,
  userId: string | undefined,
) => {
  return useQuery({
    queryKey: ["plan", planId, userId],
    queryFn: async () => {
      if (!planId || !userId) {
        throw new Error("Faltan parámetros");
      }

      // 1) Direct docId lookup (most reliable - docId == interactionId since API v2)
      const [recipesDoc, recsDoc] = await Promise.all([
        getDoc(doc(db, "historial_recetas", planId)),
        getDoc(doc(db, "historial_recomendaciones", planId)),
      ]);

      if (recipesDoc.exists()) {
        const plan = processFirestoreDoc(recipesDoc);
        if (plan) return plan;
      }

      if (recsDoc.exists()) {
        const plan = processRecommendationDoc(recsDoc);
        if (plan) return plan;
      }

      // 2) Fallback: Legacy query by interaction_id (for older docs)
      const result = await retryQuery(async () => {
        const [recipesSnap, recsSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "historial_recetas"),
              where("user_id", "==", userId),
              where("interaction_id", "==", planId),
              limit(1),
            ),
          ),
          getDocs(
            query(
              collection(db, "historial_recomendaciones"),
              where("user_id", "==", userId),
              where("interaction_id", "==", planId),
              limit(1),
            ),
          ),
        ]);

        if (!recipesSnap.empty && recipesSnap.docs.length > 0) {
          const docSnap = recipesSnap.docs[0];
          const plan = processFirestoreDoc(docSnap);
          if (plan) return plan;
        }

        if (!recsSnap.empty && recsSnap.docs.length > 0) {
          const docSnap = recsSnap.docs[0];
          const plan = processRecommendationDoc(docSnap);
          if (plan) return plan;
        }

        return null;
      }, 2, 500);

      if (result) return result;

      throw new Error("No se encontró el plan");
    },
    enabled: !!planId && !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

const PlanScreen: React.FC<PlanScreenProps> = ({
  planId,
  onStartNewPlan,
  onNavigateTab,
}) => {
  const { t } = useTranslation();

  // Memoize so the array reference is stable — without this, loadingMessages
  // gets a new reference on every render, which restarts the interval below
  const loadingMessages = React.useMemo(
    () => [
      t("plan.loadingMessages.chefs"),
      t("plan.loadingMessages.places"),
      t("plan.loadingMessages.ingredients"),
      t("plan.loadingMessages.nutrition"),
      t("plan.loadingMessages.magic"),
      t("plan.loadingMessages.final"),
    ],
    [t],
  );

  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(
    () => loadingMessages[0] ?? "Cargando...",
  );
  const user = auth.currentUser;
  const {
    data: selectedPlan,
    isLoading,
    isError,
    error,
    refetch,
  } = usePlanQuery(planId, user?.uid);

  useEffect(() => {
    if (selectedPlan) {
      trackEvent("plan_viewed", {
        plan_id: planId,
        plan_type: selectedPlan.planTitle,
        userId: user?.uid,
      });
    }
  }, [selectedPlan, planId, user]);

  useEffect(() => {
    if (isError) {
      trackEvent("plan_error", {
        plan_id: planId,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [isError, error, planId]);

  useEffect(() => {
    if (!isLoading) return;
    const intervalId = setInterval(() => {
      setCurrentLoadingMessage((prev) => {
        // 🟠 FIX #4: Validar indexOf antes de usar en array access
        const idx = loadingMessages.indexOf(prev);
        const nextIdx = idx >= 0 ? (idx + 1) % loadingMessages.length : 0;
        return loadingMessages[nextIdx] || loadingMessages[0] || "Cargando...";
      });
    }, 4000);
    return () => clearInterval(intervalId);
  }, [isLoading, loadingMessages]); // loadingMessages is memoized — stable ref

  // NOTA: MealCard ya ejecuta toggleMutation internamente en handleSaveClick.
  // Este handler solo registra el evento de analytics desde PlanScreen.
  // NO debe hacer una segunda mutación para evitar doble guardado/borrado.
  const handleToggleSave = (meal: Meal) => {
    if (!user) return;
    const isRestaurant = meal.recipe.difficulty === "Restaurante";

    trackEvent("plan_item_saved", {
      item_title: meal.recipe.title,
      type: isRestaurant ? "restaurant" : "recipe",
    });
  };

  const handleStartNew = () => {
    trackEvent("plan_return_home");
    onStartNewPlan();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-12 h-12 border-4 border-bocado-green border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-bold text-bocado-dark-green mb-2">
          {t("plan.preparingTable")}
        </h2>
        <p className="text-sm text-bocado-gray text-center max-w-xs">
          {currentLoadingMessage}
        </p>
      </div>
    );
  }

  if (isError || !selectedPlan) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="bg-white p-6 rounded-3xl shadow-bocado text-center w-full max-w-sm animate-fade-in">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-red-500 mb-2">
            {t("plan.errorTitle")}
          </h2>
          <p className="text-sm text-bocado-gray mb-6">
            {error instanceof Error ? error.message : t("plan.errorMessage")}
          </p>
          <button
            onClick={() => refetch()}
            className="w-full bg-bocado-green text-white font-bold py-3 px-6 rounded-full text-sm shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all"
          >
            {t("plan.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  return (
    // ✅ Estructura flex para contener todo incluido BottomTabBar
    <div className="flex flex-col h-full min-h-0">
      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar min-h-0">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-bocado-dark-green mb-3">
            {t("plan.ready")}
          </h1>
          <div className="p-4 bg-bocado-green/10 rounded-2xl">
            <p className="text-bocado-dark-green italic text-sm leading-relaxed">
              "{selectedPlan.greeting}"
            </p>
          </div>
        </div>

        <div className="space-y-3 max-w-2xl mx-auto">
          {selectedPlan.meals.map((meal: Meal, index: number) => (
            <MealCard
              key={index}
              meal={meal}
              onInteraction={(type) => {
                if (type === "save") handleToggleSave(meal);
              }}
            />
          ))}
        </div>

        {/* Espacio al final para evitar que BottomTabBar tape contenido */}
        <div className="h-32"></div>
      </div>

      {/* ✅ Botón fijo encima del BottomTabBar */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 pointer-events-none z-40">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <button
            onClick={handleStartNew}
            className="w-full bg-bocado-green text-white font-bold py-3 px-6 rounded-full text-sm shadow-lg hover:bg-bocado-dark-green active:scale-95 transition-all"
          >
            {t("plan.backToHome")}
          </button>
        </div>
      </div>

      {/* ✅ BottomTabBar - fixed en la parte inferior */}
      <BottomTabBar
        activeTab="recommendation"
        onTabChange={(tab) => {
          if (onNavigateTab) {
            onNavigateTab(tab);
          }
        }}
      />
    </div>
  );
};

export default PlanScreen;
