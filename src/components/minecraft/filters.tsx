import { loaderLabel, loaders, versionSuggestions } from '@/lib/minecraft/catalog';
import { translator, type Locale } from '@/lib/minecraft/locale';

export function MinecraftVersionOptions({ id, versions = versionSuggestions }: { id: string; versions?: string[] }) {
  return <datalist id={id}>{versions.map(version => <option key={version} value={version} />)}</datalist>;
}

export function LoaderOptions({ locale, empty }: { locale: Locale; empty?: string }) {
  return <><option value="">{empty ?? translator(locale)('Mọi bộ nạp', 'Any loader')}</option>{loaders.map(loader => <option key={loader} value={loader}>{loaderLabel[loader]}</option>)}</>;
}
