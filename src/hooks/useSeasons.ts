import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useItemSeasons() {
  const [seasonMap, setSeasonMap] = useState<Record<number, string[]>>({})

  useEffect(() => {
    supabase.from('item_seasons').select('item_id, season').then(({ data }) => {
      const map: Record<number, string[]> = {}
      for (const row of data ?? []) {
        if (!map[row.item_id]) map[row.item_id] = []
        map[row.item_id].push(row.season)
      }
      setSeasonMap(map)
    })
  }, [])

  return seasonMap
}