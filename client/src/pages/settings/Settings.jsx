import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../../services/api'
import PageHeader from '../../components/common/PageHeader'

const initialTarget = {
  subjectType: 'employee',
  subjectId: '',
  idDailyTarget: 5,
  salesDailyTarget: 0,
  effectiveFrom: new Date().toISOString().slice(0, 10),
}

export default function Settings() {
  const [item, setItem] = useState({ companyName: '', timezone: 'Asia/Karachi', currency: 'PKR', defaultIdDailyTarget: 5, defaultSalesDailyTarget: 0 })
  const [employees, setEmployees] = useState([])
  const [teams, setTeams] = useState([])
  const [targets, setTargets] = useState([])
  const [target, setTarget] = useState(initialTarget)

  const loadTargets = () => api.get('/targets').then(({ data }) => setTargets(data.items)).catch((error) => toast.error(error.response?.data?.message || 'Could not load targets'))
  useEffect(() => {
    api.get('/settings').then(({ data }) => setItem(data.item)).catch((error) => toast.error(error.response?.data?.message || 'Could not load settings'))
    api.get('/employees', { params: { limit: 100 } }).then(({ data }) => setEmployees(data.items)).catch((error) => toast.error(error.response?.data?.message || 'Could not load employees'))
    api.get('/teams').then(({ data }) => setTeams(data.items)).catch((error) => toast.error(error.response?.data?.message || 'Could not load teams'))
    loadTargets()
  }, [])

  const save = async () => {
    try { await api.patch('/settings', item); toast.success('Settings saved') }
    catch (error) { toast.error(error.response?.data?.message || 'Could not save settings') }
  }
  const saveTarget = async (event) => {
    event.preventDefault()
    const isEmployee = target.subjectType === 'employee'
    try {
      await api.post('/targets', {
        employeeId: isEmployee ? target.subjectId : null,
        teamId: isEmployee ? null : target.subjectId,
        idDailyTarget: Number(target.idDailyTarget),
        salesDailyTarget: Number(target.salesDailyTarget),
        effectiveFrom: target.effectiveFrom,
      })
      toast.success('Target saved')
      setTarget(initialTarget)
      loadTargets()
    } catch (error) { toast.error(error.response?.data?.message || 'Could not save target') }
  }
  const set = (key) => (event) => setItem((v) => ({ ...v, [key]: event.target.value }))

  return <div>
    <PageHeader title="Company Settings" subtitle="Company details and effective-dated performance targets" />
    <section className="mb-6 grid max-w-2xl gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
      {[['companyName', 'Company name', 'text'], ['timezone', 'Timezone', 'text'], ['currency', 'Currency', 'text'], ['defaultIdDailyTarget', 'Default ID target', 'number'], ['defaultSalesDailyTarget', 'Default sales target', 'number']].map(([key, label, type]) =>
        <label key={key} className="text-sm font-medium text-slate-700">{label}<input type={type} value={item[key] ?? ''} onChange={set(key)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      )}
      <button onClick={save} className="h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white md:col-span-2">Save settings</button>
    </section>

    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 text-lg font-semibold">Set performance target</h2>
      <p className="mb-4 text-sm text-slate-500">Targets apply to an employee or team from the selected date.</p>
      <form onSubmit={saveTarget} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">Target for<select value={target.subjectType} onChange={(event) => setTarget((v) => ({ ...v, subjectType: event.target.value, subjectId: '' }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5"><option value="employee">Employee</option><option value="team">Team</option></select></label>
        <label className="text-sm font-medium">{target.subjectType === 'employee' ? 'Employee' : 'Team'}<select required value={target.subjectId} onChange={(event) => setTarget((v) => ({ ...v, subjectId: event.target.value }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5"><option value="">Select {target.subjectType}</option>{(target.subjectType === 'employee' ? employees : teams).map((subject) => <option key={subject._id} value={subject._id}>{target.subjectType === 'employee' ? subject.fullName : subject.name}</option>)}</select></label>
        <label className="text-sm font-medium">Daily ID target<input required min="0" type="number" value={target.idDailyTarget} onChange={(event) => setTarget((v) => ({ ...v, idDailyTarget: event.target.value }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5" /></label>
        <label className="text-sm font-medium">Daily sales target<input required min="0" type="number" value={target.salesDailyTarget} onChange={(event) => setTarget((v) => ({ ...v, salesDailyTarget: event.target.value }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5" /></label>
        <label className="text-sm font-medium">Effective from<input required type="date" value={target.effectiveFrom} onChange={(event) => setTarget((v) => ({ ...v, effectiveFrom: event.target.value }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5" /></label>
        <button className="self-end rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">Save target</button>
      </form>
    </section>

    <section className="rounded-xl border border-slate-200 bg-white">
      <h2 className="border-b p-4 font-semibold">Configured targets</h2>
      {targets.map((entry) => <div key={entry._id} className="flex flex-wrap justify-between gap-2 border-b p-4 text-sm last:border-0"><span>{entry.employeeId?.fullName || entry.teamId?.name || 'Unknown'}</span><span>{entry.idDailyTarget} IDs / day</span><span>{entry.salesDailyTarget} sales / day</span><span>From {entry.effectiveFrom?.slice(0, 10)}</span></div>)}
      {!targets.length && <p className="p-6 text-center text-sm text-slate-500">No individual or team targets configured yet.</p>}
    </section>
  </div>
}
