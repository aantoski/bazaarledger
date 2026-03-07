import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// item_id -> { tool, min_level }[]
export type ToolRequirement = {
  tool: 'Fishing Rod' | 'Hatchet'
  min_level: number
}

export function useToolRequirements() {
  const [toolReqMap, setToolReqMap] = useState<Record<number, ToolRequirement[]>>({})

  useEffect(() => {
    supabase.from('tool_requirements').select('item_id, tool, min_level').then(({ data }) => {
      const map: Record<number, ToolRequirement[]> = {}
      for (const row of data ?? []) {
        if (!map[row.item_id]) map[row.item_id] = []
        map[row.item_id].push({ tool: row.tool, min_level: row.min_level })
      }
      setToolReqMap(map)
    })
  }, [])

  return toolReqMap
}