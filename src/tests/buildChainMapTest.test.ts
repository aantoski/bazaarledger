// src/lib/buildChainMaps.test.ts
import { describe, it, expect } from 'vitest'
import { buildChainMaps } from '../lib/buildChainMaps'

describe('buildChainMaps', () => {
  it('maps direct item ingredients', () => {
    const rows = [
      { processed_good_id: 1, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { pgiDirectMap } = buildChainMaps(rows)
    expect(pgiDirectMap).toEqual({ 1: [10] })
  })

  it('maps chained good ingredients', () => {
    const rows = [
      { processed_good_id: 1, item_id: null, input_good_id: 2, input_recipe_id: null, ingredient_group: 0 },
    ]
    const { pgiChainMap } = buildChainMaps(rows)
    expect(pgiChainMap).toEqual({ 1: [2] })
  })

  it('maps recipe chain ingredients', () => {
    const rows = [
      { processed_good_id: 1, item_id: null, input_good_id: null, input_recipe_id: 5, ingredient_group: 0 },
    ]
    const { pgiRecipeChainMap } = buildChainMaps(rows)
    expect(pgiRecipeChainMap).toEqual({ 1: [5] })
  })

  it('handles multiple ingredients for the same good', () => {
    const rows = [
      { processed_good_id: 1, item_id: 10, input_good_id: null, input_recipe_id: null, ingredient_group: 0 },
      { processed_good_id: 1, item_id: 11, input_good_id: null, input_recipe_id: null, ingredient_group: 1 },
    ]
    const { pgiDirectMap } = buildChainMaps(rows)
    expect(pgiDirectMap[1]).toContain(10)
    expect(pgiDirectMap[1]).toContain(11)
  })

  it('returns empty maps for empty input', () => {
    const { pgiDirectMap, pgiChainMap, pgiRecipeChainMap } = buildChainMaps([])
    expect(pgiDirectMap).toEqual({})
    expect(pgiChainMap).toEqual({})
    expect(pgiRecipeChainMap).toEqual({})
  })
})