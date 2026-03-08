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
  ingredient_required_tool_levels?: { tool: string, min_level: number }[]  // NEW
}

export function useListEntries() {
  const [entries, setEntries] = useState<ListEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      // CHANGED: added toolReqRes to Promise.all
      const [itemsRes, processedRes, recipesRes, pgiRes, toolReqRes] = await Promise.all([
        supabase.from('items').select('id, name, item_type, sell_price').not('sell_price', 'is', null),
        supabase.from('processed_goods').select('id, name, sell_price, machine_color, processing_time, requires_wonderstone').not('sell_price', 'is', null),
        supabase.from('recipes').select('id, name, category, sell_price, effect, utensil').not('sell_price', 'is', null),
        supabase.from('processed_materials').select('processed_good_id, item_id, input_good_id, ingredient_group').limit(10000),
        supabase.from('tool_requirements').select('item_id, tool, min_level'),  // NEW
      ])

      const [riRes1, riRes2] = await Promise.all([
        supabase.from('recipe_ingredients').select('recipe_id, item_id, input_good_id, ingredient_group').range(0, 999),
        supabase.from('recipe_ingredients').select('recipe_id, item_id, input_good_id, ingredient_group').range(1000, 1999),
      ])

      const riData = [...(riRes1.data ?? []), ...(riRes2.data ?? [])]

      // ── Step 1: Build chain maps ────────────────────────────────────────────
      const pgiDirectMap: Record<number, number[]> = {}
      const pgiChainMap: Record<number, number[]> = {}

      for (const row of pgiRes.data ?? []) {
        if (row.item_id) {
          if (!pgiDirectMap[row.processed_good_id]) pgiDirectMap[row.processed_good_id] = []
          pgiDirectMap[row.processed_good_id].push(row.item_id)
        }
        if (row.input_good_id) {
          if (!pgiChainMap[row.processed_good_id]) pgiChainMap[row.processed_good_id] = []
          pgiChainMap[row.processed_good_id].push(row.input_good_id)
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

      for (const row of pgiRes.data ?? []) {
        if (!pgiGroupTemp[row.processed_good_id]) pgiGroupTemp[row.processed_good_id] = {}
        if (!pgiMachineTemp[row.processed_good_id]) pgiMachineTemp[row.processed_good_id] = {}
        if (!pgiToolTemp[row.processed_good_id]) pgiToolTemp[row.processed_good_id] = []  // NEW
        const group = row.ingredient_group ?? 0
        if (!pgiGroupTemp[row.processed_good_id][group]) pgiGroupTemp[row.processed_good_id][group] = []
        if (!pgiMachineTemp[row.processed_good_id][group]) pgiMachineTemp[row.processed_good_id][group] = []
        if (row.item_id) {
          pgiGroupTemp[row.processed_good_id][group].push(row.item_id)
          pgiToolTemp[row.processed_good_id].push(...(itemToolReqMap[row.item_id] ?? []))  // NEW
        }
        if (row.input_good_id) {
          pgiGroupTemp[row.processed_good_id][group].push(...collectItemIds(row.input_good_id))
          pgiMachineTemp[row.processed_good_id][group].push(...collectRequiredMachines(row.input_good_id))
          pgiToolTemp[row.processed_good_id].push(...collectRequiredToolLevels(row.input_good_id))  // NEW
        }
      }

      const pgiGroupMap: Record<number, number[][]> = {}
      const pgiMachineMap: Record<number, string[][]> = {}
      for (const [goodId, groups] of Object.entries(pgiGroupTemp)) {
        pgiGroupMap[Number(goodId)] = Object.values(groups)
        pgiMachineMap[Number(goodId)] = Object.values(pgiMachineTemp[Number(goodId)] ?? {})
      }

      // ── Step 5: Build recipe ingredient groups + machine maps ───────────────
      const riGroupTemp: Record<number, Record<number, number[]>> = {}
      const riMachineTemp: Record<number, Record<number, string[]>> = {}
      const riWonderstoneMap: Record<number, boolean> = {}
      const riToolMap: Record<number, { tool: string, min_level: number }[]> = {}  // NEW

      for (const row of riData ?? []) {
        if (!riGroupTemp[row.recipe_id]) riGroupTemp[row.recipe_id] = {}
        if (!riMachineTemp[row.recipe_id]) riMachineTemp[row.recipe_id] = {}
        if (!riToolMap[row.recipe_id]) riToolMap[row.recipe_id] = []  // NEW
        const group = row.ingredient_group ?? 0
        if (!riGroupTemp[row.recipe_id][group]) riGroupTemp[row.recipe_id][group] = []
        if (!riMachineTemp[row.recipe_id][group]) riMachineTemp[row.recipe_id][group] = []
        if (row.item_id) {
          riGroupTemp[row.recipe_id][group].push(row.item_id)
          riToolMap[row.recipe_id].push(...(itemToolReqMap[row.item_id] ?? []))  // NEW
        }
        if (row.input_good_id) {
          riGroupTemp[row.recipe_id][group].push(...collectItemIds(row.input_good_id))
          riMachineTemp[row.recipe_id][group].push(...collectRequiredMachines(row.input_good_id))
          riToolMap[row.recipe_id].push(...collectRequiredToolLevels(row.input_good_id))  // NEW
          if (collectRequiresWonderstone(row.input_good_id)) {
            riWonderstoneMap[row.recipe_id] = true
          }
        }
      }

      const riGroupMap: Record<number, number[][]> = {}
      const riMachineMap: Record<number, string[][]> = {}
      for (const [recipeId, groups] of Object.entries(riGroupTemp)) {
        riGroupMap[Number(recipeId)] = Object.values(groups)
        riMachineMap[Number(recipeId)] = Object.values(riMachineTemp[Number(recipeId)] ?? {})
      }

      // ── Step 6: Build entries ───────────────────────────────────────────────
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
        ingredient_required_tool_levels: riToolMap[r.id] ?? [],  // NEW
      }))

      setEntries([...items, ...processed, ...recipes])
      setLoading(false)
    }

    fetchAll()
  }, [])

  return { entries, loading }
}