import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetToken, setResetToken] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setResetToken(data.resetToken || '')
      toast.success(data.message)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Reset request failed')
    } finally { setBusy(false) }
  }
  return <main className="grid min-h-screen place-items-center bg-slate-100 px-4"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg"><h1 className="text-2xl font-bold text-slate-900">Forgot password</h1><p className="mt-2 text-sm text-slate-500">Enter your account email.</p><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /><button disabled={busy} className="mt-5 w-full rounded-lg bg-blue-700 py-3 font-semibold text-white">{busy ? 'Submitting...' : 'Request reset'}</button>{resetToken && <Link to={`/reset-password?token=${encodeURIComponent(resetToken)}`} className="mt-4 block rounded-lg bg-amber-50 p-3 text-center text-sm font-medium text-amber-800">Development reset link is ready. Click to set a new password.</Link>}<Link to="/login" className="mt-5 block text-center text-sm text-blue-700">Back to sign in</Link></form></main>
}
