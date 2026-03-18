import type { RawGameData, buildLookupMaps } from './buildLookupMaps'
import type { buildIngredientGroups } from './buildIngredientGroups'
import type { makeCalcCost } from './calcCost.ts'
import type { makeCalcCriticalPath } from './calcCriticalPath.ts'
import type { ListEntry } from '../types/ListEntry.ts' // wherever your type lives

type LookupMaps = ReturnType<typeof buildLookupMaps>
type IngredientGroups = ReturnType<typeof buildIngredientGroups>
type CalcCost = ReturnType<typeof makeCalcCost>
type CalcCriticalPath = ReturnType<typeof makeCalcCriticalPath>

export function buildEntries(
  rawData: RawGameData,
  lookupMaps: LookupMaps,
  ingredientGroups: IngredientGroups,
  calcCost: CalcCost,
  calcCriticalPath: CalcCriticalPath,
) {
  const { calcGoodCost, calcRecipeCost } = calcCost
  const { calcGoodCriticalPath } = calcCriticalPath
  const {
    cropDetailsMap, itemToolReqMap,
    purchasableItemMap, purchasableGoodMap,
  } = lookupMaps
  const {
    pgiGroupMap, pgiMachineMap, pgiToolTemp, pgiGoodsMap,
    pgiRecipeGoodsMap, pgiDirectItemsMap, pgiMachineOptionTemp,
    riGroupMap, riMachineMap, riWonderstoneMap, riToolMap,
    riGroupLabelTemp, riMachineOptionMap, riGoodsMap,
    riRecipeMap, riDirectItemsMap,
  } = ingredientGroups

  const items: ListEntry[] = rawData.items.map(i => {
    const crop = cropDetailsMap[i.id]
    const profitPerDay = crop
      ? Math.round((i.sell_price! * crop.yield) / crop.days_to_grow)
      : i.sell_price ?? null
    return {
      id: i.id,
      name: i.name,
      sell_price: i.sell_price,
      type: i.item_type as ListEntry['type'],
      item_type: i.item_type,
      ingredient_required_tool_levels: itemToolReqMap[i.id] ?? [],
      buy_price: i.buy_price ?? null,
      days_to_grow: crop?.days_to_grow ?? null,
      crop_yield: crop?.yield ?? null,
      profit_per_day: profitPerDay,
      net_profit: i.sell_price,
      purchasable: purchasableItemMap[i.id] ?? null,
    }
  })

  const processed: ListEntry[] = rawData.processedGoods.map(p => {
    const cost = calcGoodCost(p.id)
    const netProfit = p.sell_price != null && cost != null ? Math.round(p.sell_price - cost) : null
    const criticalPath = calcGoodCriticalPath(p.id)
    const effectiveDays = Math.max(1, criticalPath)
    const profitPerDay = p.sell_price != null ? Math.round(p.sell_price / effectiveDays) : null
    return {
      id: p.id,
      name: p.name,
      sell_price: p.sell_price,
      type: 'Processed' as const,
      machine_color: p.machine_color,
      requires_wonderstone: p.requires_wonderstone ?? false,
      ingredient_groups: pgiGroupMap[p.id] ?? [],
      ingredient_required_machines: pgiMachineMap[p.id] ?? [],
      ingredient_required_tool_levels: pgiToolTemp[p.id] ?? [],
      ingredient_group_machine_options: pgiMachineOptionTemp[p.id] ? Object.values(pgiMachineOptionTemp[p.id]) : [],
      ingredient_group_goods: pgiGoodsMap[p.id] ?? [],
      ingredient_group_recipe_inputs: pgiRecipeGoodsMap[p.id] ?? [],
      ingredient_direct_items: pgiDirectItemsMap[p.id] ?? [],
      processing_time: p.processing_time != null ? Number(p.processing_time) : null,
      ingredient_cost: cost,
      net_profit: netProfit,
      profit_per_day: profitPerDay,
      critical_path_days: Math.round(criticalPath * 10) / 10,
      purchasable: purchasableGoodMap[p.id] ?? null,
    }
  })

  const recipes: ListEntry[] = rawData.recipes.map(r => {
    const cost = calcRecipeCost(r.id)
    const netProfit = r.sell_price != null && cost != null ? Math.round(r.sell_price - cost) : null
    return {
      id: r.id,
      name: r.name,
      sell_price: r.sell_price,
      type: 'Recipe' as const,
      utensil: r.utensil,
      category: r.category,
      effect: r.effect,
      ingredient_groups: riGroupMap[r.id] ?? [],
      ingredient_required_machines: riMachineMap[r.id] ?? [],
      ingredient_requires_wonderstone: riWonderstoneMap[r.id] ?? false,
      ingredient_required_tool_levels: riToolMap[r.id] ?? [],
      where_to_get: r.where_to_get,
      ingredient_group_labels: riGroupLabelTemp[r.id] ?? {},
      ingredient_group_machine_options: riMachineOptionMap[r.id] ?? [],
      ingredient_group_goods: riGoodsMap[r.id] ?? [],
      ingredient_group_recipes: riRecipeMap[r.id] ?? [],
      ingredient_direct_items: riDirectItemsMap[r.id] ?? [],
      ingredient_cost: cost,
      net_profit: netProfit,
      profit_per_day: null,
    }
  })

  const recipeEntryMap: Record<number, ListEntry> = {}
  for (const r of recipes) recipeEntryMap[r.id] = r

  return {
    entries: [...items, ...processed, ...recipes],
    recipeEntryMap,
  }
}