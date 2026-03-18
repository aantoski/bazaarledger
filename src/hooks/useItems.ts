import { useEffect, useState } from 'react'
import { fetchGameData } from '../lib/fetchGameData'
import { buildChainMaps } from '../lib/buildChainMaps'
import { buildLookupMaps } from '../lib/buildLookupMaps'
import { makeCollectHelpers } from '../lib/collectHelpers'
import { buildIngredientGroups } from '../lib/buildIngredientGroups'
import { makeCalcCost } from '../lib/calcCost'
import { makeCalcCriticalPath } from '../lib/calcCriticalPath'
import { buildEntries } from '../lib/buildEntries'
import type { ListEntry } from '../types/ListEntry'

export type NameMap = Record<number, string>

export function useListEntries() {
  const [entries, setEntries] = useState<ListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [itemNameMap, setItemNameMap] = useState<Record<number, string>>({})
  const [goodNameMap, setGoodNameMap] = useState<Record<number, string>>({})
  const [chainMap, setChainMap] = useState<Record<number, number[]>>({})
  const [pgiDirectMap, setPgiDirectMap] = useState<Record<number, number[]>>({})
  const [goodMachineMap, setGoodMachineMap] = useState<Record<number, string | null>>({})
  const [recipeNameMap, setRecipeNameMap] = useState<Record<number, string>>({})
  const [pgiRecipeChainMap, setPgiRecipeChainMap] = useState<Record<number, number[]>>({})
  const [pgiGroupStructure, setPgiGroupStructure] = useState<Record<number, number[][]>>({})
  const [recipeEntryMap, setRecipeEntryMap] = useState<Record<number, ListEntry>>({})
  const [itemBuyPriceMap, setItemBuyPriceMap] = useState<Record<number, number | null>>({})
  const [purchasableGoodMap, setPurchasableGoodMap] = useState<Record<number, { buy_price: number, where_to_buy: string | null }>>({})
  const [purchasableItemMap, setPurchasableItemMap] = useState<Record<number, { buy_price: number, where_to_buy: string | null }>>({})

  useEffect(() => {
    async function fetchAll() {
     const rawData = await fetchGameData()

      const chainMaps = buildChainMaps(rawData.pgiRows)
      const lookupMaps = buildLookupMaps(rawData)
      const helpers = makeCollectHelpers( 
        chainMaps.pgiDirectMap,
        chainMaps.pgiDirectMap, 
        lookupMaps.goodMachineMap,
        lookupMaps.goodWonderstoneMap,
        lookupMaps.itemToolReqMap
      )
      const ingredientGroups = buildIngredientGroups(
        rawData.pgiRows,
        rawData.riRows,
        lookupMaps,
        helpers,
      )
      const calcCost = makeCalcCost(rawData.pgiRows, rawData.riRows, lookupMaps.itemBuyPriceMap)
      const calcCriticalPath = makeCalcCriticalPath(
        rawData.pgiRows,
        rawData.riRows,
        lookupMaps.cropDetailsMap,
        lookupMaps.goodProcessingTimeMap,
      )
const { entries, recipeEntryMap } = buildEntries(
  rawData,
  lookupMaps,
  ingredientGroups,
  calcCost,
  calcCriticalPath,
)


    setEntries(entries)
    setRecipeEntryMap(recipeEntryMap)
    setItemNameMap(lookupMaps.itemNameMap)
    setGoodNameMap(lookupMaps.goodNameMap)
    setChainMap(chainMaps.pgiChainMap)
    setPgiDirectMap(chainMaps.pgiDirectMap)
    setGoodMachineMap(lookupMaps.goodMachineMap)
    setRecipeNameMap(lookupMaps.recipeNameMap)
    setPgiRecipeChainMap(chainMaps.pgiRecipeChainMap)
    setPgiGroupStructure(ingredientGroups.pgiGroupMap)
    setItemBuyPriceMap(lookupMaps.itemBuyPriceMap)
    setPurchasableGoodMap(lookupMaps.purchasableGoodMap)
    setPurchasableItemMap(lookupMaps.purchasableItemMap)

    setLoading(false)
    }

    fetchAll()
  }, [])

  return {
    entries, loading,
    itemNameMap, goodNameMap, recipeNameMap,itemBuyPriceMap,
    pgiRecipeChainMap, pgiGroupStructure, recipeEntryMap,
    purchasableGoodMap, purchasableItemMap,
    chainMap,
    pgiDirectMap,
    goodMachineMap,
  }
}