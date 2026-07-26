import { supabase } from '../../../lib/supabase'
import { notFound } from 'next/navigation'

export default async function EventoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: event } = await supabase.from('events').select('*').eq('slug', slug).single()
  if (!event) { notFound() }

  const { data: categories } = await supabase.from('categories').select('*').eq('event_id', event.id)

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto">
        <a href="/" className="text-sm text-gray-500 hover:text-gray-900 mb-4 block">Volver</a>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-between items-start mb-3">
            <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700">
              {event.status === 'draft' ? 'Borrador' : event.status === 'live' ? 'En vivo' : 'Finalizado'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-1">Ubicacion: {event.location}</p>
          <p className="text-sm text-gray-500 mb-4">Fecha: {new Date(event.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p className="text-xs text-gray-400">Maximo {event.max_athletes} atletas</p>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 mb-3">Categorias</h2>
        
        {categories && categories.length > 0 ? (
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-white rounded-xl p-4 border border-gray-100 flex justify-between items-center">
                <span className="font-medium text-gray-900">{cat.name}</span>
                <span className="text-xs text-gray-400 uppercase">{cat.division}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No hay categorias registradas.</p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <a href={`/evento/${slug}/atletas`} className="bg-white text-gray-900 py-3 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 text-center">
            Atletas
          </a>
          <a href={`/evento/${slug}/wods`} className="bg-white text-gray-900 py-3 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 text-center">
            WODs
          </a>
          <button className="col-span-2 bg-black text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800">
            Leaderboard
          </button>
        </div>
      </div>
    </main>
  )
}