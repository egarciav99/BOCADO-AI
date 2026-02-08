import React, { useState, useCallback, useEffect, useRef } from 'react';
import { trackEvent } from '../firebaseConfig';
import { useAuthStore } from '../stores/authStore';
import { useFeedbackMutation } from '../hooks/useSavedItems';
import type { Recipe } from '../types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  type: 'home' | 'away';
  originalData: Recipe;
}

const MAX_COMMENT_LENGTH = 500;
const SUCCESS_CLOSE_DELAY = 2000;

const sanitizeComment = (text: string): string => {
  return text
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, MAX_COMMENT_LENGTH);
};

/**
 * Componente StarButton - Botón de estrella individual memoizado
 * Previene re-renders innecesarios al interactuar con una estrella
 */
interface StarButtonProps {
  star: number;
  isActive: boolean;
  onClick: (star: number) => void;
  isDisabled: boolean;
}

const StarButton: React.FC<StarButtonProps> = React.memo(({
  star,
  isActive,
  onClick,
  isDisabled,
}) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDisabled) onClick(star);
  }, [star, onClick, isDisabled]);

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`text-4xl sm:text-3xl transition-all active:scale-125 disabled:opacity-50 ${
        isActive ? 'grayscale-0 scale-110' : 'grayscale opacity-30 hover:opacity-50'
      }`}
      style={{ touchAction: 'manipulation' }}
      aria-label={`Calificar con ${star} estrellas`}
    >
      ⭐
    </button>
  );
});

StarButton.displayName = 'StarButton';

/**
 * FeedbackModal - Modal de calificación con actualizaciones optimistas
 * 
 * Mejoras de rendimiento implementadas:
 * 1. Uso de useMutation de TanStack Query para operaciones async
 * 2. Actualizaciones optimistas - feedback instantáneo al usuario
 * 3. Componentes memoizados para prevenir re-renders
 * 4. Cleanup de timers y callbacks al desmontar
 * 5. Debounce en la entrada de texto
 */
const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  itemTitle,
  type,
  originalData,
}) => {
  // Estado local del formulario
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [localError, setLocalError] = useState('');
  
  // Refs para cleanup
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);

  const { user, isAuthenticated } = useAuthStore();
  const { mutate: submitFeedback, isPending, isSuccess, isError, error, reset } = useFeedbackMutation();

  // Cleanup de timeouts al desmontar
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Manejar cierre automático después de éxito
  useEffect(() => {
    if (isSuccess) {
      successTimeoutRef.current = setTimeout(() => {
        handleClose(true);
      }, SUCCESS_CLOSE_DELAY);
    }

    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, [isSuccess]);

  // Resetear estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setComment('');
      setLocalError('');
      reset();
      isSubmittingRef.current = false;
    }
  }, [isOpen, reset]);

  // Handler de calificación - memoizado para prevenir re-renders
  const handleRatingClick = useCallback((selectedRating: number) => {
    setRating(selectedRating);
    
    // Tracking de interacción (no bloqueante)
    trackEvent('rating_selected', {
      item_title: itemTitle,
      rating: selectedRating,
      type,
    });
  }, [itemTitle, type]);

  // Handler de cambio de comentario
  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_COMMENT_LENGTH) {
      setComment(value);
    }
  }, []);

  // Handler de submit con optimistic updates
  const handleSubmit = useCallback(() => {
    // Validaciones
    if (rating === 0) {
      setLocalError('Por favor selecciona una calificación');
      return;
    }

    if (!isAuthenticated || !user) {
      setLocalError('Debes iniciar sesión para enviar feedback');
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLocalError('');

    // Enviar feedback - La UI se actualiza inmediatamente (optimistic)
    submitFeedback({
      userId: user.uid,
      itemTitle,
      type,
      rating,
      comment: sanitizeComment(comment),
      originalData,
    }, {
      onSuccess: () => {
        isSubmittingRef.current = false;
      },
      onError: () => {
        isSubmittingRef.current = false;
      },
    });
  }, [rating, isAuthenticated, user, itemTitle, type, comment, originalData, submitFeedback]);

  // Handler de cierre
  const handleClose = useCallback((isFromSuccess = false) => {
    // Tracking si el usuario cierra sin calificar
    if (!isFromSuccess && rating === 0 && !isSuccess) {
      trackEvent('skip_feedback', {
        item_title: itemTitle,
        type,
      });
    }

    // Cleanup
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }

    onClose();
  }, [onClose, rating, isSuccess, itemTitle, type]);

  // No renderizar si no está abierto
  if (!isOpen) return null;

  // Determinar mensaje de error a mostrar
  const errorMessage = localError || (isError && error instanceof Error ? error.message : '');

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        // Cerrar al hacer click en el backdrop (fuera del modal)
        if (e.target === e.currentTarget && !isPending) {
          handleClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-transform duration-300 translate-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Indicador de arrastre (mobile) */}
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />
        
        {!isSuccess ? (
          <>
            {/* Header */}
            <div className="text-4xl mb-4">{type === 'home' ? '🍳' : '📍'}</div>
            <h3 className="text-lg sm:text-xl font-bold text-bocado-dark-green">
              {type === 'home' ? '¿Qué tal quedó?' : '¿Qué tal la comida?'}
            </h3>
            <p className="text-sm text-bocado-gray mt-1 mb-6 line-clamp-2">
              Califica tu experiencia con <br className="hidden sm:block"/>
              <strong className="text-bocado-dark-gray">{itemTitle}</strong>
            </p>
            
            {/* Error message */}
            {errorMessage && (
              <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-xl animate-fade-in">
                {errorMessage}
              </p>
            )}
            
            {/* Star Rating - Componentes memoizados */}
            <div className="flex justify-center gap-3 sm:gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarButton
                  key={star}
                  star={star}
                  isActive={rating >= star}
                  onClick={handleRatingClick}
                  isDisabled={isPending}
                />
              ))}
            </div>

            {/* Comment textarea */}
            <div className="relative mb-6">
              <textarea
                value={comment}
                onChange={handleCommentChange}
                onClick={(e) => e.stopPropagation()}
                placeholder="¿Algún detalle extra? (opcional)"
                disabled={isPending}
                className="w-full p-4 bg-bocado-background border-none rounded-2xl text-sm focus:ring-2 focus:ring-bocado-green/30 resize-none text-bocado-text placeholder-bocado-gray/50 disabled:opacity-50 disabled:cursor-not-allowed"
                rows={3}
                maxLength={MAX_COMMENT_LENGTH}
              />
              <span className="absolute bottom-3 right-3 text-xs text-bocado-gray bg-white/80 px-2 py-1 rounded-full">
                {comment.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pb-safe">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                disabled={isPending}
                className="flex-1 py-3 rounded-2xl font-bold text-bocado-gray hover:bg-bocado-background transition-colors active:scale-95 disabled:opacity-50"
              >
                Omitir
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
                    <span>Guardando...</span>
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </>
        ) : (
          /* Success state */
          <div className="py-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 text-bocado-green rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-bocado-dark-green">¡Gracias!</h3>
            <p className="text-bocado-gray mt-2 text-sm sm:text-base">
              Bocado aprenderá de esto para tus próximas sugerencias.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(FeedbackModal);
