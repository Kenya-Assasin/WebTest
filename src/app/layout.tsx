import type { Metadata } from 'next';
import { LanguageProvider } from '@/components/minecraft/language-provider';
import { MinecraftFooter, MinecraftHeader } from '@/components/minecraft/shell';
import { translator } from '@/lib/minecraft/locale';
import { getLocale } from '@/lib/minecraft/locale-server';
import './(minecraft)/minecraft.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = translator(await getLocale());
  return {
    title: { default: t('Mod Atlas — Thư viện Minecraft', 'Mod Atlas — Minecraft Library'), template: '%s | Mod Atlas' },
    description: t('Tra cứu mod, modpack, resource pack và hướng dẫn vật phẩm Minecraft Java bằng tiếng Việt.',
      'Explore Minecraft Java mods, modpacks, resource packs and item guides.'),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return <html lang={locale}><body><LanguageProvider locale={locale}><div className="mc-app">
    <MinecraftHeader locale={locale} />{children}<MinecraftFooter locale={locale} />
  </div></LanguageProvider></body></html>;
}
