import { useEffect, useState } from 'react'
import { CalendarCheck, CalendarCog } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Modal from '../../components/common/Modal'
import { useAuth } from '../../context/AuthContext'

const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function Attendance() {
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [mode, setMode] = useState('')
  const { user } = useAuth()
  const [attendance, setAttendance] = useState(() => ({ employeeId: '', workDate: new Date().toISOString().slice(0, 10), attendanceStatus: 'present', notes: '' }))
  const [schedule, setSchedule] = useState(() => ({ employeeId: '', effectiveFrom: new Date().toISOString().slice(0, 10), weekdaySchedule: Object.fromEntries(weekdays.map((day) => [day, !['saturday', 'sunday'].includes(day)])) }))
  const load = () => api.get('/attendance').then(({ data }) => setItems(data.items)).catch((e) => toast.error(e.response?.data?.message || 'Could not load attendance'))
  useEffect(() => { load(); api.get('/employees', { params: { limit: 100 } }).then(({ data }) => setEmployees(data.items)).catch(() => {}) }, [])
  const submitAttendance = async (event) => {
    event.preventDefault()
    try { await api.post('/attendance', attendance); toast.success('Attendance saved'); setMode(''); load() }
    catch (e) { toast.error(e.response?.data?.message || 'Could not save attendance') }
  }
  const submitSchedule = async (event) => {
    event.preventDefault()
    try { await api.post('/schedules', schedule); toast.success('Work schedule saved'); setMode('') }
    catch (e) { toast.error(e.response?.data?.message || 'Could not save schedule') }
  }
  return <div><PageHeader title="Attendance & Schedules" subtitle="Attendance status and effective-dated work schedules" actions={(user?.role === 'super_admin' || user?.role === 'supervisor') && <div className="flex gap-2"><button onClick={() => setMode('attendance')} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white"><CalendarCheck size={16} className="mr-1 inline" />Mark attendance</button>{user?.role === 'super_admin' && <button onClick={() => setMode('schedule')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><CalendarCog size={16} className="mr-1 inline" />Set schedule</button>}</div>} />
    <div className="rounded-xl border border-slate-200 bg-white">{items.map((item) => <div key={item._id} className="flex flex-wrap justify-between gap-2 border-b p-4 text-sm last:border-0"><span>{item.employeeId?.fullName}</span><span>{item.workDate?.slice(0,10)}</span><span className="capitalize">{item.attendanceStatus}</span></div>)}{!items.length && <p className="p-8 text-center text-sm text-slate-500">No attendance records found.</p>}</div>
    {mode === 'attendance' && <Modal title="Mark attendance" onClose={() => setMode('')}><form onSubmit={submitAttendance} className="space-y-4"><label className="block text-sm font-medium">Employee<select required value={attendance.employeeId} onChange={(e) => setAttendance((v) => ({ ...v, employeeId: e.target.value }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5"><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.fullName}</option>)}</select></label><label className="block text-sm font-medium">Date<input required type="date" value={attendance.workDate} onChange={(e) => setAttendance((v) => ({ ...v, workDate: e.target.value }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5" /></label><label className="block text-sm font-medium">Status<select value={attendance.attendanceStatus} onChange={(e) => setAttendance((v) => ({ ...v, attendanceStatus: e.target.value }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5">{['present','absent','leave','off'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label><button className="w-full rounded-lg bg-blue-700 py-2.5 font-semibold text-white">Save attendance</button></form></Modal>}
    {mode === 'schedule' && <Modal title="Set employee schedule" onClose={() => setMode('')}><form onSubmit={submitSchedule} className="space-y-4"><label className="block text-sm font-medium">Employee<select required value={schedule.employeeId} onChange={(e) => setSchedule((v) => ({ ...v, employeeId: e.target.value }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5"><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.fullName}</option>)}</select></label><label className="block text-sm font-medium">Effective from<input required type="date" value={schedule.effectiveFrom} onChange={(e) => setSchedule((v) => ({ ...v, effectiveFrom: e.target.value }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5" /></label><fieldset><legend className="mb-2 text-sm font-medium">Working days</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{weekdays.map((day) => <label key={day} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" checked={schedule.weekdaySchedule[day]} onChange={(e) => setSchedule((v) => ({ ...v, weekdaySchedule: { ...v.weekdaySchedule, [day]: e.target.checked } }))} />{day}</label>)}</div></fieldset><button className="w-full rounded-lg bg-blue-700 py-2.5 font-semibold text-white">Save schedule</button></form></Modal>}
  </div>
}
