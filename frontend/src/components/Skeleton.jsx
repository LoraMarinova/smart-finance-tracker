function Skeleton({ width = '100%', height = '1rem', className = '' }) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="skeleton-table" aria-busy="true" aria-label="Loading transactions">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row">
          <Skeleton width="20%" />
          <Skeleton width="15%" />
          <Skeleton width="25%" />
          <Skeleton width="20%" />
          <Skeleton width="10%" />
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ count = 2 }) {
  return (
    <div className="skeleton-cards" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <Skeleton width="60%" height="0.9rem" />
          <Skeleton width="90%" height="2rem" />
        </div>
      ))}
    </div>
  )
}

export default Skeleton
