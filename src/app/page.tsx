import { supabase } from '../lib/supabase'

export default async function HomePage() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true })

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Error al cargar eventos: {error.message}</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto">
        {/* Header con logo */}
        <div className="flex items-center gap-3 mb-2">
          <img src="/fitcompete-logo.png" alt="FitCompete" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FitCompete</h1>
            <p className="text-sm text-gray-500">Scoring en vivo para competencias de CrossFit</p>
          </div>
        </div>

        <div className="h-px bg-gray-200 my-6" />

        {events && events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => (
              <a
                key={event.id}
                href={`/evento/${event.slug}`}
                className="block bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                {event.image_url && (
                  <img 
                    src={event.image_url} 
                    alt={event.name} 
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-lg font-semibold text-gray-900">{event.name}</h2>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      event.status === 'live' 
                        ? 'bg-green-100 text-green-700' 
                        : event.status === 'finished'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {event.status === 'draft' ? 'Borrador' : event.status === 'live' ? 'En vivo' : 'Finalizado'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">📍 {event.location}</p>
                  <p className="text-sm text-gray-500">📅 {new Date(event.date).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                  <div className="mt-3 flex items-center text-xs text-gray-400">
                    <span>👥 Máx {event.max_athletes} atletas</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
            <p className="text-gray-400">No hay eventos creados aún.</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <a
            href="/nuevo-evento"
            className="inline-block bg-black text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            + Crear nuevo evento
          </a>
        </div>
      </div>
    </main>
  )
}