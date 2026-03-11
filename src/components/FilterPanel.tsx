import type { Filters } from '../App'
import type { Animal } from '../hooks/useAnimals'
import type { PantryVariant } from '../hooks/usePantry'

type Props = {
  filters: Filters
  setFilters: (f: Filters) => void
  seasons: string[]
  utensils: string[]
  windmills: string[]
  types: string[]
  animals: Animal[]
  pantryVariants: PantryVariant[]
}

function ToggleGroup({
  label, options, active, onToggle
}: {
  label: string
  options: string[]
  active: string[]
  onToggle: (val: string) => void
}) {
  return (
    <div className="filter-group">
      <h3>{label}</h3>
      <div className="toggle-buttons">
        {options.map(opt => (
          <button
            key={opt}
            className={`toggle-btn ${active.includes(opt) ? 'active' : ''}`}
            onClick={() => onToggle(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FilterPanel({ filters, setFilters, seasons, utensils, windmills, types, animals, pantryVariants }: Props) {
  function toggle(key: keyof Pick<Filters, 'seasons' | 'utensils' | 'windmills' | 'types'>, val: string) {
    const current = filters[key]
    setFilters({
      ...filters,
      [key]: current.includes(val) ? current.filter(v => v !== val) : [...current, val]
    })
  }

  function toggleAnimal(id: number) {
    const current = filters.animals
    setFilters({
      ...filters,
      animals: current.includes(id) ? current.filter(a => a !== id) : [...current, id]
    })
  }

  function togglePantry(id: number) {
    const current = filters.pantry
    setFilters({
      ...filters,
      pantry: current.includes(id) ? current.filter(p => p !== id) : [...current, id]
    })
  }

  function clearAll() {
  setFilters({
    seasons: ['Spring'], utensils: [], windmills: [],
    types: [], wonderstone: false, animals: [], fishingRod: 0,
    hatchet: 0, mushroomLog: false, beehive: false, pantry: []
  })
}

const hasFilters = filters.seasons.length > 0 || filters.utensils.length > 0 ||
  filters.windmills.length > 0 || filters.types.length > 0 ||
  filters.wonderstone || filters.animals.length > 0 ||
  filters.fishingRod > 0 || filters.hatchet > 0 ||
  filters.mushroomLog || filters.beehive || filters.pantry.length > 0

  return (
    <div className="filter-panel-inner">
      <ToggleGroup label="Season" options={seasons} active={filters.seasons} onToggle={v => toggle('seasons', v)} />
      <ToggleGroup label="Type" options={types} active={filters.types} onToggle={v => toggle('types', v)} />
      <ToggleGroup label="Utensils Obtained" options={utensils} active={filters.utensils} onToggle={v => toggle('utensils', v)} />
      <ToggleGroup label="Windmills Obtained" options={windmills} active={filters.windmills} onToggle={v => toggle('windmills', v)} />

      <div className="filter-group">
        <h3>Options</h3>
        <div className="toggle-buttons">
          <button
            className={`toggle-btn ${filters.wonderstone ? 'active' : ''}`}
            onClick={() => setFilters({ ...filters, wonderstone: !filters.wonderstone })}
          >
            ✦ Wonderstone
          </button>
        </div>
      </div>

      <div className="filter-group">
        <h3>Farm Structures</h3>
        <div className="toggle-buttons">
          <button
            className={`toggle-btn ${filters.mushroomLog ? 'active' : ''}`}
            onClick={() => setFilters({ ...filters, mushroomLog: !filters.mushroomLog })}
          >
            Mushroom Log
          </button>
          <button
            className={`toggle-btn ${filters.beehive ? 'active' : ''}`}
            onClick={() => setFilters({ ...filters, beehive: !filters.beehive })}
          >
            Beehive
          </button>
        </div>
      </div>

      <div className="filter-group">
        <h3>Pantry</h3>
        <div className="toggle-buttons">
          {pantryVariants.map(pv => (
            <button
              key={pv.id}
              className={`toggle-btn ${filters.pantry.includes(pv.id) ? 'active' : ''}`}
              onClick={() => togglePantry(pv.id)}
            >
              {pv.display_name}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <h3>Animals On Farm</h3>
        <div className="toggle-buttons">
          {animals.map(animal => (
            <button
              key={animal.id}
              className={`toggle-btn ${filters.animals.includes(animal.id) ? 'active' : ''}`}
              onClick={() => toggleAnimal(animal.id)}
            >
              {animal.name}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <h3>Fishing Rod Level</h3>
        <div className="toggle-buttons">
          {[1,2,3,4,5].map(level => (
            <button
              key={level}
              className={`toggle-btn ${filters.fishingRod === level ? 'active' : ''}`}
              onClick={() => setFilters({ ...filters, fishingRod: level })}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <h3>Hatchet Level</h3>
        <div className="toggle-buttons">
          {[1,2,3,4,5].map(level => (
            <button
              key={level}
              className={`toggle-btn ${filters.hatchet === level ? 'active' : ''}`}
              onClick={() => setFilters({ ...filters, hatchet: level })}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <button className="clear-btn" onClick={clearAll}>Clear all</button>
      )}
    </div>
  )
}