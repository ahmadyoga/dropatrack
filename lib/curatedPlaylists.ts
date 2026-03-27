// Curated playlists from YouTube Music channel, organized by region and section
// These IDs are scraped from https://www.youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ
// They change based on locale — sections below are for Indonesian users

export interface CuratedPlaylist {
  id: string;
  title: string;
  description: string;
}

export interface CuratedSection {
  title: string;
  emoji: string;
  playlists: CuratedPlaylist[];
}

// Curated sections for Indonesia (ID)
const SECTIONS_ID: CuratedSection[] = [
  {
    title: 'Lagu-lagu Hits',
    emoji: '🔥',
    playlists: [
      { id: 'RDCLAK5uy_nMln2JPa-4fhqwquE3dRinwNr6IkN2-7k', title: 'RELEASED', description: 'Lagu-lagu paling baru minggu ini' },
      { id: 'RDCLAK5uy_nlmZAEsjgUqCKMcVcmxci_8v8AIZ5qfwA', title: 'The Hit List', description: 'Tempatnya hits-hits terbaik saat ini' },
      { id: 'RDCLAK5uy_lTCjkf-QX-C_U6j8ZL5eM43zQImZS-loo', title: 'Hot Dangdut', description: 'Hotlist Dangdut Indonesia hits terbesar' },
      { id: 'RDCLAK5uy_nOwEIYxGx84rpgRE384JIBHM1xMfEzhho', title: 'Hot Koplo', description: 'Lagu-lagu koplo paling hits saat ini' },
    ],
  },
  {
    title: 'Lagu-lagu Hits Internasional',
    emoji: '🌍',
    playlists: [
      { id: 'RDCLAK5uy_lBNUteBRencHzKelu5iDHwLF6mYqjL-JU', title: 'Hot Hits Indonesia', description: 'Hits terpopuler di Indonesia' },
      { id: 'RDCLAK5uy_lBGRuQnsG37Akr1CY4SxL0VWFbPrbO4gs', title: 'Hot Hip-Hop', description: 'Hip-Hop hits terbesar saat ini' },
      { id: 'RDCLAK5uy_k27uu-EtQ_b5U2r26DNDZOmNqGdccUIGQ', title: 'Hot J-Pop', description: 'J-Pop hits terpopuler' },
      { id: 'RDCLAK5uy_nbK9qSkqYZvtMXH1fLCMmC1yn8HEm0W90', title: 'International Pop', description: 'Pop internasional terbaik' },
    ],
  },
  {
    title: 'Lagu-Lagu Fresh',
    emoji: '✨',
    playlists: [
      { id: 'RDCLAK5uy_kxD6vQQG7kmVW9tPuJ-ju24VmLDLRd3os', title: 'Fresh Indonesian Pop', description: 'Pop Indonesia terbaru' },
      { id: 'RDCLAK5uy_kmeSK0196PqJxBLa6gb78Lg8rbG8NwIp8', title: 'Fresh Indonesian Indie', description: 'Indie Indonesia terbaru' },
      { id: 'RDCLAK5uy_nFLRg6F9iZfcFczOFNfcjmx_w7sMcan80', title: 'International Indo', description: 'Artis Indonesia go international' },
      { id: 'RDCLAK5uy_mnyf2_WAi0BfzxSzwo2xd0IEKI02jOOiA', title: 'Fresh Dangdut', description: 'Dangdut terbaru' },
    ],
  },
  {
    title: 'Top Charts',
    emoji: '📊',
    playlists: [
      { id: 'PL4fGSI1pDJn5ObxTlEPlkkornHXUiKX1z', title: 'Top 100 Songs Indonesia', description: 'Chart lagu terpopuler Indonesia' },
      { id: 'PL4fGSI1pDJn5QPpj0R4vVgRWk8sSq549G', title: 'Top 100 Music Videos ID', description: 'Video musik terpopuler Indonesia' },
    ],
  },
  {
    title: 'Hits Sepanjang Masa',
    emoji: '💎',
    playlists: [
      { id: 'RDCLAK5uy_mb2_YIBK-LCLtVkq8fFY_bIvEdxjt4n6g', title: 'Classic Dangdut', description: 'Melodi abadi dari ikon Dangdut' },
      { id: 'RDCLAK5uy_nmS3YoxSwVVQk9lEQJ0UX4ZCjXsW_psU8', title: "Pop's Biggest Hits", description: 'Lagu pop terbesar dua dekade terakhir' },
      { id: 'RDCLAK5uy_lNVY90Z_CDsPEj_MFppWUlkpp_WB50mSo', title: 'Best of Indonesian Pop', description: 'Pop Indonesia terbaik sepanjang masa' },
    ],
  },
];

// Global/English fallback sections
const SECTIONS_DEFAULT: CuratedSection[] = [
  {
    title: 'Hit Songs',
    emoji: '🔥',
    playlists: [
      { id: 'RDCLAK5uy_nMln2JPa-4fhqwquE3dRinwNr6IkN2-7k', title: 'RELEASED', description: 'The hottest new songs every Friday' },
      { id: 'RDCLAK5uy_nlmZAEsjgUqCKMcVcmxci_8v8AIZ5qfwA', title: 'The Hit List', description: "Today's biggest hits" },
    ],
  },
  {
    title: 'Top Charts',
    emoji: '📊',
    playlists: [
      { id: 'PL4fGSI1pDJn5ObxTlEPlkkornHXUiKX1z', title: 'Top 100 Songs Indonesia', description: 'Top songs chart' },
      { id: 'PL4fGSI1pDJn5QPpj0R4vVgRWk8sSq549G', title: 'Top 100 Music Videos', description: 'Top music videos chart' },
    ],
  },
  {
    title: 'All-Time Hits',
    emoji: '💎',
    playlists: [
      { id: 'RDCLAK5uy_nmS3YoxSwVVQk9lEQJ0UX4ZCjXsW_psU8', title: "Pop's Biggest Hits", description: 'The biggest pop songs of the last two decades' },
    ],
  },
];

const SECTIONS_BY_REGION: Record<string, CuratedSection[]> = {
  ID: SECTIONS_ID,
};

export function getCuratedSections(regionCode: string): CuratedSection[] {
  return SECTIONS_BY_REGION[regionCode] || SECTIONS_DEFAULT;
}
