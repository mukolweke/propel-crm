const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/

export function escapeCsv(value: string): string {
  let safe = value
  if (CSV_FORMULA_PREFIX.test(safe)) {
    safe = `'${safe}`
  }
  if (/[",\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => escapeCsv(cell ?? '')).join(',')).join('\n')
}
