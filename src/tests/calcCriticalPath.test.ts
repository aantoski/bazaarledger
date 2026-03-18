// src/lib/calcCriticalPath.test.ts
import { describe, it, expect } from 'vitest'
import { makeCalcCriticalPath } from '../lib/calcCriticalPath'

function makeCriticalPath(
  pgiRows: Parameters<typeof makeCalcCriticalPath>[0],
  riRows: Parameters<typeof makeCalcCriticalPath>[1],
  cropDetailsMap: Record<number, { days_to_grow: number, yield: number }> = {},
  goodProcessingTimeMap: Record<number, number | null> = {}
) {
  return makeCalcCriticalPath(pgiRows, riRows, cropDetailsMap, goodProcessingTimeMap)
}

describe('calcGoodCriticalPath', () => {
  it('returns 0 for a good with no ingredients and no processing time', () => {
    const { calcGoodCriticalPath } = makeCriticalPath([], [])
    expect(calcGoodCriticalPath(99)).toBe(0)
  })

  it('returns processing time alone when there are no ingredients', () => {
    // 48 hours = 2 days
    const { calcGoodCriticalPath } = makeCriticalPath([], [], {}, { 1: 48 })
    expect(calcGoodCriticalPath(1)).toBe(2)
  })

  it('adds crop grow time to processing time', () => {
    // item 10 takes 3 days to grow, good 1 takes 1 day to process
    const pgiRows = [
      { processed_good_id: 1, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcGoodCriticalPath } = makeCriticalPath(
      pgiRows, [],
      { 10: { days_to_grow: 3, yield: 1 } },
      { 1: 24 }
    )
    expect(calcGoodCriticalPath(1)).toBe(4) // 3 crop + 1 processing
  })

  it('takes the max of OR options within a group', () => {
    // group 0 has two OR options: item 10 (3 days) or item 11 (5 days)
    // should use worst case: 5 days
    const pgiRows = [
      { processed_good_id: 1, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
      { processed_good_id: 1, item_id: 11, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcGoodCriticalPath } = makeCriticalPath(
      pgiRows, [],
      { 10: { days_to_grow: 3, yield: 1 }, 11: { days_to_grow: 5, yield: 1 } },
    )
    expect(calcGoodCriticalPath(1)).toBe(5)
  })

  it('takes the max across AND groups, not the sum', () => {
    // group 0: item 10 takes 3 days
    // group 1: item 11 takes 5 days
    // AND groups run in parallel — result should be max(3, 5) = 5, not 8
    const pgiRows = [
      { processed_good_id: 1, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
      { processed_good_id: 1, item_id: 11, input_good_id: null, input_recipe_id: null, ingredient_group: 1 },
    ]
    const { calcGoodCriticalPath } = makeCriticalPath(
      pgiRows, [],
      { 10: { days_to_grow: 3, yield: 1 }, 11: { days_to_grow: 5, yield: 1 } },
    )
    expect(calcGoodCriticalPath(1)).toBe(5)
  })

  it('walks chained goods recursively and adds processing times', () => {
    // good 1 (24h processing) requires good 2 (48h processing) which requires item 10 (3 days)
    // total: 3 + 2 + 1 = 6 days
    const pgiRows = [
      { processed_good_id: 1, item_id: null, input_good_id: 2, input_recipe_id: null, ingredient_group: 0 },
      { processed_good_id: 2, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcGoodCriticalPath } = makeCriticalPath(
      pgiRows, [],
      { 10: { days_to_grow: 3, yield: 1 } },
      { 1: 24, 2: 48 }
    )
    expect(calcGoodCriticalPath(1)).toBe(6)
  })

  it('returns 0 for a crop ingredient with no crop details', () => {
    // item 10 has no entry in cropDetailsMap — should default to 0
    const pgiRows = [
      { processed_good_id: 1, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcGoodCriticalPath } = makeCriticalPath(pgiRows, [], {})
    expect(calcGoodCriticalPath(1)).toBe(0)
  })

  it('handles circular references without infinite looping', () => {
    const pgiRows = [
      { processed_good_id: 1, item_id: null, input_good_id: 2, input_recipe_id: null, ingredient_group: 0 },
      { processed_good_id: 2, item_id: null, input_good_id: 1, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcGoodCriticalPath } = makeCriticalPath(pgiRows, [])
    expect(calcGoodCriticalPath(1)).toBe(0)
  })
})

describe('calcRecipeCriticalPath', () => {
  it('returns 0 for a recipe with no ingredients', () => {
    const { calcRecipeCriticalPath } = makeCriticalPath([], [])
    expect(calcRecipeCriticalPath(99)).toBe(0)
  })

  it('returns crop days for a direct item ingredient', () => {
    const riRows = [
      { recipe_id: 1, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcRecipeCriticalPath } = makeCriticalPath(
      [], riRows,
      { 10: { days_to_grow: 4, yield: 1 } }
    )
    expect(calcRecipeCriticalPath(1)).toBe(4)
  })

  it('walks into processed good ingredients and includes their processing time', () => {
    // recipe 1 requires good 2 (48h processing) which requires item 10 (3 days)
    const riRows = [
      { recipe_id: 1, item_id: null, input_good_id: 2, input_recipe_id: null, ingredient_group: 0 },
    ]
    const pgiRows = [
      { processed_good_id: 2, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcRecipeCriticalPath } = makeCriticalPath(
      pgiRows, riRows,
      { 10: { days_to_grow: 3, yield: 1 } },
      { 2: 48 }
    )
    expect(calcRecipeCriticalPath(1)).toBe(5) // 3 crop + 2 processing
  })

  it('takes the max across AND groups', () => {
    // group 0: item 10 (2 days), group 1: item 11 (6 days) — result should be 6
    const riRows = [
      { recipe_id: 1, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
      { recipe_id: 1, item_id: 11, input_good_id: null, input_recipe_id: null, ingredient_group: 1 },
    ]
    const { calcRecipeCriticalPath } = makeCriticalPath(
      [], riRows,
      { 10: { days_to_grow: 2, yield: 1 }, 11: { days_to_grow: 6, yield: 1 } }
    )
    expect(calcRecipeCriticalPath(1)).toBe(6)
  })
})