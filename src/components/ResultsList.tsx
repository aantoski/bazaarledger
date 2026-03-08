import type { ListEntry } from '../hooks/useItems'

type Props = {
  entries: ListEntry[]
  selected: ListEntry | null
  onSelect: (e: ListEntry) => void
}

function typeToClass(type: string): string {
  return 'tag-' + type.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function ResultsList({ entries, selected, onSelect }: Props) {
  if (entries.length === 0) return <p className="empty">No results match your filters.</p>

  return (
    <ul className="results-list">
      {entries.map(e => (
        <li
          key={`${e.type}-${e.id}`}
          className={`result-item ${selected?.id === e.id && selected?.type === e.type ? 'selected' : ''}`}
          onClick={() => onSelect(e)}
        >
          <span className="result-name">{e.name}</span>
          <div className="result-meta">
            <span className={`tag ${typeToClass(e.type)}`}>{e.type}</span>
            <span className="result-price">{e.sell_price?.toLocaleString()}G</span>
          </div>
        </li>
      ))}
    </ul>
  )
}