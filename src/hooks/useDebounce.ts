/**
 * useDebounce - Debounce a value with cleanup guarantees
 * Prevents excessive updates/renders during rapid state changes
 */

import { useState, useEffect, useCallback, useRef } from 'react';

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cancel previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
      onDebouncedValueChange?.(value);
      timeoutRef.current = null;
    }, delay);

    // Cleanup on unmount or value change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, delay, onDebouncedValueChange]);

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Args) => {
      // Cancel previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        timeoutRef.current = null;
      }, delay);
    },
    [callback, delay],
  );

  // Cleanup on unmount
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
