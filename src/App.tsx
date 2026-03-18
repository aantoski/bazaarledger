import { useMemo, useState } from 'react'
import { useListEntries } from './hooks/useItems'
import { useItemSeasons } from './hooks/useSeasons'
import { useAnimals } from './hooks/useAnimals'
import FilterPanel from './components/FilterPanel'
import ResultsList from './components/ResultsList'
import DetailPanel from './components/DetailPanel'
import type { ListEntry } from './types/ListEntry'
import { usePantry } from './hooks/usePantry'

import './App.css'

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter']
const UTENSILS = ['Cooking Pot', 'Oven', 'Frying Pan']
const WINDMILLS = ['Red', 'Blue', 'Yellow']
const TYPES = ['Forageable', 'Processed', 'Recipe']  // CHANGED: grouped
const TEA_LEAF_IDS = new Set([92, 93, 94])

const FORAGEABLE_TYPES = new Set(['Forageable', 'Mushroom', 'Fish', 'Honey', 'Crop', 'Animal By-Product', 'Pantry'])

export type Filters = {
  seasons: string[]
  utensils: string[]
  windmills: string[]
  types: string[]
  wonderstone: boolean
  animals: number[]
  fishingRod: number
  hatchet: number
  mushroomLog: boolean
  beehive: boolean
  pantry: number[]
}

