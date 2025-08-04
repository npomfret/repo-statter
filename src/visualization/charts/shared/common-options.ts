import type { ApexOptions } from 'apexcharts'

export const createBaseChartOptions = (type: string, height: number): Partial<ApexOptions> => ({
  chart: {
    type: type as any,
    height,
    toolbar: { show: false },
    background: '#ffffff'
  },
  grid: { borderColor: '#e1e4e8' },
  tooltip: { theme: 'light' }
})

export const createAxisOptions = (title: string) => ({
  title: { text: title, style: { color: '#24292f' } },
  labels: { style: { colors: '#24292f' } }
})

export const createDateTimeAxisOptions = (title: string) => ({
  type: 'datetime' as const,
  title: { text: title, style: { color: '#24292f' } },
  labels: {
    style: { colors: '#24292f' },
    datetimeUTC: false
  }
})

export const createNumericAxisOptions = (title: string) => ({
  type: 'numeric' as const,
  title: { text: title, style: { color: '#24292f' } },
  labels: { style: { colors: '#24292f' } }
})

export const createLegendOptions = (position: 'top' | 'bottom' | 'left' | 'right' = 'bottom') => ({
  position,
  labels: { colors: '#24292f' }
})

export const createTooltipOptions = (theme: 'light' | 'dark' = 'light') => ({
  theme,
  marker: { show: false }
})