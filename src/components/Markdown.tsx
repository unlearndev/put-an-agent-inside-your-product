import { Fragment } from 'react'

// Just enough Markdown for the assistant's answers: paragraphs, lists, bold and inline code.
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    return <Fragment key={i}>{part}</Fragment>
  })
}

export function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  const flush = () => {
    if (!list) return
    const Tag = list.ordered ? 'ol' : 'ul'
    blocks.push(<Tag key={blocks.length}>{list.items.map((item, i) => <li key={i}>{inline(item)}</li>)}</Tag>)
    list = null
  }
  for (const line of text.split('\n')) {
    const item = line.match(/^\s*(?:[-*]|(\d+)\.)\s+(.*)$/)
    if (item) {
      const ordered = Boolean(item[1])
      if (!list || list.ordered !== ordered) {
        flush()
        list = { ordered, items: [] }
      }
      list.items.push(item[2])
    } else {
      flush()
      if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ''))}</p>)
    }
  }
  flush()
  return <>{blocks}</>
}
