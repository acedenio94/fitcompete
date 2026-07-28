import { supabase } from '../../../../lib/supabase'
import { notFound } from 'next/navigation'
import AutoRefresh from './AutoRefresh'

export const revalidate = 30

function timeToSeconds(time: string): number {
  if (!time) return 999999
  const parts = time.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return parseInt(time) || 999999
}

function calcularLeaderboard(
  athletesList: any[],
  workoutsList: any[],
  scoresList: any[]
) {
  const athleteData: Record<number, {
    athlete: any
    scores: Record<number, { raw_score: string; rank: number; points: number }>
    totalPoints: number
  }> = {}

  athletesList.forEach(a => {
    athleteData[a.id] = { athlete: a, scores: {}, totalPoints: 0 }
  })

  workoutsList.forEach(w => {
    const wodScores = scoresList.filter(s => s.workout_id === w.id && athleteData[s.athlete_id]) || []
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

export default async function DisplayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: event } = await supabase.from('events').select('*').eq('slug', slug).single()
  if (!event) notFound()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('event_id', event.id)

  const { data: athletes } = await supabase
    .from('athletes')
    .select('*, categories(name)')
    .eq('event_id', event.id)
    .eq('status', 'active')

  const { data: workouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('event_id', event.id)
    .order('order_index')

  const { data: scores } = await supabase
    .from('scores')
    .select('*, athletes(id), workouts(id)')
    .in('athlete_id', athletes?.map(a => a.id) || [])

  const allAthletes = athletes || []
  const allWorkouts = workouts || []
  const allScores = scores || []

  // Leaderboard general
  const generalLeaderboard = calcularLeaderboard(allAthletes, allWorkouts, allScores)

  // Leaderboard por categoria
  const leaderboardsByCategory = (categories || []).map(cat => {
    const catAthletes = allAthletes.filter(a => a.category_id === cat.id)
    return {
      category: cat,
      athletes: calcularLeaderboard(catAthletes, allWorkouts, allScores)
    }
  })

  const tipoLabel: Record<string, string> = {
    for_time: 'For Time',
    amrap: 'AMRAP',
    max_weight: 'Max Weight'
  }

  return (
    <div className="bg-black text-white min-h-screen p-8">
      <AutoRefresh />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-2">{event.name}</h1>
          <p className="text-xl text-gray-400">{event.location} | {new Date(event.date).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <p className="text-sm text-gray-500 mt-2">Actualiza automaticamente cada 30 segundos</p>
        </div>

        {/* Top 3 por Categoria */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
          {leaderboardsByCategory.map(({ category, athletes: catAthletes }) => (
            <div key={category.id} className="bg-gray-900 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-center mb-6 text-yellow-400">{category.name}</h2>
              
              {catAthletes.length === 0 ? (
                <p className="text-gray-500 text-center">No hay atletas en esta categoria</p>
              ) : (
                <div className="flex justify-center items-end gap-4">
                  {/* 2do lugar */}
                  {catAthletes[1] && (
                    <div className="text-center pb-2">
                      <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center text-2xl font-bold mb-2 mx-auto">2</div>
                      <p className="text-sm font-bold truncate max-w-[100px]">{catAthletes[1].athlete.full_name}</p>
                      <p className="text-xs text-gray-400">#{catAthletes[1].athlete.bib_number}</p>
                      <p className="text-lg font-bold text-yellow-400">{catAthletes[1].totalPoints} pts</p>
                    </div>
                  )}
                  
                  {/* 1er lugar */}
                  {catAthletes[0] && (
                    <div className="text-center pb-4">
                      <div className="w-28 h-28 rounded-full bg-yellow-500 border-4 border-yellow-300 flex items-center justify-center text-3xl font-bold text-black mb-2 mx-auto">1</div>
                      <p className="text-base font-bold truncate max-w-[120px]">{catAthletes[0].athlete.full_name}</p>
                      <p className="text-xs text-gray-400">#{catAthletes[0].athlete.bib_number}</p>
                      <p className="text-xl font-bold text-yellow-400">{catAthletes[0].totalPoints} pts</p>
                    </div>
                  )}
                  
                  {/* 3er lugar */}
                  {catAthletes[2] && (
                    <div className="text-center pb-1">
                      <div className="w-20 h-20 rounded-full bg-orange-700 flex items-center justify-center text-2xl font-bold mb-2 mx-auto">3</div>
                      <p className="text-sm font-bold truncate max-w-[100px]">{catAthletes[2].athlete.full_name}</p>
                      <p className="text-xs text-gray-400">#{catAthletes[2].athlete.bib_number}</p>
                      <p className="text-lg font-bold text-yellow-400">{catAthletes[2].totalPoints} pts</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Leaderboard General */}
        {generalLeaderboard.length > 0 && (
          <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-700">
            <h2 className="text-2xl font-bold p-6 border-b border-gray-700">Leaderboard General</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-lg">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700">
                    <th className="px-6 py-4 text-left font-bold text-gray-300 w-16">#</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-300">Atleta</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-300 text-sm">Cat</th>
                    {allWorkouts.map(w => (
                      <th key={w.id} className="px-6 py-4 text-center font-bold text-gray-300 text-sm">
                        <div>{w.name}</div>
                        <div className="text-gray-500 font-normal text-xs">{tipoLabel[w.scoring_type]}</div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-right font-bold text-yellow-400 w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {generalLeaderboard.map((entry, idx) => (
                    <tr key={entry.athlete.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800">
                      <td className="px-6 py-4 font-bold text-xl">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-xl">#{entry.athlete.bib_number} {entry.athlete.full_name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">{entry.athlete.categories?.name}</td>
                      {allWorkouts.map(w => {
                        const s = entry.scores[w.id]
                        return (
                          <td key={w.id} className="px-6 py-4 text-center">
                            {s ? (
                              <div>
                                <div className="font-bold text-lg">{s.raw_score}</div>
                                <div className="text-xs text-gray-500">({s.points} pts)</div>
                              </div>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-6 py-4 text-right font-bold text-xl text-yellow-400">{entry.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {generalLeaderboard.length === 0 && (
          <p className="text-gray-500 text-2xl text-center py-16">No hay scores registrados aun.</p>
        )}
      </div>
    </div>
  )
}