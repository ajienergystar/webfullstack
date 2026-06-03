import { useLocation } from 'react-router-dom'

export default function PagePlaceholder() {
  const location = useLocation()
  const title = location.pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Halaman'

  return (
    <div className="page-placeholder">
      <h2 style={{ textTransform: 'capitalize' }}>{title}</h2>
      <p>Modul ini siap diintegrasikan dengan API backend POS.</p>
      <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>{location.pathname}</p>
    </div>
  )
}
