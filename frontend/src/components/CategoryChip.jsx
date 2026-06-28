import { memo } from 'react'
import { getCategoryChipStyle } from '../categoryColors.js'

function CategoryChip({ category }) {
  if (!category) return null
  const style = getCategoryChipStyle(category)
  return (
    <span className="category-chip" style={{ '--chip-color': style.color }}>
      {category}
    </span>
  )
}

export default memo(CategoryChip)
