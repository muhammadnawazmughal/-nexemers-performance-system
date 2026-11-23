import { useEffect, useState } from 'react'
import { Plus, UserRoundCog } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Modal from '../../components/common/Modal'
import { useAuth } from '../../context/AuthContext'

export default function Teams() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [supervisorOpen, setSupervisorOpen] = useState(false)
  const [supervisors, setSupervisors] = useState([])
  const [teamForm, setTeamForm] = useState({ name: '', code: '', description: '' })
  const [supervisorForm, setSupervisorForm] = useState({ name: '', email: '', username: '', password: '' })
  const { user } = useAuth()
  const load = () => api.get('/teams').then(({ data }) => setItems(data.items)).catch((e) => toast.error(e.response?.data?.message || 'Could not load teams'))
  useEffect(() => { load(); if (user?.role === 'super_admin') api.get('/teams/supervisors/list').then(({ data }) => setSupervisors(data.items)).catch(() => {}) }, [])
  const createTeam = async (event) => {
    event.preventDefault()
    try { await api.post('/teams', teamForm); toast.success('Team created'); setOpen(false); setTeamForm({ name: '', code: '', description: '' }); load() }
    catch (e) { toast.error(e.response?.data?.message || 'Could not create team') }
  }
  const createSupervisor = async (event) => {
    event.preventDefault()
    try {
      await api.post('/teams/supervisors', supervisorForm)
      toast.success('Supervisor created')
      setSupervisorOpen(false)
      setSupervisorForm({ name: '', email: '', username: '', password: '' })
      const { data } = await api.get('/teams/supervisors/list')
      setSupervisors(data.items)
    } catch (e) { toast.error(e.response?.data?.message || 'Could not create supervisor') }
  }
  const assign = async (teamId, supervisorId) => {
    try { await api.patch(`/teams/${teamId}/supervisor`, { supervisorId }); toast.success('Supervisor assigned'); load() }
    catch (e) { toast.error(e.response?.data?.message || 'Could not assign supervisor') }
  }
  return <div><PageHeader title="Teams & Supervisors" subtitle="Configurable organization structure" actions={user?.role === 'super_admin' && <div className="flex gap-2"><button onClick={() => setSupervisorOpen(true)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><UserRoundCog size={16} className="mr-1 inline" />New supervisor</button><button onClick={() => setOpen(true)} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white"><Plus size={16} className="mr-1 inline" />New team</button></div>} /><div className="grid gap-4 sm:grid-cols-2">{items.map((item) => <article key={item._id} className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">{item.name}</h2><p className="mt-1 text-sm text-slate-500">{item.code} - {item.description || 'No description'}</p><p className="mt-3 text-sm">Supervisor: {item.supervisorId?.name || 'Not assigned'}</p>{user?.role === 'super_admin' && <select value={item.supervisorId?._id || ''} onChange={(e) => e.target.value && assign(item._id, e.target.value)} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Assign supervisor...</option>{supervisors.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.email})</option>)}</select>}</article>)}</div>{!items.length && <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No teams configured yet.</p>}
    {open && <Modal title="Create team" onClose={() => setOpen(false)}><form onSubmit={createTeam} className="space-y-4">{[['name','Team name'],['code','Team code'],['description','Description']].map(([key,label]) => <label key={key} className="block text-sm font-medium">{label}<input required={key !== 'description'} value={teamForm[key]} onChange={(e) => setTeamForm((v) => ({ ...v, [key]: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>)}<button className="w-full rounded-lg bg-blue-700 py-2.5 font-semibold text-white">Create team</button></form></Modal>}
    {supervisorOpen && <Modal title="Create supervisor account" onClose={() => setSupervisorOpen(false)}><form onSubmit={createSupervisor} className="space-y-4">{[['name','Full name','text'],['email','Email','email'],['username','Username','text'],['password','Temporary password (12+ characters)','password']].map(([key,label,type]) => <label key={key} className="block text-sm font-medium">{label}<input required type={type} minLength={key === 'password' ? 12 : undefined} value={supervisorForm[key]} onChange={(e) => setSupervisorForm((v) => ({ ...v, [key]: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>)}<button className="w-full rounded-lg bg-blue-700 py-2.5 font-semibold text-white">Create supervisor</button></form></Modal>}
  </div>
}
