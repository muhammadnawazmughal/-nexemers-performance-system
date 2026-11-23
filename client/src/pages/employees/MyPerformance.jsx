import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import PageHeader from '../../components/common/PageHeader'

export default function MyPerformance() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  useEffect(() => { if (user?.employeeId) api.get(`/reports/employees/${user.employeeId}`).then(({ data }) => setRecords(data.records)).catch(() => setRecords([])) }, [user])
  return <div><PageHeader title="My Performance" subtitle="Personal ID and sales history" /><div className="rounded-xl border border-slate-200 bg-white p-6"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="py-3">Date</th><th>IDs</th><th>Status</th></tr></thead><tbody>{records.map((item) => <tr key={item._id} className="border-b"><td className="py-3">{item.workDate?.slice(0,10)}</td><td>{item.totalIds}</td><td>{item.totalIds === 0 ? 'Submitted: 0' : 'Submitted'}</td></tr>)}</tbody></table></div>{!records.length && <p className="text-sm text-slate-500">No performance records yet.</p>}</div></div>
}
