import { normalizeText, getRootWord } from "../utils/shared-logic";

export interface PantryItem {
    name: string;
    freshness: "fresh" | "soon" | "expired";
}

export interface FirestoreIngredient {
    id: string;
    name: string;
    category: string;
    regional: {
        es?: string;
        mx?: string;
        en?: string;
    };
}

/**
 * 🛠️ Lógica de puntuación y priorización de ingredientes.
 */
export class RecommendationScorer {
    private static genericWords = [
        "aceite", "sal", "leche", "pan", "harina", "agua",
        "mantequilla", "crema", "salsa"
    ];

    static scoreIngredients(
        filteredItems: FirestoreIngredient[],
        pantryItems: PantryItem[],
    ): { priorityList: string; marketList: string; hasPantryItems: boolean } {
        const pantryRoots = pantryItems
            .map((item) => ({ root: getRootWord(item.name), freshness: item.freshness }))
            .filter((obj) => obj.root && obj.root.length > 2);

        const scoredItems = filteredItems
            .map((item) => {
                const rawName = item.regional.mx || item.name || item.regional.es || "";
                if (!rawName) return { name: "", score: 0 };

                const norm = normalizeText(rawName);
                const root = getRootWord(rawName);
                let score = 1;

                pantryRoots.forEach((pantryObj) => {
                    if (root === pantryObj.root) {
                        score = pantryObj.freshness === "soon" ? 100 : 50;
                    } else if (new RegExp(`\\b${pantryObj.root}\\b`, "i").test(norm)) {
                        if (
                            !(norm.split(/\s+/).length > 2 && this.genericWords.includes(pantryObj.root))
                        ) {
                            score = pantryObj.freshness === "soon" ? 40 : 20;
                        }
                    }
                });

                // Añadir etiqueta de urgencia
                const finalName = pantryItems.some(pi => pi.name === rawName && pi.freshness === 'soon')
                    ? `${rawName} (URGENTE: Próximo a vencer)`
                    : rawName;

                return { name: finalName, score };
            })
            .filter((item) => item.name);

        scoredItems.sort((a, b) => b.score - a.score);

        const priorityList = scoredItems
            .filter((i) => i.score >= 20)
            .map((i) => i.name)
            .join(", ");
        const marketList = scoredItems
            .filter((i) => i.score < 20)
            .map((i) => i.name)
            .join(", ");

        return {
            priorityList,
            marketList,
            hasPantryItems: priorityList.length > 0
        };
    }
}
