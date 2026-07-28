import { supabase } from '../../../lib/supabase'
import { notFound, redirect } from 'next/navigation'

export default async function WodsPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>
  searchParams: Promise<{ admin?: string; editar?: string }>
}) {
  const { slug } = await params
  const { admin, editar } = await searchParams

  const { data: event } = await supabase.from('events').select('*').eq('slug', slug).single()
  if (!event) notFound()

  if (admin !== event.admin_password) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-md mx-auto text-center">
          <p className="text-red-500 mb-4">Acceso denegado. Se requiere contraseña de administrador.</p>
          <a href={`/evento/${slug}`} className="text-sm text-gray-500 hover:text-gray-900">Volver al evento</a>
        </div>
      </main>
    )
  }

  const { data: workouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('event_id', event.id)
    .order('order_index')

  // Si hay un WOD para editar, cargarlo
  let wodEditar = null
  if (editar) {
    const { data } = await supabase.from('workouts').select('*').eq('id', parseInt(editar)).single()
    wodEditar = data
  }

  async function crearWod(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const scoring_type = formData.get('scoring_type') as string
    const time_cap_minutes = parseInt(formData.get('time_cap_minutes') as string) || null
    const order_index = parseInt(formData.get('order_index') as string) || 1
    const wodId = formData.get('wod_id') as string

    if (wodId) {
      // Editar existente
      await supabase.from('workouts').update({
        name,
        description,
        scoring_type,
        time_cap_minutes,
        order_index
      }).eq('id', parseInt(wodId))
    } else {
      // Crear nuevo
      await supabase.from('workouts').insert({
        event_id: event.id,
        name,
        description,
        scoring_type,
        time_cap_minutes,
        order_index
      })
    }

    redirect(`/evento/${slug}/wods?admin=${admin}`)
  }

  async function eliminarWod(formData: FormData) {
    'use server'
    const wodId = formData.get('wod_id') as string
    await supabase.from('workouts').delete().eq('id', parseInt(wodId))
    redirect(`/evento/${slug}/wods?admin=${admin}`)
  }

  const tipoLabel: Record<string, string> = {
    for_time: 'For Time',
    amrap: 'AMRAP',
    max_weight: 'Max Weight'
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto">
        <a href={`/evento/${slug}?admin=${admin}`} className="text-sm text-gray-500 hover:text-gray-900 mb-4 block">Volver al evento</a>
        <h1 className="text-xl font-bold text-gray-900 mb-1">WODs</h1>
        <p className="text-sm text-gray-500 mb-6">{event.name}</p>

        {/* Formulario: Crear o Editar */}
        <form action={crearWod} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            {wodEditar ? 'Editar WOD' : 'Programar WOD'}
          </h2>
          
          {wodEditar && <input type="hidden" name="wod_id" value={wodEditar.id} />}
          
          <input 
            name="name" 
            placeholder="Nombre del WOD (ej: WOD 1 - Fran)" 
            required 
            defaultValue={wodEditar?.name || ''}
            className="w-full mb-3 px-3 py-2 border rounded-lg text-sm" 
          />
          <textarea 
            name="description" 
            placeholder="Descripcion (ej: 21-15-9 thrusters + pull-ups)" 
            rows={3} 
            defaultValue={wodEditar?.description || ''}
            className="w-full mb-3 px-3 py-2 border rounded-lg text-sm resize-none" 
          />
          <select 
            name="scoring_type" 
            required 
            defaultValue={wodEditar?.scoring_type || 'for_time'}
            className="w-full mb-3 px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="for_time">For Time (menor tiempo gana)</option>
            <option value="amrap">AMRAP (mas reps gana)</option>
            <option value="max_weight">Max Weight (mas peso gana)</option>
          </select>
          <input 
            name="time_cap_minutes" 
            type="number" 
            placeholder="Time cap en minutos (opcional)" 
            defaultValue={wodEditar?.time_cap_minutes || ''}
            className="w-full mb-3 px-3 py-2 border rounded-lg text-sm" 
          />
          <input 
            name="order_index" 
            type="number" 
            placeholder="Orden (1, 2, 3...)" 
            defaultValue={wodEditar?.order_index || 1}
            className="w-full mb-4 px-3 py-2 border rounded-lg text-sm" 
          />
          
          <button type="submit" className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium">
            {wodEditar ? 'Guardar cambios' : '+ Programar WOD'}
          </button>
          
          {wodEditar && (
            <a href={`/evento/${slug}/wods?admin=${admin}`} className="block text-center text-sm text-gray-500 mt-2 hover:text-gray-900">
              Cancelar edicion
            </a>
          )}
        </form>

        {/* Lista de WODs */}
        <h2 className="text-sm font-semibold text-gray-900 mb-3">WODs programados ({workouts?.length || 0})</h2>
        
        {workouts && workouts.length > 0 ? (
          <div className="space-y-3">
            {workouts.map((wod) => (
              <div key={wod.id} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">{wod.name}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{tipoLabel[wod.scoring_type]}</span>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-line mb-2">{wod.description}</p>
                {wod.time_cap_minutes && <p className="text-xs text-gray-400 mb-2">Time cap: {wod.time_cap_minutes} min</p>}
                
                <div className="flex gap-2 mt-3">
                  <a 
                    href={`/evento/${slug}/wods?admin=${admin}&editar=${wod.id}`}
                    className="flex-1 text-center py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Editar
                  </a>
                  <form action={eliminarWod} className="flex-1">
                    <input type="hidden" name="wod_id" value={wod.id} />
                    <button 
                      type="submit" 
                      className="w-full py-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">No hay WODs programados.</p>
        )}
      </div>
    </main>
  )
}