import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const user = await login(email, password)
      navigate(user.role === 'employee' ? '/my-performance' : '/admin/dashboard')
      toast.success('Signed in successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sign in failed')
    } finally { setBusy(false) }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg">
        <div className="mb-7 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-blue-700 text-white"><LockKeyhole size={22} /></div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Nexemers International</h1>
          <p className="mt-1 text-sm text-slate-500">Employee Performance Management</p>
        </div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="email">Gmail, email or username</label>
        <input id="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="password">Password</label>
        <div className="relative mt-1.5">
          <input id="password" required type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-11 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
        <Link to="/forgot-password" className="mt-4 block text-right text-sm font-medium text-blue-700">Forgot password?</Link>
        <button disabled={busy} className="mt-6 w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </main>
  )
}
