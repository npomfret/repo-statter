import type { WordFrequency } from '../../text/processor.js'
import type { WordCloudData } from './chart-utils.js'

export function renderWordCloudChart(wordCloudData: WordFrequency[], height: number): void {
  const container = document.getElementById('wordCloudChart')
  if (!container) return


  // D3 word cloud implementation
  const width = container.offsetWidth
  const maxFontSize = 60
  const minFontSize = 12

  const maxFreq = Math.max(...wordCloudData.map(d => d.size))
  const minFreq = Math.min(...wordCloudData.map(d => d.size))

  const fontSize = (window as any).d3.scaleLinear()
      .domain([minFreq, maxFreq])
      .range([minFontSize, maxFontSize])

  const layout = (window as any).d3.layout.cloud()
      .size([width, height])
      .words(wordCloudData.map(d => ({
        text: d.text,
        size: fontSize(d.size),
        frequency: d.size
      })))
      .padding(5)
      .rotate(() => (Math.random() - 0.5) * 60)
      .font('Arial')
      .fontSize((d: WordCloudData) => d.size)
      .on('end', draw)

  layout.start()

  function draw(words: WordCloudData[]) {
    const colorScale = ['#FFB6C1', '#FFDAB9', '#FFE4B5', '#D8BFD8', '#87CEEB', '#98D8C8', '#B0C4DE', '#E6E6FA', '#F0E68C']

    const svg = (window as any).d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width/2},${height/2})`)

    svg.selectAll('text')
        .data(words)
        .enter().append('text')
        .style('font-size', (d: WordCloudData) => `${d.size}px`)
        .style('font-family', 'Arial')
        .style('fill', (_: WordCloudData, i: number) => colorScale[i % colorScale.length])
        .attr('text-anchor', 'middle')
        .attr('transform', (d: WordCloudData) => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text((d: WordCloudData) => d.text)
        .append('title')
        .text((d: WordCloudData) => `${d.text}: ${d.frequency} occurrences`)
  }
}