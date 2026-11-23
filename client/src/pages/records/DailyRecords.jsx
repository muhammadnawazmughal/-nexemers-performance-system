import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Modal from '../../components/common/Modal'
import { useAuth } from '../../context/AuthContext'

export default function DailyRecords() {
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [date, setDate] = useState('')
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const [form, setForm] = useState({ employeeId: '', workDate: new Date().toISOString().slice(0, 10), totalIds: '', locations: [{ city: '', state: '', count: '' }], notes: '' })
  const load = () => api.get('/daily-records', { params: date ? { fromDate: date, toDate: date } : {} }).then(({ data }) => setItems(data.items)).catch((e) => toast.error(e.response?.data?.message || 'Could not load records'))
  useEffect(() => { load(); api.get('/employees', { params: { limit: 100 } }).then(({ data }) => setEmployees(data.items)).catch(() => {}) }, [date])
  const submit = async (event) => {
    event.preventDefault()
    try {
      await api.post('/daily-records', {
        employeeId: form.employeeId || user?.employeeId,
        workDate: form.workDate,
        totalIds: Number(form.totalIds),
        locations: form.locations.map((row) => ({ city: row.city, state: row.state, count: Number(row.count) })),
        notes: form.notes,
      })
      toast.success('Daily record saved')
      setOpen(false)
      setForm((v) => ({ ...v, totalIds: '', locations: [{ city: '', state: '', count: '' }], notes: '' }))
      load()
    } catch (e) { toast.error(e.response?.data?.message || e.response?.data?.errors?.[0]?.message || 'Could not save record') }
  }
  const canCreate = user?.role === 'super_admin' || user?.role === 'supervisor'
  return (
    <div>
      <PageHeader title="Daily ID Records" subtitle="One employee/day record; location counts must equal the daily total" actions={canCreate && <button onClick={() => setOpen(true)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"><Plus size={16} className="mr-2 inline" />Add record</button>} />
      <label className="mb-4 block"><span className="mr-3 text-sm text-slate-600">Filter work date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">IDs</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{items.map((item) => <tr key={item._id} className="border-t"><td className="px-4 py-3">{item.workDate?.slice(0,10)}</td><td className="px-4 py-3">{item.employeeId?.fullName}</td><td className="px-4 py-3">{item.totalIds}</td><td className="px-4 py-3">{item.totalIds === 0 ? 'Submitted: 0' : 'Submitted'}</td></tr>)}</tbody></table>{!items.length && <p className="p-8 text-center text-sm text-slate-500">No daily records found.</p>}</div>
      {open && (
        <Modal title="Submit daily IDs" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {canCreate && <label className="text-sm font-medium sm:col-span-2">Employee<select required value={form.employeeId} onChange={(e) => setForm((v) => ({ ...v, employeeId: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.fullName} ({employee.employeeCode})</option>)}</select></label>}
            <label className="text-sm font-medium">Work date<input required type="date" value={form.workDate} onChange={(e) => setForm((v) => ({ ...v, workDate: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <label className="text-sm font-medium">Total IDs<input required type="number" min="0" step="1" value={form.totalIds} onChange={(e) => setForm((v) => ({ ...v, totalIds: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-700">Location breakdown</p><button type="button" onClick={() => setForm((v) => ({ ...v, locations: [...v.locations, { city: '', state: '', count: '' }] }))} className="text-sm font-semibold text-blue-700">Add location</button></div>
              {form.locations.map((location, index) => (
                <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
                  <input required placeholder="City" value={location.city} onChange={(e) => setForm((v) => ({ ...v, locations: v.locations.map((row, i) => i === index ? { ...row, city: e.target.value } : row) }))} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                  <input required placeholder="State" value={location.state} onChange={(e) => setForm((v) => ({ ...v, locations: v.locations.map((row, i) => i === index ? { ...row, state: e.target.value } : row) }))} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                  <input required type="number" min="0" step="1" placeholder="IDs" value={location.count} onChange={(e) => setForm((v) => ({ ...v, locations: v.locations.map((row, i) => i === index ? { ...row, count: e.target.value } : row) }))} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </div>
              ))}
            </div>
            <label className="text-sm font-medium sm:col-span-2">Notes<textarea value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <button className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white sm:col-span-2">Save daily record</button>
          </form>
        </Modal>
      )}
    </div>
  )
}
