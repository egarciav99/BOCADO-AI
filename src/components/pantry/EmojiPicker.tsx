import React from "react";
import { useTranslation } from "../../contexts/I18nContext";

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

const EMOJI_CATEGORIES = [
    {
        key: "vegetables",
        emojis: ["🥦", "🥬", "🍅", "🥕", "🥒", "🫑", "🍆", "🥑", "🌽", "🧅", "🧄", "🥔", "🍠", "🎃", "🍄", "🎋", "🥗", "🟢", "🦯", "🍃"],
    },
    {
        key: "fruits",
        emojis: ["🍎", "🍏", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝"],
    },
    {
        key: "proteins",
        emojis: ["🥩", "🍗", "🍖", "🥓", "🐟", "🍣", "🍱", "🍤", "🥚", "🌭", "🍔", "🍕", "🥪", "🌮", "🌯", "🥙", "🧆"],
    },
    {
        key: "dairy",
        emojis: ["🥛", "🧀", "🍦", "🍨", "🧈", "🥣"],
    },
    {
        key: "grains",
        emojis: ["🍞", "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇", "🍚", "🍝", "🍜", "🍲", "🍛", "🥫"],
    },
    {
        key: "condiments",
        emojis: ["🍯", "🧂", "🍬", "🍭", "🍫", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🥜", "🌰", "🌿", "🍃", "🍄", "🧪"],
    },
    {
        key: "other",
        emojis: ["💧", "🥤", "🧃", "🧉", "☕", "🍵", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🍾", "🧊", "📦"],
    },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
    const { t } = useTranslation();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-bocado w-full max-w-sm flex flex-col max-h-[80vh] overflow-hidden">
                <div className="p-4 border-b border-bocado-border flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-bocado-dark-green">
                        {t("pantry.selectIcon") || "Selecciona un icono"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center bg-bocado-background rounded-full text-bocado-dark-gray font-bold active:scale-95 transition-transform"
                    >
                        ×
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                    {EMOJI_CATEGORIES.map((cat) => (
                        <div key={cat.key} className="mb-6">
                            <p className="text-xs font-bold text-bocado-dark-gray mb-3 uppercase tracking-wider">
                                {t(`pantry.categories.${cat.key}`)}}
                            </p>
                            <div className="grid grid-cols-5 gap-2">
                                {cat.emojis.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => {
                                            onSelect(emoji);
                                            onClose();
                                        }}
                                        className="aspect-square flex items-center justify-center text-2xl hover:bg-bocado-background rounded-xl transition-colors active:scale-90"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
