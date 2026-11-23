import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../services/api'
import PageHeader from '../../components/common/PageHeader'

export default function DataManagement() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const preview = async () => {
    if (!file) return toast.error('Select an XLSX or CSV file')
    const form = new FormData(); form.append('file', file)
    try {
      const { data } = await api.post('/imports/daily-records', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(data); toast.success('Import preview created')
    } catch (error) { toast.error(error.response?.data?.message || 'Import preview failed') }
  }
  const commit = async () => {
    if (!result?.jobId) return
    try {
      const { data } = await api.post(`/imports/${result.jobId}/commit`)
      toast.success(`${data.counts.imported} rows imported; ${data.counts.skipped} skipped`)
      setResult(null)
      setFile(null)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Import could not be committed')
    }
  }
  const download = async (kind) => {
    const response = await api.get(kind === 'sales' ? '/exports/sales' : '/exports/daily-records', { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = kind === 'sales' ? 'sales.xlsx' : 'daily-records.xlsx'; anchor.click(); URL.revokeObjectURL(url)
  }
  return <div><PageHeader title="Data Management" subtitle="Validated imports and permission-aware exports" /><div className="grid gap-4 lg:grid-cols-2"><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Daily records import</h2><p className="mt-1 text-sm text-slate-500">Each employee/date can include multiple location rows; location counts must add up to totalIds.</p><input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files[0])} className="mt-4 block w-full text-sm" /><button onClick={preview} className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"><Upload size={16} className="mr-2 inline" />Preview import</button>{result && <div className="mt-4 space-y-3 text-sm text-slate-600"><p>{result.counts.total} rows previewed; {result.errors.length} validation errors.</p>{result.errors.length > 0 && <ul className="max-h-40 list-inside list-disc overflow-auto rounded bg-red-50 p-3 text-red-700">{result.errors.slice(0, 20).map((error, index) => <li key={index}>Row {error.row}, {error.field}: {error.message}</li>)}</ul>}<div className="flex gap-2"><button disabled={result.errors.length > 0} onClick={commit} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">Confirm import</button><button onClick={() => setResult(null)} className="rounded-lg border px-4 py-2">Cancel</button></div></div>}</section><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Exports</h2><div className="mt-4 flex flex-wrap gap-3"><button onClick={() => download('daily')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm"><Download size={16} className="mr-2 inline" />Daily records</button><button onClick={() => download('sales')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm"><Download size={16} className="mr-2 inline" />Sales</button></div></section></div></div>
}
