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
  ingredient_group_labels?: Record<number, string | null>  // group index -> fallback label
  ingredient_group_machine_options?: string[][][]  // [group][option][machines]
  ingredient_group_goods?: number[][]  // input_good_ids per group (before chain resolution)
  ingredient_group_recipes?: number[][] 
  ingredient_group_recipe_inputs?: number[][]  // input_recipe_ids per group for processed goods
  ingredient_direct_items?: number[][]
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

  useEffect(() => {
    async function fetchAll() {
      // CHANGED: added toolReqRes to Promise.all
      const [itemsRes, processedRes, recipesRes, pgiRes, toolReqRes] = await Promise.all([
        supabase.from('items').select('id, name, item_type, sell_price').not('sell_price', 'is', null),
        supabase.from('processed_goods').select('id, name, sell_price, machine_color, processing_time, requires_wonderstone').not('sell_price', 'is', null),
        // supabase.from('recipes').select('id, name, category, sell_price, effect, utensil').not('sell_price', 'is', null),
        supabase.from('recipes').select('id, name, category, sell_price, effect, utensil, where_to_get'),
        supabase.from('processed_materials').select('processed_good_id, item_id, input_good_id, input_recipe_id, ingredient_group').limit(10000),
        supabase.from('tool_requirements').select('item_id, tool, min_level'),  // NEW
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
        if (row.input_recipe_id) {  // NEW
          if (!pgiRecipeChainMap[row.processed_good_id]) pgiRecipeChainMap[row.processed_good_id] = []
          pgiRecipeChainMap[row.processed_good_id].push(row.input_recipe_id)
        }
      }

      // ── Step 2: Build lookup maps ───────────────────────────────────────────
      const goodMachineMap: Record<number, string | null> = {}
      const goodWonderstoneMap: Record<number, boolean> = {}
      for (const p of processedRes.data ?? []) {
        goodMachineMap[p.id] = p.machine_color ?? null
        goodWonderstoneMap[p.id] = p.requires_wonderstone ?? false
      }

      // NEW: build item -> tool requirements map
      const itemToolReqMap: Record<number, { tool: string, min_level: number }[]> = {}
      for (const row of toolReqRes.data ?? []) {
        if (!itemToolReqMap[row.item_id]) itemToolReqMap[row.item_id] = []
        itemToolReqMap[row.item_id].push({ tool: row.tool, min_level: row.min_level })
      }

      const recipeNameMap: Record<number, string> = {}
      for (const r of recipesRes.data ?? []) recipeNameMap[r.id] = r.name

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

      // NEW: walk chain collecting tool requirements from all ingredient item_ids
      function collectRequiredToolLevels(goodId: number, visited = new Set<number>()): { tool: string, min_level: number }[] {
        if (visited.has(goodId)) return []
        visited.add(goodId)
        const direct = (pgiDirectMap[goodId] ?? []).flatMap(itemId => itemToolReqMap[itemId] ?? [])
        const chained = (pgiChainMap[goodId] ?? []).flatMap(gid => collectRequiredToolLevels(gid, visited))
        return [...direct, ...chained]
      }

      // ── Step 4: Build processed good ingredient groups + machine maps ───────
      const pgiGroupTemp: Record<number, Record<number, number[]>> = {}
      const pgiMachineTemp: Record<number, Record<number, string[]>> = {}
      const pgiToolTemp: Record<number, { tool: string, min_level: number }[]> = {}  // NEW
      const pgiMachineOptionTemp: Record<number, Record<number, string[][]>> = {}
      const pgiGoodsTemp: Record<number, Record<number, number[]>> = {} // NEW
      const pgiRecipeGoodsTemp: Record<number, Record<number, number[]>> = {} // NEW
      const pgiDirectItemsTemp: Record<number, Record<number, number[]>> = {} // NEW

      for (const row of pgiRes.data ?? []) {
        if (!pgiGroupTemp[row.processed_good_id]) pgiGroupTemp[row.processed_good_id] = {}
        if (!pgiMachineTemp[row.processed_good_id]) pgiMachineTemp[row.processed_good_id] = {}
        if (!pgiToolTemp[row.processed_good_id]) pgiToolTemp[row.processed_good_id] = []  // NEW
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
        if (row.input_recipe_id) {
          pgiRecipeGoodsTemp[row.processed_good_id][group].push(row.input_recipe_id)
        }
        if (row.item_id) {
          pgiGroupTemp[row.processed_good_id][group].push(row.item_id)
          pgiToolTemp[row.processed_good_id].push(...(itemToolReqMap[row.item_id] ?? []))  // NEW
          pgiMachineOptionTemp[row.processed_good_id][group].push([])
          pgiDirectItemsTemp[row.processed_good_id][group].push(row.item_id)
        }
        if (row.input_good_id) {
          pgiGroupTemp[row.processed_good_id][group].push(...collectItemIds(row.input_good_id))
          pgiMachineTemp[row.processed_good_id][group].push(...collectRequiredMachines(row.input_good_id))
          pgiToolTemp[row.processed_good_id].push(...collectRequiredToolLevels(row.input_good_id))  // NEW
          pgiMachineOptionTemp[row.processed_good_id][group].push(collectRequiredMachines(row.input_good_id))
        }
      }

      const pgiGroupMap: Record<number, number[][]> = {}
      const pgiMachineMap: Record<number, string[][]> = {}
      for (const [goodId, groups] of Object.entries(pgiGroupTemp)) {
        pgiGroupMap[Number(goodId)] = Object.values(groups)
        pgiMachineMap[Number(goodId)] = Object.values(pgiMachineTemp[Number(goodId)] ?? {})
      }

      const pgiMachineOptionMap: Record<number, string[][][]> = {}
      for (const [recipeId, groups] of Object.entries(pgiMachineOptionMap)) {
        pgiMachineOptionMap[Number(recipeId)] = Object.values(groups)
      }

      const pgiGoodsMap: Record<number, number[][]> = {}
      for (const [recipeId, groups] of Object.entries(pgiGoodsTemp)) {
        pgiGoodsMap[Number(recipeId)] = Object.values(groups)
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

      // ── Step 6: Build recipe ingredient groups + machine maps ───────────────
      const riGroupTemp: Record<number, Record<number, number[]>> = {}
      const riMachineTemp: Record<number, Record<number, string[]>> = {}
      const riWonderstoneMap: Record<number, boolean> = {}
      const riToolMap: Record<number, { tool: string, min_level: number }[]> = {} 
      const riGroupLabelTemp: Record<number, Record<number, string | null>> = {}
      const riMachineOptionTemp: Record<number, Record<number, string[][]>> = {} // NEW
      const riGoodsTemp: Record<number, Record<number, number[]>> = {} // NEW
      const riRecipeTemp: Record<number, Record<number, number[]>> = {} // NEW
      const riDirectItemsTemp: Record<number, Record<number, number[]>> = {} // NEW 

      for (const row of riData ?? []) {
        if (!riGroupTemp[row.recipe_id]) riGroupTemp[row.recipe_id] = {}
        if (!riMachineTemp[row.recipe_id]) riMachineTemp[row.recipe_id] = {}
        if (!riToolMap[row.recipe_id]) riToolMap[row.recipe_id] = []  // NEW
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
          riToolMap[row.recipe_id].push(...(itemToolReqMap[row.item_id] ?? []))  // NEW
          riMachineOptionTemp[row.recipe_id][group].push([])
        }
        if (row.input_good_id) {
          riGroupTemp[row.recipe_id][group].push(...collectItemIds(row.input_good_id))
          riMachineTemp[row.recipe_id][group].push(...collectRequiredMachines(row.input_good_id))
          riToolMap[row.recipe_id].push(...collectRequiredToolLevels(row.input_good_id))  // NEW
          if (collectRequiresWonderstone(row.input_good_id)) {
            riWonderstoneMap[row.recipe_id] = true
          }
          riMachineOptionTemp[row.recipe_id][group].push(collectRequiredMachines(row.input_good_id))
        }
        if (!riGroupLabelTemp[row.recipe_id]) riGroupLabelTemp[row.recipe_id] = {}
        if (row.input_good_id) {
          const resolved = collectItemIds(row.input_good_id)
          if (resolved.length === 0) {
            // no raw items found — store the good name as fallback
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

      const riGroupLabelMap: Record<number, (string | null)[]> = {}
      for (const [recipeId, groups] of Object.entries(riGroupLabelTemp)) {
        riGroupLabelMap[Number(recipeId)] = Object.values(groups)
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
      const items: ListEntry[] = (itemsRes.data ?? []).map(i => ({
        id: i.id,
        name: i.name,
        sell_price: i.sell_price,
        type: i.item_type as ListEntry['type'],
        item_type: i.item_type,
        ingredient_required_tool_levels: itemToolReqMap[i.id] ?? [],  // ADD THIS
      }))

      const processed: ListEntry[] = (processedRes.data ?? []).map(p => ({
        id: p.id,
        name: p.name,
        sell_price: p.sell_price,
        type: 'Processed' as const,
        machine_color: p.machine_color,
        requires_wonderstone: p.requires_wonderstone ?? false,
        ingredient_groups: pgiGroupMap[p.id] ?? [],
        ingredient_required_machines: pgiMachineMap[p.id] ?? [],
        ingredient_required_tool_levels: pgiToolTemp[p.id] ?? [],  // NEW
        ingredient_group_machine_options: riMachineOptionMap[p.id] ?? [],
        ingredient_group_goods: pgiGoodsMap[p.id] ?? [],
        ingredient_group_recipe_inputs: pgiRecipeGoodsMap[p.id] ?? [],
        ingredient_direct_items: pgiDirectItemsMap[p.id] ?? [],
      }))

      const recipes: ListEntry[] = (recipesRes.data ?? []).map(r => ({
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
      }))

      setEntries([...items, ...processed, ...recipes])
      setItemNameMap(itemNameMap)
      setGoodNameMap(goodNameMap)
      setChainMap(pgiChainMap)
      setPgiDirectMap(pgiDirectMap)
      setGoodMachineMap(goodMachineMap)
      setRecipeNameMap(recipeNameMap)
      setPgiRecipeChainMap(pgiRecipeChainMap)
      setPgiGroupStructure(pgiGroupMap)
      setLoading(false)
    }

    fetchAll()
  }, [])

  return {  entries, loading, 
            itemNameMap, goodNameMap, recipeNameMap, pgiRecipeChainMap, pgiGroupStructure,
            chainMap,           // processed_good_id -> input_good_ids
            pgiDirectMap,       // processed_good_id -> item_ids  
            goodMachineMap,     // processed_good_id -> machine_color
          }
}