/**
 * Personal Knowledge Management (PKM) Export Utilities
 * Generates Obsidian Markdown with [[wikilinks]] and Notion Research Vault databases.
 */

import type { Paper, Highlight, Note } from '@/lib/types'

/**
 * Format a string into an Obsidian wikilink [[Target]]
 */
export function toWikiLink(text: string): string {
  if (!text) return ''
  const clean = text.replace(/[[\]]/g, '').trim()
  return `[[${clean}]]`
}

/**
 * Generate Obsidian-ready Markdown note with YAML frontmatter & [[wikilinks]]
 */
export function generateObsidianMarkdown(
  paper: Paper,
  highlights: Highlight[] = [],
  notes: Note[] = []
): string {
  const authorWikiLinks = paper.authors
    ? paper.authors
        .split(/[,&]/)
        .map((a) => a.trim())
        .filter(Boolean)
        .map((a) => `  - "[[${a}]]"`)
        .join('\n')
    : '  - "[[Unknown Author]]"'

  const yearTag = paper.publicationYear ? `  - "${paper.publicationYear}"` : ''
  const venueWiki = paper.journal ? `venue: "[[${paper.journal}]]"\n` : ''

  // Build Frontmatter
  let md = `---
title: "${(paper.title || 'Untitled Paper').replace(/"/g, '\\"')}"
type: literature-note
status: ${paper.status || 'TO_READ'}
priority: ${paper.priority || 'MEDIUM'}
${venueWiki}year: ${paper.publicationYear || new Date().getFullYear()}
doi: "${paper.doi || ''}"
arxivId: "${paper.arxivId || ''}"
codeUrl: "${paper.codeUrl || ''}"
modelUrl: "${paper.modelUrl || ''}"
replicationStatus: ${paper.replicationStatus || 'UNTESTED'}
authors:
${authorWikiLinks}
tags:
  - research-paper
  - literature-review
${yearTag}
---

# 📄 ${toWikiLink(paper.title)}

> [!abstract] Abstract
> ${paper.abstract || 'No abstract available.'}

---

## 🔬 3-Minute Research Digest
- **Problem Solved**: ${paper.problemSolved || 'Not specified'}
- **Core Contribution & Method**: ${paper.keyContribution || 'Not specified'}
- **Limitations & Threats**: ${paper.limitations || 'Not specified'}

---

## 🛠️ Code & Replication Artifacts
- **Official Code**: ${paper.codeUrl ? `[GitHub Repository](${paper.codeUrl})` : 'Not linked'}
- **Model Card**: ${paper.modelUrl ? `[Hugging Face Model](${paper.modelUrl})` : 'Not linked'}
- **Dataset**: ${paper.datasetUrl ? `[Dataset Link](${paper.datasetUrl})` : 'Not linked'}
- **Student Notebook**: ${paper.notebookUrl ? `[Colab/Jupyter Notebook](${paper.notebookUrl})` : 'Not linked'}
- **Reproduction Status**: \`${paper.replicationStatus || 'UNTESTED'}\`
${paper.hardwareSpecs ? `- **Hardware Environment**: \`${paper.hardwareSpecs}\`` : ''}

${paper.replicationNotes ? `\n### 📝 Student Reproduction Findings\n${paper.replicationNotes}\n` : ''}

---

