import Alert from './Alert'
import LoadingState from './LoadingState'
import PageHeader from './PageHeader'

export default function PageShell({
  title,
  description,
  actions,
  loading,
  loadingMessage,
  error,
  errorHint,
  success,
  onDismissSuccess,
  children,
  className = 'ui-page',
}) {
  if (loading) {
    return <LoadingState message={loadingMessage} />
  }

  if (error && !children) {
    return (
      <div className={className}>
        <div className="ui-error-block">
          <p>{error}</p>
          {errorHint && <p className="ui-error-hint">{errorHint}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <PageHeader title={title} description={description} actions={actions} />
      {error && <Alert variant="error">{error}</Alert>}
      {success && (
        <Alert variant="success" onDismiss={onDismissSuccess}>
          {success}
        </Alert>
      )}
      {children}
    </div>
  )
}
