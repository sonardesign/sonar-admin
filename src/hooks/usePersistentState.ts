import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for persistent state using localStorage
 * Automatically saves and loads state from localStorage
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state from localStorage or use default
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
      return defaultValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return defaultValue;
    }
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }, [key, state]);

  return [state, setState];
}

/**
 * Hook to persist the current page location
 */
export function useLastPage() {
  const saveLastPage = useCallback((path: string) => {
    try {
      localStorage.setItem('lastPage', path);
    } catch (error) {
      console.error('Error saving last page:', error);
    }
  }, []);

  const getLastPage = useCallback((): string | null => {
    try {
      return localStorage.getItem('lastPage');
    } catch (error) {
      console.error('Error getting last page:', error);
      return null;
    }
  }, []);

  return { saveLastPage, getLastPage };
}

