import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clampTablePage,
  tablePageCount,
  tablePageSlice,
  tablePageWindow,
} from '../../resources/js/scripts/teacher/tablePagination.js'

test('tablePageCount returns at least one page', () => {
  assert.equal(tablePageCount(0, 10), 1)
  assert.equal(tablePageCount(10, 10), 1)
  assert.equal(tablePageCount(11, 10), 2)
})

test('tablePageSlice returns the correct window', () => {
  const items = Array.from({ length: 25 }, (_, index) => index + 1)
  assert.deepEqual(tablePageSlice(items, 1, 10), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.deepEqual(tablePageSlice(items, 3, 10), [21, 22, 23, 24, 25])
  assert.deepEqual(tablePageSlice(items, 99, 10), [21, 22, 23, 24, 25])
})

test('tablePageWindow stays within bounds', () => {
  assert.deepEqual(tablePageWindow(1, 3), [1, 2, 3])
  assert.deepEqual(tablePageWindow(5, 10), [3, 4, 5, 6, 7])
  assert.deepEqual(tablePageWindow(10, 10), [6, 7, 8, 9, 10])
})

test('clampTablePage clamps to page count', () => {
  assert.equal(clampTablePage(0, 4), 1)
  assert.equal(clampTablePage(3, 4), 3)
  assert.equal(clampTablePage(9, 4), 4)
})