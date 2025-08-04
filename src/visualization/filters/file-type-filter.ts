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
    this.listeners.forEach(callback => callback(this.currentFilter));
  }

  attachToChart(chartElement: HTMLElement, segments: { label: string; color: string }[]): void {
    const svg = chartElement.querySelector('svg');
    if (!svg) {
      console.error('FileTypeFilter: No SVG found in chart element');
      return;
    }

    const paths = svg.querySelectorAll('path[fill]:not([fill="none"])');
    const texts = svg.querySelectorAll('text');
    
    const segmentMap = new Map<string, HTMLElement>();
    
    paths.forEach((path, index) => {
      if (index < segments.length) {
        const segment = segments[index];
        if (segment) {
          path.setAttribute('data-file-type', segment.label);
          path.setAttribute('data-index', index.toString());
          segmentMap.set(segment.label, path as HTMLElement);
          
          path.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleSegmentClick(segment.label);
          });
          
          (path as HTMLElement).style.cursor = 'pointer';
        }
      }
    });
    
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