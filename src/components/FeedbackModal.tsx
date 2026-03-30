import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useId,
  createContext,
  useContext,
} from "react";
import { createPortal } from "react-dom";
import { trackEvent } from "../firebaseConfig";
import { useAuthStore } from "../stores/authStore";
import { useFeedbackMutation } from "../hooks/useSavedItems";
import type { Recipe } from "../types";
import { useTranslation } from "../contexts/I18nContext";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  type: "home" | "away";
  originalData: Recipe;
  // ✅ FIX: prop opcional para el delay de cierre post-éxito
  successCloseDelay?: number;
}

const MAX_COMMENT_LENGTH = 500;
const DEFAULT_SUCCESS_CLOSE_DELAY = 2000;

interface ModalContextType {
  activeModalId: string | null;
  setActiveModalId: (id: string | null) => void;
}

const ModalContext = createContext<ModalContextType>({
  activeModalId: null,
  setActiveModalId: () => {},
});

export const FeedbackModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeModalId, setActiveModalId] = useState<string | null>(null);
  return (
    <ModalContext.Provider value={{ activeModalId, setActiveModalId }}>
      {children}
    </ModalContext.Provider>
  );
};

const sanitizeComment = (text: string): string => {
  return text.trim().replace(/[<>]/g, "").substring(0, MAX_COMMENT_LENGTH);
};

interface StarButtonProps {
  star: number;
  isActive: boolean;
  onClick: (star: number) => void;
  isDisabled: boolean;
  // ✅ FIX: recibir el label traducido como prop
  ariaLabel: string;
}

const StarButton: React.FC<StarButtonProps> = React.memo(
  ({ star, isActive, onClick, isDisabled, ariaLabel }) => {
    const handleClick = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDisabled) onClick(star);
      },
      [star, onClick, isDisabled],
    );

    return (
      <button
        onClick={handleClick}
        onTouchEnd={handleClick}
        disabled={isDisabled}
        className={`text-4xl sm:text-3xl transition-all active:scale-125 disabled:opacity-50 select-none cursor-pointer ${
          isActive
            ? "grayscale-0 scale-110"
            : "grayscale opacity-40 hover:opacity-70"
        }`}
        style={{
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
        // ✅ FIX: aria-label traducido
        aria-label={ariaLabel}
        type="button"
      >
        ⭐
      </button>
    );
  },
);

