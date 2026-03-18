import type { Tables } from '../types/supabase'

type PgiRow = Pick<Tables<'processed_materials'>, 'processed_good_id' | 'item_id' | 'input_good_id' | 'input_recipe_id' | 'ingredient_group'>

export function buildChainMaps(pgiRows: PgiRow[]) { 
      const pgiDirectMap: Record<number, number[]> = {}
      const pgiChainMap: Record<number, number[]> = {}
      const pgiRecipeChainMap: Record<number, number[]> = {}

      for (const row of pgiRows) {
        if (row.item_id) {
          if (!pgiDirectMap[row.processed_good_id!]) pgiDirectMap[row.processed_good_id!] = []
          pgiDirectMap[row.processed_good_id!].push(row.item_id)
        }
        if (row.input_good_id) {
          if (!pgiChainMap[row.processed_good_id!]) pgiChainMap[row.processed_good_id!] = []
          pgiChainMap[row.processed_good_id!].push(row.input_good_id)
        }
        if (row.input_recipe_id) {
          if (!pgiRecipeChainMap[row.processed_good_id!]) pgiRecipeChainMap[row.processed_good_id!] = []
          pgiRecipeChainMap[row.processed_good_id!].push(row.input_recipe_id)
        }
      }

    return { pgiDirectMap, pgiChainMap, pgiRecipeChainMap }
}

