import { loaderLabel, loaders, versionSuggestions } from '@/lib/minecraft/catalog';

export function MinecraftVersionOptions({ id, versions = versionSuggestions }: { id: string; versions?: string[] }) {
  return <datalist id={id}>{versions.map(version => <option key={version} value={version} />)}</datalist>;
}

export function LoaderOptions({ empty = 'Mọi bộ nạp' }: { empty?: string }) {
  return <><option value="">{empty}</option>{loaders.map(loader => <option key={loader} value={loader}>{loaderLabel[loader]}</option>)}</>;
}
