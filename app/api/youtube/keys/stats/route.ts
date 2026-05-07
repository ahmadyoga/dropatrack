import { NextRequest, NextResponse } from 'next/server';
import { getKeyRotationStats } from '@/lib/youtubeKeyRotation';

export async function GET(request: NextRequest) {
    try {
        const stats = getKeyRotationStats();
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            stats,
            summary: {
                totalKeys: stats.length,
                exhaustedKeys: stats.filter(s => s.quotaExhausted).length,
                totalUsage: stats.reduce((sum, s) => sum + s.usageCount, 0),
                totalErrors: stats.reduce((sum, s) => sum + s.errorCount, 0),
            },
        });
    } catch (error) {
        console.error('Error getting key rotation stats:', error);
        return NextResponse.json(
            { error: 'Failed to get key rotation stats' },
            { status: 500 }
        );
    }
}
