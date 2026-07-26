import { supabase } from '../../../../lib/supabase'
import { notFound, redirect } from 'next/navigation'

export default async function JuezPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: event } = await supabase.from('events').select('*').eq('slug', slug).single()
  if (!event) notFound()

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

  async function guardarScore(formData: FormData) {
    'use server'
    const athlete_id = formData.get('athlete_id') as string
    const workout_id = formData.get('workout_id') as string
    const raw_score = formData.get('raw_score') as string
    const tiebreak = formData.get('tiebreak') as string
    const judge_notes = formData.get('judge_notes') as string

    await supabase.from('scores').insert({
      athlete_id,
      workout_id,
      raw_score,
      tiebreak: tiebreak || null,
      judge_notes: judge_notes || null
    })

    redirect(`/evento/${slug}/juez`)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto">
        <a href={`/evento/${slug}`} className="text-sm text-gray-500 hover:text-gray-900 mb-4 block">Volver al evento</a>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Modo Juez</h1>
        <p className="text-sm text-gray-500 mb-6">{event.name}</p>

        <form action={guardarScore} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Entrar Score</h2>

          <select name="workout_id" required className="w-full mb-3 px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Seleccionar WOD</option>
            {workouts?.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.scoring_type})</option>
            ))}
          </select>

          <select name="athlete_id" required className="w-full mb-3 px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Seleccionar atleta</option>
            {athletes?.map((a) => (
              <option key={a.id} value={a.id}>#{a.bib_number} {a.full_name} ({a.categories?.name})</option>
            ))}
          </select>

          <input name="raw_score" placeholder="Score (ej: 4:32, 142 reps, 120kg)" required className="w-full mb-3 px-3 py-2 border rounded-lg text-sm" />

          <input name="tiebreak" placeholder="Tiebreak (opcional)" className="w-full mb-3 px-3 py-2 border rounded-lg text-sm" />

          <input name="judge_notes" placeholder="Notas del juez (opcional)" className="w-full mb-4 px-3 py-2 border rounded-lg text-sm" />

          <button type="submit" className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium">Guardar Score</button>
        </form>

        <h2 className="text-sm font-semibold text-gray-900 mb-3">Scores registrados</h2>
        <ScoresList eventId={event.id} />
      </div>
    </main>
  )
}

async function ScoresList({ eventId }: { eventId: number }) {
  const { data: scores } = await supabase
    .from('scores')
    .select('*, athletes(full_name, bib_number), workouts(name)')
    .eq('workouts.event_id', eventId)
    .order('created_at', { ascending: false })

  if (!scores || scores.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">No hay scores registrados.</p>
  }

  return (
    <div className="space-y-2">
      {scores.map((s) => (
        <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-gray-900 text-sm">#{s.athletes?.bib_number} {s.athletes?.full_name}</p>
              <p className="text-xs text-gray-400">{s.workouts?.name}</p>
            </div>
            <span className="text-sm font-bold text-gray-900">{s.raw_score}</span>
          </div>
          {s.tiebreak && <p className="text-xs text-gray-400 mt-1">Tiebreak: {s.tiebreak}</p>}
        </div>
      ))}
    </div>
  )
}