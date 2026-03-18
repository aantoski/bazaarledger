import type { Tables } from '../types/supabase'

type PgiRow = Pick<Tables<'processed_materials'>, 'processed_good_id' | 'item_id' | 'input_good_id' | 'input_recipe_id' | 'ingredient_group'>
type RiRow = Pick<Tables<'recipe_ingredients'>, 'recipe_id' | 'item_id' | 'input_good_id' | 'input_recipe_id' | 'ingredient_group'>

export function makeCalcCost(
  pgiRows: PgiRow[],
  riRows: RiRow[],
  itemBuyPriceMap: Record<number, number | null>,
) {
  // build raw row indexes
  const pgiRawRowsByGood: Record<number, Record<number, Array<{
    item_id: number | null
    input_good_id: number | null
    input_recipe_id: number | null
  }>>> = {}
  for (const row of pgiRows) {
    const group = row.ingredient_group ?? 0
    if (!pgiRawRowsByGood[row.processed_good_id!]) pgiRawRowsByGood[row.processed_good_id!] = {}
    if (!pgiRawRowsByGood[row.processed_good_id!][group]) pgiRawRowsByGood[row.processed_good_id!][group] = []
    pgiRawRowsByGood[row.processed_good_id!][group].push({
      item_id: row.item_id,
      input_good_id: row.input_good_id,
      input_recipe_id: row.input_recipe_id,
    })
  }

  const riRawRowsByRecipe: Record<number, Record<number, Array<{
    item_id: number | null
    input_good_id: number | null
    input_recipe_id: number | null
  }>>> = {}
  for (const row of riRows) {
    const group = row.ingredient_group ?? 0
    if (!riRawRowsByRecipe[row.recipe_id!]) riRawRowsByRecipe[row.recipe_id!] = {}
    if (!riRawRowsByRecipe[row.recipe_id!][group]) riRawRowsByRecipe[row.recipe_id!][group] = []
    riRawRowsByRecipe[row.recipe_id!][group].push({
      item_id: row.item_id,
      input_good_id: row.input_good_id,
      input_recipe_id: row.input_recipe_id,
    })
  }

  function itemCost(itemId: number): number | null {
    return itemBuyPriceMap[itemId] ?? null
  }

  function calcGoodCost(goodId: number, visited = new Set<number>()): number | null {
    if (visited.has(goodId)) return null
    const newVisited = new Set(visited)
    newVisited.add(goodId)
    const groupsByIndex = pgiRawRowsByGood[goodId]
    if (!groupsByIndex) return 0
    let total = 0
    for (const rows of Object.values(groupsByIndex)) {
      const costs = rows.map(row => {
        if (row.item_id) return itemCost(row.item_id)
        if (row.input_good_id) return calcGoodCost(row.input_good_id, newVisited)
        if (row.input_recipe_id) return calcRecipeCost(row.input_recipe_id, newVisited)
        return null
      })
      if (costs.some(c => c === null)) return null
      const avg = costs.reduce((a, b) => a! + b!, 0)! / costs.length
      total += avg
    }
    return total
  }

  function calcRecipeCost(recipeId: number, visited = new Set<number>()): number | null {
    if (visited.has(recipeId)) return null
    const newVisited = new Set(visited)
    newVisited.add(recipeId)
    const groupsByIndex = riRawRowsByRecipe[recipeId]
    if (!groupsByIndex) return 0
    let total = 0
    for (const rows of Object.values(groupsByIndex)) {
      const costs = rows.map(row => {
        if (row.item_id) return itemCost(row.item_id)
        if (row.input_good_id) return calcGoodCost(row.input_good_id, newVisited)
        if (row.input_recipe_id) return calcRecipeCost(row.input_recipe_id, newVisited)
        return null
      })
      if (costs.some(c => c === null)) return null
      const avg = costs.reduce((a, b) => a! + b!, 0)! / costs.length
      total += avg
    }
    return total
  }

  return { calcGoodCost, calcRecipeCost }
}