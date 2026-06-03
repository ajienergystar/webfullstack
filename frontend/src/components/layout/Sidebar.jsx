import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { posMenu } from '../../config/posMenu'
import { MenuIcon } from './MenuIcons'

function ChevronIcon({ open }) {
  return (
    <span className={`menu-chevron ${open ? 'open' : ''}`}>
      <MenuIcon name="chevron" />
    </span>
  )
}

export default function Sidebar() {
  const location = useLocation()
  const [openMenus, setOpenMenus] = useState(['pos', 'master'])

  function toggleMenu(id) {
    setOpenMenus((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  function isChildActive(children) {
    return children?.some((c) => location.pathname === c.path)
  }

  return (
    <aside className="sidebar-nav">
      {posMenu.map((item) => {
        if (item.children) {
          const isOpen = openMenus.includes(item.id)
          const hasActiveChild = isChildActive(item.children)

          return (
            <div key={item.id}>
              <button
                type="button"
                className={`menu-item ${hasActiveChild ? 'active' : ''}`}
                onClick={() => toggleMenu(item.id)}
              >
                <MenuIcon name={item.icon} />
                <span className="menu-label">{item.label}</span>
                <ChevronIcon open={isOpen} />
              </button>
              <div className={`menu-children ${isOpen ? 'open' : ''}`}>
                {item.children.map((child) => (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    className={({ isActive }) =>
                      `menu-child ${isActive ? 'active' : ''}`
                    }
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        }

        return (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
          >
            <MenuIcon name={item.icon} />
            <span className="menu-label">{item.label}</span>
          </NavLink>
        )
      })}
    </aside>
  )
}
