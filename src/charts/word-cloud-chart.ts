import type { WordFrequency } from '../text/processor.js'
import { assert } from '../utils/errors.js'

export class WordCloudChart {
  private containerId: string

  constructor(containerId: string) {
    this.containerId = containerId
  }

  render(wordCloudData: WordFrequency[], height: number = 400): void {
    assert(wordCloudData !== undefined, 'Word cloud data is required')
    assert(Array.isArray(wordCloudData), 'Word cloud data must be an array')
    
    const container = document.querySelector('#' + this.containerId)
    assert(container !== null, `Container with id ${this.containerId} not found`)
    
    if (wordCloudData.length === 0) {
      container.innerHTML = '<p class="text-muted text-center">No commit messages to analyze</p>'
      return
    }
    
    const width = (container as HTMLElement).offsetWidth
    
    // Theme-aware colors
    const colors = ['#27aeef', '#87bc45', '#ea5545', '#ef9b20', '#b33dc6', '#f46a9b', '#ede15b', '#bdcf32']
    const color = (window as any).d3.scaleOrdinal().range(colors)
    
    const draw = (words: any[]) => {
      (window as any).d3.select('#' + this.containerId)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', 'translate(' + width/2 + ',' + height/2 + ')')
        .selectAll('text')
        .data(words)
        .enter().append('text')
        .style('font-size', function(d: any) { return d.size + 'px' })
        .style('font-family', "'Inter', -apple-system, sans-serif")
        .style('font-weight', function(d: any) { return d.size > 40 ? '600' : '400' })
        .style('fill', function(_d: any, i: number) { return color(i) })
        .attr('text-anchor', 'middle')
        .attr('transform', function(d: any) {
          return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')'
        })
        .text(function(d: any) { return d.text })
        .style('cursor', 'default')
        .each(function(this: any, d: any) {
          (window as any).d3.select(this).append('title')
            .text(d.text + ': ' + Math.round(d.size))
        })
    }
    
    const layout = (window as any).d3.layout.cloud()
      .size([width, height])
      .words(wordCloudData.map(function(d) {
        return {text: d.text, size: d.size}
      }))
      .padding(5)
      .rotate(function() { return ~~(Math.random() * 2) * 90 })
      .font("'Inter', -apple-system, sans-serif")
      .fontSize(function(d: any) { return d.size })
      .on('end', draw)
    
    layout.start()
  }

  destroy(): void {
    const container = document.querySelector('#' + this.containerId)
    if (container) {
      container.innerHTML = ''
    }
  }
}