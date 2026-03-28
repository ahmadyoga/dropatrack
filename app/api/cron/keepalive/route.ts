import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// This endpoint is used by Vercel Cron to keep the Supabase project active
export async function GET() {
  try {
    // A simple query to any table is enough to prevent the project from pausing
    const { error } = await supabase
      .from('rooms')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error pinging Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to ping database', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Supabase pinged successfully',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Unexpected error processing keepalive cron:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
