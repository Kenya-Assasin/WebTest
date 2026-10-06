import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { FavoritesProvider } from '@/components/creatures/favorites-provider';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'MCA — Multiverse Creature Archive', template: '%s | MCA' },
  description: 'Cơ sở dữ liệu lưu trữ và nghiên cứu các sinh vật trên khắp đa vũ trụ.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" data-scroll-behavior="smooth"><body>
    <link rel="stylesheet" href="/styles/layout.css" />
    <FavoritesProvider><div id="site-header"><Header /></div>
    {children}
    <div id="site-footer"><Footer /></div></FavoritesProvider>
  </body></html>;
}

