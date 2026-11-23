import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, Building2, ClipboardCheck, Database, LogOut, Menu, Moon, PackageSearch, Settings, Sun, UserRound, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const links = [
  ['Dashboard', '/admin/dashboard', BarChart3],
  ['Employees', '/admin/employees', Users],
  ['Teams', '/admin/teams', Building2],
  ['Daily Records', '/records/daily', ClipboardCheck],
  ['Sales', '/records/sales', PackageSearch],
  ['Reports', '/reports/weekly', BarChart3],
  ['Attendance', '/attendance', UserRound],
  ['Data Management', '/data-management', Database],
  ['Audit Logs', '/audit-logs', ClipboardCheck],
  ['Settings', '/settings', Settings],
  ['My Performance', '/my-performance', UserRound],
]

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark')
  useEffect(() => {
    const theme = dark ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    localStorage.setItem('nexemers_theme', theme)
  }, [dark])
  const { user, logout } = useAuth()
  const visibleLinks = links.filter(([label]) => {
    if (user?.role === 'super_admin') return true
    if (user?.role === 'supervisor') return !['Dashboard', 'Data Management', 'Audit Logs', 'Settings'].includes(label)
    return label === 'My Performance'
  })
  return (
    <div className={dark ? 'dark min-h-screen' : 'min-h-screen'}>
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-slate-950 px-4 py-5 transition-transform ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="mb-8 px-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Nexemers</p>
          <p className="mt-1 text-sm text-slate-300">Performance Management</p>
        </div>
        <nav className="space-y-1">
          {visibleLinks.map(([label, to, Icon]) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {open && <button aria-label="Close navigation" className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-7">
          <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <div className="ml-auto flex items-center gap-2">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDark((v) => !v)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <span className="hidden text-sm text-slate-600 sm:block">{user?.name}</span>
            <button className="rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-600" aria-label="Log out" onClick={logout}><LogOut size={18} /></button>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4rem)] bg-slate-50 p-4 md:p-7"><Outlet /></main>
      </div>
    </div>
  )
}
