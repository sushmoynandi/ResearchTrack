import { NextRequest, NextResponse } from 'next/server'

// GET /api/proxy/pdf?url=... — Stream remote PDF inline to bypass publisher X-Frame-Options restrictions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const targetUrl = searchParams.get('url')

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Valid target PDF URL is required' }, { status: 400 })
    }

    // Fetch the remote PDF with standard browser headers
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/pdf,application/xhtml+xml,text/html;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      return new NextResponse(getFallbackHtml(targetUrl, response.status), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const arrayBuffer = await response.arrayBuffer()
    const headerBytes = Buffer.from(arrayBuffer.slice(0, 5)).toString('utf-8')

    // Check if the response is actually a binary PDF
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

    // If server returned HTML / redirect landing page instead of PDF binary
    return new NextResponse(getFallbackHtml(targetUrl, 200), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    console.error('Error proxying PDF stream:', error)
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
  <title>Publisher PDF Reader</title>
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
      border-radius: 16px;
      padding: 36px 28px;
      max-width: 460px;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
    }
    .icon { font-size: 42px; margin-bottom: 12px; }
    h2 { font-size: 17px; font-weight: 700; margin: 0 0 8px 0; color: #f8fafc; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0; }
    .btn-group { display: flex; flex-direction: column; gap: 8px; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: #3b82f6;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn:hover { background: #2563eb; }
    .btn-outline {
      background: transparent;
      color: #cbd5e1;
      border: 1px solid #334155;
    }
    .btn-outline:hover { background: #1e293b; color: #ffffff; }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-family: monospace;
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📑</div>
    <div class="badge">Publisher Portal Direct Stream</div>
    <h2>Publisher Direct Access</h2>
    <p>This journal publisher restricts automated iframe rendering. Click below to open the official publication or read the complete text in the <strong>Structured Article</strong> tab above.</p>
    <div class="btn-group">
      <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn">
        Open in Publisher Portal ↗
      </a>
    </div>
  </div>
</body>
</html>`
}
