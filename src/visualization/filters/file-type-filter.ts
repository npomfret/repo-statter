export class FileTypeFilter {
  private currentFilter: string | null = null;
  private listeners: Set<(filter: string | null) => void> = new Set();

  toggle(fileType: string): void {
    this.currentFilter = this.currentFilter === fileType ? null : fileType;
    this.emit();
  }

  setFilter(fileType: string | null): void {
    if (this.currentFilter !== fileType) {
      this.currentFilter = fileType;
      this.emit();
    }
  }

  getFilter(): string | null {
    return this.currentFilter;
  }

  subscribe(callback: (filter: string | null) => void): void {
    this.listeners.add(callback);
  }

  unsubscribe(callback: (filter: string | null) => void): void {
    this.listeners.delete(callback);
  }

  private emit(): void {
    console.log('FileTypeFilter: Applied filter =', this.currentFilter);
    this.listeners.forEach(callback => {
      try {
        callback(this.currentFilter);
      } catch (error) {
        console.error('FileTypeFilter: Listener failed:', error);
      }
    });
  }

  attachToChart(chartElement: HTMLElement, segments: { label: string; color: string }[]): void {
    const svg = chartElement.querySelector('svg');
    if (!svg) {
      console.error('FileTypeFilter: No SVG found in chart element');
      return;
    }

    // Get both legend markers AND donut segments
    const legendPaths = svg.querySelectorAll('path.apexcharts-legend-marker');
    const donutSegments = svg.querySelectorAll('path.apexcharts-pie-area');
    const texts = svg.querySelectorAll('text');
    
    const segmentMap = new Map<string, HTMLElement>();
    
    // Function to add click listeners to a set of elements
    const attachClickListeners = (elements: NodeListOf<Element>) => {
      elements.forEach((element, index) => {
        if (index < segments.length) {
          const segment = segments[index];
          if (segment) {
            element.setAttribute('data-file-type', segment.label);
            element.setAttribute('data-index', index.toString());
            segmentMap.set(segment.label, element as HTMLElement);
            
            element.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.handleSegmentClick(segment.label);
            });
            
            (element as HTMLElement).style.cursor = 'pointer';
          }
        }
      });
    };
    
    // Attach listeners to both legend markers and donut segments
    attachClickListeners(legendPaths);
    attachClickListeners(donutSegments);
    
    texts.forEach((text) => {
      const matchingSegment = segments.find(s => 
        text.textContent && text.textContent.includes(s.label)
      );
      if (matchingSegment) {
        text.setAttribute('data-file-type', matchingSegment.label);
        text.style.pointerEvents = 'none';
      }
    });
    
    this.updateVisualState(segmentMap);
  }

  private handleSegmentClick(fileType: string): void {
    this.toggle(fileType);
  }

  private updateVisualState(segmentMap: Map<string, HTMLElement>): void {
    segmentMap.forEach((element, fileType) => {
      const isActive = this.currentFilter === fileType;
      const isFiltered = this.currentFilter !== null && this.currentFilter !== fileType;
      
      if (isActive) {
        element.style.opacity = '1';
        element.style.filter = 'brightness(1.1)';
      } else if (isFiltered) {
        element.style.opacity = '0.3';
        element.style.filter = 'brightness(0.8)';
      } else {
        element.style.opacity = '1';
        element.style.filter = 'none';
      }
    });
  }

  clearFilter(): void {
    if (this.currentFilter !== null) {
      this.currentFilter = null;
      this.emit();
    }
  }
}