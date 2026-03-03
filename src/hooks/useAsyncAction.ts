import { useState, useCallback } from 'react';

/**
 * Hook for handling async actions with loading state.
 *
 * @example
 * const { execute, isLoading } = useAsyncAction(async () => {
 *   await someAsyncWork();
 * });
 *
 * <button onClick={execute} disabled={isLoading}>
 *   {isLoading ? 'Loading...' : 'Submit'}
 * </button>
 */
export function useAsyncAction<T extends (...args: Parameters<T>) => Promise<unknown>>(
  action: T,
  options?: {
    onError?: (error: unknown) => void;
  }
): {
  execute: (...args: Parameters<T>) => Promise<void>;
  isLoading: boolean;
} {
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      setIsLoading(true);
      try {
        await action(...args);
      } catch (error) {
        if (options?.onError) {
          options.onError(error);
        } else {
          console.error('Async action error:', error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [action, options]
  );

  return { execute, isLoading };
}
