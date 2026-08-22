import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { testAiConnection, AiProvider } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, apiKey, model } = body as {
      provider: AiProvider
      apiKey: string
      model?: string
    }

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
    }

    const result = await testAiConnection(provider, apiKey, model)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Connection test failed' },
      { status: 500 }
    )
  }
}
