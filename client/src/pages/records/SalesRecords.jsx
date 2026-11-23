import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Modal from '../../components/common/Modal'
import { useAuth } from '../../context/AuthContext'

export default function SalesRecords() {
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const [form, setForm] = useState({ employeeId: '', transactionDate: new Date().toISOString().slice(0, 10), amount: '', saleCount: '1', reference: '', notes: '' })
  const load = () => api.get('/sales').then(({ data }) => setItems(data.items)).catch((e) => toast.error(e.response?.data?.message || 'Could not load sales'))
  useEffect(() => { load(); api.get('/employees', { params: { limit: 100 } }).then(({ data }) => setEmployees(data.items)).catch(() => {}) }, [])
  const submit = async (event) => {
    event.preventDefault()
    try {
      await api.post('/sales', { ...form, employeeId: form.employeeId || user?.employeeId, amount: Number(form.amount), saleCount: Number(form.saleCount) })
      toast.success('Sales transaction saved')
      setOpen(false)
      setForm((v) => ({ ...v, amount: '', reference: '', notes: '' }))
      load()
    } catch (e) { toast.error(e.response?.data?.message || 'Could not save sales transaction') }
  }
  const canCreate = user?.role === 'super_admin' || user?.role === 'supervisor'
  return <div><PageHeader title="Sales Transactions" subtitle="Sales remain separate from ID/account production" actions={canCreate && <button onClick={() => setOpen(true)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"><Plus size={16} className="mr-2 inline" />Add sale</button>} /><div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Currency</th></tr></thead><tbody>{items.map((item) => <tr key={item._id} className="border-t"><td className="px-4 py-3">{item.transactionDate?.slice(0,10)}</td><td className="px-4 py-3">{item.employeeId?.fullName}</td><td className="px-4 py-3">{item.amount}</td><td className="px-4 py-3">{item.currency}</td></tr>)}</tbody></table>{!items.length && <p className="p-8 text-center text-sm text-slate-500">No sales transactions found.</p>}</div>{open && <Modal title="Add sales transaction" onClose={() => setOpen(false)}><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">{user?.role !== 'employee' && <label className="text-sm font-medium sm:col-span-2">Employee<select required value={form.employeeId} onChange={(e) => setForm((v) => ({ ...v, employeeId: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.fullName}</option>)}</select></label>}<label className="text-sm font-medium">Transaction date<input required type="date" value={form.transactionDate} onChange={(e) => setForm((v) => ({ ...v, transactionDate: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-medium">Amount (PKR)<input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((v) => ({ ...v, amount: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-medium">Sale count<input required type="number" min="0" step="1" value={form.saleCount} onChange={(e) => setForm((v) => ({ ...v, saleCount: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-medium">Reference<input value={form.reference} onChange={(e) => setForm((v) => ({ ...v, reference: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-medium sm:col-span-2">Notes<textarea value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><button className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white sm:col-span-2">Save transaction</button></form></Modal>}</div>
}
