import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DropATrack',
    short_name: 'DropATrack',
    description: 'Collaborative music rooms — drop tracks and listen together in real time.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#ffd23f',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
