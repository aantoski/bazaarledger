import type { RawGameData } from './buildLookupMaps'
import { supabase } from './supabase.ts'

export async function fetchGameData(): Promise<RawGameData> {
  const [itemsRes, processedRes, recipesRes, pgiRes, toolReqRes, cropRes, purchasableRes] = await Promise.all([
    supabase.from('items').select('id, name, item_type, sell_price, buy_price').not('sell_price', 'is', null),
    supabase.from('processed_goods').select('id, name, sell_price, machine_color, processing_time, requires_wonderstone').not('sell_price', 'is', null),
    supabase.from('recipes').select('id, name, category, sell_price, effect, utensil, where_to_get'),
    supabase.from('processed_materials').select('processed_good_id, item_id, input_good_id, input_recipe_id, ingredient_group').limit(10000),
    supabase.from('tool_requirements').select('item_id, tool, min_level'),
    supabase.from('crop_details').select('item_id, days_to_grow, yield'),
    supabase.from('purchasable_goods').select('processed_good_id, item_id, buy_price, where_to_buy'),
  ])

  const [riRes1, riRes2] = await Promise.all([
    supabase.from('recipe_ingredients').select('recipe_id, item_id, input_good_id, input_recipe_id, ingredient_group').range(0, 999),
    supabase.from('recipe_ingredients').select('recipe_id, item_id, input_good_id, input_recipe_id, ingredient_group').range(1000, 1999),
  ])

  return {
    items: itemsRes.data ?? [],
    processedGoods: processedRes.data ?? [],
    recipes: recipesRes.data ?? [],
    pgiRows: pgiRes.data ?? [],
    riRows: [...(riRes1.data ?? []), ...(riRes2.data ?? [])],
    toolRequirements: toolReqRes.data ?? [],
    cropDetails: cropRes.data ?? [],
    purchasables: purchasableRes.data ?? [],
  }
}