function App() {
  // const { entries, loading } = useListEntries()
  const { entries, loading, itemNameMap, goodNameMap, 
          recipeNameMap, chainMap, pgiDirectMap, goodMachineMap, 
          pgiRecipeChainMap, pgiGroupStructure, recipeEntryMap,
          itemBuyPriceMap} = useListEntries()
  const seasonMap = useItemSeasons()
  const { animals, animalProductMap } = useAnimals()
  const pantryVariants = usePantry()
  const [selected, setSelected] = useState<ListEntry | null>(null)
  const [filters, setFilters] = useState<Filters>({
    seasons: ['Spring'],
    utensils: [],
    windmills: [],
    types: [],
    wonderstone: false,
    animals: [],
    fishingRod: 1,
    hatchet: 1,
    mushroomLog: false,
    beehive: false,
    pantry: [],
  })

  const mushroomIds = useMemo(() =>
    new Set(entries.filter(e => e.type === 'Mushroom').map(e => e.id))
  , [entries])

  const beehiveIds = useMemo(() =>
    new Set(entries.filter(e => e.type === 'Honey').map(e => e.id))
  , [entries])

  function isItemInSeason(itemId: number, selectedSeasons: string[]): boolean {
    if (selectedSeasons.length === 0) return true
    // Special case: Tea Leaves can be converted via Yellow Windmill
    // If you have Yellow Windmill and any non-winter season is selected, all tea leaves are available
    if (TEA_LEAF_IDS.has(itemId) && filters.windmills.includes('Yellow')) {
      return selectedSeasons.some(s => s !== 'Winter')
    }
    const itemSeasons = seasonMap[itemId] ?? []
    if (itemSeasons.length === 0) return true
    return itemSeasons.some(s => selectedSeasons.includes(s))
  }

  function isGoodInSeason(goodId: number, visited = new Set<number>()): boolean {
    if (visited.has(goodId)) return true
    visited.add(goodId)

    const groups = pgiGroupStructure[goodId] ?? []
    if (groups.length === 0) return true

    return groups.every(group =>
      group.length === 0 || group.some(itemId => isItemInSeason(itemId, filters.seasons))
    )
  }

  function isRecipeInSeason(recipeId: number, visited = new Set<number>()): boolean {
    if (visited.has(recipeId)) return true
    visited.add(recipeId)

    const recipeEntry = entries.find(e => e.type === 'Recipe' && e.id === recipeId)
    if (!recipeEntry) return true

    const rGroups = recipeEntry.ingredient_groups ?? []
    const rGroupGoods = recipeEntry.ingredient_group_goods ?? []
    const rGroupRecipes = recipeEntry.ingredient_group_recipes ?? []

    return rGroups.every((rGroup, i) => {
      const rGoods = rGroupGoods[i] ?? []
      const rRecipes = rGroupRecipes[i] ?? []

      if (rGoods.length > 0) return rGoods.some(gid => isGoodInSeason(gid))
      if (rGroup.length > 0) return rGroup.some(id => isItemInSeason(id, filters.seasons))
      if (rRecipes.length > 0) return rRecipes.some(rid => isRecipeInSeason(rid, visited))
      return true
    })
  }

  const filtered = entries
    .filter(e => {
      // Type filter — map display groups to actual types
      if (filters.types.length > 0) {
        const matched =
          (filters.types.includes('Forageable') && FORAGEABLE_TYPES.has(e.type)) ||
          (filters.types.includes('Processed') && e.type === 'Processed') ||
          (filters.types.includes('Recipe') && e.type === 'Recipe')
        if (!matched) return false
      }

      // Wonderstone filter
      if (!filters.wonderstone && (e.requires_wonderstone || e.ingredient_requires_wonderstone)) return false

      // Utensil filter
      if (e.type === 'Recipe') {
        if (e.utensil && !filters.utensils.includes(e.utensil)) return false
      }

      // Windmill filter
      if (e.type === 'Processed') {
        if (e.machine_color && !filters.windmills.includes(e.machine_color)) return false
      }

      // Windmill chain filter
      // if (e.type === 'Processed' || e.type === 'Recipe') {
      //   const machineGroups = e.ingredient_required_machines ?? []
      //   const allSatisfied = machineGroups.every(group =>
      //     group.length === 0 || group.every(color => filters.windmills.includes(color))
      //   )
      //   if (!allSatisfied) return false
      // }

      if (e.type === 'Processed' || e.type === 'Recipe') {
        const machineOptions = e.ingredient_group_machine_options ?? []
        const allSatisfied = machineOptions.every(groupOptions => {
          if (groupOptions.length === 0) return true
          // at least one option in the group must be satisfiable
          return groupOptions.some(optionMachines =>
            // this option is satisfiable if it needs no machines, or all its machines are owned
            optionMachines.length === 0 || optionMachines.every(color => filters.windmills.includes(color))
          )
        })
        if (!allSatisfied) return false
      }

      // Season filter
      // if (filters.seasons.length > 0) {
      //   if (FORAGEABLE_TYPES.has(e.type)) {
      //     if (!isItemInSeason(e.id, filters.seasons)) return false
      //   }
      //   if (e.type === 'Processed' || e.type === 'Recipe') {
      //     const groups = e.ingredient_groups ?? []
      //     // const allGroupsInSeason = groups.every(group =>
      //     //   group.some(itemId => isItemInSeason(itemId, filters.seasons))
      //     // )
      //     const allGroupsInSeason = groups.every(group =>
      //       group.length === 0 || group.some(itemId => isItemInSeason(itemId, filters.seasons))
      //     )
      //     if (!allGroupsInSeason) return false
      //   }
      // }
      if (filters.seasons.length > 0) {
        if (FORAGEABLE_TYPES.has(e.type)) {
          if (!isItemInSeason(e.id, filters.seasons)) return false
        }
        if (e.type === 'Processed' || e.type === 'Recipe') {
          const groups = e.ingredient_groups ?? []
          const groupGoods = e.ingredient_group_goods ?? []

          const allGroupsInSeason = groups.every((group, i) => {
          const goods = groupGoods[i] ?? []
          const recipes = (e.type === 'Processed'
            ? (e.ingredient_group_recipe_inputs ?? [])
            : (e.ingredient_group_recipes ?? []))[i] ?? []

          if (goods.length > 0) return goods.some(gid => isGoodInSeason(gid))
          if (group.length > 0) return group.some(id => isItemInSeason(id, filters.seasons))
          if (recipes.length > 0) return recipes.some(rid => isRecipeInSeason(rid))
          return true
        })
        if (!allGroupsInSeason) return false

          // const allGroupsInSeason = groups.every((group, i) => {
          //   const goods = groupGoods[i] ?? []

          //   if (goods.length > 0) {
          //     // OR logic: at least one good option must be fully in season
          //     return goods.some(goodId => isGoodInSeason(goodId))
          //   }

          //   if (group.length > 0) {
          //     return group.some(itemId => isItemInSeason(itemId, filters.seasons))
          //   }

          //   return true
          // })
          // if (!allGroupsInSeason) return false
        }
      }

      // Mushroom log filter
      if (!filters.mushroomLog) {
        if (e.type === 'Mushroom') return false
        if (e.type === 'Processed' || e.type === 'Recipe') {
          const flat = (e.ingredient_groups ?? []).flat()
          if (flat.some(id => mushroomIds.has(id))) return false
        }
      }

      // Beehive filter
      if (!filters.beehive) {
        if (e.type === 'Honey') return false
        if (e.type === 'Processed' || e.type === 'Recipe') {
          const flat = (e.ingredient_groups ?? []).flat()
          if (flat.some(id => beehiveIds.has(id))) return false
        }
      }

      // Animal by-product filter
      if (e.type === 'Animal By-Product') {
        const producingAnimals = animalProductMap[e.id]
        if (producingAnimals?.length > 0 && !producingAnimals.some(id => filters.animals.includes(id))) return false
      }

      // Tool level filter — direct items
      if (e.type === 'Fish' || e.type === 'Forageable') {
        const reqs = e.ingredient_required_tool_levels ?? []
        for (const req of reqs) {
          const playerLevel = req.tool === 'Fishing Rod' ? filters.fishingRod : filters.hatchet
          if (playerLevel < req.min_level) return false
        }
      }

      // Tool chain filter — recipes/processed whose ingredients need tools
      if (e.type === 'Processed' || e.type === 'Recipe') {
        const reqs = e.ingredient_required_tool_levels ?? []
        for (const req of reqs) {
          const playerLevel = req.tool === 'Fishing Rod' ? filters.fishingRod : filters.hatchet
          if (playerLevel < req.min_level) return false
        }
      }

      // Animal ingredient filter
      if (e.type === 'Processed' || e.type === 'Recipe') {
        const groups = e.ingredient_groups ?? []
        const allGroupsSatisfied = groups.every(group => {
          if (group.length === 0) return true
          const animalItems = group.filter(itemId => animalProductMap[itemId]?.length > 0)
          if (animalItems.length === 0) return true
          return animalItems.some(itemId =>
            animalProductMap[itemId].some(animalId => filters.animals.includes(animalId))
          )
        })
        if (!allGroupsSatisfied) return false
      }

      // Pantry filter
      if (e.type === 'Recipe' || e.type === 'Processed') {
        const groups = e.ingredient_groups ?? []
        const allGroupsSatisfied = groups.every(group => {
          if (group.length === 0) return true
          const neededPantry = pantryVariants.filter(pv =>
            pv.raw_item_id !== null && group.includes(pv.raw_item_id)
          )
          if (neededPantry.length === 0) return true
          return neededPantry.every(pv => filters.pantry.includes(pv.id))
        })
        if (!allGroupsSatisfied) return false
      }

      return true
    })
    .sort((a, b) => (b.sell_price ?? 0) - (a.sell_price ?? 0))

  return (
    <div className="app-layout">
      <aside className="filter-panel">
        <h1 className="logo">BazaarLedger</h1>
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          seasons={SEASONS}
          utensils={UTENSILS}
          windmills={WINDMILLS}
          types={TYPES}
          animals={animals}
          pantryVariants={pantryVariants}
        />
      </aside>
      <main className="results-panel">
        {loading ? (
          <p className="loading">Loading...</p>
        ) : (
          <ResultsList entries={filtered} selected={selected} onSelect={setSelected} />
        )}
      </main>
      <aside className="detail-panel">
        <DetailPanel
          selected={selected}
          itemNameMap={itemNameMap}
          goodNameMap={goodNameMap}
          recipeNameMap={recipeNameMap}
          chainMap={chainMap}
          pgiDirectMap={pgiDirectMap}
          goodMachineMap={goodMachineMap}
          pgiRecipeChainMap={pgiRecipeChainMap}
          recipeEntryMap={recipeEntryMap}
          pantryVariants={pantryVariants}
          itemBuyPriceMap={itemBuyPriceMap}
        />
      </aside>
    </div>
  )
}

export default App