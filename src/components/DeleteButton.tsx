'use client'

export default function DeleteButton({ className }: { className: string }) {
  return (
    <button 
      type="submit" 
      className={className}
      onClick={(e) => {
        if (!confirm('¿Eliminar este atleta?')) {
          e.preventDefault()
        }
      }}
    >
      Eliminar
    </button>
  )
}