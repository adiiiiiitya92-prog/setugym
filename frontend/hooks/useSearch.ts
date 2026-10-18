import { useMemo } from 'react';

export function useSearch<T>(
  data: T[],
  query: string,
  searchKeys: (keyof T)[]
): T[] {
  return useMemo(() => {
    if (!query || query.trim() === '') {
      return data;
    }

    const lowerQuery = query.toLowerCase().trim();

    return data.filter((item) => {
      return searchKeys.some((key) => {
        const val = item[key];
        if (val === null || val === undefined) {
          return false;
        }
        return String(val).toLowerCase().includes(lowerQuery);
      });
    });
  }, [data, query, searchKeys]);
}
