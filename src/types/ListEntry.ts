export type ListEntry = {
  id: number
  name: string
  sell_price: number | null
  type: 'Crop' | 'Forageable' | 'Animal By-Product' | 'Pantry' | 'Fish' | 'Mushroom' | 'Honey' | 'Processed' | 'Recipe'
  utensil?: string | null
  machine_color?: string | null
  category?: string | null
  effect?: string | null
  requires_wonderstone?: boolean
  ingredient_groups?: number[][]
  ingredient_required_machines?: string[][]
  ingredient_requires_wonderstone?: boolean
  item_type?: string | null
  ingredient_required_tool_levels?: { tool: string, min_level: number }[]
  where_to_get?: string | null
  ingredient_group_labels?: Record<number, string | null>
  ingredient_group_machine_options?: string[][][]
  ingredient_group_goods?: number[][]
  ingredient_group_recipes?: number[][]
  ingredient_group_recipe_inputs?: number[][]
  ingredient_direct_items?: number[][]
  buy_price?: number | null
  days_to_grow?: number | null
  crop_yield?: number | null
  processing_time?: number | null
  profit_per_day?: number | null
  ingredient_cost?: number | null
  net_profit?: number | null
  critical_path_days?: number | null
  processing_time_hours?: number | null 
  purchasable?: { buy_price: number, where_to_buy: string | null } | null
}