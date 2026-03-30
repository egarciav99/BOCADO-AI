import React from "react";
import { UtensilsCrossed, User, BookOpen, MapPin, Home } from "./icons";
import { useTranslation } from "../contexts/I18nContext";

export type Tab =
  | "recommendation"
  | "pantry"
  | "saved"
  | "restaurants"
  | "profile";

interface BottomTabBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

// ✅ FIX: configuración de tabs en un array para eliminar código duplicado
const useTabConfig = (t: (key: string) => string) => [
  {
    id: "saved" as Tab,
    testId: "nav-saved",
    label: t("tabs.recipes"),
    icon: BookOpen,
  },
  {
    id: "restaurants" as Tab,
    testId: "nav-restaurants",
    label: t("tabs.restaurants"),
    icon: MapPin,
  },
  // El tab central (recommendation) se renderiza aparte por su diseño especial
  {
    id: "pantry" as Tab,
    testId: "nav-pantry",
    label: t("tabs.pantry"),
    icon: UtensilsCrossed,
  },
  {
    id: "profile" as Tab,
    testId: "nav-profile",
    label: t("tabs.profile"),
    icon: User,
  },
];

const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { t } = useTranslation();
  const isActive = (id: Tab) => activeTab === id;

  const leftTabs = useTabConfig(t).slice(0, 2);  // saved, restaurants
  const rightTabs = useTabConfig(t).slice(2);     // pantry, profile

  const renderTab = (tab: ReturnType<typeof useTabConfig>[number]) => {
    const Icon = tab.icon;
    const active = isActive(tab.id);

    return (
      <button
        key={tab.id}
        data-testid={tab.testId}
        onClick={() => onTabChange(tab.id)}
        role="tab"
        aria-label={tab.label}
        aria-current={active ? "page" : undefined}
        className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 min-h-[48px] touch-manipulation ${
          active
            ? "text-bocado-green"
            : "text-bocado-gray dark:text-gray-400"
        }`}
        style={{
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
        <span className="text-xs font-medium whitespace-nowrap">
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    // ✅ FIX: position/bottom solo en className, sin duplicar en style
    // translateZ(0) se mantiene para el fix de iOS keyboard
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 px-safe pb-safe bg-bocado-background dark:bg-gray-800 border-t border-bocado-border/30 dark:border-gray-700"
      aria-label={t("tabs.navLabel")}
      style={{
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
      }}
    >
      <div className="mx-auto max-w-md md:max-w-lg bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] overflow-visible">
        <div
          className="flex items-center justify-between h-16 px-2 relative"
          role="tablist"
          // ✅ FIX: aria-label traducido
          aria-label={t("tabs.primaryNav")}
        >
          {/* Tabs izquierda */}
          {leftTabs.map(renderTab)}

          {/* Tab central — diseño especial elevado */}
          <div className="flex flex-col items-center justify-center flex-1 h-full relative">
            <button
              data-testid="nav-recommendation"
              onClick={() => onTabChange("recommendation")}
              role="tab"
              aria-label={t("tabs.home")}
              aria-current={isActive("recommendation") ? "page" : undefined}
              className={`w-14 h-14 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-md -mt-4 transition-transform touch-manipulation ${
                isActive("recommendation")
                  ? "bg-bocado-green text-white scale-110"
                  : "bg-bocado-dark-green text-white"
              }`}
              style={{
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                minWidth: "56px",
                minHeight: "56px",
              }}
            >
              <Home className="w-6 h-6" strokeWidth={2.5} />
            </button>
            <span
              className={`text-2xs font-bold mt-1 ${
                isActive("recommendation")
                  ? "text-bocado-green"
                  : "text-bocado-gray dark:text-gray-400"
              }`}
            >
              {t("tabs.home")}
            </span>
          </div>

          {/* Tabs derecha */}
          {rightTabs.map(renderTab)}
        </div>
      </div>
    </nav>
  );
};

export default BottomTabBar;