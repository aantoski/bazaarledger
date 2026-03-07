import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Animal = {
  id: number
  name: string
}

export function useAnimals() {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [animalProductMap, setAnimalProductMap] = useState<Record<number, number[]>>({})

  useEffect(() => {
    async function fetch() {
      const [animalsRes, productsRes] = await Promise.all([
        supabase.from('animals').select('id, name').order('name'),
        supabase.from('animal_products').select('animal_id, item_id'),
      ])

      setAnimals(animalsRes.data ?? [])

      // map: item_id -> list of animal_ids that produce it
      const map: Record<number, number[]> = {}
      for (const row of productsRes.data ?? []) {
        if (!map[row.item_id]) map[row.item_id] = []
        map[row.item_id].push(row.animal_id)
      }
      setAnimalProductMap(map)
    }
    fetch()
  }, [])

  return { animals, animalProductMap }
}