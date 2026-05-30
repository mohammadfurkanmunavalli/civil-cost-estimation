import { AlertTriangle, X } from 'lucide-react'

interface Props {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmModal({ title, message, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-sm shadow-2xl animate-in">
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={22} className="text-danger" />
          </div>
          <h2 className="font-semibold text-white text-lg">{title}</h2>
          <p className="text-surface-muted text-sm mt-2 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onCancel} className="btn-outline flex-1">Cancel</button>
          <button onClick={onConfirm} className="btn-danger flex-1">Delete</button>
        </div>
      </div>
    </div>
  )
}
