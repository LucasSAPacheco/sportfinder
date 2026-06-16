import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function ImageViewer({ src, onClose }) {
  useEffect(() => {
    if (!src) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [src, onClose])

  if (!src) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X size={20} className="text-white" />
      </button>
      <img
        src={src}
        alt=""
        className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
