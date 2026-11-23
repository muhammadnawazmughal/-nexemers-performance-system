import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../services/api'
import PageHeader from '../../components/common/PageHeader'

export default function Reports() {
  const { pathname } = useLocation()
  const weekly = pathname.includes('/weekly')
  const [items, setItems] = useState([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [period, setPeriod] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    const endpoint = period ? '/reports/period' : weekly ? '/reports/weekly' : '/reports/daily'
    api.get(endpoint, { params: period ? { date, period } : { date } })
      .then(({ data }) => { setItems(data.items || []); setError('') })
      .catch((e) => { setItems([]); setError(e.response?.data?.message || 'Could not load report') })
  }, [weekly, date, period])
  const exportCsv = () => {
    if (!items.length) return toast.error('There is no report data to export')
    const headers = Object.keys(items[0])
    const csv = [headers.join(','), ...items.map((item) => headers.map((header) => `"${String(item[header] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${period || (weekly ? 'weekly' : 'daily')}-performance-${date}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const title = period ? `${period[0].toUpperCase()}${period.slice(1)} Report` : weekly ? 'Weekly Report' : 'Daily Report'
  return <div><PageHeader title={title} subtitle={weekly ? 'Monday-to-Sunday employee performance' : 'Daily employee submission and status view'} actions={<button onClick={exportCsv} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><Download size={16} className="mr-2 inline" />Export CSV</button>} />
    <div className="mb-4 flex flex-wrap gap-3"><label className="text-sm text-slate-600">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ml-2 rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm text-slate-600">Period<select value={period} onChange={(e) => setPeriod(e.target.value)} className="ml-2 rounded-lg border border-slate-300 px-3 py-2"><option value="">Daily / weekly route</option><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></select></label></div>
    {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{(weekly || period ? [['employeeCode','Code'],['fullName','Employee'],['workingDays','Work days'],['actualIds','Actual IDs'],['idTarget','ID target'],['idAchievement','ID %'],['actualSales','Sales'],['salesTarget','Sales target'],['salesAchievement','Sales %']] : [['workDate','Date'],['employeeCode','Code'],['fullName','Employee'],['actualIds','IDs'],['status','Status']]).map(([key,label]) => <th key={key} className="whitespace-nowrap px-4 py-3">{label}</th>)}</tr></thead><tbody>{items.map((item, index) => <tr key={item.employeeId || item._id || index} className="border-t">{(weekly || period ? [item.employeeCode,item.fullName,item.workingDays,item.actualIds,item.idTarget,item.idAchievement == null ? '-' : `${item.idAchievement}%`,item.actualSales,item.salesTarget,item.salesAchievement == null ? '-' : `${item.salesAchievement}%`] : [item.workDate?.slice(0,10),item.employeeId?.employeeCode,item.employeeId?.fullName,item.totalIds,item.totalIds === 0 ? 'Submitted: 0' : 'Submitted']).map((value, i) => <td key={i} className="whitespace-nowrap px-4 py-3">{value ?? '-'}</td>)}</tr>)}</tbody></table>{!items.length && !error && <p className="p-8 text-center text-sm text-slate-500">No report data found for this period.</p>}</div>
  </div>
}
