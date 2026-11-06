export const kinds = ['mod', 'modpack', 'resourcepack'] as const;
export const kindLabel = { mod: 'Mod', modpack: 'Modpack', resourcepack: 'Resource pack' };
export const loaders = ['fabric', 'forge', 'neoforge', 'quilt'] as const;
export const loaderLabel: Record<string, string> = {
  fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge', quilt: 'Quilt', minecraft: 'Minecraft',
};
export const versionSuggestions = ['26.2', '26.1.2', '1.21.11', '1.21.1', '1.20.1', '1.19.2', '1.16.5'];
export type Kind = (typeof kinds)[number];
export type Loader = (typeof loaders)[number];
export type Query = Record<string, string | string[] | undefined>;

export type Project = {
  id: string; slug: string; title: string; kind: Kind; description: string;
  icon: string | null; downloads: number; tags: string[]; gameVersions: string[];
};
export type Relation = 'required' | 'optional' | 'incompatible' | 'embedded';
export type Dependency = {
  relation: Relation; projectId: string | null; versionId: string | null;
  file: string | null; title: string | null;
};
export type Release = {
  id: string; number: string; date: string; channel: 'release' | 'beta' | 'alpha';
  gameVersions: string[]; loaders: string[]; dependencies: Dependency[];
};
export type PlanEntry = Pick<Project, 'id' | 'slug' | 'title' | 'kind'> & { release: Release };

export function isKind(value: unknown): value is Kind {
  return kinds.some(kind => kind === value);
}
export function isLoader(value: unknown): value is Loader {
  return loaders.some(loader => loader === value);
}
export function projectKey(value: unknown): value is string {
  return typeof value === 'string' && /^[\w!@$()`.+,"'-]{1,64}$/.test(value) && value !== '.' && value !== '..';
}
export function idKey(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9]{1,32}$/.test(value);
}
export function isGameVersion(value: unknown): value is string {
  return typeof value === 'string' && /^[\w.+-]{1,32}$/.test(value);
}
export function first(query: Query, key: string) {
  const value = query[key];
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export type Target = { mc: string; loader: Loader | '' };
export function readTarget(query: Query): Target {
  const mc = first(query, 'mc').trim();
  const loader = first(query, 'loader');
  return { mc: isGameVersion(mc) ? mc : '', loader: isLoader(loader) ? loader : '' };
}
export function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== '') params.set(key, String(value));
  const query = params.toString();
  return query ? '?' + query : '';
}
export function detailPath(id: string, target?: Target) {
  return '/thu-vien/' + encodeURIComponent(id) + (target ? queryString(target) : '');
}
export function sourcePath(project: Pick<Project, 'slug' | 'kind'>, versionId?: string) {
  return 'https://modrinth.com/' + project.kind + '/' + encodeURIComponent(project.slug) +
    (versionId ? '/version/' + encodeURIComponent(versionId) : '');
}

export const relationLabel: Record<Relation, string> = {
  required: 'Bắt buộc', optional: 'Tùy chọn', incompatible: 'Không tương thích', embedded: 'Đóng kèm',
};
export function dependencyName(dep: Dependency) {
  return dep.title ?? dep.file ?? (dep.projectId ? 'Dự án ' + dep.projectId : dep.versionId ? 'Bản phát hành ' + dep.versionId : 'Thành phần chưa xác định');
}
export function normalizeSearch(value: string) {
  return value.toLocaleLowerCase('vi').normalize('NFD').replace(/\p{M}/gu, '').replaceAll('đ', 'd').trim();
}
