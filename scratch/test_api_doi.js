async function testApiEndpoint() {
  const doi = '10.1093/bib/bbae298'
  console.log(`Querying internal /api/arxiv logic directly for DOI: ${doi}`)

  // Let's test the Crossref + NCBI + Unpaywall logic
  let pdfUrl = ''
  
  // Crossref
  try {
    const crossrefRes = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)
    if (crossrefRes.ok) {
      const crJson = await crossrefRes.json()
      const cr = crJson.message
      if (cr.link && Array.isArray(cr.link)) {
        const pdfLink = cr.link.find(
          (l) => l['content-type']?.includes('pdf') || l.URL?.includes('.pdf')
        )
        if (pdfLink?.URL) pdfUrl = pdfLink.URL
      }
    }
  } catch (err) {
    console.error('Crossref test error:', err.message)
  }

  // NCBI fallback
  if (!pdfUrl) {
    try {
      const pmcRes = await fetch(`https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?ids=${encodeURIComponent(doi)}&format=json`)
      if (pmcRes.ok) {
        const pmcJson = await pmcRes.json()
        const record = pmcJson.records?.[0]
        if (record?.pmcid) {
          pdfUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/${record.pmcid}/pdf/`
        }
      }
    } catch {}
  }

  console.log('Final resolved pdfUrl:', pdfUrl)
}

testApiEndpoint().catch(console.error)
