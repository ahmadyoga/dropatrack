import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// POST /webhook/google-play
// Logs incoming payload body (raw + parsed JSON when possible)
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    let parsedBody: unknown = rawBody;
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      // Non-JSON body is still logged as raw text
    }

    console.log('Google Play webhook received', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      rawBody,
      body: parsedBody,
      receivedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Google Play webhook error', error);
    return NextResponse.json({ ok: false, error: 'Failed to process webhook' }, { status: 500 });
  }
}
