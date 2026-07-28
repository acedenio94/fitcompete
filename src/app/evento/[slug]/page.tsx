import { supabase } from '../../../lib/supabase'
import { notFound, redirect } from 'next/navigation'

export default async function EventoPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>
  searchParams: Promise<{ admin?: string }>
}) {
  const { slug } = await params
  const { admin } = await searchParams

  const { data: event } = await supabase.from('events').select('*').eq('slug', slug).single()
  if (!event) notFound()

  const { data: categories } = await supabase.from('categories').select('*').eq('event_id', event.id)

  const esAdmin = admin === event.admin_password

  async function cambiarEstado() {
    'use server'
    if (!esAdmin) return
    const nuevoEstado = event.status === 'draft' ? 'live' : event.status === 'live' ? 'finished' : 'draft'
    await supabase.from('events').update({ status: nuevoEstado }).eq('id', event.id)
    redirect(`/evento/${slug}?admin=${admin}`)
  }

  async function crearCategoria(formData: FormData) {
    'use server'
    if (!esAdmin) return
    const name = formData.get('name') as string
    const gender = formData.get('gender') as string
    const division = formData.get('division') as string

    await supabase.from('categories').insert({
      event_id: event.id,
      name,
      gender,
      division
    })

    redirect(`/evento/${slug}?admin=${admin}`)
  }

  const estadoLabel: Record<string, string> = {
    draft: 'Borrador',
    live: 'En vivo',
    finished: 'Finalizado'
  }

  const estadoColor: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-700',
    live: 'bg-green-100 text-green-700',
    finished: 'bg-gray-100 text-gray-600'
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto">
        <a href="/" className="text-sm text-gray-500 hover:text-gray-900 mb-4 block">Volver</a>
        
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 mb-6">
          {event.image_url && (
            <img 
              src={event.image_url} 
              alt={event.name} 
              className="w-full h-48 object-cover"
            />
          )}
          <div className="p-6">
            <div className="flex justify-between items-start mb-3">
              <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${estadoColor[event.status]}`}>
                {estadoLabel[event.status]}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-1">Ubicacion: {event.location}</p>
            <p className="text-sm text-gray-500 mb-4">Fecha: {new Date(event.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="text-xs text-gray-400">Maximo {event.max_athletes} atletas</p>

            {esAdmin && (
              <form action={cambiarEstado} className="mt-4">
                <button type="submit" className={`w-full py-2.5 rounded-lg text-sm font-medium ${
                  event.status === 'draft' 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : event.status === 'live'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}>
                  {event.status === 'draft' ? 'Iniciar competencia' : event.status === 'live' ? 'Finalizar competencia' : 'Reiniciar'}
                </button>
              </form>
            )}
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 mb-3">Categorias</h2>
        
        {categories && categories.length > 0 ? (
          <div className="space-y-3 mb-6">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-white rounded-xl p-4 border border-gray-100 flex justify-between items-center">
                <span className="font-medium text-gray-900">{cat.name}</span>
                <span className="text-xs text-gray-400 uppercase">{cat.division}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm mb-6">No hay categorias registradas.</p>
        )}

        {esAdmin && (
          <form action={crearCategoria} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Agregar categoria</h3>
            <input name="name" placeholder="Nombre (ej: RX Masculino)" required className="w-full mb-3 px-3 py-2 border rounded-lg text-sm" />
            <select name="gender" required className="w-full mb-3 px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Genero</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </select>
            <select name="division" required className="w-full mb-4 px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">Division</option>
              <option value="rx">RX</option>
              <option value="scaled">Scaled</option>
              <option value="masters">Masters</option>
            </select>
            <button type="submit" className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium">+ Agregar categoria</button>
          </form>
        )}

        {/* Botones de navegacion - Visibles para todos */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {esAdmin ? (
            <>
              <a href={`/evento/${slug}/atletas?admin=${admin}`} className="bg-white text-gray-900 py-3 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 text-center">
                Atletas
              </a>
              <a href={`/evento/${slug}/wods?admin=${admin}`} className="bg-white text-gray-900 py-3 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 text-center">
                WODs
              </a>
            </>
          ) : null}
          
          <a href={`/evento/${slug}/leaderboard`} className={`bg-black text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 text-center ${!esAdmin ? 'col-span-2' : ''}`}>
            Ver Leaderboard
          </a>
          
          {esAdmin && (
            <a href={`/evento/${slug}/juez`} className="bg-white text-gray-900 py-3 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 text-center">
              Modo Juez
            </a>
          )}
        </div>

        {/* Display para TV - Visible para todos */}
        <a href={`/evento/${slug}/display`} target="_blank" className="block w-full bg-purple-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-purple-700 text-center mb-4">
          📺 Abrir Display para TV
        </a>

        {!esAdmin && (
          <div className="mt-4 bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Acceso de administrador</p>
            <form action={`/evento/${slug}`} method="GET" className="flex gap-2">
              <input type="password" name="admin" placeholder="Contraseña" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
              <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">Entrar</button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}