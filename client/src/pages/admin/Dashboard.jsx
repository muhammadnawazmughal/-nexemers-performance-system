import { useEffect, useState } from 'react'
import { Users, ClipboardCheck, CircleDollarSign, Target } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../services/api'
import PageHeader from '../../components/common/PageHeader'

const cards = (kpis) => [
  ['Active employees', kpis.activeEmployees ?? 0, Users],
  ['Today IDs', kpis.todayIds ?? 0, ClipboardCheck],
  ['Today sales', kpis.todaySales ?? 0, CircleDollarSign],
  ['Week IDs', kpis.weekIds ?? 0, Target],
]

export default function Dashboard() {
  const [kpis, setKpis] = useState({})
  const [chartData, setChartData] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    api.get('/reports/dashboard').then(({ data }) => {
      setKpis(data.kpis)
      const byDate = new Map()
      data.chartData.dailyIds.forEach((row) => byDate.set(row.date, { date: row.date.slice(5), ids: row.value, sales: 0 }))
      data.chartData.dailySales.forEach((row) => byDate.set(row.date, { ...(byDate.get(row.date) || { date: row.date.slice(5), ids: 0 }), sales: row.value }))
      setChartData([...byDate.values()])
    }).catch((e) => setError(e.response?.data?.message || 'Could not load dashboard'))
  }, [])
  return (
    <div>
      <PageHeader title="Company Dashboard" subtitle="Live performance overview" />
      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards(kpis).map(([label, value, Icon]) => (
          <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><Icon size={18} className="text-blue-700" /></div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
          </article>
        ))}
      </div>
      <article className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-5 font-semibold text-slate-900">Production chart</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Bar dataKey="ids" name="IDs" fill="#1d4ed8" /><Bar dataKey="sales" name="Sales" fill="#10b981" /></BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  )
}
