export class FileTypeFilter {
  private currentFilter: string | null = null;
  private listeners: Set<(filter: string | null) => void> = new Set();

  toggle(fileType: string): void {
    console.log('🔄 FileTypeFilter.toggle() called with fileType:', fileType);
    console.log('🔄 Current filter before toggle:', this.currentFilter);
    this.currentFilter = this.currentFilter === fileType ? null : fileType;
    console.log('🔄 Current filter after toggle:', this.currentFilter);
    this.emit();
  }

  setFilter(fileType: string | null): void {
    console.log('🎯 FileTypeFilter.setFilter() called with fileType:', fileType);
    if (this.currentFilter !== fileType) {
      console.log('🎯 Filter changed from', this.currentFilter, 'to', fileType);
      this.currentFilter = fileType;
      this.emit();
    } else {
      console.log('🎯 Filter unchanged, already set to:', fileType);
    }
  }

  getFilter(): string | null {
    return this.currentFilter;
  }

  subscribe(callback: (filter: string | null) => void): void {
    console.log('📝 FileTypeFilter.subscribe() called. Total listeners after:', this.listeners.size + 1);
    this.listeners.add(callback);
  }

  unsubscribe(callback: (filter: string | null) => void): void {
    this.listeners.delete(callback);
  }

  private emit(): void {
    console.log('📢 FileTypeFilter.emit() called with filter:', this.currentFilter, 'to', this.listeners.size, 'listeners');
    let callbackIndex = 0;
    this.listeners.forEach(callback => {
      console.log('📢 Calling listener', callbackIndex++, 'with filter:', this.currentFilter);
      try {
        callback(this.currentFilter);
        console.log('✅ Listener', callbackIndex - 1, 'executed successfully');
      } catch (error) {
        console.error('❌ Listener', callbackIndex - 1, 'failed:', error);
      }
    });
  }

  attachToChart(chartElement: HTMLElement, segments: { label: string; color: string }[]): void {
    console.log('🔗 FileTypeFilter.attachToChart() called with', segments.length, 'segments:', segments.map(s => s.label));
    const svg = chartElement.querySelector('svg');
    if (!svg) {
      console.error('❌ FileTypeFilter: No SVG found in chart element');
      return;
    }
    console.log('✅ SVG found, proceeding with attachment');

    // Get both legend markers AND donut segments
    const legendPaths = svg.querySelectorAll('path.apexcharts-legend-marker');
    const donutSegments = svg.querySelectorAll('path.apexcharts-pie-area');
    const texts = svg.querySelectorAll('text');
    console.log('🔍 Found', legendPaths.length, 'legend paths,', donutSegments.length, 'donut segments, and', texts.length, 'text elements');
    
    const segmentMap = new Map<string, HTMLElement>();
    
    // Function to add click listeners to a set of elements
    const attachClickListeners = (elements: NodeListOf<Element>, elementType: string) => {
      elements.forEach((element, index) => {
        console.log(`🔧 Processing ${elementType} ${index}:`, element);
        if (index < segments.length) {
          const segment = segments[index];
          if (segment) {
            console.log(`🏷️ Setting attributes for ${elementType} ${index}: ${segment.label}`);
            element.setAttribute('data-file-type', segment.label);
            element.setAttribute('data-index', index.toString());
            segmentMap.set(segment.label, element as HTMLElement);
            
            console.log(`👆 Adding click listener to ${elementType} ${index} for ${segment.label}`);
            element.addEventListener('click', (e) => {
              console.log(`🖱️ Click detected on ${elementType} for file type:`, segment.label);
              e.preventDefault();
              e.stopPropagation();
              this.handleSegmentClick(segment.label);
            });
            
            (element as HTMLElement).style.cursor = 'pointer';
            console.log(`✅ ${elementType} ${index} (${segment.label}) setup complete with cursor pointer`);
          } else {
            console.log(`⚠️ No segment data for ${elementType} ${index}`);
          }
        } else {
          console.log(`⚠️ ${elementType} ${index} exceeds segments length (${segments.length})`);
        }
      });
    };
    
    // Attach listeners to both legend markers and donut segments
    attachClickListeners(legendPaths, 'legend marker');
    attachClickListeners(donutSegments, 'donut segment');
    
    texts.forEach((text) => {
      const matchingSegment = segments.find(s => 
        text.textContent && text.textContent.includes(s.label)
      );
      if (matchingSegment) {
        text.setAttribute('data-file-type', matchingSegment.label);
        text.style.pointerEvents = 'none';
      }
    });
    
    console.log('🔗 Attachment complete. Segment map has', segmentMap.size, 'entries');
    
    // Test: Try to programmatically click both legend and donut segment
    console.log('🧪 Testing click listeners...');
    const firstDonutSegment = svg.querySelector('path.apexcharts-pie-area[data-file-type]');
    if (firstDonutSegment) {
      console.log('🧪 Found first donut segment with data-file-type:', firstDonutSegment.getAttribute('data-file-type'));
      console.log('🧪 Attempting programmatic click on donut segment...');
      setTimeout(() => {
        firstDonutSegment.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
        console.log('🧪 Programmatic donut segment click dispatched');
      }, 1000);
    } else {
      console.log('🧪 No donut segment with data-file-type found for testing');
    }
    
    this.updateVisualState(segmentMap);
  }

  private handleSegmentClick(fileType: string): void {
    console.log('🖱️ FileTypeFilter.handleSegmentClick() called with fileType:', fileType);
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