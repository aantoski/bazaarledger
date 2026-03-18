// src/lib/calcCost.test.ts
import { describe, it, expect } from 'vitest'
import { makeCalcCost } from '../lib/calcCost'

// helper to reduce boilerplate across tests
function makeCost(
  pgiRows: Parameters<typeof makeCalcCost>[0],
  riRows: Parameters<typeof makeCalcCost>[1],
  itemBuyPriceMap: Record<number, number | null> = {}
) {
  return makeCalcCost(pgiRows, riRows, itemBuyPriceMap)
}

describe('calcGoodCost', () => {
  it('returns 0 for a good with no ingredients', () => {
    const { calcGoodCost } = makeCost([], [], {})
    expect(calcGoodCost(99)).toBe(0)
  })

  it('returns the item cost for a single direct ingredient', () => {
    const pgiRows = [
      { processed_good_id: 1, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcGoodCost } = makeCost(pgiRows, [], { 10: 100 })
    expect(calcGoodCost(1)).toBe(100)
  })

  it('returns null if an ingredient has no known buy price', () => {
    const pgiRows = [
      { processed_good_id: 1, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcGoodCost } = makeCost(pgiRows, [], { 10: null })
    expect(calcGoodCost(1)).toBeNull()
  })

  it('sums costs across AND groups', () => {
    // group 0 costs 100, group 1 costs 200 — total should be 300
    const pgiRows = [
      { processed_good_id: 1, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
      { processed_good_id: 1, item_id: 11, input_good_id: null, input_recipe_id: null, ingredient_group: 1 },
    ]
    const { calcGoodCost } = makeCost(pgiRows, [], { 10: 100, 11: 200 })
    expect(calcGoodCost(1)).toBe(300)
  })

  it('averages costs across OR options within a group', () => {
    // group 0 has two OR options: 100 and 200 — average should be 150
    const pgiRows = [
      { processed_good_id: 1, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
      { processed_good_id: 1, item_id: 11, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcGoodCost } = makeCost(pgiRows, [], { 10: 100, 11: 200 })
    expect(calcGoodCost(1)).toBe(150)
  })

  it('walks chained goods recursively', () => {
    // good 1 requires good 2, good 2 requires item 10 (cost 100)
    const pgiRows = [
      { processed_good_id: 1, item_id: null, input_good_id: 2, input_recipe_id: null, ingredient_group: 0 },
      { processed_good_id: 2, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcGoodCost } = makeCost(pgiRows, [], { 10: 100 })
    expect(calcGoodCost(1)).toBe(100)
  })

  it('handles circular references without infinite looping', () => {
    // good 1 requires good 2, good 2 requires good 1
    const pgiRows = [
      { processed_good_id: 1, item_id: null, input_good_id: 2, input_recipe_id: null, ingredient_group: 0 },
      { processed_good_id: 2, item_id: null, input_good_id: 1, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcGoodCost } = makeCost(pgiRows, [], {})
    expect(calcGoodCost(1)).toBeNull()
  })
})

describe('calcRecipeCost', () => {
  it('returns 0 for a recipe with no ingredients', () => {
    const { calcRecipeCost } = makeCost([], [], {})
    expect(calcRecipeCost(99)).toBe(0)
  })

  it('returns the item cost for a single direct ingredient', () => {
    const riRows = [
      { recipe_id: 1, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcRecipeCost } = makeCost([], riRows, { 10: 50 })
    expect(calcRecipeCost(1)).toBe(50)
  })

  it('returns null if any ingredient cost is unknown', () => {
    const riRows = [
      { recipe_id: 1, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcRecipeCost } = makeCost([], riRows, { 10: null })
    expect(calcRecipeCost(1)).toBeNull()
  })

  it('walks into processed good ingredients', () => {
    // recipe 1 requires good 2, good 2 requires item 10 (cost 80)
    const riRows = [
      { recipe_id: 1, item_id: null, input_good_id: 2, input_recipe_id: null, ingredient_group: 0 },
    ]
    const pgiRows = [
      { processed_good_id: 2, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { calcRecipeCost } = makeCost(pgiRows, riRows, { 10: 80 })
    expect(calcRecipeCost(1)).toBe(80)
  })
})