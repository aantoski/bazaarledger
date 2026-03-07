import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (error) console.error(error)
        else setCount(count)
      })
  }, [])

  return (
    <div>
      <h1>CropCruncher</h1>
      <p>{count === null ? 'Connecting...' : `✅ Connected! ${count} items in DB`}</p>
    </div>
  )
}

export default App