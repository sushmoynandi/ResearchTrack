import type { Paper } from './types'

export type CitationFormat = 'APA' | 'MLA' | 'IEEE' | 'CHICAGO' | 'BIBTEX'

export function generateCitation(paper: Paper, format: CitationFormat): string {
  const { title, authors, journal, publicationYear, doi, url } = paper
  const year = publicationYear || 'n.d.'

  switch (format) {
    case 'APA': {
      // APA 7th: Author, A. A. (Year). Title of article. Title of Periodical, DOI/URL
      let cite = `${authors} (${year}). ${title}.`
      if (journal) cite += ` ${journal}.`
      if (doi) cite += ` https://doi.org/${doi}`
      else if (url) cite += ` ${url}`
      return cite
    }

    case 'MLA': {
      // MLA 9th: Author. "Title of Article." Title of Journal, Year, URL/DOI.
      let cite = `${authors}. "${title}."`
      if (journal) cite += ` ${journal},`
      cite += ` ${year}.`
      if (doi) cite += ` https://doi.org/${doi}`
      else if (url) cite += ` ${url}`
      return cite
    }

    case 'IEEE': {
      // IEEE: [1] J. K. Author, "Title of paper," Abbrev. Title of Journal, year.
      let cite = `${authors}, "${title},"`
      if (journal) cite += ` ${journal},`
      cite += ` ${year}.`
      if (doi) cite += ` doi: ${doi}.`
      return cite
    }

    case 'CHICAGO': {
      // Chicago: Author. Year. "Title of Article." Journal. URL/DOI.
      let cite = `${authors}. ${year}. "${title}."`
      if (journal) cite += ` ${journal}.`
      if (doi) cite += ` https://doi.org/${doi}.`
      else if (url) cite += ` ${url}.`
      return cite
    }

    case 'BIBTEX': {
      // Generate clean BibTeX cite key (e.g. firstAuthorYear)
      const firstAuthor = (authors.split(',')[0] || 'author').trim().replace(/[^a-zA-Z]/g, '').toLowerCase()
      const citeKey = `${firstAuthor}${year}`
      
      const lines = [
        `@article{${citeKey},`,
        `  title={${title}},`,
        `  author={${authors}},`,
      ]
      if (journal) lines.push(`  journal={${journal}},`)
      if (publicationYear) lines.push(`  year={${publicationYear}},`)
      if (doi) lines.push(`  doi={${doi}},`)
      if (url) lines.push(`  url={${url}},`)
      lines.push(`}`)
      return lines.join('\n')
    }

    default:
      return `${authors} (${year}). ${title}.`
  }
}