## 📋 Structured Literature Review Matrix (Q1–Q9)
`

  // Parse Literature Review JSON if present
  if (paper.literatureReview) {
    try {
      const lr = JSON.parse(paper.literatureReview)
      if (lr.q1ProblemImportance?.detailedAnswer) {
        md += `\n### Q1: Problem Importance & Novelty\n${lr.q1ProblemImportance.detailedAnswer}\n`
      }
      if (lr.q4MethodsPipeline?.detailedAnswer) {
        md += `\n### Q4: Methods & Pipeline Architecture\n${lr.q4MethodsPipeline.detailedAnswer}\n`
      }
      if (lr.q7KeyResults?.detailedAnswer) {
        md += `\n### Q7: Key Results & Benchmarks\n${lr.q7KeyResults.detailedAnswer}\n`
      }
      if (lr.q8LimitationsBiases?.detailedAnswer) {
        md += `\n### Q8: Limitations & Biases\n${lr.q8LimitationsBiases.detailedAnswer}\n`
      }
      if (lr.outcome) {
        md += `\n### Final Evaluation Outcome\n**Verdict**: ${lr.outcome}\n`
      }
    } catch {
      // non-blocking
    }
  }

  // Highlights Section
  if (highlights && highlights.length > 0) {
    md += `\n---\n\n## 🖍️ Inline PDF Highlights & Marginal Discussions\n\n`
    highlights.forEach((hl) => {
      const catEmoji =
        hl.category === 'METHODOLOGY'
          ? '🟡 **Methodology**'
          : hl.category === 'CONTRIBUTION'
          ? '🟢 **Novelty & Contribution**'
          : hl.category === 'LIMITATION'
          ? '🔴 **Threat to Validity**'
          : '🟣 **Advisor Feedback**'

      const pageText = hl.pageNumber ? ` *(p. ${hl.pageNumber})*` : ''
      md += `> [!quote] ${catEmoji}${pageText}\n> "${hl.text}"\n`

      if (hl.comments && hl.comments.length > 0) {
        hl.comments.forEach((c) => {
          const roleBadge = c.user?.systemRole === 'SUPERVISOR' ? '*(Advisor)*' : '*(Student)*'
          md += `> - 💬 **${c.user?.name || 'Researcher'}** ${roleBadge}: ${c.content}\n`
        })
      }
      md += `\n`
    })
  }

  // Notes Section
  if (notes && notes.length > 0) {
    md += `\n---\n\n## 📝 Margin Notes & Synthesis\n\n`
    notes.forEach((n) => {
      md += `- ${n.content}\n`
    })
  }

  // Connected Backlinks
  md += `\n---\n\n## 📚 Connected Literature & Backlinks\n`
  if (paper.authors) {
    paper.authors.split(/[,&]/).forEach((a) => {
      const name = a.trim()
      if (name) md += `- ${toWikiLink(name)}\n`
    })
  }
  if (paper.journal) {
    md += `- ${toWikiLink(paper.journal)}\n`
  }

  return md
}

/**
 * Generate Notion Database-ready Markdown with callouts and properties
 */
export function generateNotionMarkdown(
  paper: Paper,
  highlights: Highlight[] = [],
  notes: Note[] = []
): string {
  let md = `# ${paper.title}\n\n`

  md += `| Property | Value |\n`
  md += `| :--- | :--- |\n`
  md += `| **Authors** | ${paper.authors || 'Unknown'} |\n`
  md += `| **Year** | ${paper.publicationYear || '-'} |\n`
  md += `| **Status** | ${paper.status} |\n`
  md += `| **Priority** | ${paper.priority} |\n`
  md += `| **Venue** | ${paper.journal || 'General'} |\n`
  md += `| **Reproduction** | ${paper.replicationStatus || 'UNTESTED'} |\n`
  if (paper.codeUrl) md += `| **Code** | [GitHub Repo](${paper.codeUrl}) |\n`
  if (paper.modelUrl) md += `| **Hugging Face** | [Model Card](${paper.modelUrl}) |\n`
  if (paper.doi) md += `| **DOI** | [${paper.doi}](https://doi.org/${paper.doi}) |\n`

  md += `\n## 📌 Abstract\n> ${paper.abstract || 'No abstract available.'}\n\n`

  if (paper.problemSolved || paper.keyContribution || paper.limitations) {
    md += `## 🔬 3-Minute Digest\n`
    if (paper.problemSolved) md += `- **Problem**: ${paper.problemSolved}\n`
    if (paper.keyContribution) md += `- **Method**: ${paper.keyContribution}\n`
    if (paper.limitations) md += `- **Limitations**: ${paper.limitations}\n`
    md += `\n`
  }

  if (highlights.length > 0) {
    md += `## 🖍️ Key Highlights\n`
    highlights.forEach((h) => {
      md += `> **[${h.category}]** *(p. ${h.pageNumber || '1'})*: "${h.text}"\n\n`
    })
  }

  if (notes.length > 0) {
    md += `## 📝 Literature Notes\n`
    notes.forEach((n) => {
      md += `- ${n.content}\n`
    })
  }

  return md
}

/**
 * Trigger immediate browser download of a Markdown file (.md)
 */
export function downloadMarkdownFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.md') ? filename : `${filename}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
