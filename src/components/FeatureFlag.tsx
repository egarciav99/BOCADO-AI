import React, { ReactNode, Suspense, useEffect, useMemo, lazy } from "react";
import type { FeatureFlags } from "../types/featureFlags";
import {
  useFeatureFlag,
  useMultipleFeatureFlags,
} from "../hooks/useFeatureFlag";
import { trackEvent } from "../firebaseConfig";

// ============================================
// TIPOS
// ============================================

interface FeatureFlagProps {
  feature: keyof FeatureFlags;
  children: ReactNode;
  fallback?: ReactNode;
  userId?: string | null;
  showLoader?: boolean;
  loaderComponent?: ReactNode;
}

interface FeatureFlagAllProps {
  features: Array<keyof FeatureFlags>;
  children: ReactNode;
  fallback?: ReactNode;
  userId?: string | null;
  showLoader?: boolean;
  loaderComponent?: ReactNode;
}

interface FeatureFlagAnyProps {
  features: Array<keyof FeatureFlags>;
  children: ReactNode;
  fallback?: ReactNode;
  userId?: string | null;
  showLoader?: boolean;
  loaderComponent?: ReactNode;
}

interface FeatureFlagSwitchProps {
  feature: keyof FeatureFlags;
  userId?: string | null;
  whenEnabled: ReactNode;
  whenDisabled: ReactNode;
  showLoader?: boolean;
  loaderComponent?: ReactNode;
}

interface FeatureFlagLazyProps {
  feature: keyof FeatureFlags;
  component: () => Promise<{ default: React.ComponentType<any> }>;
  componentProps?: Record<string, any>;
  loadingFallback?: ReactNode;
  disabledFallback?: ReactNode;
  userId?: string | null;
}

interface FeatureFlagWithTrackingProps extends FeatureFlagProps {
  trackEventName?: string;
  trackProperties?: Record<string, any>;
}

// ✅ Tipo explícito para el resultado de useMultipleFeatureFlags
type MultipleFlags = {
  [K in keyof FeatureFlags]?: boolean;
} & { isLoading: boolean };

// ============================================
// COMPONENTE: Loader por defecto
// ============================================

const DefaultLoader = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-1/2" />
  </div>
);

// ============================================
// COMPONENTE PRINCIPAL: FeatureFlag
// ============================================

export function FeatureFlag({
  feature,
  children,
  fallback = null,
  userId,
  showLoader = false,
  loaderComponent = <DefaultLoader />,
}: FeatureFlagProps): React.ReactElement | null {
  const { enabled, isLoading } = useFeatureFlag(feature, { userId });

  if (isLoading && showLoader) {
    return <>{loaderComponent}</>;
  }

  return <>{enabled ? children : fallback}</>;
}

// ============================================
// COMPONENTE: FeatureFlag.All
// ============================================

function FeatureFlagAll({
  features,
  children,
  fallback = null,
  userId,
  showLoader = false,
  loaderComponent = <DefaultLoader />,
}: FeatureFlagAllProps): React.ReactElement | null {
  const flags = useMultipleFeatureFlags(features, { userId }) as MultipleFlags;

  if (flags.isLoading && showLoader) {
    return <>{loaderComponent}</>;
  }

  // ✅ FIX: acceso tipado explícito a las keys del resultado
  const allEnabled = features.every((feature) => flags[feature] === true);

  return <>{allEnabled ? children : fallback}</>;
}

// ============================================
// COMPONENTE: FeatureFlag.Any
// ============================================

function FeatureFlagAny({
  features,
  children,
  fallback = null,
  userId,
  showLoader = false,
  loaderComponent = <DefaultLoader />,
}: FeatureFlagAnyProps): React.ReactElement | null {
  const flags = useMultipleFeatureFlags(features, { userId }) as MultipleFlags;

  if (flags.isLoading && showLoader) {
    return <>{loaderComponent}</>;
  }

  // ✅ FIX: acceso tipado explícito
  const anyEnabled = features.some((feature) => flags[feature] === true);

  return <>{anyEnabled ? children : fallback}</>;
}

// ============================================
// COMPONENTE: FeatureFlag.Switch
// ============================================

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
// COMPONENTE: FeatureFlag.Lazy
// ============================================

// ✅ FIX: LazyComponent vive fuera del render para evitar
// recrear el lazy en cada render cuando enabled cambia.
// Se usa un Map como cache por referencia de la función import.
// ✅ FIX: tipo compatible con todas las versiones de @types/react
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lazyCache = new WeakMap<() => Promise<any>, React.ComponentType<any>>();

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

  if (!enabled) {
    return <>{disabledFallback}</>;
  }

  if (isFlagLoading) {
    return <>{loadingFallback}</>;
  }

  // ✅ FIX: cachear el lazy component por referencia de la función
  // para no recrearlo en cada render
if (!lazyCache.has(component)) {
  lazyCache.set(component, lazy(component));
}
const LazyComponent = lazyCache.get(component) as React.ExoticComponent<any>;

  return (
    <Suspense fallback={loadingFallback}>
      <LazyComponent {...componentProps} />
    </Suspense>
  );
}

// ============================================
// COMPONENTE: FeatureFlag.WithTracking
// ============================================

function FeatureFlagWithTracking({
  trackEventName,
  trackProperties,
  ...props
}: FeatureFlagWithTrackingProps): React.ReactElement | null {
  // ✅ FIX: usar el resultado de FeatureFlag en vez de llamar useFeatureFlag
  // dos veces para el mismo feature — evita doble subscripción
  const { enabled, isLoading } = useFeatureFlag(props.feature, {
    userId: props.userId,
  });

  useEffect(() => {
    if (!isLoading && trackEventName) {
      // ✅ FIX: tracking real en vez de console.log comentado
      trackEvent(trackEventName, {
        ...trackProperties,
        featureEnabled: enabled,
        featureName: props.feature,
      });

      if (process.env.NODE_ENV === "development") {
        console.log("[FeatureFlag.Track]", {
          event: trackEventName,
          feature: props.feature,
          enabled,
          properties: trackProperties,
        });
      }
    }
  }, [enabled, isLoading, trackEventName, props.feature]);
  // trackProperties intencionalmente excluido de deps —
  // objetos inline recreados en cada render causarían loops

  return <FeatureFlag {...props} />;
}

// ============================================
// COMPOSITION PATTERN
// ============================================

FeatureFlag.All = FeatureFlagAll;
FeatureFlag.Any = FeatureFlagAny;
FeatureFlag.Switch = FeatureFlagSwitch;
FeatureFlag.Lazy = FeatureFlagLazy;
FeatureFlag.WithTracking = FeatureFlagWithTracking;

// ============================================
// EXPORTS
// ============================================

export {
  FeatureFlagAll,
  FeatureFlagAny,
  FeatureFlagSwitch,
  FeatureFlagLazy,
  FeatureFlagWithTracking,
};

export default FeatureFlag;
