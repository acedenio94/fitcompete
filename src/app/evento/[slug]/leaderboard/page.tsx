import { supabase } from '../../../../lib/supabase'
import { notFound } from 'next/navigation'

export default async function LeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
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
    .order('bib_number')

  const { data: workouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('event_id', event.id)
    .order('order_index')

  const { data: scores } = await supabase
    .from('scores')
    .select('*, athletes(id, full_name, bib_number), workouts(id, name, scoring_type)')
    .in('athlete_id', athletes?.map(a => a.id) || [])

  // Calcular puntos por atleta
  const athleteData: Record<number, {
    athlete: any
    scores: Record<number, { raw_score: string; rank: number; points: number }>
    totalPoints: number
  }> = {}

  athletes?.forEach(a => {
    athleteData[a.id] = { athlete: a, scores: {}, totalPoints: 0 }
  })

  // Para cada WOD, ordenar y asignar puntos
  workouts?.forEach(w => {
    const wodScores = scores?.filter(s => s.workout_id === w.id) || []
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

  const sortedAthletes = Object.values(athleteData).sort((a, b) => a.totalPoints - b.totalPoints)

  const tipoLabel: Record<string, string> = {
    for_time: 'For Time',
    amrap: 'AMRAP',
    max_weight: 'Max Weight'
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <a href={`/evento/${slug}`} className="text-sm text-gray-500 hover:text-gray-900 mb-4 block">Volver al evento</a>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Leaderboard</h1>
        <p className="text-sm text-gray-500 mb-6">{event.name}</p>

        {/* Podio */}
        {sortedAthletes.length >= 3 && (
          <div className="flex justify-center items-end gap-4 mb-8">
            <div className="text-center pb-2">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 mb-2">2</div>
              <p className="text-xs font-medium">{sortedAthletes[1]?.athlete.full_name}</p>
              <p className="text-xs text-gray-400">{sortedAthletes[1]?.totalPoints} pts</p>
            </div>
            <div className="text-center pb-4">
              <div className="w-20 h-20 rounded-full bg-yellow-100 border-2 border-yellow-400 flex items-center justify-center text-xl font-bold text-yellow-700 mb-2">1</div>
              <p className="text-sm font-medium">{sortedAthletes[0]?.athlete.full_name}</p>
              <p className="text-xs text-gray-400">{sortedAthletes[0]?.totalPoints} pts</p>
            </div>
            <div className="text-center pb-1">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-lg font-bold text-orange-700 mb-2">3</div>
              <p className="text-xs font-medium">{sortedAthletes[2]?.athlete.full_name}</p>
              <p className="text-xs text-gray-400">{sortedAthletes[2]?.totalPoints} pts</p>
            </div>
          </div>
        )}

        {/* Tabla matriz */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-2 text-left font-medium text-gray-500 w-10">#</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Atleta</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 text-xs">Cat</th>
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
              {sortedAthletes.map((entry, idx) => (
                <tr key={entry.athlete.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-3 font-bold text-gray-900">{idx + 1}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900">{entry.athlete.full_name}</div>
                    <div className="text-xs text-gray-400">#{entry.athlete.bib_number}</div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400">{entry.athlete.categories?.name}</td>
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

        {sortedAthletes.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No hay scores registrados aun.</p>
        )}
      </div>
    </main>
  )
}

function timeToSeconds(time: string): number {
  if (!time) return 999999
  const parts = time.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return parseInt(time) || 999999
}