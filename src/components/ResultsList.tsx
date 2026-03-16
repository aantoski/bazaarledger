import { useState } from 'react'
import type { ListEntry } from '../hooks/useItems'

type Props = {
  entries: ListEntry[]
  selected: ListEntry | null
  onSelect: (e: ListEntry) => void
}

type PriceMode = 'sell' | 'net' | 'per_day'

function typeToClass(type: string): string {
  return 'tag-' + type.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function formatValue(e: ListEntry, mode: PriceMode): string {
  if (mode === 'sell') return e.sell_price != null ? `${e.sell_price.toLocaleString()}G` : '—'
  if (mode === 'net') return e.net_profit != null ? `${e.net_profit.toLocaleString()}G` : '—'
  if (mode === 'per_day') return e.profit_per_day != null ? `${e.profit_per_day.toLocaleString()}G/day` : '—'
  return '—'
}

export default function ResultsList({ entries, selected, onSelect }: Props) {
  const [mode, setMode] = useState<PriceMode>('sell')
  

  if (entries.length === 0) return <p className="empty">No results match your filters.</p>

  return (
    <div className="results-container">
      <div className="results-toolbar">
        <div className="price-mode-toggle">
          {(['sell', 'net', 'per_day'] as PriceMode[]).map(m => (
            <button
              key={m}
              className={`mode-btn ${mode === m ? 'active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m === 'sell' ? 'Sell Price' : m === 'net' ? 'Net Profit' : 'Per Day'}
            </button>
          ))}
        </div>
        {mode === 'net' && (
          <span className="price-mode-note">* Based on raw ingredient buy prices, averaged across OR options</span>
        )}
        {mode === 'per_day' && (
          <span className="price-mode-note">* Recipes excluded (no cook time data)</span>
        )}
      </div>
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
              <span className="result-price">{formatValue(e, mode)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}