import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Modal from '../../components/common/Modal'
import { useAuth } from '../../context/AuthContext'

export default function Employees() {
  const [items, setItems] = useState([])
  const [teams, setTeams] = useState([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const { user } = useAuth()
  const [form, setForm] = useState({ fullName: '', username: '', email: '', employeeCode: '', teamId: '', joiningDate: new Date().toISOString().slice(0, 10), password: '' })
  const load = () => api.get('/employees', { params: { search, limit: 100 } }).then(({ data }) => setItems(data.items)).catch((e) => setError(e.response?.data?.message || 'Could not load employees'))
  useEffect(() => { load(); api.get('/teams').then(({ data }) => setTeams(data.items)).catch(() => {}) }, [search])
  const create = async (event) => {
    event.preventDefault()
    try {
      await api.post('/employees', form)
      toast.success('Employee created')
      setOpen(false)
      setForm({ fullName: '', username: '', email: '', employeeCode: '', teamId: '', joiningDate: new Date().toISOString().slice(0, 10), password: '' })
      load()
    } catch (e) { toast.error(e.response?.data?.message || 'Could not create employee') }
  }
  const changeStatus = async (item) => {
    const status = item.status === 'active' ? 'inactive' : 'active'
    try { await api.patch(`/employees/${item._id}/status`, { status }); toast.success(`Employee ${status}`); load() }
    catch (e) { toast.error(e.response?.data?.message || 'Could not update employee') }
  }
  return (
    <div>
      <PageHeader title="Employees" subtitle="Employee directory and account status" actions={user?.role === 'super_admin' && <button onClick={() => setOpen(true)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"><Plus size={16} className="mr-2 inline" />Add employee</button>} />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="mb-4"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee..." className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2.5" /></div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Team</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item._id} className="border-b last:border-0"><td className="px-4 py-3">{item.employeeCode}</td><td className="px-4 py-3 font-medium">{item.fullName}</td><td className="px-4 py-3">{item.teamId?.name || 'Unassigned'}</td><td className="px-4 py-3">{item.status}</td><td className="px-4 py-3">{user?.role === 'super_admin' && <button onClick={() => changeStatus(item)} className="text-blue-700">{item.status === 'active' ? 'Deactivate' : 'Activate'}</button>}</td></tr>)}</tbody>
        </table>
        {!items.length && <p className="p-8 text-center text-sm text-slate-500">No employees found.</p>}
      </div>
      {open && <Modal title="Create employee account" onClose={() => setOpen(false)}><form onSubmit={create} className="grid gap-4 sm:grid-cols-2">{[['fullName','Full name','text'],['username','Username','text'],['email','Email','email'],['employeeCode','Employee code','text'],['password','Temporary password (12+ characters)','password'],['joiningDate','Joining date','date']].map(([key,label,type]) => <label key={key} className="text-sm font-medium text-slate-700">{label}<input required type={type} minLength={key === 'password' ? 12 : undefined} value={form[key]} onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>)}<label className="text-sm font-medium text-slate-700 sm:col-span-2">Team<select value={form.teamId} onChange={(e) => setForm((v) => ({ ...v, teamId: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="">Unassigned</option>{teams.map((team) => <option key={team._id} value={team._id}>{team.name}</option>)}</select></label><div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2">Cancel</button><button className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Create employee</button></div></form></Modal>}
    </div>
  )
}
