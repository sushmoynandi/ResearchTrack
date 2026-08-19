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
      return NextResponse.json(
        { error: `Remote PDF server responded with HTTP ${response.status}` },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type') || 'application/pdf'
    const arrayBuffer = await response.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Error proxying PDF stream:', error)
    return NextResponse.json({ error: 'Failed to stream remote PDF document' }, { status: 500 })
  }
}
