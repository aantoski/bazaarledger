import type { ListEntry } from '../hooks/useItems'
import type { PantryVariant } from '../hooks/usePantry'

type Props = {
  selected: ListEntry | null
  itemNameMap: Record<number, string>
  goodNameMap: Record<number, string>
  recipeNameMap: Record<number, string>
  chainMap: Record<number, number[]>
  pgiDirectMap: Record<number, number[]>
  goodMachineMap: Record<number, string | null>
  pgiRecipeChainMap: Record<number, number[]>
  recipeEntryMap: Record<number, ListEntry>
  pantryVariants: PantryVariant[]
  itemBuyPriceMap: Record<number, number | null>
}

function PriceTiers({ base }: { base: number }) {
  return (
    <div className="price-tiers">
      <div className="price-tier">
        <span className="tier-label">Base</span>
        <span className="tier-value">{base.toLocaleString()}G</span>
      </div>
      <div className="price-tier">
        <span className="tier-label">5-star</span>
        <span className="tier-value">{Math.floor(base * 1.6).toLocaleString()}G</span>
      </div>
      <div className="price-tier">
        <span className="tier-label">7-star</span>
        <span className="tier-value">{Math.floor(base * 3).toLocaleString()}G</span>
      </div>
    </div>
  )
}

function ProductionTime({ entry }: { entry: ListEntry }) {
  if (['Forageable', 'Fish', 'Animal By-Product'].includes(entry.type)) return null
  const { type, processing_time, critical_path_days, days_to_grow, crop_yield, profit_per_day } = entry

  if (type === 'Recipe') return null

  return (
    <div className="detail-field">
      <span className="field-label">Production Time</span>
      <div className="production-time">
        {type === 'Processed' && (
          <>
            {critical_path_days != null && critical_path_days > 0 && (
              <div className="production-row">
                <span className="production-label">Critical Path</span>
                <span className="production-value">~{critical_path_days.toFixed(1)} days</span>
              </div>
            )}
            {processing_time != null && (
              <div className="production-row">
                <span className="production-label">Processing</span>
                <span className="production-value">{processing_time}h</span>
              </div>
            )}
            {profit_per_day != null && (
              <div className="production-row">
                <span className="production-label">Profit / Day</span>
                <span className="production-value profit-highlight">{profit_per_day.toLocaleString()}G</span>
              </div>
            )}
          </>
        )}
        {type !== 'Processed' && days_to_grow != null && (
          <>
            <div className="production-row">
              <span className="production-label">Growth</span>
              <span className="production-value">
                {days_to_grow} days
                {crop_yield != null && crop_yield > 1 && (
                  <span className="yield-note"> (yield ×{crop_yield})</span>
                )}
              </span>
            </div>
            {profit_per_day != null && (
              <div className="production-row">
                <span className="production-label">Profit/Day</span>
                <span className="production-value profit-highlight">{profit_per_day.toLocaleString()}G</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// type PantryObtainProps = {
//   entry: ListEntry
//   pantryVariants: PantryVariant[]
//   itemNameMap: Record<number, string>
//   itemBuyPriceMap: Record<number, number | null>
//   goodNameMap: Record<number, string>
//   goodMachineMap: Record<number, string | null>
// }

function PantryObtain({ entry }: { entry: ListEntry }) {
  const buyPrice = entry.purchasable?.buy_price ?? entry.buy_price
  const whereToBy = entry.purchasable?.where_to_buy
  const profit = entry.sell_price != null && buyPrice != null
    ? entry.sell_price - buyPrice
    : null

  return (
    <div className="detail-field">
      <span className="field-label">How to Obtain</span>
      <div className="pantry-obtain">
        <div className="pantry-path">
          <div className="pantry-path-header">
            <span className="pantry-option-label">Buy Directly</span>
          </div>
          <div className="pantry-path-body">
            {whereToBy && (
              <div className="pantry-row">
                <span className="pantry-label">Where</span>
                <span className="pantry-value">{whereToBy}</span>
              </div>
            )}
            <div className="pantry-row">
              <span className="pantry-label">Cost</span>
              <span className="pantry-value">{buyPrice?.toLocaleString() ?? '?'}G</span>
            </div>
            <div className="pantry-row">
              <span className="pantry-label">Profit</span>
              <span className={`pantry-value ${profit != null && profit < 0 ? 'profit-negative' : 'profit-highlight'}`}>
                {profit != null ? `${profit > 0 ? '+' : ''}${profit.toLocaleString()}G` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProcessedPantryObtain({
  entry, pantryVariants, itemNameMap, itemBuyPriceMap
}: {
  entry: ListEntry
  pantryVariants: PantryVariant[]
  itemNameMap: Record<number, string>
  itemBuyPriceMap: Record<number, number | null>
}) {
  const variant = pantryVariants.find(v => v.processed_good_id === entry.id)
  // if (!variant) return null

  const rawName = variant?.raw_item_id ? itemNameMap[variant.raw_item_id] : null
  const rawBuyPrice = variant?.raw_item_id ? itemBuyPriceMap[variant.raw_item_id] : null
  const craftProfit = entry.sell_price != null && rawBuyPrice != null
    ? entry.sell_price - rawBuyPrice : null

  const directBuy = entry.purchasable
  const directProfit = entry.sell_price != null && directBuy != null
    ? entry.sell_price - directBuy.buy_price : null

  return (
    <div className="detail-field">
      <span className="field-label">How to Obtain</span>
      <div className="pantry-obtain">
        {/* Craft path */}
        {rawName && (
          <div className="pantry-path">
            <div className="pantry-path-header">
              <span className="pantry-option-label">Craft</span>
            </div>
            <div className="pantry-path-body">
              <div className="pantry-row">
                <span className="pantry-label">Raw Ingredient</span>
                <span className="pantry-value">{rawName} — {rawBuyPrice?.toLocaleString() ?? '?'}G</span>
              </div>
              {entry.machine_color && (
                <div className="pantry-row">
                  <span className="pantry-label">Process With</span>
                  <span className="pantry-value">
                    {entry.machine_color} Windmill
                    {entry.processing_time != null && ` (${entry.processing_time}h)`}
                  </span>
                </div>
              )}
              {entry.critical_path_days != null && (
                <div className="pantry-row">
                  <span className="pantry-label">Critical Path</span>
                  <span className="pantry-value">~{entry.critical_path_days.toFixed(1)} days</span>
                </div>
              )}
              <div className="pantry-row">
                <span className="pantry-label">Profit</span>
                <span className={`pantry-value ${craftProfit != null && craftProfit < 0 ? 'profit-negative' : 'profit-highlight'}`}>
                  {craftProfit != null ? `${craftProfit > 0 ? '+' : ''}${craftProfit.toLocaleString()}G` : '—'}
                </span>
              </div>
            </div>
          </div>
        )}
        {/* Direct buy path */}
        {directBuy && (
          <div className="pantry-path">
            <div className="pantry-path-header">
              <span className="pantry-option-label">Buy Directly</span>
            </div>
            <div className="pantry-path-body">
              {directBuy.where_to_buy && (
                <div className="pantry-row">
                  <span className="pantry-label">Where</span>
                  <span className="pantry-value">{directBuy.where_to_buy}</span>
                </div>
              )}
              <div className="pantry-row">
                <span className="pantry-label">Cost</span>
                <span className="pantry-value">{directBuy.buy_price.toLocaleString()}G</span>
              </div>
              <div className="pantry-row">
                <span className="pantry-label">Profit</span>
                <span className={`pantry-value ${directProfit != null && directProfit < 0 ? 'profit-negative' : 'profit-highlight'}`}>
                  {directProfit != null ? `${directProfit > 0 ? '+' : ''}${directProfit.toLocaleString()}G` : '—'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function typeToClass(type: string): string {
  return 'tag-' + type.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function OrList({ names }: { names: string[] }) {
  return (
    <>
      {names.map((name, idx) => (
        <span key={idx}>
          {name}
          {idx < names.length - 1 && <em className="or-divider"> or </em>}
        </span>
      ))}
    </>
  )
}

// ── Shared maps type passed down through trees ──────────────────────────────
type TreeMaps = {
  itemNameMap: Record<number, string>
  goodNameMap: Record<number, string>
  recipeNameMap: Record<number, string>
  chainMap: Record<number, number[]>
  pgiDirectMap: Record<number, number[]>
  goodMachineMap: Record<number, string | null>
  pgiRecipeChainMap: Record<number, number[]>
  recipeEntryMap: Record<number, ListEntry>
}

// ── GoodTree: recursively renders a processed good and all its ingredients ──
type GoodTreeProps = TreeMaps & {
  goodId: number
  showName?: boolean
  depth?: number
  visitedGoods?: Set<number>
}

function GoodTree({
  goodId, showName = true, depth = 0, visitedGoods = new Set(),
  itemNameMap, goodNameMap, recipeNameMap,
  chainMap, pgiDirectMap, goodMachineMap, pgiRecipeChainMap, recipeEntryMap,
}: GoodTreeProps) {
  if (visitedGoods.has(goodId)) return null
  const newVisited = new Set(visitedGoods)
  newVisited.add(goodId)

  const maps: TreeMaps = {
    itemNameMap, goodNameMap, recipeNameMap,
    chainMap, pgiDirectMap, goodMachineMap, pgiRecipeChainMap, recipeEntryMap,
  }

  const name = goodNameMap[goodId] ?? `Good #${goodId}`
  const machine = goodMachineMap[goodId]
  const directItems = pgiDirectMap[goodId] ?? []
  const inputGoods = chainMap[goodId] ?? []
  const inputRecipes = pgiRecipeChainMap[goodId] ?? []

  if (directItems.length === 0 && inputGoods.length === 0 && inputRecipes.length === 0) return null

  const childIndent = { marginLeft: showName ? 12 : 0 }

  return (
    <div className="good-tree" style={{ marginLeft: depth * 12 }}>
      {showName && (
        <div className="ingredient-row">
          <span className="tree-arrow">↳</span>
          <span className="ingredient-name">{name}</span>
          {machine && <span className={`tag tag-windmill tag-windmill-${machine.toLowerCase()}`}>{machine}</span>}
        </div>
      )}
      {/* Direct raw items */}
      {directItems.map(itemId => (
        <div key={itemId} className="ingredient-row" style={childIndent}>
          <span className="tree-arrow">↳</span>
          <span className="ingredient-name">{itemNameMap[itemId] ?? `Item #${itemId}`}</span>
          {!showName && machine && <span className={`tag tag-windmill tag-windmill-${machine.toLowerCase()}`}>{machine}</span>}
        </div>
      ))}
      {/* Recipe inputs (e.g. Black Tea in Tea Perfume) */}
      {inputRecipes.map(recipeId => (
        <RecipeTree
          key={recipeId}
          recipeId={recipeId}
          depth={0}
          style={childIndent}
          visitedGoods={newVisited}
          {...maps}
        />
      ))}
      {/* Chained processed goods */}
      {inputGoods.map(inputGoodId => (
        <GoodTree
          key={inputGoodId}
          goodId={inputGoodId}
          showName={true}
          depth={depth + 1}
          visitedGoods={newVisited}
          {...maps}
        />
      ))}
    </div>
  )
}

// ── RecipeTree: recursively renders a recipe and all its ingredients ─────────
type RecipeTreeProps = TreeMaps & {
  recipeId: number
  showBullet?: boolean
  depth?: number
  style?: React.CSSProperties
  visitedGoods?: Set<number>
  visitedRecipes?: Set<number>
}

function RecipeTree({
  recipeId, showBullet, depth = 0, style, visitedGoods = new Set(), visitedRecipes = new Set(),
  itemNameMap, goodNameMap, recipeNameMap,
  chainMap, pgiDirectMap, goodMachineMap, pgiRecipeChainMap, recipeEntryMap,
}: RecipeTreeProps) {
  if (visitedRecipes.has(recipeId)) return null
  const newVisitedRecipes = new Set(visitedRecipes)
  newVisitedRecipes.add(recipeId)

  const maps: TreeMaps = {
    itemNameMap, goodNameMap, recipeNameMap,
    chainMap, pgiDirectMap, goodMachineMap, pgiRecipeChainMap, recipeEntryMap,
  }

  const name = recipeNameMap[recipeId] ?? `Recipe #${recipeId}`
  const entry = recipeEntryMap[recipeId]

  return (
    <div className="recipe-tree" style={{ marginLeft: depth * 12, ...style }}>
      <div className="ingredient-row">
          <span className={showBullet ? 'tree-bullet' : 'tree-arrow'}>
            {showBullet ? '•' : '↳'}
          </span>
        <span className="ingredient-name">{name}</span>
        <span className="tag tag-recipe">Recipe</span>
      </div>
      {entry && (
        <div style={{ marginLeft: 12 }}>
          {(entry.ingredient_groups ?? []).map((group, i) => {
            const directItems = entry.ingredient_direct_items?.[i] ?? []
            const goods = entry.ingredient_group_goods?.[i] ?? []
            const recipes = entry.ingredient_group_recipes?.[i] ?? []
            const fallback = entry.ingredient_group_labels?.[i + 1]

            // Direct raw items
            if (goods.length === 0 && recipes.length === 0 && directItems.length > 0) {
              const names = [...new Set(directItems.map(id => itemNameMap[id]).filter(Boolean))] as string[]
              return (
                <div key={i} className="ingredient-row">
                  <span className="tree-arrow">↳</span>
                  <span className="ingredient-name"><OrList names={names} /></span>
                </div>
              )
            }

            // Processed goods
            if (goods.length > 0) {
              return (
                <div key={i} className="ingredient-block">
                  {directItems.length > 0 && (
                    <div className="ingredient-row">
                      <span className="tree-arrow">↳</span>
                      <span className="ingredient-name">
                        <OrList names={directItems.map(id => itemNameMap[id] ?? `Item #${id}`)} />
                      </span>
                    </div>
                  )}
                  {goods.map(goodId => (
                    <GoodTree
                      key={goodId}
                      goodId={goodId}
                      showName={true}
                      depth={0}
                      visitedGoods={visitedGoods}
                      {...maps}
                    />
                  ))}
                </div>
              )
            }

            // Nested recipes
            if (recipes.length > 0) {
              return (
                <div key={i} className="ingredient-block">
                  {recipes.map(rid => (
                    <RecipeTree
                      key={rid}
                      recipeId={rid}
                      depth={0}
                      visitedGoods={visitedGoods}
                      visitedRecipes={newVisitedRecipes}
                      {...maps}
                    />
                  ))}
                </div>
              )
            }

            // Fallback label
            if (fallback) {
              return (
                <div key={i} className="ingredient-row">
                  <span className="tree-arrow">↳</span>
                  <span className="ingredient-name">{fallback}</span>
                </div>
              )
            }

            return null
          })}
        </div>
      )}
    </div>
  )
}

// ── IngredientTree: top-level ingredient renderer ───────────────────────────
type IngredientTreeProps = TreeMaps & {
  selected: ListEntry
}

function IngredientTree({ selected, ...maps }: IngredientTreeProps) {
  const groups = selected.ingredient_groups ?? []
  if (groups.length === 0) return null

  const isProcessed = selected.type === 'Processed'

  return (
    <div className="detail-field">
      <span className="field-label">Ingredients</span>
      <div className="ingredient-groups">
        {groups.map((group, i) => {
          const directItems = selected.ingredient_direct_items?.[i] ?? []
          const goods = selected.ingredient_group_goods?.[i] ?? []
          const recipes = isProcessed
            ? (selected.ingredient_group_recipe_inputs?.[i] ?? [])
            : (selected.ingredient_group_recipes?.[i] ?? [])
          const fallback = selected.ingredient_group_labels?.[i + 1]

          // ── Pure direct items ──────────────────────────────────────────
          if (goods.length === 0 && recipes.length === 0 && directItems.length > 0) {
            const names = [...new Set(directItems.map(id => maps.itemNameMap[id]).filter(Boolean))] as string[]
            return (
              <div key={i} className="ingredient-row">
                <span className="tree-bullet">•</span>
                <span className="ingredient-name"><OrList names={names} /></span>
              </div>
            )
          }

          // ── Processed goods ────────────────────────────────────────────
          if (goods.length > 0) {
            const goodNames = goods.map(gid => maps.goodNameMap[gid] ?? `Good #${gid}`)
            const directNames = directItems.map(id => maps.itemNameMap[id] ?? `Item #${id}`)
            const allNames = [...directNames, ...goodNames]

            return (
              <div key={i} className="ingredient-block">
                <div className="ingredient-row">
                  <span className="tree-bullet">•</span>
                  <span className="ingredient-name"><OrList names={allNames} /></span>
                </div>
                <div className="ingredient-chain">
                  {goods.map(goodId => (
                    <GoodTree
                      key={goodId}
                      goodId={goodId}
                      showName={goods.length > 1}
                      depth={0}
                      visitedGoods={new Set()}
                      {...maps}
                    />
                  ))}
                </div>
              </div>
            )
          }

          // ── Recipe ingredients ─────────────────────────────────────────
          if (recipes.length > 0) {
            const multipleOptions = recipes.length > 1
            // const recipeNames = recipes.map(rid => maps.recipeNameMap[rid] ?? `Recipe #${rid}`)
            // const allNames = [...directItems.map(id => maps.itemNameMap[id] ?? `Item #${id}`), ...recipeNames]

            return (
               <div key={i} className="ingredient-block">
                {multipleOptions && (
                  <div className="ingredient-row">
                    <span className="tree-bullet">•</span>
                    <span className="ingredient-name">
                      <OrList names={recipes.map(rid => maps.recipeNameMap[rid] ?? `Recipe #${rid}`)} />
                    </span>
                  </div>
                )}
                <div className={multipleOptions ? 'ingredient-chain' : ''}>
                  {recipes.map(rid => (
                    <RecipeTree
                      key={rid}
                      recipeId={rid}
                      showBullet={!multipleOptions}
                      depth={0}
                      visitedGoods={new Set()}
                      visitedRecipes={new Set()}
                      {...maps}
                    />
                  ))}
                </div>
              </div>
            )
          }

          // ── Fallback label ─────────────────────────────────────────────
          if (fallback) {
            return (
              <div key={i} className="ingredient-row">
                <span className="tree-bullet">•</span>
                <span className="ingredient-name">{fallback}</span>
              </div>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}

// ── DetailPanel ──────────────────────────────────────────────────────────────
export default function DetailPanel({
  selected,
  itemNameMap, goodNameMap, recipeNameMap,
  chainMap, pgiDirectMap, goodMachineMap,
  pgiRecipeChainMap, recipeEntryMap,
  pantryVariants, itemBuyPriceMap
}: Props) {
  if (!selected) {
    return (
      <div className="detail-welcome">
        <h2>BazaarLedger</h2>
        <p>Select an item from the list to see details.</p>
        <p className="detail-subtitle">Track profitability for Story of Seasons: Grand Bazaar</p>
      </div>
    )
  }

  const maps: TreeMaps = {
    itemNameMap, goodNameMap, recipeNameMap,
    chainMap, pgiDirectMap, goodMachineMap,
    pgiRecipeChainMap, recipeEntryMap,
  }

  const hasIngredients = (selected.ingredient_groups?.length ?? 0) > 0

  return (
    <div className="detail-content">
      <h2>{selected.name}</h2>

      <div className="detail-tag-row">
        <span className={`tag ${typeToClass(selected.type)}`}>{selected.type}</span>
        {selected.utensil && <span className="tag tag-utensil">{selected.utensil}</span>}
        {selected.machine_color && (
          <span className={`tag tag-windmill tag-windmill-${selected.machine_color.toLowerCase()}`}>
            {selected.machine_color} Windmill
          </span>
        )}
        {selected.category && <span className="tag tag-category">{selected.category}</span>}
      </div>

      {selected.sell_price != null && <PriceTiers base={selected.sell_price} />}
      
{selected.type === 'Pantry' && (
  <PantryObtain entry={selected} />
)}
{selected.type === 'Processed' && selected.purchasable && (
  <ProcessedPantryObtain
    entry={selected}
    pantryVariants={pantryVariants}
    itemNameMap={itemNameMap}
    itemBuyPriceMap={itemBuyPriceMap}
  />
)}
      <ProductionTime entry={selected} />

      {hasIngredients && <IngredientTree selected={selected} {...maps} />}

      {selected.effect && (
        <div className="detail-field">
          <span className="field-label">Effect</span>
          <span className="field-value">{selected.effect}</span>
        </div>
      )}

      {selected.where_to_get && (
        <div className="detail-field">
          <span className="field-label">Where to Get</span>
          <span className="field-value">{selected.where_to_get}</span>
        </div>
      )}
    </div>
  )
}