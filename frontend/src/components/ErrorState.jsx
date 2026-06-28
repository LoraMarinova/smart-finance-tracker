function ErrorState({ message, onRetry, retrying = false }) {
  return (
    <div className="error-state" role="alert">
      <span className="error-state-message">{message}</span>
      {onRetry ? (
        <button
          type="button"
          className="btn btn--small"
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      ) : null}
    </div>
  )
}

export default ErrorState
