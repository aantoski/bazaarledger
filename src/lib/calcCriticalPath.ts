import type { Tables } from '../types/supabase'

type PgiRow = Pick<Tables<'processed_materials'>, 'processed_good_id' | 'item_id' | 'input_good_id' | 'input_recipe_id' | 'ingredient_group'>
type RiRow = Pick<Tables<'recipe_ingredients'>, 'recipe_id' | 'item_id' | 'input_good_id' | 'input_recipe_id' | 'ingredient_group'>

export function makeCalcCriticalPath(
  pgiRows: PgiRow[],
  riRows: RiRow[],
  cropDetailsMap: Record<number, { days_to_grow: number, yield: number }>,
  goodProcessingTimeMap: Record<number, number | null>,
) {
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

  function calcGoodCriticalPath(goodId: number, visited = new Set<number>()): number {
    if (visited.has(goodId)) return 0
    const newVisited = new Set(visited)
    newVisited.add(goodId)
    const processingDays = (goodProcessingTimeMap[goodId] ?? 0) / 24
    const groupsByIndex = pgiRawRowsByGood[goodId]
    if (!groupsByIndex) return processingDays
    let maxGroupTime = 0
    for (const rows of Object.values(groupsByIndex)) {
      const optionTimes = rows.map(row => {
        if (row.item_id) {
          const crop = cropDetailsMap[row.item_id]
          return crop ? crop.days_to_grow : 0
        }
        if (row.input_good_id) return calcGoodCriticalPath(row.input_good_id, newVisited)
        if (row.input_recipe_id) return calcRecipeCriticalPath(row.input_recipe_id, newVisited)
        return 0
      })
      maxGroupTime = Math.max(maxGroupTime, Math.max(...optionTimes, 0))
    }
    return maxGroupTime + processingDays
  }

  function calcRecipeCriticalPath(recipeId: number, visited = new Set<number>()): number {
    if (visited.has(recipeId)) return 0
    const newVisited = new Set(visited)
    newVisited.add(recipeId)
    const groupsByIndex = riRawRowsByRecipe[recipeId]
    if (!groupsByIndex) return 0
    let maxGroupTime = 0
    for (const rows of Object.values(groupsByIndex)) {
      const optionTimes = rows.map(row => {
        if (row.item_id) {
          const crop = cropDetailsMap[row.item_id]
          return crop ? crop.days_to_grow : 0
        }
        if (row.input_good_id) return calcGoodCriticalPath(row.input_good_id, newVisited)
        if (row.input_recipe_id) return calcRecipeCriticalPath(row.input_recipe_id, newVisited)
        return 0
      })
      maxGroupTime = Math.max(maxGroupTime, Math.max(...optionTimes, 0))
    }
    return maxGroupTime
  }

  return { calcGoodCriticalPath, calcRecipeCriticalPath }
}