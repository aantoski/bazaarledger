import { useState } from 'react'
import { useListEntries } from './hooks/useItems'
import { useItemSeasons } from './hooks/useSeasons'
import { useAnimals } from './hooks/useAnimals'
import FilterPanel from './components/FilterPanel'
import ResultsList from './components/ResultsList'
import DetailPanel from './components/DetailPanel'
import type { ListEntry } from './hooks/useItems'
import { useToolRequirements } from './hooks/useToolRequirements'

import './App.css'

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter']
const UTENSILS = ['Cooking Pot', 'Oven', 'Frying Pan']
const WINDMILLS = ['Red', 'Blue', 'Yellow']
const TYPES = ['Crop', 'Processed', 'Recipe']

export type Filters = {
  seasons: string[]
  utensils: string[]
  windmills: string[]
  types: string[]
  wonderstone: boolean
  animals: number[]
  fishingRod: number  // 0 = none, 1-5 = level
  hatchet: number
}

function App() {
  const { entries, loading } = useListEntries()
  const seasonMap = useItemSeasons()
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
  })

  const { animals, animalProductMap } = useAnimals()
  const toolReqMap = useToolRequirements()

  function isItemInSeason(itemId: number, selectedSeasons: string[]): boolean {
    if (selectedSeasons.length === 0) return true
    const itemSeasons = seasonMap[itemId] ?? []
    if (itemSeasons.length === 0) return true // year-round
    return itemSeasons.some(s => selectedSeasons.includes(s))
  }

  const filtered = entries
    .filter(e => {
      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(e.type)) return false

      // Wonderstone filter — hide if item or any ingredient requires wonderstone
      if (!filters.wonderstone && (e.requires_wonderstone || e.ingredient_requires_wonderstone)) return false

      // Utensil filter — hide recipes that need a utensil you don't have
      if (e.type === 'Recipe') {
        if (e.utensil && !filters.utensils.includes(e.utensil)) return false
      }

      // Windmill filter — hide processed goods from windmills you don't have
      if (e.type === 'Processed') {
        if (!e.machine_color) {
          // no windmill needed — always show
        } else if (!filters.windmills.includes(e.machine_color ?? '')) {
          return false
        }
      }

      // Windmill chain filter — hide processed goods if their inputs need windmills you don't have
      if (e.type === 'Processed') {
        const machineGroups = e.ingredient_required_machines ?? []
        const allMachineGroupsSatisfied = machineGroups.every(group => {
          if (group.length === 0) return true
          return group.every(color => filters.windmills.includes(color))
        })
        if (!allMachineGroupsSatisfied) return false
      }

      // Windmill chain filter — hide recipes if their processed ingredients need windmills you don't have
      if (e.type === 'Recipe') {
        const machineGroups = e.ingredient_required_machines ?? []
        const allMachineGroupsSatisfied = machineGroups.every(group => {
          if (group.length === 0) return true
          return group.every(color => filters.windmills.includes(color))
        })
        if (!allMachineGroupsSatisfied) return false
      }

      // Season filter
      if (filters.seasons.length > 0) {
        if (e.type === 'Crop') {
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

      // Animal filter — every group must have at least one option you can produce
      if (e.type === 'Processed' || e.type === 'Recipe') {
        const groups = e.ingredient_groups ?? []
        const allGroupsSatisfied = groups.every(group => {
          // if no item in the group is an animal product, group is always satisfied
          const animalItems = group.filter(itemId => animalProductMap[itemId]?.length > 0)
          if (animalItems.length === 0) return true
          // at least one option in the group must be producible with your animals
          return animalItems.some(itemId =>
            animalProductMap[itemId].some(animalId => filters.animals.includes(animalId))
          )
        })
        if (!allGroupsSatisfied) return false
      }

      // Tool filter — hide items that require a higher tool level than you have
      if (e.type === 'Crop') {
        const reqs = toolReqMap[e.id] ?? []
        for (const req of reqs) {
          const playerLevel = req.tool === 'Fishing Rod' ? filters.fishingRod : filters.hatchet
          if (playerLevel < req.min_level) return false
        }
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