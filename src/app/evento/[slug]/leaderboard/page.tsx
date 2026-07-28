'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function LeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [event, setEvent] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [athletes, setAthletes] = useState<any[]>([])
  const [workouts, setWorkouts] = useState<any[]>([])
  const [scores, setScores] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: eventData } = await supabase.from('events').select('*').eq('slug', slug).single()
      if (!eventData) {
        setLoading(false)
        return
      }
      setEvent(eventData)

      const [{ data: cats }, { data: ats }, { data: wods }, { data: scs }] = await Promise.all([
        supabase.from('categories').select('*').eq('event_id', eventData.id),
        supabase.from('athletes').select('*, categories(name)').eq('event_id', eventData.id).eq('status', 'active'),
        supabase.from('workouts').select('*').eq('event_id', eventData.id).order('order_index'),
        supabase.from('scores').select('*, athletes(id), workouts(id)').eq('workouts.event_id', eventData.id)
      ])

      setCategories(cats || [])
      setAthletes(ats || [])
      setWorkouts(wods || [])
      setScores(scs || [])
      setLoading(false)
    }

    loadData()
  }, [slug])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <p className="text-gray-400">Cargando leaderboard...</p>
        </div>
      </main>
    )
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <p className="text-red-500">Evento no encontrado</p>
        </div>
      </main>
    )
  }

  const tipoLabel: Record<string, string> = {
    for_time: 'For Time',
    amrap: 'AMRAP',
    max_weight: 'Max Weight'
  }

  function timeToSeconds(time: string): number {
    if (!time) return 999999
    const parts = time.split(':').map(Number)
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return parseInt(time) || 999999
  }

  function calcularLeaderboard(catId: string) {
    const catAthletes = athletes.filter(a => a.category_id === parseInt(catId))
    
    const athleteData: Record<number, {
      athlete: any
      scores: Record<number, { raw_score: string; rank: number; points: number }>
      totalPoints: number
    }> = {}

    catAthletes.forEach(a => {
      athleteData[a.id] = { athlete: a, scores: {}, totalPoints: 0 }
    })

    workouts.forEach(w => {
      const wodScores = scores.filter(s => s.workout_id === w.id && athleteData[s.athlete_id]) || []
      let sorted = [...wodScores]

      if (w.scoring_type === 'for_time') {
        sorted.sort((a, b) => timeToSeconds(a.raw_score) - timeToSeconds(b.raw_score))
      } else {
        sorted.sort((a, b) => parseInt(b.raw_score || '0') - parseInt(a.raw_score || '0'))
      }

      sorted.forEach((s, idx) => {
        const points = idx + 1
        if (athleteData[s.athlete_id]) {
          athleteData[s.athlete_id].scores[w.id] = {
            raw_score: s.raw_score,
            rank: idx + 1,
            points
          }
          athleteData[s.athlete_id].totalPoints += points
        }
      })
    })

    return Object.values(athleteData).sort((a, b) => a.totalPoints - b.totalPoints)
  }

  const currentAthletes = selectedCategory === 'all' 
    ? [] 
    : calcularLeaderboard(selectedCategory)

  const selectedCatName = selectedCategory === 'all' 
    ? '' 
    : categories.find(c => c.id.toString() === selectedCategory)?.name || ''

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <a href={`/evento/${slug}`} className="text-sm text-gray-500 hover:text-gray-900 mb-4 block">Volver al evento</a>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Leaderboard</h1>
        <p className="text-sm text-gray-500 mb-6">{event.name}</p>

        {/* Dropdown de categorias */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Seleccionar categoria</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl text-sm bg-white shadow-sm"
          >
            <option value="all">-- Selecciona una categoria --</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
            ))}
          </select>
        </div>

        {selectedCategory !== 'all' && currentAthletes.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{selectedCatName}</h2>

            {/* Podio */}
            {currentAthletes.length >= 3 && (
              <div className="flex justify-center items-end gap-4 mb-6">
                <div className="text-center pb-2">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 mb-2">2</div>
                  <p className="text-xs font-medium">{currentAthletes[1]?.athlete.full_name}</p>
                  <p className="text-xs text-gray-400">{currentAthletes[1]?.totalPoints} pts</p>
                </div>
                <div className="text-center pb-4">
                  <div className="w-20 h-20 rounded-full bg-yellow-100 border-2 border-yellow-400 flex items-center justify-center text-xl font-bold text-yellow-700 mb-2">1</div>
                  <p className="text-sm font-medium">{currentAthletes[0]?.athlete.full_name}</p>
                  <p className="text-xs text-gray-400">{currentAthletes[0]?.totalPoints} pts</p>
                </div>
                <div className="text-center pb-1">
                  <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-lg font-bold text-orange-700 mb-2">3</div>
                  <p className="text-xs font-medium">{currentAthletes[2]?.athlete.full_name}</p>
                  <p className="text-xs text-gray-400">{currentAthletes[2]?.totalPoints} pts</p>
                </div>
              </div>
            )}

            {/* Tabla */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-2 text-left font-medium text-gray-500 w-10">#</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Atleta</th>
                    {workouts?.map(w => (
                      <th key={w.id} className="px-3 py-2 text-center font-medium text-gray-500 text-xs min-w-[80px]">
                        <div>{w.name}</div>
                        <div className="text-gray-400 font-normal">{tipoLabel[w.scoring_type]}</div>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium text-gray-500 w-16">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAthletes.map((entry, idx) => (
                    <tr key={entry.athlete.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-3 font-bold text-gray-900">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900">#{entry.athlete.bib_number} {entry.athlete.full_name}</div>
                      </td>
                      {workouts?.map(w => {
                        const s = entry.scores[w.id]
                        return (
                          <td key={w.id} className="px-3 py-3 text-center">
                            {s ? (
                              <div>
                                <div className="font-medium text-gray-900">{s.raw_score}</div>
                                <div className="text-xs text-gray-400">({s.points} pts)</div>
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-3 py-3 text-right font-bold text-gray-900">{entry.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {selectedCategory === 'all' && (
          <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
            <p className="text-gray-400 text-sm">Selecciona una categoria para ver el leaderboard.</p>
          </div>
        )}

        {selectedCategory !== 'all' && currentAthletes.length === 0 && (
          <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
            <p className="text-gray-400 text-sm">No hay atletas o scores en esta categoria.</p>
          </div>
        )}
      </div>
    </main>
  )
}