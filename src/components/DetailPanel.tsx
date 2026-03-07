import type { ListEntry } from '../hooks/useItems'

type Props = {
  selected: ListEntry | null
}

export default function DetailPanel({ selected }: Props) {
  if (!selected) {
    return (
      <div className="detail-welcome">
        <h2>BazaarLedger</h2>
        <p>Select an item from the list to see details.</p>
        <p className="detail-subtitle">Track profitability for Story of Seasons: Grand Bazaar</p>
      </div>
    )
  }

  return (
    <div className="detail-content">
      <h2>{selected.name}</h2>
      <div className="detail-tag-row">
        <span className={`tag tag-${selected.type.toLowerCase()}`}>{selected.type}</span>
        {selected.utensil && <span className="tag tag-utensil">{selected.utensil}</span>}
        {selected.machine_color && <span className="tag tag-windmill">{selected.machine_color} Windmill</span>}
        {selected.category && <span className="tag tag-category">{selected.category}</span>}
      </div>
      <div className="detail-price">
        <span className="price-label">Sell Price</span>
        <span className="price-value">{selected.sell_price?.toLocaleString()}G</span>
      </div>
      {selected.effect && (
        <div className="detail-field">
          <span className="field-label">Effect</span>
          <span className="field-value">{selected.effect}</span>
        </div>
      )}
    </div>
  )
}