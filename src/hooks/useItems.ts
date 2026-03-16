import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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
  // cost/profit fields
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

export type NameMap = Record<number, string>

export function useListEntries() {
  const [entries, setEntries] = useState<ListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [itemNameMap, setItemNameMap] = useState<Record<number, string>>({})
  const [goodNameMap, setGoodNameMap] = useState<Record<number, string>>({})
  const [chainMap, setChainMap] = useState<Record<number, number[]>>({})
  const [pgiDirectMap, setPgiDirectMap] = useState<Record<number, number[]>>({})
  const [goodMachineMap, setGoodMachineMap] = useState<Record<number, string | null>>({})
  const [recipeNameMap, setRecipeNameMap] = useState<Record<number, string>>({})
  const [pgiRecipeChainMap, setPgiRecipeChainMap] = useState<Record<number, number[]>>({})
  const [pgiGroupStructure, setPgiGroupStructure] = useState<Record<number, number[][]>>({})
  const [recipeEntryMap, setRecipeEntryMap] = useState<Record<number, ListEntry>>({})
  const [itemBuyPriceMap, setItemBuyPriceMap] = useState<Record<number, number | null>>({})
  const [purchasableGoodMap, setPurchasableGoodMap] = useState<Record<number, { buy_price: number, where_to_buy: string | null }>>({})
  const [purchasableItemMap, setPurchasableItemMap] = useState<Record<number, { buy_price: number, where_to_buy: string | null }>>({})


  useEffect(() => {
    async function fetchAll() {
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

      const riData = [...(riRes1.data ?? []), ...(riRes2.data ?? [])]

      // ── Step 1: Build chain maps ────────────────────────────────────────────
      const pgiDirectMap: Record<number, number[]> = {}
      const pgiChainMap: Record<number, number[]> = {}
      const pgiRecipeChainMap: Record<number, number[]> = {}

      for (const row of pgiRes.data ?? []) {
        if (row.item_id) {
          if (!pgiDirectMap[row.processed_good_id]) pgiDirectMap[row.processed_good_id] = []
          pgiDirectMap[row.processed_good_id].push(row.item_id)
        }
        if (row.input_good_id) {
          if (!pgiChainMap[row.processed_good_id]) pgiChainMap[row.processed_good_id] = []
          pgiChainMap[row.processed_good_id].push(row.input_good_id)
        }
        if (row.input_recipe_id) {
          if (!pgiRecipeChainMap[row.processed_good_id]) pgiRecipeChainMap[row.processed_good_id] = []
          pgiRecipeChainMap[row.processed_good_id].push(row.input_recipe_id)
        }
      }

      // ── Step 2: Build lookup maps ───────────────────────────────────────────
      const goodMachineMap: Record<number, string | null> = {}
      const goodWonderstoneMap: Record<number, boolean> = {}
      const goodProcessingTimeMap: Record<number, number | null> = {}
      for (const p of processedRes.data ?? []) {
        goodMachineMap[p.id] = p.machine_color ?? null
        goodWonderstoneMap[p.id] = p.requires_wonderstone ?? false
        goodProcessingTimeMap[p.id] = p.processing_time ?? null
      }

      const itemToolReqMap: Record<number, { tool: string, min_level: number }[]> = {}
      for (const row of toolReqRes.data ?? []) {
        if (!itemToolReqMap[row.item_id]) itemToolReqMap[row.item_id] = []
        itemToolReqMap[row.item_id].push({ tool: row.tool, min_level: row.min_level })
      }

      const itemBuyPriceMap: Record<number, number | null> = {}
      for (const i of itemsRes.data ?? []) itemBuyPriceMap[i.id] = i.buy_price ?? null

      const cropDetailsMap: Record<number, { days_to_grow: number, yield: number }> = {}
      for (const c of cropRes.data ?? []) {
        cropDetailsMap[c.item_id] = { days_to_grow: c.days_to_grow, yield: c.yield }
      }

      const recipeNameMap: Record<number, string> = {}
      for (const r of recipesRes.data ?? []) recipeNameMap[r.id] = r.name

      const purchasableGoodMap: Record<number, { buy_price: number, where_to_buy: string | null }> = {}
      const purchasableItemMap: Record<number, { buy_price: number, where_to_buy: string | null }> = {}
      for (const row of purchasableRes.data ?? []) {
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

      // ── Step 3: Define helpers ──────────────────────────────────────────────
      function collectItemIds(goodId: number, visited = new Set<number>()): number[] {
        if (visited.has(goodId)) return []
        visited.add(goodId)
        const direct = pgiDirectMap[goodId] ?? []
        const chained = (pgiChainMap[goodId] ?? []).flatMap(gid => collectItemIds(gid, visited))
        return [...direct, ...chained]
      }

      function collectRequiredMachines(goodId: number, visited = new Set<number>()): string[] {
        if (visited.has(goodId)) return []
        visited.add(goodId)
        const color = goodMachineMap[goodId]
        const own = color ? [color] : []
        const chained = (pgiChainMap[goodId] ?? []).flatMap(gid => collectRequiredMachines(gid, visited))
        return [...own, ...chained]
      }

      function collectRequiresWonderstone(goodId: number, visited = new Set<number>()): boolean {
        if (visited.has(goodId)) return false
        visited.add(goodId)
        if (goodWonderstoneMap[goodId]) return true
        return (pgiChainMap[goodId] ?? []).some(gid => collectRequiresWonderstone(gid, visited))
      }

      function collectRequiredToolLevels(goodId: number, visited = new Set<number>()): { tool: string, min_level: number }[] {
        if (visited.has(goodId)) return []
        visited.add(goodId)
        const direct = (pgiDirectMap[goodId] ?? []).flatMap(itemId => itemToolReqMap[itemId] ?? [])
        const chained = (pgiChainMap[goodId] ?? []).flatMap(gid => collectRequiredToolLevels(gid, visited))
        return [...direct, ...chained]
      }

      // ── Cost helpers ────────────────────────────────────────────────────────

      // Raw rows indexed for cost calculation
      const pgiRawRowsByGood: Record<number, Record<number, Array<{
        item_id: number | null,
        input_good_id: number | null,
        input_recipe_id: number | null,
      }>>> = {}
      for (const row of pgiRes.data ?? []) {
        const group = row.ingredient_group ?? 0
        if (!pgiRawRowsByGood[row.processed_good_id]) pgiRawRowsByGood[row.processed_good_id] = {}
        if (!pgiRawRowsByGood[row.processed_good_id][group]) pgiRawRowsByGood[row.processed_good_id][group] = []
        pgiRawRowsByGood[row.processed_good_id][group].push({
          item_id: row.item_id,
          input_good_id: row.input_good_id,
          input_recipe_id: row.input_recipe_id,
        })
      }

      const riRawRowsByRecipe: Record<number, Record<number, Array<{
        item_id: number | null,
        input_good_id: number | null,
        input_recipe_id: number | null,
      }>>> = {}
      for (const row of riData ?? []) {
        const group = row.ingredient_group ?? 0
        if (!riRawRowsByRecipe[row.recipe_id]) riRawRowsByRecipe[row.recipe_id] = {}
        if (!riRawRowsByRecipe[row.recipe_id][group]) riRawRowsByRecipe[row.recipe_id][group] = []
        riRawRowsByRecipe[row.recipe_id][group].push({
          item_id: row.item_id,
          input_good_id: row.input_good_id,
          input_recipe_id: row.input_recipe_id,
        })
      }

      // Cost of a single raw item
      function itemCost(itemId: number): number | null {
        return itemBuyPriceMap[itemId] ?? null
      }

      // Cost of a processed good (walks chain to raw items, averages OR groups)
      function calcGoodCost(goodId: number, visited = new Set<number>()): number | null {
        if (visited.has(goodId)) return null
        const newVisited = new Set(visited)
        newVisited.add(goodId)

        const groupsByIndex = pgiRawRowsByGood[goodId]
        if (!groupsByIndex) return 0 // terminal good, no known ingredients

        let total = 0
        for (const rows of Object.values(groupsByIndex)) {
          // each row in a group is an OR option — average their costs
          const costs: (number | null)[] = rows.map(row => {
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

      // Cost of a recipe (walks chain, averages OR groups)
      function calcRecipeCost(recipeId: number, visited = new Set<number>()): number | null {
        if (visited.has(recipeId)) return null
        const newVisited = new Set(visited)
        newVisited.add(recipeId)

        const groupsByIndex = riRawRowsByRecipe[recipeId]
        if (!groupsByIndex) return 0

        let total = 0
        for (const rows of Object.values(groupsByIndex)) {
          const costs: (number | null)[] = rows.map(row => {
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

      // Returns total days from planting/starting to having this good ready
      function calcGoodCriticalPath(goodId: number, visited = new Set<number>()): number {
        if (visited.has(goodId)) return 0
        const newVisited = new Set(visited)
        newVisited.add(goodId)

        const processingDays = (goodProcessingTimeMap[goodId] ?? 0) / 24
        const groupsByIndex = pgiRawRowsByGood[goodId]
        if (!groupsByIndex) return processingDays

        // Each group is AND — take max across groups (parallel crops, sequential processing)
        // Within a group, rows are OR options — take longest (worst case)
        let maxGroupTime = 0
        for (const rows of Object.values(groupsByIndex)) {
          // OR options — take longest
          const optionTimes = rows.map(row => {
            if (row.item_id) {
              const crop = cropDetailsMap[row.item_id]
              return crop ? crop.days_to_grow : 0
            }
            if (row.input_good_id) return calcGoodCriticalPath(row.input_good_id, newVisited)
            if (row.input_recipe_id) return calcRecipeCriticalPath(row.input_recipe_id, newVisited)
            return 0
          })
          const groupTime = Math.max(...optionTimes, 0)
          // AND groups run in parallel — take the max
          maxGroupTime = Math.max(maxGroupTime, groupTime)
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
          const groupTime = Math.max(...optionTimes, 0)
          maxGroupTime = Math.max(maxGroupTime, groupTime)
        }

        return maxGroupTime
      }

      // ── Step 4: Build processed good ingredient groups + machine maps ───────
      const pgiGroupTemp: Record<number, Record<number, number[]>> = {}
      const pgiMachineTemp: Record<number, Record<number, string[]>> = {}
      const pgiToolTemp: Record<number, { tool: string, min_level: number }[]> = {}
      const pgiMachineOptionTemp: Record<number, Record<number, string[][]>> = {}
      const pgiGoodsTemp: Record<number, Record<number, number[]>> = {}
      const pgiRecipeGoodsTemp: Record<number, Record<number, number[]>> = {}
      const pgiDirectItemsTemp: Record<number, Record<number, number[]>> = {}

      for (const row of pgiRes.data ?? []) {
        if (!pgiGroupTemp[row.processed_good_id]) pgiGroupTemp[row.processed_good_id] = {}
        if (!pgiMachineTemp[row.processed_good_id]) pgiMachineTemp[row.processed_good_id] = {}
        if (!pgiToolTemp[row.processed_good_id]) pgiToolTemp[row.processed_good_id] = []
        const group = row.ingredient_group ?? 0
        if (!pgiMachineOptionTemp[row.processed_good_id]) pgiMachineOptionTemp[row.processed_good_id] = {}
        if (!pgiMachineOptionTemp[row.processed_good_id][group]) pgiMachineOptionTemp[row.processed_good_id][group] = []
        if (!pgiGroupTemp[row.processed_good_id][group]) pgiGroupTemp[row.processed_good_id][group] = []
        if (!pgiMachineTemp[row.processed_good_id][group]) pgiMachineTemp[row.processed_good_id][group] = []
        if (!pgiGoodsTemp[row.processed_good_id]) pgiGoodsTemp[row.processed_good_id] = {}
        if (!pgiGoodsTemp[row.processed_good_id][group]) pgiGoodsTemp[row.processed_good_id][group] = []
        if (row.input_good_id) pgiGoodsTemp[row.processed_good_id][group].push(row.input_good_id)
        if (!pgiRecipeGoodsTemp[row.processed_good_id]) pgiRecipeGoodsTemp[row.processed_good_id] = {}
        if (!pgiRecipeGoodsTemp[row.processed_good_id][group]) pgiRecipeGoodsTemp[row.processed_good_id][group] = []
        if (!pgiDirectItemsTemp[row.processed_good_id]) pgiDirectItemsTemp[row.processed_good_id] = {}
        if (!pgiDirectItemsTemp[row.processed_good_id][group]) pgiDirectItemsTemp[row.processed_good_id][group] = []
        if (row.input_recipe_id) pgiRecipeGoodsTemp[row.processed_good_id][group].push(row.input_recipe_id)
        if (row.item_id) {
          pgiGroupTemp[row.processed_good_id][group].push(row.item_id)
          pgiToolTemp[row.processed_good_id].push(...(itemToolReqMap[row.item_id] ?? []))
          pgiMachineOptionTemp[row.processed_good_id][group].push([])
          pgiDirectItemsTemp[row.processed_good_id][group].push(row.item_id)
        }
        if (row.input_good_id) {
          pgiGroupTemp[row.processed_good_id][group].push(...collectItemIds(row.input_good_id))
          pgiMachineTemp[row.processed_good_id][group].push(...collectRequiredMachines(row.input_good_id))
          pgiToolTemp[row.processed_good_id].push(...collectRequiredToolLevels(row.input_good_id))
          pgiMachineOptionTemp[row.processed_good_id][group].push(collectRequiredMachines(row.input_good_id))
        }
      }

      const pgiGroupMap: Record<number, number[][]> = {}
      const pgiMachineMap: Record<number, string[][]> = {}
      for (const [goodId, groups] of Object.entries(pgiGroupTemp)) {
        pgiGroupMap[Number(goodId)] = Object.values(groups)
        pgiMachineMap[Number(goodId)] = Object.values(pgiMachineTemp[Number(goodId)] ?? {})
      }

      const pgiGoodsMap: Record<number, number[][]> = {}
      for (const [goodId, groups] of Object.entries(pgiGoodsTemp)) {
        pgiGoodsMap[Number(goodId)] = Object.values(groups)
      }

      const pgiRecipeGoodsMap: Record<number, number[][]> = {}
      for (const [goodId, groups] of Object.entries(pgiRecipeGoodsTemp)) {
        pgiRecipeGoodsMap[Number(goodId)] = Object.values(groups)
      }

      const pgiDirectItemsMap: Record<number, number[][]> = {}
      for (const [goodId, groups] of Object.entries(pgiDirectItemsTemp)) {
        pgiDirectItemsMap[Number(goodId)] = Object.values(groups)
      }

      // ── Step 5: Build name lookup maps ─────────────────────────────────────
      const itemNameMap: Record<number, string> = {}
      for (const i of itemsRes.data ?? []) itemNameMap[i.id] = i.name

      const goodNameMap: Record<number, string> = {}
      for (const p of processedRes.data ?? []) goodNameMap[p.id] = p.name

      // ── Step 6: Build recipe ingredient groups ──────────────────────────────
      const riGroupTemp: Record<number, Record<number, number[]>> = {}
      const riMachineTemp: Record<number, Record<number, string[]>> = {}
      const riWonderstoneMap: Record<number, boolean> = {}
      const riToolMap: Record<number, { tool: string, min_level: number }[]> = {}
      const riGroupLabelTemp: Record<number, Record<number, string | null>> = {}
      const riMachineOptionTemp: Record<number, Record<number, string[][]>> = {}
      const riGoodsTemp: Record<number, Record<number, number[]>> = {}
      const riRecipeTemp: Record<number, Record<number, number[]>> = {}
      const riDirectItemsTemp: Record<number, Record<number, number[]>> = {}

      for (const row of riData ?? []) {
        if (!riGroupTemp[row.recipe_id]) riGroupTemp[row.recipe_id] = {}
        if (!riMachineTemp[row.recipe_id]) riMachineTemp[row.recipe_id] = {}
        if (!riToolMap[row.recipe_id]) riToolMap[row.recipe_id] = []
        const group = row.ingredient_group ?? 0
        if (!riGroupTemp[row.recipe_id][group]) riGroupTemp[row.recipe_id][group] = []
        if (!riMachineTemp[row.recipe_id][group]) riMachineTemp[row.recipe_id][group] = []
        if (!riMachineOptionTemp[row.recipe_id]) riMachineOptionTemp[row.recipe_id] = {}
        if (!riMachineOptionTemp[row.recipe_id][group]) riMachineOptionTemp[row.recipe_id][group] = []
        if (!riGoodsTemp[row.recipe_id]) riGoodsTemp[row.recipe_id] = {}
        if (!riGoodsTemp[row.recipe_id][group]) riGoodsTemp[row.recipe_id][group] = []
        if (row.input_good_id) riGoodsTemp[row.recipe_id][group].push(row.input_good_id)
        if (!riRecipeTemp[row.recipe_id]) riRecipeTemp[row.recipe_id] = {}
        if (!riRecipeTemp[row.recipe_id][group]) riRecipeTemp[row.recipe_id][group] = []
        if (row.input_recipe_id) riRecipeTemp[row.recipe_id][group].push(row.input_recipe_id)
        if (!riDirectItemsTemp[row.recipe_id]) riDirectItemsTemp[row.recipe_id] = {}
        if (!riDirectItemsTemp[row.recipe_id][group]) riDirectItemsTemp[row.recipe_id][group] = []
        if (row.item_id) riDirectItemsTemp[row.recipe_id][group].push(row.item_id)
        if (row.item_id) {
          riGroupTemp[row.recipe_id][group].push(row.item_id)
          riToolMap[row.recipe_id].push(...(itemToolReqMap[row.item_id] ?? []))
          riMachineOptionTemp[row.recipe_id][group].push([])
        }
        if (row.input_good_id) {
          riGroupTemp[row.recipe_id][group].push(...collectItemIds(row.input_good_id))
          riMachineTemp[row.recipe_id][group].push(...collectRequiredMachines(row.input_good_id))
          riToolMap[row.recipe_id].push(...collectRequiredToolLevels(row.input_good_id))
          if (collectRequiresWonderstone(row.input_good_id)) riWonderstoneMap[row.recipe_id] = true
          riMachineOptionTemp[row.recipe_id][group].push(collectRequiredMachines(row.input_good_id))
        }
        if (!riGroupLabelTemp[row.recipe_id]) riGroupLabelTemp[row.recipe_id] = {}
        if (row.input_good_id) {
          const resolved = collectItemIds(row.input_good_id)
          if (resolved.length === 0) {
            const existingLabel = riGroupLabelTemp[row.recipe_id][group]
            const goodName = goodNameMap[row.input_good_id] ?? `Good #${row.input_good_id}`
            riGroupLabelTemp[row.recipe_id][group] = existingLabel
              ? `${existingLabel} or ${goodName}`
              : goodName
          }
        }
      }

      const riGroupMap: Record<number, number[][]> = {}
      const riMachineMap: Record<number, string[][]> = {}
      for (const [recipeId, groups] of Object.entries(riGroupTemp)) {
        riGroupMap[Number(recipeId)] = Object.values(groups)
        riMachineMap[Number(recipeId)] = Object.values(riMachineTemp[Number(recipeId)] ?? {})
      }

      const riMachineOptionMap: Record<number, string[][][]> = {}
      for (const [recipeId, groups] of Object.entries(riMachineOptionTemp)) {
        riMachineOptionMap[Number(recipeId)] = Object.values(groups)
      }

      const riGoodsMap: Record<number, number[][]> = {}
      for (const [recipeId, groups] of Object.entries(riGoodsTemp)) {
        riGoodsMap[Number(recipeId)] = Object.values(groups)
      }

      const riRecipeMap: Record<number, number[][]> = {}
      for (const [recipeId, groups] of Object.entries(riRecipeTemp)) {
        riRecipeMap[Number(recipeId)] = Object.values(groups)
      }

      const riDirectItemsMap: Record<number, number[][]> = {}
      for (const [recipeId, groups] of Object.entries(riDirectItemsTemp)) {
        riDirectItemsMap[Number(recipeId)] = Object.values(groups)
      }

      // ── Step 7: Build entries ───────────────────────────────────────────────
      const items: ListEntry[] = (itemsRes.data ?? []).map(i => {
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
          net_profit: i.sell_price,  // raw items: no ingredient cost
          purchasable: purchasableItemMap[i.id] ?? null,
        }
      })

      const processed: ListEntry[] = (processedRes.data ?? []).map(p => {
        const cost = calcGoodCost(p.id)
        const netProfit = p.sell_price != null && cost != null ? Math.round(p.sell_price - cost) : null
        const criticalPath = calcGoodCriticalPath(p.id)
        const effectiveDays = Math.max(1, criticalPath)
        const profitPerDay = p.sell_price != null
          ? Math.round(p.sell_price / effectiveDays)
          : null
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
          ingredient_group_machine_options: riMachineOptionMap[p.id] ?? [],
          ingredient_group_goods: pgiGoodsMap[p.id] ?? [],
          ingredient_group_recipe_inputs: pgiRecipeGoodsMap[p.id] ?? [],
          ingredient_direct_items: pgiDirectItemsMap[p.id] ?? [],
          processing_time: p.processing_time ?? null,
          ingredient_cost: cost,
          net_profit: netProfit,
          profit_per_day: profitPerDay,
          critical_path_days: Math.round(criticalPath * 10) / 10, // round to 1 decimal
          purchasable: purchasableGoodMap[p.id] ?? null,
        }
      })

      // Build recipes array first without recipeEntryMap (needed for cost calc)
      const recipes: ListEntry[] = (recipesRes.data ?? []).map(r => {
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
          profit_per_day: null,  // recipes have no cook time
        }
      })

      const recipeEntryMapBuilt: Record<number, ListEntry> = {}
      for (const r of recipes) recipeEntryMapBuilt[r.id] = r


      setEntries([...items, ...processed, ...recipes])
      setItemNameMap(itemNameMap)
      setGoodNameMap(goodNameMap)
      setChainMap(pgiChainMap)
      setPgiDirectMap(pgiDirectMap)
      setGoodMachineMap(goodMachineMap)
      setRecipeNameMap(recipeNameMap)
      setPgiRecipeChainMap(pgiRecipeChainMap)
      setPgiGroupStructure(pgiGroupMap)
      setRecipeEntryMap(recipeEntryMapBuilt)
      setItemBuyPriceMap(itemBuyPriceMap)
      setPurchasableGoodMap(purchasableGoodMap)
      setPurchasableItemMap(purchasableItemMap)

console.log('Mochi purchasable:', purchasableGoodMap[87])
console.log('purchasableGoodMap keys:', Object.keys(purchasableGoodMap))


      setLoading(false)
    }

    fetchAll()
  }, [])

  return {
    entries, loading,
    itemNameMap, goodNameMap, recipeNameMap,itemBuyPriceMap,
    pgiRecipeChainMap, pgiGroupStructure, recipeEntryMap,
    purchasableGoodMap, purchasableItemMap,
    chainMap,
    pgiDirectMap,
    goodMachineMap,
  }
}