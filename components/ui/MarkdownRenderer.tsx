'use client'

import React from 'react'
import { ExternalLink, Check, Copy } from 'lucide-react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Parse markdown blocks
  const renderFormattedText = (text: string) => {
    // 1. Process inline bold, italics, code, links, and LaTeX math
    const parts: React.ReactNode[] = []
    let cursor = 0

    // Regex for bold **text**, italic *text*, inline code `code`, markdown link [text](url), and inline math $math$
    const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\$[^$]+\$)/g
    let match: RegExpExecArray | null

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > cursor) {
        parts.push(text.substring(cursor, match.index))
      }

      const matchText = match[0]
      if (matchText.startsWith('**') && matchText.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-semibold text-text-primary">
            {matchText.slice(2, -2)}
          </strong>
        )
      } else if (matchText.startsWith('*') && matchText.endsWith('*')) {
        parts.push(
          <em key={match.index} className="italic text-text-secondary">
            {matchText.slice(1, -1)}
          </em>
        )
      } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded bg-bg-primary/80 border border-border-default font-mono text-[11px] text-accent"
          >
            {matchText.slice(1, -1)}
          </code>
        )
      } else if (matchText.startsWith('$') && matchText.endsWith('$')) {
        parts.push(
          <span
            key={match.index}
            className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 font-mono text-[11px] text-accent font-semibold inline-block my-0.5"
          >
            {matchText.slice(1, -1)}
          </span>
        )
      } else if (matchText.startsWith('[') && matchText.includes('](')) {
        const linkMatch = matchText.match(/\[([^\]]+)\]\(([^)]+)\)/)
        if (linkMatch) {
          const [, linkText, linkUrl] = linkMatch
          parts.push(
            <a
              key={match.index}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline inline-flex items-center gap-0.5 font-medium"
            >
              {linkText}
              <ExternalLink size={10} className="inline opacity-70" />
            </a>
          )
        } else {
          parts.push(matchText)
        }
      } else {
        parts.push(matchText)
      }

      cursor = match.index + matchText.length
    }

    if (cursor < text.length) {
      parts.push(text.substring(cursor))
    }

    return parts.length > 0 ? parts : text
  }

  // Parse lines and blocks
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let tableRows: string[][] = []
  let inTable = false
  let inCodeBlock = false
  let codeBlockContent: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="p-3 my-2 rounded-xl bg-bg-primary border border-border-default font-mono text-xs overflow-x-auto text-text-primary"
          >
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        )
        codeBlockContent = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    // Table row detection
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true
      const cells = line
        .trim()
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim())
      // Check if it's a separator line (e.g. |---|---|)
      if (!cells.every((c) => /^:?-+:?$/.test(c))) {
        tableRows.push(cells)
      }
      continue
    } else if (inTable) {
      // Flush table
      if (tableRows.length > 0) {
        const headerRow = tableRows[0]
        const bodyRows = tableRows.slice(1)
        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-xl border border-border-default shadow-sm">
            <table className="w-full text-xs text-left border-collapse">
              {headerRow && (
                <thead>
                  <tr className="bg-bg-tertiary border-b border-border-default text-text-secondary font-mono">
                    {headerRow.map((cell, cIdx) => (
                      <th key={cIdx} className="px-3 py-2 font-semibold">
                        {renderFormattedText(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-border-default/50 bg-bg-primary/50">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-bg-tertiary/40 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-text-primary">
                        {renderFormattedText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      tableRows = []
      inTable = false
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={`space-${i}`} className="h-2" />)
      continue
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-xs font-bold font-mono uppercase tracking-wider text-accent mt-3 mb-1.5 flex items-center gap-1.5">
          {renderFormattedText(line.replace('### ', ''))}
        </h4>
      )
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-sm font-bold text-text-primary mt-3.5 mb-1.5">
          {renderFormattedText(line.replace('## ', ''))}
        </h3>
      )
      continue
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-base font-bold text-text-primary mt-4 mb-2">
          {renderFormattedText(line.replace('# ', ''))}
        </h2>
      )
      continue
    }

    // Blockquotes
    if (line.trim().startsWith('>')) {
      const quoteText = line.trim().replace(/^>\s*/, '')
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="p-2.5 my-2 rounded-xl bg-accent/5 border-l-3 border-accent text-text-secondary text-xs italic leading-relaxed"
        >
          {renderFormattedText(quoteText)}
        </blockquote>
      )
      continue
    }

    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const itemText = line.trim().replace(/^[-*]\s+/, '')
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 text-xs text-text-primary my-1 pl-1">
          <span className="text-accent text-[13px] leading-none mt-0.5">•</span>
          <div className="flex-1 leading-relaxed">{renderFormattedText(itemText)}</div>
        </div>
      )
      continue
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line.trim())) {
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/)
      if (numMatch) {
        elements.push(
          <div key={`num-${i}`} className="flex items-start gap-2 text-xs text-text-primary my-1 pl-1">
            <span className="font-mono text-[11px] text-accent font-semibold shrink-0 mt-0.5">{numMatch[1]}.</span>
            <div className="flex-1 leading-relaxed">{renderFormattedText(numMatch[2])}</div>
          </div>
        )
        continue
      }
    }

    // Normal paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs text-text-primary leading-relaxed my-1">
        {renderFormattedText(line)}
      </p>
    )
  }

  // Flush trailing table if any
  if (inTable && tableRows.length > 0) {
    const headerRow = tableRows[0]
    const bodyRows = tableRows.slice(1)
    elements.push(
      <div key="table-end" className="my-3 overflow-x-auto rounded-xl border border-border-default shadow-sm">
        <table className="w-full text-xs text-left border-collapse">
          {headerRow && (
            <thead>
              <tr className="bg-bg-tertiary border-b border-border-default text-text-secondary font-mono">
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx} className="px-3 py-2 font-semibold">
                    {renderFormattedText(cell)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-border-default/50 bg-bg-primary/50">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-bg-tertiary/40 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-text-primary">
                    {renderFormattedText(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>
}
