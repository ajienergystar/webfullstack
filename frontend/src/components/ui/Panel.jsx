export default function Panel({ title, children, flush = false, className = '' }) {
  return (
    <section className={`ui-panel ${className}`.trim()}>
      {title && <div className="ui-panel-title">{title}</div>}
      <div className={flush ? 'ui-panel-body-flush' : 'ui-panel-body'}>{children}</div>
    </section>
  )
}
