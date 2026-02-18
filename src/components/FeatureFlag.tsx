// src/components/FeatureFlag.tsx - Componente wrapper para Feature Flags

import React, { ReactNode, Suspense } from "react";
import type { FeatureFlags } from "../types/featureFlags";
import {
  useFeatureFlag,
  useMultipleFeatureFlags,
} from "../hooks/useFeatureFlag";
import { DEFAULT_FEATURE_FLAGS } from "../config/featureFlags";

// ============================================
// TIPOS
// ============================================

interface FeatureFlagProps {
  /** Nombre del feature flag a verificar */
  feature: keyof FeatureFlags;
  /** Contenido a renderizar si el feature está habilitado */
  children: ReactNode;
  /** Contenido alternativo si el feature NO está habilitado */
  fallback?: ReactNode;
  /** ID del usuario (opcional, se obtiene del contexto si no se proporciona) */
  userId?: string | null;
  /** Mostrar loader mientras carga el flag */
  showLoader?: boolean;
  /** Componente de loader personalizado */
  loaderComponent?: ReactNode;
}

interface FeatureFlagAllProps {
  /** Todos estos features deben estar habilitados */
  features: Array<keyof FeatureFlags>;
  /** Contenido a renderizar */
  children: ReactNode;
  /** Contenido alternativo si algún feature NO está habilitado */
  fallback?: ReactNode;
  /** ID del usuario (opcional) */
  userId?: string | null;
  /** Mostrar loader mientras carga */
  showLoader?: boolean;
  /** Componente de loader personalizado */
  loaderComponent?: ReactNode;
}

interface FeatureFlagAnyProps {
  /** Al menos uno de estos features debe estar habilitado */
  features: Array<keyof FeatureFlags>;
  /** Contenido a renderizar */
  children: ReactNode;
  /** Contenido alternativo si NINGUNO está habilitado */
  fallback?: ReactNode;
  /** ID del usuario (opcional) */
  userId?: string | null;
  /** Mostrar loader mientras carga */
  showLoader?: boolean;
  /** Componente de loader personalizado */
  loaderComponent?: ReactNode;
}

interface FeatureFlagSwitchProps {
  /** Feature flag a evaluar */
  feature: keyof FeatureFlags;
  /** ID del usuario (opcional) */
  userId?: string | null;
  /** Caso cuando está habilitado */
  whenEnabled: ReactNode;
  /** Caso cuando está deshabilitado */
  whenDisabled: ReactNode;
  /** Mostrar loader mientras carga */
  showLoader?: boolean;
  /** Componente de loader personalizado */
  loaderComponent?: ReactNode;
}

// ============================================
// COMPONENTE: Loader por defecto
// ============================================

const DefaultLoader = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);

// ============================================
// COMPONENTE PRINCIPAL: FeatureFlag
// ============================================

/**
 * Componente wrapper que renderiza children solo si el feature flag está habilitado.
 *
 * @example
 * ```tsx
 * // Uso básico
 * <FeatureFlag feature="newRecommendationUI">
 *   <NewRecommendationScreen />
 * </FeatureFlag>
 *
 * // Con fallback
 * <FeatureFlag
 *   feature="newRecommendationUI"
 *   fallback={<OldRecommendationScreen />}
 * >
 *   <NewRecommendationScreen />
 * </FeatureFlag>
 *
 * // Con loader personalizado
 * <FeatureFlag
 *   feature="pantryV2"
 *   showLoader
 *   loaderComponent={<CustomSpinner />}
 * >
 *   <PantryV2 />
 * </FeatureFlag>
 * ```
 */
export function FeatureFlag({
  feature,
  children,
  fallback = null,
  userId,
  showLoader = false,
  loaderComponent = <DefaultLoader />,
}: FeatureFlagProps): React.ReactElement | null {
  const { enabled, isLoading } = useFeatureFlag(feature, { userId });

  // Mostrar loader mientras carga (si está habilitado)
  if (isLoading && showLoader) {
    return <>{loaderComponent}</>;
  }

  // Renderizar children si está habilitado, fallback si no
  return <>{enabled ? children : fallback}</>;
}

