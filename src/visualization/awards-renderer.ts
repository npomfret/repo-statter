import type { ContributorAward, CommitAward } from '../data/types.js'

export interface AwardsData {
  filesModified: CommitAward[]
  bytesAdded: CommitAward[]
  bytesRemoved: CommitAward[]
  linesAdded: CommitAward[]
  linesRemoved: CommitAward[]
  lowestAverage: ContributorAward[]
  highestAverage: ContributorAward[]
}

export function renderAwards(awards: AwardsData, githubUrl?: string): void {
  const container = document.getElementById('awardsContainer')
  if (!container) return

  const awardCategories = [
    { title: 'Most Files Modified', data: awards.filesModified, icon: '📁', color: 'primary', type: 'commit' },
    { title: 'Most Bytes Added', data: awards.bytesAdded, icon: '➕', color: 'success', type: 'commit' },
    { title: 'Most Bytes Removed', data: awards.bytesRemoved, icon: '➖', color: 'danger', type: 'commit' },
    { title: 'Most Lines Added', data: awards.linesAdded, icon: '📈', color: 'info', type: 'commit' },
    { title: 'Most Lines Removed', data: awards.linesRemoved, icon: '📉', color: 'warning', type: 'commit' },
    { title: 'Lowest Average Lines Changed', data: awards.lowestAverage, icon: '🎯', color: 'secondary', type: 'contributor' },
    { title: 'Highest Average Lines Changed', data: awards.highestAverage, icon: '💥', color: 'dark', type: 'contributor' }
  ]

  container.innerHTML = ''

  awardCategories.forEach(category => {
    if (category.data.length === 0) return

    const col = document.createElement('div')
    col.className = 'chart-third'

    const card = document.createElement('div')
    card.className = 'card h-100'

    const cardHeader = document.createElement('div')
    cardHeader.className = `card-header award-header-${category.color}`
    cardHeader.innerHTML = `
      <h6 class="mb-0 text-secondary">
        <span class="me-2" style="font-size: 1.2em;">${category.icon}</span>
        ${category.title}
      </h6>
    `

    const cardBody = document.createElement('div')
    cardBody.className = 'card-body'

    const list = document.createElement('ol')
    list.className = 'list-group list-group-flush'

    category.data.forEach((award: any) => {
      const item = document.createElement('li')
      item.className = 'list-group-item d-flex justify-content-between align-items-start'

      const content = document.createElement('div')
      content.className = 'ms-2 me-auto'

      const header = document.createElement('div')
      header.className = 'fw-bold text-secondary'

      const meta = document.createElement('small')
      meta.className = 'text-muted'

      const badge = document.createElement('span')
      badge.className = `badge bg-light text-secondary border rounded-pill`

      if (category.type === 'commit') {
        header.textContent = award.message.length > 50 ?
            award.message.substring(0, 50) + '...' :
            award.message

        const commitLink = githubUrl ?
            `<a href="${githubUrl}/commit/${award.sha}" target="_blank" class="text-decoration-none" title="${award.sha}">
            ${award.sha.substring(0, 7)}
          </a>` :
            `<span title="${award.sha}">${award.sha.substring(0, 7)}</span>`

        meta.innerHTML = `
          ${award.authorName} • 
          ${new Date(award.date).toLocaleDateString()} • 
          ${commitLink}
        `

        if (category.title.includes('Files')) {
          badge.textContent = award.value.toLocaleString()
        } else if (category.title.includes('Bytes')) {
          badge.textContent = formatBytes(award.value)
        } else {
          badge.textContent = award.value.toLocaleString()
        }
      } else {
        header.textContent = award.name

        meta.innerHTML = `
          ${award.commits} commits • 
          ${award.averageLinesChanged.toFixed(1)} avg lines/commit
        `

        badge.textContent = award.averageLinesChanged.toFixed(1)
      }

      content.appendChild(header)
      content.appendChild(meta)

      item.appendChild(content)
      item.appendChild(badge)
      list.appendChild(item)
    })

    cardBody.appendChild(list)
    card.appendChild(cardHeader)
    card.appendChild(cardBody)
    col.appendChild(card)
    container.appendChild(col)
  })
}

function formatBytes(bytes: number): string {
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