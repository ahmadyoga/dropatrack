// Helper to derive ISO 3166-1 alpha-2 region code from IANA timezone.
// Used by YouTube API routes to serve region-appropriate content.

const TIMEZONE_TO_REGION: Record<string, string> = {
    // Southeast Asia
    'Asia/Jakarta': 'ID', 'Asia/Makassar': 'ID', 'Asia/Jayapura': 'ID', 'Asia/Pontianak': 'ID',
    'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Bangkok': 'TH',
    'Asia/Manila': 'PH', 'Asia/Ho_Chi_Minh': 'VN',

    // East Asia
    'Asia/Seoul': 'KR', 'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK',
    'Asia/Taipei': 'TW',

    // South Asia
    'Asia/Kolkata': 'IN', 'Asia/Karachi': 'PK',

    // Middle East
    'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA',

    // Europe
    'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES',
    'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL', 'Europe/Moscow': 'RU', 'Europe/Istanbul': 'TR',

    // Americas
    'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US',
    'America/Sao_Paulo': 'BR', 'America/Mexico_City': 'MX', 'America/Toronto': 'CA',
    'America/Buenos_Aires': 'AR', 'America/Bogota': 'CO', 'America/Lima': 'PE',

    // Oceania
    'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Pacific/Auckland': 'NZ',

    // Africa
    'Africa/Lagos': 'NG', 'Africa/Cairo': 'EG', 'Africa/Johannesburg': 'ZA',
};

const DEFAULT_REGION = 'ID';

/**
 * Convert an IANA timezone string to a YouTube-compatible region code.
 * Falls back to 'ID' (Indonesia) when the timezone is unknown.
 */
export function getRegionCodeFromTimezone(timezone: string | null | undefined): string {
    if (!timezone) return DEFAULT_REGION;
    return TIMEZONE_TO_REGION[timezone] || DEFAULT_REGION;
}