// ============================================
// COMPONENTE: FeatureFlag.All (todos deben estar habilitados)
// ============================================

/**
 * Componente que renderiza children solo si TODOS los features están habilitados.
 *
 * @example
 * ```tsx
 * <FeatureFlag.All features={['darkMode', 'newRecommendationUI']}>
 *   <NewDarkRecommendationUI />
 * </FeatureFlag.All>
 * ```
 */
function FeatureFlagAll({
  features,
  children,
  fallback = null,
  userId,
  showLoader = false,
  loaderComponent = <DefaultLoader />,
}: FeatureFlagAllProps): React.ReactElement | null {
  const flags = useMultipleFeatureFlags(features, { userId });

  if (flags.isLoading && showLoader) {
    return <>{loaderComponent}</>;
  }

  // Verificar que TODOS estén habilitados
  const allEnabled = features.every((feature) => flags[feature]);

  return <>{allEnabled ? children : fallback}</>;
}

// ============================================
// COMPONENTE: FeatureFlag.Any (al menos uno habilitado)
// ============================================

/**
 * Componente que renderiza children si AL MENOS UNO de los features está habilitado.
 *
 * @example
 * ```tsx
 * <FeatureFlag.Any features={['pantryV2', 'smartNotifications']}>
 *   <AdvancedFeatures />
 * </FeatureFlag.Any>
 * ```
 */
function FeatureFlagAny({
  features,
  children,
  fallback = null,
  userId,
  showLoader = false,
  loaderComponent = <DefaultLoader />,
}: FeatureFlagAnyProps): React.ReactElement | null {
  const flags = useMultipleFeatureFlags(features, { userId });

  if (flags.isLoading && showLoader) {
    return <>{loaderComponent}</>;
  }

  // Verificar que AL MENOS UNO esté habilitado
  const anyEnabled = features.some((feature) => flags[feature]);

  return <>{anyEnabled ? children : fallback}</>;
}

// ============================================
// COMPONENTE: FeatureFlag.Switch
// ============================================

/**
 * Componente tipo switch que renderiza diferentes contenidos
 * según si el feature está habilitado o no.
 *
 * @example
 * ```tsx
 * <FeatureFlag.Switch
 *   feature="darkMode"
 *   whenEnabled={<DarkThemeProvider />}
 *   whenDisabled={<LightThemeProvider />}
 * />
 * ```
 */
function FeatureFlagSwitch({
  feature,
  userId,
  whenEnabled,
  whenDisabled,
  showLoader = false,
  loaderComponent = <DefaultLoader />,
}: FeatureFlagSwitchProps): React.ReactElement | null {
  const { enabled, isLoading } = useFeatureFlag(feature, { userId });

  if (isLoading && showLoader) {
    return <>{loaderComponent}</>;
  }

  return <>{enabled ? whenEnabled : whenDisabled}</>;
}

// ============================================
// COMPONENTE: FeatureFlag.Lazy (lazy loading)
// ============================================

interface FeatureFlagLazyProps {
  /** Feature flag a verificar */
  feature: keyof FeatureFlags;
  /** Función de import del componente (lazy loading) */
  component: () => Promise<{ default: React.ComponentType<any> }>;
  /** Props para el componente lazy */
  componentProps?: Record<string, any>;
  /** Fallback mientras carga el componente */
  loadingFallback?: ReactNode;
  /** Fallback si el feature está deshabilitado */
  disabledFallback?: ReactNode;
  /** ID del usuario (opcional) */
  userId?: string | null;
}

