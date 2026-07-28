import { supabase } from '../../../../lib/supabase'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import DeleteButton from '@/components/DeleteButton'

export default async function AtletasPage({ 
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
          <Link href={`/evento/${slug}`} className="text-sm text-gray-500 hover:text-gray-900">Volver al evento</Link>
        </div>
      </main>
    )
  }

  const { data: categories } = await supabase.from('categories').select('*').eq('event_id', event.id)
  const { data: athletes } = await supabase
    .from('athletes')
    .select('*, categories(name)')
    .eq('event_id', event.id)
    .order('bib_number')

  let atletaEditar = null
  if (editar) {
    const { data } = await supabase.from('athletes').select('*').eq('id', parseInt(editar)).single()
    atletaEditar = data
  }

  async function registrarAtleta(formData: FormData) {
    'use server'
    const full_name = formData.get('full_name') as string
    const category_id = formData.get('category_id') as string
    const bib_number = parseInt(formData.get('bib_number') as string)
    const email = formData.get('email') as string
    const affiliate = formData.get('affiliate') as string
    const atletaId = formData.get('atleta_id') as string

    if (isNaN(bib_number)) {
      throw new Error('El dorsal debe ser un número válido')
    }

    if (atletaId) {
      await supabase.from('athletes').update({
        full_name,
        category_id,
        bib_number,
        email: email || null,
        affiliate: affiliate || null
      }).eq('id', parseInt(atletaId))
    } else {
      await supabase.from('athletes').insert({
        event_id: event.id,
        category_id,
        full_name,
        bib_number,
        email: email || null,
        affiliate: affiliate || null
      })
    }

    redirect(`/evento/${slug}/atletas?admin=${admin}`)
  }

  async function eliminarAtleta(formData: FormData) {
    'use server'
    const atletaId = formData.get('atleta_id') as string
    await supabase.from('athletes').delete().eq('id', parseInt(atletaId))
    redirect(`/evento/${slug}/atletas?admin=${admin}`)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto">
        <Link href={`/evento/${slug}?admin=${admin}`} className="text-sm text-gray-500 hover:text-gray-900 mb-4 block">Volver al evento</Link>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Atletas</h1>
        <p className="text-sm text-gray-500 mb-6">{event.name}</p>

        <form action={registrarAtleta} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            {atletaEditar ? 'Editar atleta' : 'Registrar atleta'}
          </h2>
          
          {atletaEditar && <input type="hidden" name="atleta_id" value={atletaEditar.id} />}
          
          <input 
            name="full_name" 
            placeholder="Nombre completo" 
            required 
            defaultValue={atletaEditar?.full_name || ''}
            className="w-full mb-3 px-3 py-2 border rounded-lg text-sm" 
          />
          <input 
            name="email" 
            type="email" 
            placeholder="Email (opcional)" 
            defaultValue={atletaEditar?.email || ''}
            className="w-full mb-3 px-3 py-2 border rounded-lg text-sm" 
          />
          <input 
            name="affiliate" 
            placeholder="Box / Affiliate (opcional)" 
            defaultValue={atletaEditar?.affiliate || ''}
            className="w-full mb-3 px-3 py-2 border rounded-lg text-sm" 
          />
          <input 
            name="bib_number" 
            type="number" 
            placeholder="Dorsal #" 
            required 
            defaultValue={atletaEditar?.bib_number || ''}
            className="w-full mb-3 px-3 py-2 border rounded-lg text-sm" 
          />
          <select 
            name="category_id" 
            required 
            defaultValue={atletaEditar?.category_id || ''}
            className="w-full mb-4 px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="">Seleccionar categoria</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          
          <button type="submit" className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium">
            {atletaEditar ? 'Guardar cambios' : '+ Registrar atleta'}
          </button>
          
          {atletaEditar && (
            <Link href={`/evento/${slug}/atletas?admin=${admin}`} className="block text-center text-sm text-gray-500 mt-2 hover:text-gray-900">
              Cancelar edicion
            </Link>
          )}
        </form>

        <h2 className="text-sm font-semibold text-gray-900 mb-3">Atletas registrados ({athletes?.length || 0}/{event.max_athletes})</h2>
        
        {athletes && athletes.length > 0 ? (
          <div className="space-y-3">
            {athletes.map((a) => (
              <div key={a.id} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">#{a.bib_number} {a.full_name}</p>
                    <p className="text-xs text-gray-400">{a.categories?.name} {a.affiliate ? `• ${a.affiliate}` : ''}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Activo</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Link 
                    href={`/evento/${slug}/atletas?admin=${admin}&editar=${a.id}`}
                    className="flex-1 text-center py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Editar
                  </Link>
                  <form action={eliminarAtleta} className="flex-1">
                    <input type="hidden" name="atleta_id" value={a.id} />
                    <DeleteButton className="w-full py-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100" />
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">No hay atletas registrados.</p>
        )}
      </div>
    </main>
  )
}