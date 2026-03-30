/**
 * useDebounce - Debounce a value with cleanup guarantees
 * Prevents excessive updates/renders during rapid state changes
 */
import { useState, useEffect, useCallback, useRef } from "react";

interface UseDebouncedValueOptions {
  delay?: number;
  onDebouncedValueChange?: (value: any) => void;
}

/**
 * Debounced value hook - returns the debounced value after delay
 */
export function useDebouncedValue<T>(
  value: T,
  options: UseDebouncedValueOptions = {},
): T {
  const { delay = 500, onDebouncedValueChange } = options;
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  // ✅ FIX: ReturnType<typeof setTimeout> en vez de NodeJS.Timeout
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ FIX: estabilizar onDebouncedValueChange con ref para evitar
  // que funciones inline rereinicien el debounce en cada render
  const callbackRef = useRef(onDebouncedValueChange);
  useEffect(() => {
    callbackRef.current = onDebouncedValueChange;
  }, [onDebouncedValueChange]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
      callbackRef.current?.(value);
      timeoutRef.current = null;
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  // ✅ onDebouncedValueChange removido de deps — estabilizado via ref
  }, [value, delay]);

  return debouncedValue;
}

interface UseDebouncedCallbackOptions {
  delay?: number;
}

/**
 * Debounced callback hook - executes function after delay
 * Multiple calls within delay period cancel previous executions
 */
export function useDebouncedCallback<Args extends any[]>(
  callback: (...args: Args) => void | Promise<void>,
  options: UseDebouncedCallbackOptions = {},
): (...args: Args) => void {
  const { delay = 500 } = options;

  // ✅ FIX: ReturnType<typeof setTimeout>
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Estabilizar callback con ref para evitar que funciones inline
  // rompan la memoización del debouncedCallback
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timeoutRef.current = null;
      }, delay);
    },
    // ✅ callback removido de deps — estabilizado via ref
    [delay],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Combined hook: manages a state value and executes a callback when debounced
 */
export function useDebouncedState<T>(
  initialValue: T,
  onChanged: (value: T) => void | Promise<void>,
  options: UseDebouncedCallbackOptions = {},
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);

  const debouncedCallback = useDebouncedCallback(
    (newValue: T) => onChanged(newValue),
    options,
  );

  const handleChange = useCallback(
    (newValue: T) => {
      setValue(newValue);
      debouncedCallback(newValue);
    },
    [debouncedCallback],
  );

  return [value, handleChange];
}