/**
 * Componente con lazy loading condicional.
 * Solo carga el componente si el feature está habilitado.
 *
 * @example
 * ```tsx
 * <FeatureFlag.Lazy
 *   feature="pantryV2"
 *   component={() => import('./PantryV2')}
 *   componentProps={{ userId: currentUser.uid }}
 *   loadingFallback={<Spinner />}
 *   disabledFallback={<PantryV1 />}
 * />
 * ```
 */
function FeatureFlagLazy({
  feature,
  component,
  componentProps = {},
  loadingFallback = <DefaultLoader />,
  disabledFallback = null,
  userId,
}: FeatureFlagLazyProps): React.ReactElement | null {
  const { enabled, isLoading: isFlagLoading } = useFeatureFlag(feature, {
    userId,
  });

  // Lazy load el componente solo si el feature está habilitado
  const LazyComponent = React.useMemo(() => {
    if (!enabled) return null;
    return React.lazy(component);
  }, [enabled, component]);

  // Mostrar fallback si el feature está deshabilitado
  if (!enabled) {
    return <>{disabledFallback}</>;
  }

  // Mostrar loader mientras carga el flag
  if (isFlagLoading) {
    return <>{loadingFallback}</>;
  }

  // Renderizar componente lazy con Suspense
  if (LazyComponent) {
    return (
      <Suspense fallback={loadingFallback}>
        <LazyComponent {...componentProps} />
      </Suspense>
    );
  }

  return null;
}

// ============================================
// COMPONENTE: FeatureFlag.WithTracking
// ============================================

interface FeatureFlagWithTrackingProps extends FeatureFlagProps {
  /** Nombre del evento de tracking */
  trackEventName?: string;
  /** Propiedades adicionales para tracking */
  trackProperties?: Record<string, any>;
}

/**
 * Componente FeatureFlag con tracking de analytics.
 * Rastrea cuando se muestra/oculta el feature.
 *
 * @example
 * ```tsx
 * <FeatureFlag.WithTracking
 *   feature="newRecommendationUI"
 *   trackEventName="feature_view"
 *   trackProperties={{ feature: 'newRecommendationUI' }}
 * >
 *   <NewUI />
 * </FeatureFlag.WithTracking>
 * ```
 */
function FeatureFlagWithTracking({
  trackEventName,
  trackProperties,
  ...props
}: FeatureFlagWithTrackingProps): React.ReactElement | null {
  const { enabled, isLoading } = useFeatureFlag(props.feature, {
    userId: props.userId,
  });

  // Effect para tracking
  React.useEffect(() => {
    if (!isLoading && trackEventName) {
      // Aquí se integraría con el sistema de analytics
      // trackEvent(trackEventName, {
      //   ...trackProperties,
      //   featureEnabled: enabled,
      //   featureName: props.feature,
      // });

      if (import.meta.env.DEV) {
        console.log("[FeatureFlag.Track]", {
          event: trackEventName,
          feature: props.feature,
          enabled,
          properties: trackProperties,
        });
      }
    }
  }, [enabled, isLoading, trackEventName, trackProperties, props.feature]);

  return <FeatureFlag {...props} />;
}

// ============================================
// COMPOSITION PATTERN
// ============================================

/**
 * Asignar sub-componentes al componente principal.
 * Esto permite usar: FeatureFlag, FeatureFlag.All, FeatureFlag.Any, etc.
 */
FeatureFlag.All = FeatureFlagAll;
FeatureFlag.Any = FeatureFlagAny;
FeatureFlag.Switch = FeatureFlagSwitch;
FeatureFlag.Lazy = FeatureFlagLazy;
FeatureFlag.WithTracking = FeatureFlagWithTracking;

// ============================================
// EXPORTS
// ============================================

// Sub-componentes exportados individualmente
export {
  FeatureFlagAll,
  FeatureFlagAny,
  FeatureFlagSwitch,
  FeatureFlagLazy,
  FeatureFlagWithTracking,
};

// Default export del componente principal
export default FeatureFlag;
