import type { ApexOptions } from 'apexcharts'
import type { ChartDefinition } from '../chart-definitions.js'
import { CHART_COLOR_PALETTES } from '../shared/colors.js'
import { createBaseChartOptions, createTooltipOptions } from '../shared/common-options.js'
import { validateArrayInput, validateWordFrequency } from '../shared/validators.js'

export const wordCloudChart: ChartDefinition = {
  type: 'd3-wordcloud' as const,
  hasAxisToggle: false,
  height: 400,
  elementId: 'wordCloudChart',
  dataFormatter: (wordFrequency: any[]) => {
    const validatedWords = validateArrayInput(wordFrequency, 'wordCloud')
    
    const normalizedData = validatedWords.map((w, index) => 
      validateWordFrequency(w, index, 'wordCloud')
    ).filter(w => w !== null)
    
    if (normalizedData.length === 0) {
      throw new Error('wordCloud: No valid word frequency data after normalization')
    }
    
    const topWords = normalizedData.slice(0, 50)
    
    return [{
      data: topWords
    }]
  },
  optionsBuilder: (series): ApexOptions => ({
    ...createBaseChartOptions('treemap', 400),
    series,
    colors: CHART_COLOR_PALETTES.pastel,
    plotOptions: {
      treemap: {
        distributed: true,
        enableShades: true,
        shadeIntensity: 0.5,
        dataLabels: {
          format: 'truncate'
        }
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '14px',
        fontWeight: '600',
        colors: ['#24292f']
      },
      formatter: function(text: string, op: any) {
        return [text, op.value]
      },
      offsetY: -4
    },
    tooltip: {
      ...createTooltipOptions(),
      y: {
        formatter: function(value: number) {
          return value + ' occurrences'
        }
      }
    }
  })
}