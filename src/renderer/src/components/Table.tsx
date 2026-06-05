import { clsx } from 'clsx'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  mono?: boolean
  width?: string
  render?: (row: T) => ReactNode
  value?: (row: T) => string | number
}

interface TableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, i: number) => string
  onRowClick?: (row: T) => void
  expandedKey?: string | null
  renderExpanded?: (row: T) => ReactNode
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  emptyMessage?: string
  stickyHeader?: boolean
  maxHeight?: string
  zebra?: boolean
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  expandedKey,
  renderExpanded,
  initialSort,
  emptyMessage = 'No results match your filters',
  stickyHeader = true,
  maxHeight,
  zebra = true
}: TableProps<T>): JSX.Element {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    const getVal = (row: T): string | number =>
      col.value ? col.value(row) : ((row as Record<string, unknown>)[col.key] as string | number) ?? ''
    const arr = [...rows].sort((a, b) => {
      const va = getVal(a)
      const vb = getVal(b)
      if (typeof va === 'number' && typeof vb === 'number') return va - vb
      return String(va).localeCompare(String(vb), undefined, { numeric: true })
    })
    return sort.dir === 'desc' ? arr.reverse() : arr
  }, [rows, sort, columns])

  const toggleSort = (key: string): void => {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }
    )
  }

  const alignClass = (a?: string): string =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

  return (
    <div
      className="overflow-auto rounded-card border border-brand-stone"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="w-full border-collapse text-body">
        <thead className={clsx(stickyHeader && 'sticky top-0 z-10')}>
          <tr className="bg-brand-dark">
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                onClick={() => c.sortable !== false && toggleSort(c.key)}
                className={clsx(
                  'whitespace-nowrap px-3.5 py-2.5 text-label uppercase text-white/90',
                  alignClass(c.align),
                  c.sortable !== false && 'cursor-pointer select-none hover:text-white'
                )}
              >
                <span className={clsx('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                  {c.header}
                  {c.sortable !== false &&
                    (sort?.key === c.key ? (
                      sort.dir === 'asc' ? (
                        <ChevronUp size={13} />
                      ) : (
                        <ChevronDown size={13} />
                      )
                    ) : (
                      <ChevronsUpDown size={13} className="text-white/40" />
                    ))}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-body text-text-secondary">
                {emptyMessage}
              </td>
            </tr>
          )}
          {sorted.map((row, i) => {
            const key = rowKey(row, i)
            const expanded = expandedKey != null && expandedKey === key
            return (
              <Fragment key={key}>
                <tr
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    'border-t border-brand-stone/70 transition-colors',
                    zebra && i % 2 === 1 ? 'bg-surface-gray' : 'bg-surface-white',
                    onRowClick && 'cursor-pointer hover:bg-brand-light',
                    expanded && 'bg-brand-light'
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={clsx(
                        'px-3.5 py-2.5 align-middle',
                        alignClass(c.align),
                        c.mono && 'font-mono text-[13px]'
                      )}
                    >
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                    </td>
                  ))}
                </tr>
                {expanded && renderExpanded && (
                  <tr className="bg-surface-gray">
                    <td colSpan={columns.length} className="px-3.5 py-3">
                      {renderExpanded(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
