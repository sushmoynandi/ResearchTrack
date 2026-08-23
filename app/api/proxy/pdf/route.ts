import { NextRequest, NextResponse } from 'next/server'

// GET /api/proxy/pdf?url=... — Stream remote PDF or HTML article inline to bypass publisher X-Frame-Options restrictions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let targetUrl = searchParams.get('url')

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Valid target PDF URL is required' }, { status: 400 })
    }

    let fetchUrl: string = targetUrl

    // 1. Rewrite arXiv abs URL to direct PDF
    const arxivAbsMatch = fetchUrl.match(/(?:arxiv\.org\/abs\/|ar5iv\.labs\.arxiv\.org\/html\/)([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)/i)
    if (arxivAbsMatch) {
      fetchUrl = `https://arxiv.org/pdf/${arxivAbsMatch[1]}.pdf`
    }

    // 2. If it is a DOI URL, attempt OpenAlex / Unpaywall OA resolution first
    const doiMatch = fetchUrl.match(/(?:doi\.org\/|doi:\s*)(10\.[0-9]{4,9}\/[-._;()/:A-Za-z0-9]+)/i)
    if (doiMatch) {
      try {
        const cleanDoi = doiMatch[1].trim()
        const oaRes = await fetch(
          `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(cleanDoi)}`,
          { headers: { 'User-Agent': 'ResearchTrack/1.0 (mailto:support@researchtrack.io)' } }
        )
        if (oaRes.ok) {
          const oaJson = await oaRes.json()
          const oaPdf =
            oaJson.best_oa_location?.pdf_url ||
            oaJson.primary_location?.pdf_url ||
            (oaJson.best_oa_location?.landing_page_url?.endsWith('.pdf') ? oaJson.best_oa_location.landing_page_url : null)
          if (oaPdf && typeof oaPdf === 'string' && oaPdf.startsWith('http')) {
            fetchUrl = oaPdf
          }
        }
      } catch {
        // Fall back to direct fetch
      }
    }

    // 3. Fetch the remote resource with browser-like headers
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/pdf,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      return new NextResponse(getFallbackHtml(fetchUrl, response.status), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const finalUrl = response.url || fetchUrl
    const arrayBuffer = await response.arrayBuffer()
    const headerBytes = Buffer.from(arrayBuffer.slice(0, 5)).toString('utf-8')

    // 4. Check if the response is actually a binary PDF
    if (headerBytes.startsWith('%PDF')) {
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // 5. If server returned HTML, check for embedded citation_pdf_url meta tag
    const htmlText = Buffer.from(arrayBuffer).toString('utf-8')
    const citationPdfMatch =
      htmlText.match(/<meta[^>]+(?:name|property)=["'](?:citation_pdf_url|biorxiv_pdf_url|eprints\.document_url)["'][^>]+content=["']([^"']+)["']/i) ||
      htmlText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:citation_pdf_url|biorxiv_pdf_url|eprints\.document_url)["']/i)

    if (citationPdfMatch && citationPdfMatch[1]?.startsWith('http')) {
      try {
        const directPdfRes = await fetch(citationPdfMatch[1], {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'application/pdf,*/*',
          },
          redirect: 'follow',
        })
        if (directPdfRes.ok) {
          const pdfBuffer = await directPdfRes.arrayBuffer()
          const pdfHeader = Buffer.from(pdfBuffer.slice(0, 5)).toString('utf-8')
          if (pdfHeader.startsWith('%PDF')) {
            return new NextResponse(pdfBuffer, {
              status: 200,
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline',
                'Cache-Control': 'public, max-age=86400, s-maxage=86400',
                'Access-Control-Allow-Origin': '*',
              },
            })
          }
        }
      } catch {
        // Fall back to proxied HTML
      }
    }

    // 6. Direct In-Website HTML Article View:
    // Sanitize HTML, remove iframe-busting scripts, and inject base href
    let modifiedHtml = htmlText
      .replace(/<script[^>]*>(?:(?!(<\/script>))[\s\S])*?(?:top\.location|window\.top|window\.self\s*!==\s*window\.top|location\.href\s*=\s*top\.location)[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]*src=["'][^"']*(?:frame-buster|antibot)[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '')

    // Inject base href so all stylesheets, images, fonts, and assets resolve to the publisher site
    if (modifiedHtml.includes('<head>')) {
      modifiedHtml = modifiedHtml.replace('<head>', `<head><base href="${finalUrl}">`)
    } else if (modifiedHtml.includes('<html')) {
      modifiedHtml = modifiedHtml.replace(/(<html[^>]*>)/i, `$1<head><base href="${finalUrl}"></head>`)
    } else {
      modifiedHtml = `<head><base href="${finalUrl}"></head>` + modifiedHtml
    }

    return new NextResponse(modifiedHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Error proxying PDF/Article stream:', error)
    return new NextResponse(getFallbackHtml(request.nextUrl.searchParams.get('url') || '', 500), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

function getFallbackHtml(targetUrl: string, status: number) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Publisher Article Portal</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #090d16;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      background: #131b2e;
      border: 1px solid #1e293b;
      border-radius: 20px;
      padding: 40px 32px;
      max-width: 520px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .icon { font-size: 44px; margin-bottom: 12px; }
    h2 { font-size: 19px; font-weight: 700; margin: 0 0 8px 0; color: #f8fafc; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0; }
    .btn-group { display: flex; flex-direction: column; gap: 10px; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #6366f1;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
      box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
    }
    .btn:hover { background: #4f46e5; transform: translateY(-1px); }
    .btn-outline {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 500;
      text-decoration: none;
    }
    .btn-outline:hover { background: #334155; color: #ffffff; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-family: monospace;
      font-weight: 600;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
      margin-bottom: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🌐</div>
    <div class="badge">Publisher Portal Direct Access</div>
    <h2>Official Publisher Publication</h2>
    <p>This publisher requires direct browsing credentials. Click below to open the complete authentic article or switch to the <strong>Structured Article</strong> tab in the reader toolbar above.</p>
    <div class="btn-group">
      <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn">
        Open in Publisher Portal ↗
      </a>
    </div>
  </div>
</body>
</html>`
}
