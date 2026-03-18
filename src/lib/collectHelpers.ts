export function makeCollectHelpers(
  pgiDirectMap: Record<number, number[]>,
  pgiChainMap: Record<number, number[]>,
  goodMachineMap: Record<number, string | null>,
  goodWonderstoneMap: Record<number, boolean>,
  itemToolReqMap: Record<number, { tool: string, min_level: number }[]>,
) {
    function collectItemIds(goodId: number, visited = new Set<number>()): number[] {
        if (visited.has(goodId)) return []
        visited.add(goodId)
        const direct = pgiDirectMap[goodId] ?? []
        const chained = (pgiChainMap[goodId] ?? []).flatMap(gid => collectItemIds(gid, visited))
        return [...direct, ...chained]
    }

    function collectRequiredMachines(goodId: number, visited = new Set<number>()): string[] {
        if (visited.has(goodId)) return []
        visited.add(goodId)
        const color = goodMachineMap[goodId]
        const own = color ? [color] : []
        const chained = (pgiChainMap[goodId] ?? []).flatMap(gid => collectRequiredMachines(gid, visited))
        return [...own, ...chained]
    }

    function collectRequiresWonderstone(goodId: number, visited = new Set<number>()): boolean {
        if (visited.has(goodId)) return false
        visited.add(goodId)
        if (goodWonderstoneMap[goodId]) return true
        return (pgiChainMap[goodId] ?? []).some(gid => collectRequiresWonderstone(gid, visited))
    }

    function collectRequiredToolLevels(goodId: number, visited = new Set<number>()): { tool: string, min_level: number }[] {
        if (visited.has(goodId)) return []
        visited.add(goodId)
        const direct = (pgiDirectMap[goodId] ?? []).flatMap(itemId => itemToolReqMap[itemId] ?? [])
        const chained = (pgiChainMap[goodId] ?? []).flatMap(gid => collectRequiredToolLevels(gid, visited))
        return [...direct, ...chained]
    }

    return { collectItemIds, collectRequiredMachines, collectRequiresWonderstone, collectRequiredToolLevels }
}