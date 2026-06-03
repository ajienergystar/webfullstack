import { useLocation } from 'react-router-dom'
import PageShell from '../../components/ui/PageShell'
import Panel from '../../components/ui/Panel'

export default function PagePlaceholder() {
  const location = useLocation()
  const segment = location.pathname.split('/').filter(Boolean).pop() || 'halaman'
  const title = segment.replace(/-/g, ' ')

  return (
    <PageShell
      title={title}
      description="Modul ini siap diintegrasikan dengan API backend POS."
    >
      <Panel>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>{location.pathname}</p>
      </Panel>
    </PageShell>
  )
}
