import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNavbar from './TopNavbar'
import '../../styles/dashboard.css'

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="dashboard-layout">
      <div className={`dashboard-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Sidebar />
      </div>
      <div className="dashboard-main">
        <TopNavbar onToggleSidebar={() => setSidebarCollapsed((v) => !v)} />
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
