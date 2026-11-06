import type { Metadata } from 'next';
import { MinecraftFooter, MinecraftHeader } from '@/components/minecraft/shell';
import './(minecraft)/minecraft.css';

export const metadata: Metadata = {
  title: { default: 'Mod Atlas — Thư viện Minecraft', template: '%s | Mod Atlas' },
  description: 'Tra cứu mod, modpack, resource pack và hướng dẫn vật phẩm Minecraft Java bằng tiếng Việt.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><div className="mc-app">
    <MinecraftHeader />{children}<MinecraftFooter />
  </div></body></html>;
}
