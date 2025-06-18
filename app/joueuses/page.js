'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function JoueusesPage() {
  const [joueuses, setJoueuses] = useState([])

  useEffect(() => {
    const fetchJoueuses = async () => {
      const { data, error } = await supabase.from('joueuses').select('*')
      if (error) console.error(error)
      else setJoueuses(data)
    }

    fetchJoueuses()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Liste des joueuses</h1>
      <ul className="space-y-2">
        {joueuses.map((j) => (
          <li key={j.id} className="p-2 bg-white shadow rounded">
            {j.nom}
          </li>
        ))}
      </ul>
    </div>
  )
}
