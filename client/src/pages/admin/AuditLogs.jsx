import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import PageHeader from '../../components/common/PageHeader'

export default function AuditLogs() {
  const [items, setItems] = useState([])
  useEffect(() => { api.get('/audit-logs').then(({ data }) => setItems(data.items)).catch(() => setItems([])) }, [])
  return <div><PageHeader title="Audit Logs" subtitle="Append-only history of important changes" /><div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th></tr></thead><tbody>{items.map((item) => <tr key={item._id} className="border-t"><td className="px-4 py-3">{item.timestamp?.replace('T',' ').slice(0,19)}</td><td className="px-4 py-3">{item.actorId?.name || 'Unknown'}</td><td className="px-4 py-3">{item.action}</td><td className="px-4 py-3">{item.entityType}</td></tr>)}</tbody></table>{!items.length && <p className="p-8 text-center text-sm text-slate-500">No audit entries found.</p>}</div></div>
}
