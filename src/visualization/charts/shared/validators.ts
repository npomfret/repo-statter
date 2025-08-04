export const validateArrayInput = (data: any, chartName: string): any[] => {
  if (!Array.isArray(data)) {
    throw new Error(`${chartName}: Expected array, got ${typeof data}`)
  }
  return data
}

export const validateContributor = (contributor: any, index: number) => {
  if (!contributor) {
    throw new Error(`contributors: Contributor at index ${index} is null/undefined`)
  }
  if (!contributor.name || typeof contributor.name !== 'string') {
    throw new Error(`contributors: Contributor at index ${index} has invalid name: ${contributor.name}`)
  }
  if (typeof contributor.commits !== 'number' || contributor.commits < 0) {
    throw new Error(`contributors: Contributor '${contributor.name}' has invalid commits count: ${contributor.commits}`)
  }
}

export const validateFileType = (fileType: any, index: number) => {
  if (!fileType) {
    throw new Error(`fileTypes: FileType at index ${index} is null/undefined`)
  }
  if (!fileType.type || typeof fileType.type !== 'string') {
    throw new Error(`fileTypes: FileType at index ${index} has invalid type: ${fileType.type}`)
  }
  if (typeof fileType.lines !== 'number' || fileType.lines < 0) {
    throw new Error(`fileTypes: FileType '${fileType.type}' has invalid lines count: ${fileType.lines}`)
  }
}

export const validateTimeSeriesPoint = (point: any, index: number, chartName: string) => {
  if (!point) {
    throw new Error(`${chartName}: TimeSeriesPoint at index ${index} is null/undefined`)
  }
  if (!point.date || typeof point.date !== 'string') {
    throw new Error(`${chartName}: TimeSeriesPoint at index ${index} has invalid date: ${point.date}`)
  }
}

export const validateLinearSeriesPoint = (point: any, index: number, chartName: string) => {
  if (!point) {
    throw new Error(`${chartName}: LinearSeriesPoint at index ${index} is null/undefined`)
  }
  if (typeof point.commitIndex !== 'number' || point.commitIndex < 0) {
    throw new Error(`${chartName}: LinearSeriesPoint at index ${index} has invalid commitIndex: ${point.commitIndex}`)
  }
}

export const validateFile = (file: any, index: number, chartName: string) => {
  if (!file) {
    throw new Error(`${chartName}: File at index ${index} is null/undefined`)
  }
  if (!file.fileName || typeof file.fileName !== 'string') {
    throw new Error(`${chartName}: File at index ${index} has invalid fileName: ${file.fileName}`)
  }
}

export const validateWordFrequency = (word: any, index: number, chartName: string) => {
  if (!word) {
    console.warn(`${chartName}: Entry at index ${index} is null/undefined`)
    return null
  }
  
  const text = word.text || word.word
  const count = word.size !== undefined ? word.size : word.count
  
  if (typeof text !== 'string' || !text.trim()) {
    console.warn(`${chartName}: Entry at index ${index} has invalid text: ${text}`)
    return null
  }
  
  if (typeof count !== 'number' || count < 0) {
    console.warn(`${chartName}: Entry at index ${index} has invalid count: ${count}`)
    return null
  }
  
  return { x: text, y: count }
}