StarButton.displayName = "StarButton";

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  itemTitle,
  type,
  originalData,
  successCloseDelay = DEFAULT_SUCCESS_CLOSE_DELAY,
}) => {
  const { t } = useTranslation();
  const modalInstanceId = useId();
  const { activeModalId, setActiveModalId } = useContext(ModalContext);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [localError, setLocalError] = useState("");

  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubmittingRef = useRef(false);

  const { user, isAuthenticated } = useAuthStore();
  const {
    mutate: submitFeedback,
    isPending,
    isSuccess,
    isError,
    error,
    reset,
  } = useFeedbackMutation();

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const handleCloseRef = useRef<(isFromSuccess?: boolean) => void>(() => {});

  // ✅ FIX: separar efectos por responsabilidad

  // Efecto 1: manejo del Context de modal activo
  useEffect(() => {
    if (isOpen) {
      if (activeModalId === null) {
        setActiveModalId(modalInstanceId);
      }
    } else if (activeModalId === modalInstanceId) {
      setActiveModalId(null);
    }
  }, [isOpen, modalInstanceId, activeModalId, setActiveModalId]);

  // Efecto 2: reset del formulario solo cuando el modal se abre
  useEffect(() => {
    if (!isOpen || activeModalId !== modalInstanceId) return;
    setRating(0);
    setComment("");
    setLocalError("");
    reset();
    isSubmittingRef.current = false;
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps — reset solo al abrir

  // Efecto 3: bloqueo del scroll del body
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Efecto 4: cleanup al desmontar
  useEffect(() => {
    return () => {
      if (activeModalId === modalInstanceId) {
        setActiveModalId(null);
      }
    };
  }, [modalInstanceId, activeModalId, setActiveModalId]);

  const handleRatingClick = useCallback(
    (selectedRating: number) => {
      setRating(selectedRating);
      trackEvent("rating_selected", {
        item_title: itemTitle,
        rating: selectedRating,
        type,
      });
    },
    [itemTitle, type],
  );

  const handleCommentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= MAX_COMMENT_LENGTH) {
        setComment(value);
      }
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    // ✅ FIX: errores de validación traducidos
    if (rating === 0) {
      setLocalError(t("feedback.errors.ratingRequired"));
      return;
    }

    if (!isAuthenticated || !user) {
      setLocalError(t("feedback.errors.authRequired"));
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLocalError("");

    submitFeedback(
      {
        userId: user.uid,
        itemTitle,
        type,
        rating,
        comment: sanitizeComment(comment),
        originalData,
      },
      {
        onSuccess: () => {
          isSubmittingRef.current = false;
        },
        onError: () => {
          isSubmittingRef.current = false;
        },
      },
    );
  }, [
    rating,
    isAuthenticated,
    user,
    itemTitle,
    type,
    comment,
    originalData,
    submitFeedback,
    t,
  ]);

  const handleClose = useCallback(
    (isFromSuccess = false) => {
      if (!isFromSuccess && rating === 0 && !isSuccess) {
        trackEvent("skip_feedback", { item_title: itemTitle, type });
      }
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
      onClose();
    },
    [onClose, rating, isSuccess, itemTitle, type],
  );

  handleCloseRef.current = handleClose;

  useEffect(() => {
    if (!isSuccess) return;
    // ✅ FIX: usar prop successCloseDelay en vez de constante hardcodeada
    successTimeoutRef.current = setTimeout(() => {
      handleCloseRef.current(true);
    }, successCloseDelay);
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, [isSuccess, successCloseDelay]);

  // ✅ FIX: backdrop simplificado — un solo handler por evento
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isPending) {
        handleClose();
      }
    },
    [handleClose, isPending],
  );

  const stopPropagation = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  if (activeModalId !== null && activeModalId !== modalInstanceId) {
    return null;
  }

  const errorMessage =
    localError || (isError && error instanceof Error ? error.message : "");

  return createPortal(
    <>
      {/* ✅ FIX: backdrop simplificado a 2 handlers */}
      <div
        className="fixed inset-0 z-[2147483646] bg-black/60 backdrop-blur-sm"
        style={{ touchAction: "none" }}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      <div
        className="fixed inset-0 z-[2147483647] flex items-end sm:items-center justify-center px-safe py-4 animate-fade-in"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-transform duration-300 translate-y-0"
          style={{ pointerEvents: "auto" }}
          onClick={stopPropagation}
          onPointerDown={stopPropagation}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
        >
          <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />

          {!isSuccess ? (
            <>
              <div className="text-4xl mb-4">
                {type === "home" ? "🍳" : "📍"}
              </div>
              <h3
                id="feedback-title"
                className="text-lg sm:text-xl font-bold text-bocado-dark-green"
              >
                {type === "home"
                  ? t("feedback.titleHome")
                  : t("feedback.titleAway")}
              </h3>
              <p className="text-sm text-bocado-gray mt-1 mb-6 line-clamp-2">
                {t("feedback.subtitle")}{" "}
                <br className="hidden sm:block" />
                <strong className="text-bocado-dark-gray">{itemTitle}</strong>
              </p>

              {errorMessage && (
                <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-xl animate-fade-in">
                  {errorMessage}
                </p>
              )}

              <div
                className="flex justify-center gap-3 sm:gap-2 mb-6"
                onClick={stopPropagation}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarButton
                    key={star}
                    star={star}
                    isActive={rating >= star}
                    onClick={handleRatingClick}
                    isDisabled={isPending}
                    // ✅ FIX: aria-label traducido pasado como prop
                    ariaLabel={t("feedback.starLabel", { count: star })}
                  />
                ))}
              </div>

              <div className="relative mb-6">
                <textarea
                  value={comment}
                  onChange={handleCommentChange}
                  onClick={stopPropagation}
                  placeholder={t("feedback.commentsLabel")}
                  disabled={isPending}
                  className="w-full p-4 bg-bocado-background border-none rounded-2xl text-sm focus:ring-2 focus:ring-bocado-green/30 resize-none text-bocado-text placeholder-bocado-gray/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={3}
                  maxLength={MAX_COMMENT_LENGTH}
                />
                <span className="absolute bottom-3 right-3 text-xs text-bocado-gray bg-white/80 px-2 py-1 rounded-full">
                  {comment.length}/{MAX_COMMENT_LENGTH}
                </span>
              </div>

              <div className="flex gap-3 pb-safe">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-2xl font-bold text-bocado-gray hover:bg-bocado-background transition-colors active:scale-95 disabled:opacity-50"
                >
                  {t("feedback.skip")}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubmit();
                  }}
                  disabled={rating === 0 || isPending}
                  className="flex-1 bg-bocado-green text-white py-3 rounded-2xl font-bold shadow-bocado disabled:bg-bocado-gray/30 disabled:shadow-none transition-all active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t("feedback.saving")}</span>
                    </>
                  ) : (
                    t("feedback.confirm")
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="py-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 text-bocado-green rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-bocado-dark-green">
                {t("feedback.successTitle")}
              </h3>
              <p className="text-bocado-gray mt-2 text-sm sm:text-base">
                {t("feedback.successMessage")}
              </p>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
};

export default React.memo(FeedbackModal);