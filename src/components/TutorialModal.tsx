import React, { useState, useEffect, useRef } from "react";
import BocadoLogo from "./BocadoLogo";
import { trackEvent } from "../firebaseConfig";
import { useTranslation } from "../contexts/I18nContext";
import { ChevronLeft, ChevronRight, Clock, Heart, Zap, Star } from "lucide-react";

interface TutorialModalProps {
  onClose: () => void;
  userName?: string;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ onClose, userName }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  // ✅ FIX: refs para swipe táctil
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50;
  const VERTICAL_THRESHOLD = 30;

  const steps = React.useMemo(
    () => [
      {
        title: t("tutorial.welcome", {
          userName: userName ? `, ${userName}` : "",
        }),
        description: t("tutorial.subtitle"),
        icon: (
          <div className="w-40 mx-auto">
            <BocadoLogo className="w-full" />
          </div>
        ),
        color: "bg-white",
        textColor: "text-bocado-green",
        id: "welcome",
      },
      {
        title: t("tutorial.slides.rateLimit.title"),
        description: t("tutorial.slides.rateLimit.description"),
        // ✅ FIX: Lucide icon en vez de emoji
        icon: (
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mx-auto">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
        ),
        color: "bg-amber-50",
        textColor: "text-amber-900",
        id: "ratelimit",
      },
      {
        title: t("tutorial.slides.budget.title"),
        description: t("tutorial.slides.budget.description"),
        // ✅ FIX: Lucide icon en vez de emoji
        icon: (
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
            <Star className="w-8 h-8 text-green-600" />
          </div>
        ),
        color: "bg-green-50",
        textColor: "text-green-900",
        id: "budget",
      },
      {
        title: t("tutorial.slides.favorites.title"),
        description: t("tutorial.slides.favorites.description"),
        // ✅ FIX: Lucide icon en vez de emoji
        icon: (
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mx-auto">
            <Heart className="w-8 h-8 text-red-500" />
          </div>
        ),
        color: "bg-red-50",
        textColor: "text-red-900",
        id: "favorites",
      },
    ],
    [t, userName],
  );

  useEffect(() => {
    trackEvent("tutorial_step_view", {
      step_index: currentStep,
      step_id: steps[currentStep]?.id,
    });
  }, [currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      trackEvent("tutorial_finished");
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    trackEvent("tutorial_skipped", {
      at_step: currentStep,
      step_id: steps[currentStep].id,
    });
    onClose();
  };

  const handleDotClick = (index: number) => {
    trackEvent("tutorial_dot_navigation", {
      from_step: currentStep,
      to_step: index,
    });
    setCurrentStep(index);
  };

  // ✅ FIX: handlers de swipe táctil
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);

    // Ignorar si el movimiento es principalmente vertical (scroll)
    if (deltaY > VERTICAL_THRESHOLD) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }

    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      if (deltaX < 0) {
        // Swipe izquierda → siguiente
        handleNext();
      } else {
        // Swipe derecha → anterior
        handlePrev();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const content = steps[currentStep];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-safe animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div
        className="bg-white rounded-3xl shadow-bocado w-full max-w-sm overflow-visible flex flex-col max-h-[90vh]"
        // ✅ FIX: swipe táctil en el card
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Visual Area */}
        <div
          className={`${content.color} h-48 flex items-center justify-center transition-colors duration-300 shrink-0 rounded-t-3xl`}
        >
          <div
            className={`transform transition-transform duration-300 ${
              currentStep === 0 ? "scale-100" : "scale-110"
            }`}
          >
            {content.icon}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 text-center flex-1 flex flex-col justify-between overflow-y-auto">
          <div>
            <h2
              id="tutorial-title"
              className={`text-xl font-bold mb-3 ${content.textColor}`}
            >
              {content.title}
            </h2>
            <p className="text-bocado-gray leading-relaxed text-sm">
              {content.description}
            </p>
          </div>

          <div className="mt-6">
            {/* ✅ FIX: dots con aria-label traducido */}
            <div
              className="flex justify-center gap-2 mb-4"
              role="tablist"
              aria-label={t("tutorial.stepsNavigation")}
            >
              {steps.map((step, index) => (
                <button
                  key={index}
                  onClick={() => handleDotClick(index)}
                  role="tab"
                  aria-selected={index === currentStep}
                  aria-label={t("tutorial.goToStep", { step: index + 1 })}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    index === currentStep
                      ? "w-6 bg-bocado-green"
                      : "w-2 bg-bocado-border hover:bg-bocado-gray"
                  }`}
                />
              ))}
            </div>

            {/* ✅ FIX: botones prev/next para usuarios que no usan swipe */}
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="p-2 rounded-full bg-bocado-background hover:bg-bocado-border transition-colors"
                  aria-label={t("tutorial.previous")}
                >
                  <ChevronLeft className="w-5 h-5 text-bocado-dark-gray" />
                </button>
              )}

              <button
                onClick={handleNext}
                className="flex-1 bg-bocado-green text-white font-bold py-3 px-6 rounded-full text-sm shadow-bocado hover:bg-bocado-dark-green active:scale-95 transition-all"
              >
                {currentStep === steps.length - 1
                  ? t("tutorial.start")
                  : t("tutorial.next")}
              </button>

              {currentStep < steps.length - 1 && (
                <button
                  onClick={handleNext}
                  className="p-2 rounded-full bg-bocado-background hover:bg-bocado-border transition-colors"
                  aria-label={t("tutorial.next")}
                >
                  <ChevronRight className="w-5 h-5 text-bocado-dark-gray" />
                </button>
              )}
            </div>

            {currentStep < steps.length - 1 && (
              <button
                onClick={handleSkip}
                className="mt-3 text-xs text-bocado-gray font-medium hover:text-bocado-dark-gray transition-colors"
              >
                {t("tutorial.skip")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
