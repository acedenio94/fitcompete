import { supabase } from '../../../../lib/supabase'
import { notFound, redirect } from 'next/navigation'

export default async function AtletasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: event } = await supabase.from('events').select('*').eq('slug', slug).single()
  if (!event) notFound()

  const { data: categories } = await supabase.from('categories').select('*').eq('event_id', event.id)
  const { data: athletes } = await supabase.from('athletes').select('*, categories(name)').eq('event_id', event.id).order('bib_number')

  async function registrarAtleta(formData: FormData) {
    'use server'
    const full_name = formData.get('full_name') as string
    const category_id = formData.get('category_id') as string
    const bib_number = parseInt(formData.get('bib_number') as string)
    const email = formData.get('email') as string
    const affiliate = formData.get('affiliate') as string

    await supabase.from('athletes').insert({
      event_id: event.id,
      category_id,
      full_name,
      bib_number,
      email: email || null,
      affiliate: affiliate || null
    })

    redirect(`/evento/${slug}/atletas`)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto">
        <a href={`/evento/${slug}`} className="text-sm text-gray-500 hover:text-gray-900 mb-4 block">{'\u2190'} Volver al evento</a>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Atletas</h1>
        <p className="text-sm text-gray-500 mb-6">{event.name}</p>

        <form action={registrarAtleta} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Registrar atleta</h2>
          <input name="full_name" placeholder="Nombre completo" required className="w-full mb-3 px-3 py-2 border rounded-lg text-sm" />
          <input name="email" type="email" placeholder="Email (opcional)" className="w-full mb-3 px-3 py-2 border rounded-lg text-sm" />
          <input name="affiliate" placeholder="Box / Affiliate (opcional)" className="w-full mb-3 px-3 py-2 border rounded-lg text-sm" />
          <input name="bib_number" type="number" placeholder="Dorsal #" required className="w-full mb-3 px-3 py-2 border rounded-lg text-sm" />
          <select name="category_id" required className="w-full mb-4 px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Seleccionar categoria</option>
            {categories?.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
          </select>
          <button type="submit" className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium">+ Registrar atleta</button>
        </form>

        <h2 className="text-sm font-semibold text-gray-900 mb-3">Atletas registrados ({athletes?.length || 0}/{event.max_athletes})</h2>
        {athletes && athletes.length > 0 ? (
          <div className="space-y-2">
            {athletes.map((a) => (<div key={a.id} className="bg-white rounded-xl p-4 border border-gray-100 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">#{a.bib_number} {a.full_name}</p>
                <p className="text-xs text-gray-400">{a.categories?.name} {a.affiliate ? `• ${a.affiliate}` : ''}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Activo</span>
            </div>))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">No hay atletas registrados.</p>
        )}
      </div>
    </main>
  )
}