import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type PantryVariant = {
  id: number
  display_name: string
  raw_item_id: number | null
  processed_good_id: number | null
}

export function usePantry() {
  const [pantryVariants, setPantryVariants] = useState<PantryVariant[]>([])

  useEffect(() => {
    supabase.from('pantry_variants')
      .select('id, display_name, raw_item_id, processed_good_id')
      .then(({ data }) => setPantryVariants(data ?? []))
  }, [])

  return pantryVariants
}