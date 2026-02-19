export interface FoodSearchResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  barcode?: string;
}

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const encoded = encodeURIComponent(query.trim());
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,nutriments,serving_size,code`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) return [];

    const data = await response.json();

    if (!data.products || !Array.isArray(data.products)) return [];

    const results: FoodSearchResult[] = [];

    for (const product of data.products) {
      const name = product.product_name;
      if (!name) continue;

      const n = product.nutriments || {};
      const calories = Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0);

      if (calories === 0) continue;

      results.push({
        name: name.substring(0, 80),
        calories,
        protein: Math.round((n.proteins_100g || n.proteins || 0) * 10) / 10,
        carbs: Math.round((n.carbohydrates_100g || n.carbohydrates || 0) * 10) / 10,
        fat: Math.round((n.fat_100g || n.fat || 0) * 10) / 10,
        servingSize: product.serving_size || '100g',
        barcode: product.code || undefined,
      });
    }

    return results;
  } catch {
    // Offline or timeout - fail gracefully
    return [];
  }
}
