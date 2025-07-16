export function formatBytes(bytes: number): string {
  if (bytes >= 1000000000) {
    return (bytes / 1000000000).toFixed(2) + ' GB'
  } else if (bytes >= 1000000) {
    return (bytes / 1000000).toFixed(2) + ' MB'
  } else if (bytes >= 1000) {
    return (bytes / 1000).toFixed(2) + ' KB'
  } else {
    return bytes.toFixed(0) + ' bytes'
  }
}

export function formatNumber(value: number): string {
  return Math.abs(value).toLocaleString()
}

export function createYAxisFormatter(metric: 'lines' | 'bytes') {
  return function(val: number): string {
    const absVal = Math.abs(val)
    if (metric === 'bytes') {
      return formatBytes(absVal)
    }
    return formatNumber(absVal)
  }
}

export function createTooltipFormatter(metric: 'lines' | 'bytes') {
  return function(val: number): string {
    const prefix = val < 0 ? '-' : ''
    const absVal = Math.abs(val)
    if (metric === 'bytes') {
      return prefix + formatBytes(absVal)
    }
    return prefix + formatNumber(absVal)
  }
}

export function truncateMessage(msg: string, maxLength: number): string {
  if (msg.length <= maxLength) return msg
  return msg.substring(0, maxLength) + '...'
}