import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../../services/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      await api.post('/auth/reset-password', { token: params.get('token') || '', password })
      toast.success('Password reset successfully')
      navigate('/login')
    } catch (error) { toast.error(error.response?.data?.message || 'Password reset failed') }
    finally { setBusy(false) }
  }
  return <main className="grid min-h-screen place-items-center bg-slate-100 px-4"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg"><h1 className="text-2xl font-bold text-slate-900">Set a new password</h1><input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /><button disabled={busy} className="mt-5 w-full rounded-lg bg-blue-700 py-3 font-semibold text-white">{busy ? 'Saving...' : 'Reset password'}</button><Link to="/login" className="mt-5 block text-center text-sm text-blue-700">Back to sign in</Link></form></main>
}
