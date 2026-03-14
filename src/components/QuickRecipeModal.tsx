import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  addDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, serverTimestamp, trackEvent } from "../firebaseConfig";
import { useAuthStore } from "../stores/authStore";
import { useUserProfile } from "../hooks/useUser";
import { logger } from "../utils/logger";
import { useTranslation } from "../contexts/I18nContext";
import { env } from "../environment/env";
import FirstTimeUserTutorialQuickRecipe from "./FirstTimeUserTutorialQuickRecipe";

interface QuickRecipeModalProps {
  userName: string;
  onClose: () => void;
  onRecipeGenerated: (interactionId: string) => void;
  isProfileScreen?: boolean;
}

interface Ingredient {
  id: string;
  name: string;
  regional?: {
    mx?: string;
    es?: string;
  };
}

/**
 * 🚀 Modal para generar Receta Rápida con ingredientes al vuelo
 */
const QuickRecipeModal: React.FC<QuickRecipeModalProps> = ({
  userName,
  onClose,
  onRecipeGenerated,
  isProfileScreen = false,
}) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: profile } = useUserProfile(user?.uid);

  // State
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<Ingredient[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [cookingTime, setCookingTime] = useState<number | null>(null);
  const [showTimeSlider, setShowTimeSlider] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(true); // Tutorial visible on first open (unless Profile)

  const inputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. Cargar ingredientes desde Firestore (una sola vez)
  useEffect(() => {
    const loadIngredients = async () => {
      try {
        const response = await fetch("/api/ingredients", { method: "GET" });
        if (!response.ok) throw new Error("Failed to fetch ingredients");
        const data = await response.json();
        setAllIngredients(data.ingredients || []);
      } catch (err) {
        logger.warn("Failed to load ingredients for autocomplete:", err);
        // Fallback: usar lista vacía, permitir entrada libre
        setAllIngredients([]);
      } finally {
        setLoading(false);
      }
    };

    loadIngredients();
  }, []);

  // 2. Actualizar sugerencias mientras el usuario escribe
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setError(null);

    if (value.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    const normalized = value.toLowerCase();
    const filtered = allIngredients
      .filter((ing) => {
        const name = ing.name.toLowerCase();
        const mx = ing.regional?.mx?.toLowerCase() || "";
        const es = ing.regional?.es?.toLowerCase() || "";
        const combined = `${name} ${mx} ${es}`;

        return combined.includes(normalized);
      })
      .slice(0, 8); // máximo 8 sugerencias

    setSuggestions(filtered);
  };

  // 3. Agregar ingrediente (desde sugerencia o enterkey)
  const addIngredient = useCallback((ingredientName: string) => {
    const normalized = ingredientName.trim();
    if (!normalized) return;

    // Evitar duplicados
    if (
      selectedIngredients.some(
        (ing) => ing.toLowerCase() === normalized.toLowerCase(),
      )
    ) {
      setError(t("quickRecipe.ingredientDuplicate") || "Ingrediente ya agregado");
      return;
    }

    // Máximo 15 ingredientes
    if (selectedIngredients.length >= 15) {
      setError(
        t("quickRecipe.maxIngredientsReached") ||
          "Máximo 15 ingredientes permitidos",
      );
      return;
    }

    setSelectedIngredients([...selectedIngredients, normalized]);
    setInputValue("");
    setSuggestions([]);
    setError(null);

    trackEvent("quick_recipe_ingredient_added", {
      ingredient: normalized,
      count: selectedIngredients.length + 1,
    });
  }, [selectedIngredients, t]);

  // 4. Manejar enter en input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addIngredient(inputValue);
    }
  };

  // 5. Remover ingrediente
  const removeIngredient = (ingredientName: string) => {
    setSelectedIngredients(
      selectedIngredients.filter((ing) => ing !== ingredientName),
    );
    trackEvent("quick_recipe_ingredient_removed", { ingredient: ingredientName });
  };

  // 6. Generar receta
  const handleGenerateRecipe = async () => {
    if (isProcessingRef.current || isGenerating) return;

    if (selectedIngredients.length < 2) {
      setError(
        t("quickRecipe.minIngredientsError") ||
          "Se requieren al menos 2 ingredientes",
      );
      return;
    }

    if (!user || !profile) {
      setError(t("quickRecipe.userNotFound") || "Usuario no encontrado");
      return;
    }

    isProcessingRef.current = true;
    setIsGenerating(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // Initialize timeoutId - will be set if fetch starts successfully
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      // 1. Crear documento de interacción en Firestore
      const interactionData = {
        userId: user.uid,
        type: "Receta Rápida",
        ingredientes: selectedIngredients,
        cookingTime: cookingTime || null,
        createdAt: serverTimestamp(),
        procesado: false,
      };

      const newDoc = await addDoc(
        collection(db, "user_interactions"),
        interactionData,
      );

      // 2. Llamar API de recomendación
      const token = await user.getIdToken();

      interface RequestBody {
        type: "Receta Rápida";
        userId: string;
        ingredientes: string[];
        cookingTime?: number | null;
        _id: string;
        language: string;
      }

      const requestBody: RequestBody = {
        type: "Receta Rápida",
        userId: user.uid,
        ingredientes: selectedIngredients,
        cookingTime: cookingTime,
        _id: newDoc.id,
        language: "es", // TODO: usar locale del context
      };

      timeoutId = setTimeout(() => {
        controller.abort();
        isProcessingRef.current = false;
        setIsGenerating(false);
        setError(
          t("quickRecipe.connectionError") || "Error de conexión, intenta de nuevo",
        );
        trackEvent("quick_recipe_timeout");
      }, 30000); // 30 segundos

      const response = await fetch(env.api.recommendationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          setError(
            t("quickRecipe.rateLimited") ||
              "Demasiadas solicitudes, intenta más tarde",
          );
        } else {
          const errorText = await response.text();
          setError(
            t("quickRecipe.generationError") ||
              `Error: ${errorText.substring(0, 100)}`,
          );
        }
        isProcessingRef.current = false;
        setIsGenerating(false);
        trackEvent("quick_recipe_failed", { status: response.status });
        return;
      }

      trackEvent("quick_recipe_generated", {
        ingredient_count: selectedIngredients.length,
        cooking_time: cookingTime,
      });

      // Reset processing flags before notifying parent
      isProcessingRef.current = false;
      setIsGenerating(false);

      // Callback para cerrar modal y redirigir
      onRecipeGenerated(newDoc.id);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError(
          t("quickRecipe.connectionError") ||
            "Solicitud cancelada, intenta de nuevo",
        );
      } else {
        logger.error("Quick recipe error:", err);
        setError(
          t("quickRecipe.unknownError") || "Error desconocido, intenta de nuevo",
        );
      }
      isProcessingRef.current = false;
      setIsGenerating(false);
      trackEvent("quick_recipe_error", { error: err.message });
    } finally {
      // Ensure timeout is always cleared, regardless of success or error
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  };

  // UI
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full md:max-w-md bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl p-5 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center gap-3">
          <h2 className="text-lg font-bold text-bocado-dark-gray dark:text-white flex-1 truncate">
            ⚡ {t("quickRecipe.title") || "Receta Rápida"}
          </h2>
          <button
            onClick={onClose}
            className="text-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition flex-shrink-0"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Descripción - Corta y clara */}
        <p className="text-xs text-bocado-gray dark:text-gray-400 line-clamp-2">
          {t("quickRecipe.description") ||
            "Agrega 2+ ingredientes y genera una receta personalizada al instante."}
        </p>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Input Autocomplete */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-bocado-dark-gray dark:text-gray-300 uppercase tracking-wide">
            {t("quickRecipe.ingredientsLabel") || "Ingredientes"}
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                t("quickRecipe.ingredientPlaceholder") || "Pan, huevo, queso..."
              }
              disabled={isGenerating || loading}
              className="input-base"
              aria-label={t("quickRecipe.ingredientsLabel")}
            />

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-bocado-border dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                {suggestions.map((ing) => (
                  <button
                    key={ing.id}
                    onClick={() => addIngredient(ing.name)}
                    className="w-full text-left px-4 py-2.5 hover:bg-bocado-background dark:hover:bg-gray-600 transition text-sm text-bocado-dark-gray dark:text-white first:rounded-t-lg last:rounded-b-lg truncate"
                  >
                    {ing.regional?.mx || ing.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-bocado-gray dark:text-gray-400">
            {t("quickRecipe.pressEnterHint") || "Enter o selecciona"}
          </p>
        </div>

        {/* Ingredientes Seleccionados como Chips */}
        {selectedIngredients.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {selectedIngredients.map((ing) => (
                <div
                  key={ing}
                  className="bg-bocado-green/15 dark:bg-bocado-green/20 text-bocado-green dark:text-bocado-green-light px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border border-bocado-green/30 dark:border-bocado-green/50"
                >
                  {ing}
                  <button
                    onClick={() => removeIngredient(ing)}
                    className="hover:opacity-70 transition font-bold text-sm"
                    aria-label={`Remover ${ing}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-bocado-gray dark:text-gray-400 font-medium">
              {selectedIngredients.length} {selectedIngredients.length === 1 ? "ingrediente" : "ingredientes"} seleccionados
            </p>
          </div>
        )}

        {/* Cooking Time - Collapsible Card with Presets */}
        <div className="bg-bocado-background dark:bg-gray-700 rounded-2xl p-3 space-y-3">
          <button
            onClick={() => setShowTimeSlider(!showTimeSlider)}
            className="w-full flex justify-between items-center text-sm font-bold text-bocado-dark-gray dark:text-white hover:opacity-80 transition"
          >
            <span>⏱️ {cookingTime ? `${cookingTime} min máximo` : "Tiempo de cocción"}</span>
            <span className={`text-lg transition-transform ${showTimeSlider ? "rotate-180" : ""}`}>▼</span>
          </button>

          {showTimeSlider && (
            <div className="space-y-3 pt-2 border-t border-bocado-border dark:border-gray-600">
              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 20, 30].map((min) => (
                  <button
                    key={min}
                    onClick={() => setCookingTime(min)}
                    disabled={isGenerating}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                      cookingTime === min
                        ? "bg-bocado-green text-white shadow-md"
                        : "bg-white dark:bg-gray-600 text-bocado-dark-gray dark:text-gray-200 border border-bocado-border dark:border-gray-500 hover:border-bocado-green dark:hover:border-bocado-green"
                    }"`}
                  >
                    {min}m
                  </button>
                ))}
              </div>

              {/* Fine-tune Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-bocado-gray dark:text-gray-400">Personalizar:</span>
                  <span className="text-sm font-bold text-bocado-green">{cookingTime || 20} min</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={cookingTime || 20}
                  onChange={(e) => setCookingTime(parseInt(e.target.value, 10))}
                  disabled={isGenerating}
                  className="quick-recipe-range-slider w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-2 border-t border-bocado-border dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="btn-secondary flex-1 py-2.5 text-sm"
          >
            {t("quickRecipe.cancelButton") || "Cancelar"}
          </button>
          <button
            onClick={handleGenerateRecipe}
            disabled={
              isGenerating ||
              selectedIngredients.length < 2 ||
              loading
            }
            className="btn-primary flex-1 py-2.5 text-sm"
          >
            {isGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t("quickRecipe.generatingButton") || "Generando..."}
              </>
            ) : (
              <>
                ⚡ {t("quickRecipe.generateButton") || "Generar"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tutorial First-Time-User (hidden on Profile screen) */}
      {!isProfileScreen && (
        <FirstTimeUserTutorialQuickRecipe
          isVisible={showTutorial}
          onDismiss={() => setShowTutorial(false)}
        />
      )}
    </div>
  );
};

export default QuickRecipeModal;
