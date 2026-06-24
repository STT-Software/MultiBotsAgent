import { SearchResult } from '@multibotagents/types';

/**
 * Filtra resultados de búsqueda vectorial por umbral de relevancia.
 * Solo retorna resultados cuyo score de similitud es >= al threshold.
 *
 * @param results - Array de resultados de búsqueda vectorial
 * @param threshold - Umbral mínimo de similitud (0.0 - 1.0)
 * @returns Array filtrado con solo resultados relevantes
 */
export function filterByThreshold(results: SearchResult[], threshold: number): SearchResult[] {
  return results.filter((result) => result.score >= threshold);
}
