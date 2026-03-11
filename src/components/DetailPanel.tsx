import type { ListEntry } from '../hooks/useItems'

type Props = {
  selected: ListEntry | null
  itemNameMap: Record<number, string>
  goodNameMap: Record<number, string>
  recipeNameMap: Record<number, string>
  chainMap: Record<number, number[]>
  pgiDirectMap: Record<number, number[]>
  goodMachineMap: Record<number, string | null>
  pgiRecipeChainMap: Record<number, number[]>
}

function PriceTiers({ base }: { base: number }) {
  return (
    <div className="price-tiers">
      <div className="price-tier">
        <span className="tier-label">Base</span>
        <span className="tier-value">{base.toLocaleString()}G</span>
      </div>
      <div className="price-tier">
        <span className="tier-label">★★★★★</span>
        <span className="tier-value">{Math.floor(base * 1.6).toLocaleString()}G</span>
      </div>
      <div className="price-tier">
        <span className="tier-label">★★★★★★★</span>
        <span className="tier-value">{Math.floor(base * 3).toLocaleString()}G</span>
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

type GoodTreeProps = {
  goodId: number
  showName?: boolean
  depth?: number
  visited?: Set<number>
  itemNameMap: Record<number, string>
  goodNameMap: Record<number, string>
  recipeNameMap: Record<number, string>
  chainMap: Record<number, number[]>
  pgiDirectMap: Record<number, number[]>
  goodMachineMap: Record<number, string | null>
  pgiRecipeChainMap: Record<number, number[]>
}

function GoodTree({
  goodId,
  showName = true,
  depth = 0,
  visited = new Set<number>(),
  itemNameMap,
  goodNameMap,
  recipeNameMap,
  chainMap,
  pgiDirectMap,
  goodMachineMap,
  pgiRecipeChainMap,
}: GoodTreeProps) {
  if (visited.has(goodId)) return null
  const newVisited = new Set(visited)
  newVisited.add(goodId)

  const name = goodNameMap[goodId] ?? `Good #${goodId}`
  const machine = goodMachineMap[goodId]
  const directItems = pgiDirectMap[goodId] ?? []
  const inputGoods = chainMap[goodId] ?? []
  const inputRecipes = pgiRecipeChainMap[goodId] ?? []

  if (directItems.length === 0 && inputGoods.length === 0 && inputRecipes.length === 0) return null

  const indent = { marginLeft: depth * 12 }
  const childIndent = { marginLeft: showName ? 12 : 0 }

  return (
    <div className="good-tree" style={indent}>
      {showName && (
        <div className="good-tree-header">
          <span className="tree-arrow">↳</span>
          <span className="ingredient-name">{name}</span>
          {machine && <span className="tag tag-windmill">{machine}</span>}
        </div>
      )}
      {directItems.map(itemId => (
        <div key={itemId} className="good-tree-item" style={childIndent}>
          <span className="tree-arrow">↳</span>
          <span className="ingredient-name">{itemNameMap[itemId] ?? `Item #${itemId}`}</span>
          {!showName && machine && <span className="tag tag-windmill">{machine}</span>}
        </div>
      ))}
      {inputRecipes.map(recipeId => (
        <div key={recipeId} className="good-tree-item" style={childIndent}>
          <span className="tree-arrow">↳</span>
          <span className="ingredient-name">{recipeNameMap[recipeId] ?? `Recipe #${recipeId}`}</span>
          <span className="tag tag-recipe">Recipe</span>
        </div>
      ))}
      {inputGoods.map(inputGoodId => (
        <GoodTree
          key={inputGoodId}
          goodId={inputGoodId}
          showName={true}
          depth={depth + 1}
          visited={newVisited}
          itemNameMap={itemNameMap}
          goodNameMap={goodNameMap}
          recipeNameMap={recipeNameMap}
          chainMap={chainMap}
          pgiDirectMap={pgiDirectMap}
          goodMachineMap={goodMachineMap}
          pgiRecipeChainMap={pgiRecipeChainMap}
        />
      ))}
    </div>
  )
}

type IngredientTreeProps = {
  groups: number[][]
  groupGoods: number[][]
  groupRecipes: number[][]
  groupLabels: Record<number, string | null> | undefined
  itemNameMap: Record<number, string>
  goodNameMap: Record<number, string>
  recipeNameMap: Record<number, string>
  chainMap: Record<number, number[]>
  pgiDirectMap: Record<number, number[]>
  goodMachineMap: Record<number, string | null>
  pgiRecipeChainMap: Record<number, number[]>
  directItems: number[][]  // NEW — only direct item_ids
}

function IngredientTree({
  groups,
  groupGoods,
  groupRecipes,
  groupLabels,
  itemNameMap,
  goodNameMap,
  recipeNameMap,
  chainMap,
  pgiDirectMap,
  goodMachineMap,
  pgiRecipeChainMap,
  directItems,
}: IngredientTreeProps) {
  if (!groups || groups.length === 0) return null

  return (
    <div className="detail-field">
      <span className="field-label">Ingredients</span>
      <div className="ingredient-groups">
        {groups.map((group, i) => {
          // const directItemNames = [...new Set(
          //   group.map(id => itemNameMap[id]).filter(Boolean) as string[]
          // )]
          const directItemNames = [...new Set(
            (directItems?.[i] ?? []).map(id => itemNameMap[id]).filter(Boolean) as string[]
          )]
          const goods = groupGoods?.[i] ?? []
          const recipes = groupRecipes?.[i] ?? []
          const fallback = groupLabels?.[i + 1]

          // ── Case 1: pure direct items ──────────────────────────────────
          if (goods.length === 0 && recipes.length === 0 && directItemNames.length > 0) {
            return (
              <div key={i} className="ingredient-row">
                <span className="tree-bullet">•</span>
                <span className="ingredient-name">
                  <OrList names={directItemNames} />
                </span>
              </div>
            )
          }

          // ── Case 2: recipe ingredients (Jam Tea, Tempura Udon) ─────────
          if (recipes.length > 0 && goods.length === 0 && directItemNames.length === 0) {
            return (
              <div key={i} className="ingredient-row">
                <span className="tree-bullet">•</span>
                <span className="ingredient-name">
                  <OrList names={recipes.map(rid => recipeNameMap[rid] ?? `Recipe #${rid}`)} />
                </span>
              </div>
            )
          }

          // ── Case 3: processed goods with chain ─────────────────────────
          if (goods.length > 0) {
            const goodNames = goods.map(gid => goodNameMap[gid] ?? `Good #${gid}`)
            const allNames = [...directItemNames, ...goodNames]
            const hasChain = goods.some(gid => {
              const d = pgiDirectMap[gid] ?? []
              const c = chainMap[gid] ?? []
              const r = pgiRecipeChainMap[gid] ?? []
              return d.length > 0 || c.length > 0 || r.length > 0
            })

            return (
              <div key={i} className="ingredient-block">
                <div className="ingredient-row">
                  <span className="tree-bullet">•</span>
                  <span className="ingredient-name">
                    <OrList names={allNames} />
                  </span>
                </div>
                {hasChain && (
                  <div className="ingredient-chain">
                    {goods.map(goodId => (
                      <GoodTree
                        key={goodId}
                        goodId={goodId}
                        showName={goods.length > 1}
                        depth={0}
                        visited={new Set()}
                        itemNameMap={itemNameMap}
                        goodNameMap={goodNameMap}
                        recipeNameMap={recipeNameMap}
                        chainMap={chainMap}
                        pgiDirectMap={pgiDirectMap}
                        goodMachineMap={goodMachineMap}
                        pgiRecipeChainMap={pgiRecipeChainMap}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          }

          // ── Case 4: fallback label (terminal goods like Butter) ────────
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

export default function DetailPanel({
  selected,
  itemNameMap,
  goodNameMap,
  recipeNameMap,
  chainMap,
  pgiDirectMap,
  goodMachineMap,
  pgiRecipeChainMap,
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

  const hasIngredients = (selected.ingredient_groups?.length ?? 0) > 0

  return (
    <div className="detail-content">
      <h2>{selected.name}</h2>

      <div className="detail-tag-row">
        <span className={`tag ${typeToClass(selected.type)}`}>{selected.type}</span>
        {selected.utensil && <span className="tag tag-utensil">{selected.utensil}</span>}
        {selected.machine_color && <span className="tag tag-windmill">{selected.machine_color} Windmill</span>}
        {selected.category && <span className="tag tag-category">{selected.category}</span>}
      </div>

      {selected.sell_price != null && (
        <PriceTiers base={selected.sell_price} />
      )}

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

      {hasIngredients && (
        <IngredientTree
          groups={selected.ingredient_groups!}
          groupGoods={selected.ingredient_group_goods ?? []}
          groupRecipes={
            selected.type === 'Processed' 
              ? (selected.ingredient_group_recipe_inputs ?? [])
              : (selected.ingredient_group_recipes ?? [])}
          groupLabels={selected.ingredient_group_labels}
          itemNameMap={itemNameMap}
          goodNameMap={goodNameMap}
          recipeNameMap={recipeNameMap}
          chainMap={chainMap}
          pgiDirectMap={pgiDirectMap}
          goodMachineMap={goodMachineMap}
          pgiRecipeChainMap={pgiRecipeChainMap}
          directItems={selected.ingredient_direct_items ?? []}
        />
      )}
    </div>
  )
}