import React, { useState, useEffect, useCallback } from "react";

interface UseSkeletonOptions {
  /** Tiempo mínimo que el skeleton debe mostrarse en ms (default: 500) */
  minDuration?: number;
  /** Delay antes de mostrar el skeleton en ms (default: 0) */
  delay?: number;
}

interface UseSkeletonReturn {
  /** Si el skeleton debe mostrarse */
  showSkeleton: boolean;
  /** Función para iniciar la carga */
  startLoading: () => void;
  /** Función para detener la carga */
  stopLoading: () => void;
  /** Estado actual de carga */
  isLoading: boolean;
}

/**
 * Hook para controlar la visualización de Skeleton Screens
 *
 * Características:
 * - Tiempo mínimo de visualización (evita flash)
 * - Delay antes de mostrar (para carga rápida)
 * - Control manual del estado
 *
 * @example
 * ```tsx
 * const { showSkeleton, startLoading, stopLoading } = useSkeleton({
 *   minDuration: 500,
 *   delay: 200
 * });
 *
 * useEffect(() => {
 *   startLoading();
 *   fetchData().finally(stopLoading);
 * }, []);
 *
 * if (showSkeleton) return <MySkeleton />;
 * ```
 */
export function useSkeleton(
  options: UseSkeletonOptions = {},
): UseSkeletonReturn {
  const { minDuration = 500, delay = 0 } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);

  // Refs para manejar los timeouts
  const delayTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const minDurationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = React.useRef<number>(0);

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
      if (minDurationTimeoutRef.current) {
        clearTimeout(minDurationTimeoutRef.current);
      }
    };
  }, []);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    startTimeRef.current = Date.now();

    // Limpiar timeout anterior si existe
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
    }

    // Mostrar skeleton después del delay
    delayTimeoutRef.current = setTimeout(() => {
      setShowSkeleton(true);
    }, delay);
  }, [delay]);

  const stopLoading = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, minDuration - elapsed);

    // Limpiar timeout de delay si aún no se mostró
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
      delayTimeoutRef.current = null;
    }

    // Si ya pasó el tiempo mínimo, ocultar inmediatamente
    // Si no, esperar el tiempo restante
    if (elapsed >= minDuration) {
      setShowSkeleton(false);
      setIsLoading(false);
    } else {
      minDurationTimeoutRef.current = setTimeout(() => {
        setShowSkeleton(false);
        setIsLoading(false);
      }, remaining);
    }
  }, [minDuration]);

  return {
    showSkeleton,
    startLoading,
    stopLoading,
    isLoading,
  };
}
