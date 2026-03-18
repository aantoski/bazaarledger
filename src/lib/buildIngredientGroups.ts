// import type { buildChainMaps } from './buildChainMaps'
import type { buildLookupMaps, RawGameData } from './buildLookupMaps'
import type { makeCollectHelpers } from './collectHelpers'

type CollectHelpers = ReturnType<typeof makeCollectHelpers>
type LookupMaps = ReturnType<typeof buildLookupMaps>
// type ChainMaps = ReturnType<typeof buildChainMaps>

export function buildIngredientGroups(
  pgiRows: RawGameData['pgiRows'],
  riRows: RawGameData['riRows'],
//   chainMaps: ChainMaps,
  lookupMaps: LookupMaps,
  helpers: CollectHelpers,
) {
    // Processed Goods
    const pgiGroupTemp: Record<number, Record<number, number[]>> = {}
    const pgiMachineTemp: Record<number, Record<number, string[]>> = {}
    const pgiToolTemp: Record<number, { tool: string, min_level: number }[]> = {}
    const pgiMachineOptionTemp: Record<number, Record<number, string[][]>> = {}
    const pgiGoodsTemp: Record<number, Record<number, number[]>> = {}
    const pgiRecipeGoodsTemp: Record<number, Record<number, number[]>> = {}
    const pgiDirectItemsTemp: Record<number, Record<number, number[]>> = {}

    for (const row of pgiRows) {
        if (!pgiGroupTemp[row.processed_good_id!]) pgiGroupTemp[row.processed_good_id!] = {}
        if (!pgiMachineTemp[row.processed_good_id!]) pgiMachineTemp[row.processed_good_id!] = {}
        if (!pgiToolTemp[row.processed_good_id!]) pgiToolTemp[row.processed_good_id!] = []
        const group = row.ingredient_group ?? 0
        if (!pgiMachineOptionTemp[row.processed_good_id!]) pgiMachineOptionTemp[row.processed_good_id!] = {}
        if (!pgiMachineOptionTemp[row.processed_good_id!][group]) pgiMachineOptionTemp[row.processed_good_id!][group] = []
        if (!pgiGroupTemp[row.processed_good_id!][group]) pgiGroupTemp[row.processed_good_id!][group] = []
        if (!pgiMachineTemp[row.processed_good_id!][group]) pgiMachineTemp[row.processed_good_id!][group] = []
        if (!pgiGoodsTemp[row.processed_good_id!]) pgiGoodsTemp[row.processed_good_id!] = {}
        if (!pgiGoodsTemp[row.processed_good_id!][group]) pgiGoodsTemp[row.processed_good_id!][group] = []
        if (row.input_good_id) pgiGoodsTemp[row.processed_good_id!][group].push(row.input_good_id)
        if (!pgiRecipeGoodsTemp[row.processed_good_id!]) pgiRecipeGoodsTemp[row.processed_good_id!] = {}
        if (!pgiRecipeGoodsTemp[row.processed_good_id!][group]) pgiRecipeGoodsTemp[row.processed_good_id!][group] = []
        if (!pgiDirectItemsTemp[row.processed_good_id!]) pgiDirectItemsTemp[row.processed_good_id!] = {}
        if (!pgiDirectItemsTemp[row.processed_good_id!][group]) pgiDirectItemsTemp[row.processed_good_id!][group] = []
        if (row.input_recipe_id) pgiRecipeGoodsTemp[row.processed_good_id!][group].push(row.input_recipe_id)
        if (row.item_id) {
            pgiGroupTemp[row.processed_good_id!][group].push(row.item_id)
            pgiToolTemp[row.processed_good_id!].push(...(lookupMaps.itemToolReqMap[row.item_id] ?? []))
            pgiMachineOptionTemp[row.processed_good_id!][group].push([])
            pgiDirectItemsTemp[row.processed_good_id!][group].push(row.item_id)
        }
        if (row.input_good_id) {
            pgiGroupTemp[row.processed_good_id!][group].push(...helpers.collectItemIds(row.input_good_id))
            pgiMachineTemp[row.processed_good_id!][group].push(...helpers.collectRequiredMachines(row.input_good_id))
            pgiToolTemp[row.processed_good_id!].push(...helpers.collectRequiredToolLevels(row.input_good_id))
            pgiMachineOptionTemp[row.processed_good_id!][group].push(helpers.collectRequiredMachines(row.input_good_id))
        }
    }

    const pgiGroupMap: Record<number, number[][]> = {}
    const pgiMachineMap: Record<number, string[][]> = {}
    for (const [goodId, groups] of Object.entries(pgiGroupTemp)) {
        pgiGroupMap[Number(goodId)] = Object.values(groups)
        pgiMachineMap[Number(goodId)] = Object.values(pgiMachineTemp[Number(goodId)] ?? {})
    }

    const pgiGoodsMap: Record<number, number[][]> = {}
    for (const [goodId, groups] of Object.entries(pgiGoodsTemp)) {
        pgiGoodsMap[Number(goodId)] = Object.values(groups)
    }

    const pgiRecipeGoodsMap: Record<number, number[][]> = {}
    for (const [goodId, groups] of Object.entries(pgiRecipeGoodsTemp)) {
        pgiRecipeGoodsMap[Number(goodId)] = Object.values(groups)
    }

    const pgiDirectItemsMap: Record<number, number[][]> = {}
    for (const [goodId, groups] of Object.entries(pgiDirectItemsTemp)) {
        pgiDirectItemsMap[Number(goodId)] = Object.values(groups)
    }

    // Recipes 
    const riGroupTemp: Record<number, Record<number, number[]>> = {}
    const riMachineTemp: Record<number, Record<number, string[]>> = {}
    const riWonderstoneMap: Record<number, boolean> = {}
    const riToolMap: Record<number, { tool: string, min_level: number }[]> = {}
    const riGroupLabelTemp: Record<number, Record<number, string | null>> = {}
    const riMachineOptionTemp: Record<number, Record<number, string[][]>> = {}
    const riGoodsTemp: Record<number, Record<number, number[]>> = {}
    const riRecipeTemp: Record<number, Record<number, number[]>> = {}
    const riDirectItemsTemp: Record<number, Record<number, number[]>> = {}

    for (const row of riRows) {
        if (!riGroupTemp[row.recipe_id!]) riGroupTemp[row.recipe_id!] = {}
        if (!riMachineTemp[row.recipe_id!]) riMachineTemp[row.recipe_id!] = {}
        if (!riToolMap[row.recipe_id!]) riToolMap[row.recipe_id!] = []
            const group = row.ingredient_group ?? 0
        if (!riGroupTemp[row.recipe_id!][group]) riGroupTemp[row.recipe_id!][group] = []
        if (!riMachineTemp[row.recipe_id!][group]) riMachineTemp[row.recipe_id!][group] = []
        if (!riMachineOptionTemp[row.recipe_id!]) riMachineOptionTemp[row.recipe_id!] = {}
        if (!riMachineOptionTemp[row.recipe_id!][group]) riMachineOptionTemp[row.recipe_id!][group] = []
        if (!riGoodsTemp[row.recipe_id!]) riGoodsTemp[row.recipe_id!] = {}
        if (!riGoodsTemp[row.recipe_id!][group]) riGoodsTemp[row.recipe_id!][group] = []
        if (row.input_good_id) riGoodsTemp[row.recipe_id!][group].push(row.input_good_id)
        if (!riRecipeTemp[row.recipe_id!]) riRecipeTemp[row.recipe_id!] = {}
        if (!riRecipeTemp[row.recipe_id!][group]) riRecipeTemp[row.recipe_id!][group] = []
        if (row.input_recipe_id) riRecipeTemp[row.recipe_id!][group].push(row.input_recipe_id)
        if (!riDirectItemsTemp[row.recipe_id!]) riDirectItemsTemp[row.recipe_id!] = {}
        if (!riDirectItemsTemp[row.recipe_id!][group]) riDirectItemsTemp[row.recipe_id!][group] = []
        if (row.item_id) riDirectItemsTemp[row.recipe_id!][group].push(row.item_id)
        if (row.item_id) {
            riGroupTemp[row.recipe_id!][group].push(row.item_id)
            riToolMap[row.recipe_id!].push(...(lookupMaps.itemToolReqMap[row.item_id] ?? []))
            riMachineOptionTemp[row.recipe_id!][group].push([])
        }
        if (row.input_good_id) {
            riGroupTemp[row.recipe_id!][group].push(...helpers.collectItemIds(row.input_good_id))
            riMachineTemp[row.recipe_id!][group].push(...helpers.collectRequiredMachines(row.input_good_id))
            riToolMap[row.recipe_id!].push(...helpers.collectRequiredToolLevels(row.input_good_id))
        if (helpers.collectRequiresWonderstone(row.input_good_id)) riWonderstoneMap[row.recipe_id!] = true
            riMachineOptionTemp[row.recipe_id!][group].push(helpers.collectRequiredMachines(row.input_good_id))
        }
        if (!riGroupLabelTemp[row.recipe_id!]) riGroupLabelTemp[row.recipe_id!] = {}
        if (row.input_good_id) {
            const resolved = helpers.collectItemIds(row.input_good_id)
        if (resolved.length === 0) {
            const existingLabel = riGroupLabelTemp[row.recipe_id!][group]
            const goodName = lookupMaps.goodNameMap[row.input_good_id] ?? `Good #${row.input_good_id}`
            riGroupLabelTemp[row.recipe_id!][group] = existingLabel
                ? `${existingLabel} or ${goodName}`
                : goodName
        }
        }
    }

    const riGroupMap: Record<number, number[][]> = {}
    const riMachineMap: Record<number, string[][]> = {}
    for (const [recipeId, groups] of Object.entries(riGroupTemp)) {
        riGroupMap[Number(recipeId)] = Object.values(groups)
        riMachineMap[Number(recipeId)] = Object.values(riMachineTemp[Number(recipeId)] ?? {})
    }

    const riMachineOptionMap: Record<number, string[][][]> = {}
    for (const [recipeId, groups] of Object.entries(riMachineOptionTemp)) {
        riMachineOptionMap[Number(recipeId)] = Object.values(groups)
    }

    const riGoodsMap: Record<number, number[][]> = {}
    for (const [recipeId, groups] of Object.entries(riGoodsTemp)) {
        riGoodsMap[Number(recipeId)] = Object.values(groups)
    }

    const riRecipeMap: Record<number, number[][]> = {}
    for (const [recipeId, groups] of Object.entries(riRecipeTemp)) {
        riRecipeMap[Number(recipeId)] = Object.values(groups)
    }

    const riDirectItemsMap: Record<number, number[][]> = {}
    for (const [recipeId, groups] of Object.entries(riDirectItemsTemp)) {
        riDirectItemsMap[Number(recipeId)] = Object.values(groups)
    }

    return {
        pgiGroupMap,
        pgiMachineMap,
        pgiGoodsMap,
        pgiRecipeGoodsMap,
        pgiDirectItemsMap,
        pgiToolTemp,
        pgiMachineOptionTemp,  // needed by buildEntries as riMachineOptionMap for processed goods
        riGroupMap,
        riMachineMap,
        riMachineOptionMap,
        riGoodsMap,
        riRecipeMap,
        riDirectItemsMap,
        riToolMap,
        riWonderstoneMap,
        riGroupLabelTemp,
        }
}