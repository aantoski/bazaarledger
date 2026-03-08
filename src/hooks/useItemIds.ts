import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useItemIdsByType(itemType: string) {
  const [idSet, setIdSet] = useState<Set<number>>(new Set())

  useEffect(() => {
    supabase.from('items').select('id').eq('item_type', itemType).then(({ data }) => {
      setIdSet(new Set((data ?? []).map(r => r.id)))
    })
  }, [])

  return idSet
}