export const DEFAULT_TABLE_PAGE_SIZE = 15

export function tablePageCount(total, perPage = DEFAULT_TABLE_PAGE_SIZE) {
  const size = Math.max(1, Number(perPage) || DEFAULT_TABLE_PAGE_SIZE)
  return Math.max(1, Math.ceil(Math.max(0, Number(total) || 0) / size))
}

export function clampTablePage(page, pageCount) {
  const count = Math.max(1, Number(pageCount) || 1)
  const current = Math.max(1, Number(page) || 1)
  return Math.min(current, count)
}

export function tablePageSlice(items, page, perPage = DEFAULT_TABLE_PAGE_SIZE) {
  const list = Array.isArray(items) ? items : []
  const size = Math.max(1, Number(perPage) || DEFAULT_TABLE_PAGE_SIZE)
  const count = tablePageCount(list.length, size)
  const safePage = clampTablePage(page, count)
  const start = (safePage - 1) * size
  return list.slice(start, start + size)
}

export function tablePageWindow(currentPage, pageCount, windowSize = 5) {
  const count = Math.max(1, Number(pageCount) || 1)
  const current = clampTablePage(currentPage, count)
  const width = Math.min(Math.max(1, Number(windowSize) || 5), count)
  const start = Math.max(1, Math.min(current - 2, count - width + 1))
  return Array.from({ length: width }, (_, index) => start + index)
}