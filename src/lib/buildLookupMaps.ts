import type { Tables } from '../types/supabase'

type ItemRow = Pick<Tables<'items'>, 'id' | 'name' | 'item_type' | 'sell_price' | 'buy_price'>
type ProcessedGoodRow = Pick<Tables<'processed_goods'>, 'id' | 'name' | 'sell_price' | 'machine_color' | 'processing_time' | 'requires_wonderstone'>
type RecipeRow = Pick<Tables<'recipes'>, 'id' | 'name' | 'category' | 'sell_price' | 'effect' | 'utensil' | 'where_to_get'>
type PgiRow = Pick<Tables<'processed_materials'>, 'processed_good_id' | 'item_id' | 'input_good_id' | 'input_recipe_id' | 'ingredient_group'>
type RiRow = Pick<Tables<'recipe_ingredients'>, 'recipe_id' | 'item_id' | 'input_good_id' | 'input_recipe_id' | 'ingredient_group'>
type ToolReqRow = Pick<Tables<'tool_requirements'>, 'item_id' | 'tool' | 'min_level'>
type CropDetailRow = Pick<Tables<'crop_details'>, 'item_id' | 'days_to_grow' | 'yield'>
type PurchasableRow = Pick<Tables<'purchasable_goods'>, 'processed_good_id' | 'item_id' | 'buy_price' | 'where_to_buy'>

export type RawGameData = {
  items: ItemRow[]
  processedGoods: ProcessedGoodRow[]
  recipes: RecipeRow[]
  pgiRows: PgiRow[]
  riRows: RiRow[]
  toolRequirements: ToolReqRow[]
  cropDetails: CropDetailRow[]
  purchasables: PurchasableRow[]
}

export function buildLookupMaps(data: RawGameData) {
    const goodMachineMap: Record<number, string | null> = {}
    const goodWonderstoneMap: Record<number, boolean> = {}
    const goodProcessingTimeMap: Record<number, number | null> = {}
    for (const p of data.processedGoods) {
        goodMachineMap[p.id] = p.machine_color ?? null
        goodWonderstoneMap[p.id] = p.requires_wonderstone ?? false
        goodProcessingTimeMap[p.id] = p.processing_time != null ? Number(p.processing_time) : null
    }

    const itemToolReqMap: Record<number, { tool: string, min_level: number }[]> = {}
    for (const row of data.toolRequirements) {
    if (!row.item_id || !row.tool || row.min_level == null) continue
    if (!itemToolReqMap[row.item_id]) itemToolReqMap[row.item_id] = []
        itemToolReqMap[row.item_id].push({ tool: row.tool, min_level: row.min_level })
    }

    const itemBuyPriceMap: Record<number, number | null> = {}
    for (const i of data.items) itemBuyPriceMap[i.id] = i.buy_price ?? null

    const cropDetailsMap: Record<number, { days_to_grow: number, yield: number }> = {}
    for (const c of data.cropDetails) {
    if (!c.item_id || c.days_to_grow == null || c.yield == null) continue
        cropDetailsMap[c.item_id] = { days_to_grow: c.days_to_grow, yield: c.yield }
    }

    const recipeNameMap: Record<number, string> = {}
    for (const r of data.recipes) recipeNameMap[r.id] = r.name

    const purchasableGoodMap: Record<number, { buy_price: number, where_to_buy: string | null }> = {}
    const purchasableItemMap: Record<number, { buy_price: number, where_to_buy: string | null }> = {}
    for (const row of data.purchasables) {
    if (row.processed_good_id) {
        purchasableGoodMap[row.processed_good_id] = {
        buy_price: row.buy_price,
        where_to_buy: row.where_to_buy
    }
    }
    if (row.item_id) {
        purchasableItemMap[row.item_id] = {
        buy_price: row.buy_price,
        where_to_buy: row.where_to_buy
    }
    }
    }

    const itemNameMap: Record<number, string> = {}
    for (const i of data.items) itemNameMap[i.id] = i.name

    const goodNameMap: Record<number, string> = {}
    for (const p of data.processedGoods) goodNameMap[p.id] = p.name

    return {
        goodMachineMap,
        goodWonderstoneMap,
        goodProcessingTimeMap,
        itemToolReqMap,
        itemBuyPriceMap,
        cropDetailsMap,
        recipeNameMap,
        purchasableGoodMap,
        purchasableItemMap,
        itemNameMap,
        goodNameMap
    }
}