import { X } from 'lucide-react'

export default function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-slate-950/50 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-label={title} className="my-auto w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl md:p-7">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">{title}</h2><button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
        {children}
      </section>
    </div>
  )
}
