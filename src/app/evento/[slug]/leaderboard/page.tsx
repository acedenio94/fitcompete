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

  const { data: workouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('event_id', event.id)
    .order('order_index')

  const { data: scores } = await supabase
    .from('scores')
    .select('*, athletes(id), workouts(id, scoring_type)')
    .in('athlete_id', athletes?.map(a => a.id) || [])

  // Calcular puntos por atleta
  const athleteScores: Record<number, { athlete: any; workoutScores: Record<number, any>; totalPoints: number }> = {}

  athletes?.forEach(a => {
    athleteScores[a.id] = { athlete: a, workoutScores: {}, totalPoints: 0 }
  })

  // Agrupar scores por WOD y calcular rankings
  const scoresByWorkout: Record<number, any[]> = {}
  scores?.forEach(s => {
    if (!scoresByWorkout[s.workout_id]) scoresByWorkout[s.workout_id] = []
    scoresByWorkout[s.workout_id].push(s)
  })

  // Para cada WOD, ordenar y asignar puntos
  workouts?.forEach(w => {
    const wodScores = scoresByWorkout[w.id] || []
    let sorted = [...wodScores]

    if (w.scoring_type === 'for_time') {
      // Menor tiempo gana
      sorted.sort((a, b) => {
        const ta = timeToSeconds(a.raw_score)
        const tb = timeToSeconds(b.raw_score)
        return ta - tb
      })
    } else if (w.scoring_type === 'amrap') {
      // Mas reps gana
      sorted.sort((a, b) => parseInt(b.raw_score) - parseInt(a.raw_score))
    } else {
      // Max weight - mas peso gana
      sorted.sort((a, b) => parseInt(b.raw_score) - parseInt(a.raw_score))
    }

    sorted.forEach((s, idx) => {
      const points = idx + 1 // 1er lugar = 1 punto, 2do = 2 puntos, etc. (menor gana)
      if (athleteScores[s.athlete_id]) {
        athleteScores[s.athlete_id].workoutScores[w.id] = { ...s, rank: idx + 1, points }
        athleteScores[s.athlete_id].totalPoints += points
      }
    })
  })

  // Ordenar atletas por puntos totales (menor = mejor)
  const sortedAthletes = Object.values(athleteScores).sort((a, b) => a.totalPoints - b.totalPoints)

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <a href={`/evento/${slug}`} className="text-sm text-gray-500 hover:text-gray-900 mb-4 block">Volver al evento</a>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Leaderboard</h1>
        <p className="text-sm text-gray-500 mb-6">{event.name}</p>

        {/* Podio */}
        {sortedAthletes.length >= 3 && (
          <div className="flex justify-center items-end gap-3 mb-8">
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

        {/* Tabla completa */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 px-4 py-2">
            <span className="w-10">#</span>
            <span className="flex-1">Atleta</span>
            <span className="w-16 text-right">Pts</span>
          </div>
          {sortedAthletes.map((entry, idx) => (
            <div key={entry.athlete.id} className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0">
              <span className="w-10 text-sm font-bold text-gray-900">{idx + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{entry.athlete.full_name}</p>
                <p className="text-xs text-gray-400">{entry.athlete.categories?.name}</p>
              </div>
              <span className="w-16 text-right text-sm font-bold text-gray-900">{entry.totalPoints}</span>
            </div>
          ))}
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