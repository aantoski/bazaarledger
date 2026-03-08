import { useState } from 'react'
import { useListEntries } from './hooks/useItems'
import { useItemSeasons } from './hooks/useSeasons'
import { useAnimals } from './hooks/useAnimals'
import FilterPanel from './components/FilterPanel'
import ResultsList from './components/ResultsList'
import DetailPanel from './components/DetailPanel'
import type { ListEntry } from './hooks/useItems'

import './App.css'

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter']
const UTENSILS = ['Cooking Pot', 'Oven', 'Frying Pan']
const WINDMILLS = ['Red', 'Blue', 'Yellow']
const TYPES = ['Forageable', 'Processed', 'Recipe']  // CHANGED: grouped

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
}

function App() {
  const { entries, loading } = useListEntries()
  const seasonMap = useItemSeasons()
  const { animals, animalProductMap } = useAnimals()
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
  })

  function isItemInSeason(itemId: number, selectedSeasons: string[]): boolean {
    if (selectedSeasons.length === 0) return true
    const itemSeasons = seasonMap[itemId] ?? []
    if (itemSeasons.length === 0) return true
    return itemSeasons.some(s => selectedSeasons.includes(s))
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
      if (e.type === 'Processed' || e.type === 'Recipe') {
        const machineGroups = e.ingredient_required_machines ?? []
        const allSatisfied = machineGroups.every(group =>
          group.length === 0 || group.every(color => filters.windmills.includes(color))
        )
        if (!allSatisfied) return false
      }

      // Season filter
      if (filters.seasons.length > 0) {
        if (FORAGEABLE_TYPES.has(e.type)) {
          if (!isItemInSeason(e.id, filters.seasons)) return false
        }
        if (e.type === 'Processed' || e.type === 'Recipe') {
          const groups = e.ingredient_groups ?? []
          const allGroupsInSeason = groups.every(group =>
            group.some(itemId => isItemInSeason(itemId, filters.seasons))
          )
          if (!allGroupsInSeason) return false
        }
      }

      // Mushroom log filter
      if (!filters.mushroomLog && e.type === 'Mushroom') return false

      // Beehive filter
      if (!filters.beehive && e.type === 'Honey') return false

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
          const animalItems = group.filter(itemId => animalProductMap[itemId]?.length > 0)
          if (animalItems.length === 0) return true
          return animalItems.some(itemId =>
            animalProductMap[itemId].some(animalId => filters.animals.includes(animalId))
          )
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
        <DetailPanel selected={selected} />
      </aside>
    </div>
  )
}

export default App