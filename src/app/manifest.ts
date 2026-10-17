import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'YolNet | Taksi Rota, Canlı Trafik & Ücret Hakemi',
    short_name: 'YolNet',
    description:
      'Yolcu ve şoförler için canlı trafikli taksimetre hesaplama, köprü/otoyol gişe hakemi, grup bölüşme ve vardiya kâr asistanı.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#090d16',
    orientation: 'portrait',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
