import 'server-only';
import {
  idKey, isGameVersion, isKind, kinds, projectKey,
  type Dependency, type Kind, type Project, type Release, type Target,
} from './catalog';

const liveBase = 'https://api.modrinth.com/v2';
const testing = process.env.MOD_ATLAS_TEST === '1' && Boolean(process.env.MOD_ATLAS_TEST_MODRINTH_URL);
const base = testing ? process.env.MOD_ATLAS_TEST_MODRINTH_URL! : liveBase;
export const pageSize = 18;
// Bound broad browsing; a more specific search still covers the full source catalog.
export const maxPage = 55;
type ObjectValue = Record<string, unknown>;
type Result<T> = { status: 'ok'; value: T } | { status: 'missing' | 'unavailable' };

const obj = (value: unknown): ObjectValue | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as ObjectValue : null;
const text = (value: unknown, max: number) => typeof value === 'string' ? value.slice(0, max) : '';
const strings = (value: unknown, count: number) => Array.isArray(value)
  ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length <= 64).slice(0, count) : [];
const idOrNull = (value: unknown) => idKey(value) ? value : null;

async function get(path: string, params: URLSearchParams, ttl: number): Promise<Result<unknown>> {
  try {
    const response = await fetch(base + path + (params.size ? '?' + params : ''), {
      headers: { 'User-Agent': 'Kenya-Assasin/WebTest-ModAtlas/0.1 (+https://github.com/Kenya-Assasin/WebTest)', Accept: 'application/json' },
      signal: AbortSignal.timeout(6500),
      ...(testing ? { cache: 'no-store' } as const : { next: { revalidate: ttl } }),
    });
    if (response.status === 404) return { status: 'missing' };
    if (!response.ok) return { status: 'unavailable' };
    return { status: 'ok', value: await response.json() };
  } catch {
    return { status: 'unavailable' };
  }
}

function iconUrl(value: unknown): string | null {
  try {
    const url = new URL(text(value, 1500));
    return url.origin === 'https://cdn.modrinth.com' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function parseProject(value: unknown): Project | null {
  const row = obj(value);
  const id = row?.project_id ?? row?.id;
  if (!row || !idKey(id) || !projectKey(row.slug) || !isKind(row.project_type) || typeof row.title !== 'string') return null;
  return {
    id, slug: row.slug, title: text(row.title, 160), kind: row.project_type,
    description: text(row.description, 500), icon: iconUrl(row.icon_url),
    downloads: typeof row.downloads === 'number' && Number.isFinite(row.downloads) ? Math.max(0, row.downloads) : 0,
    tags: strings(row.display_categories ?? row.categories, 16),
    gameVersions: strings(row.game_versions ?? row.versions, 800).filter(isGameVersion),
  };
}

function parseDependency(value: unknown): Dependency | null {
  const row = obj(value);
  const relation = row?.dependency_type;
  if (!row || (relation !== 'required' && relation !== 'optional' && relation !== 'incompatible' && relation !== 'embedded')) return null;
  return { relation, projectId: idOrNull(row.project_id), versionId: idOrNull(row.version_id), file: text(row.file_name, 200) || null, title: null };
}

function parseRelease(value: unknown, projectId: string): Release | null {
  const row = obj(value);
  if (!row || !idKey(row.id) || row.project_id !== projectId || typeof row.version_number !== 'string') return null;
  if (row.status && row.status !== 'listed' && row.status !== 'archived' && row.status !== 'unlisted') return null;
  const channel = row.version_type;
  if (channel !== 'release' && channel !== 'beta' && channel !== 'alpha') return null;
  return {
    id: row.id, number: text(row.version_number, 100), date: text(row.date_published, 40), channel,
    gameVersions: strings(row.game_versions, 800).filter(isGameVersion), loaders: strings(row.loaders, 16),
    dependencies: Array.isArray(row.dependencies) ? row.dependencies.map(parseDependency).filter(dep => dep !== null) : [],
  };
}

export type CatalogFilters = Target & { q: string; kind: Kind | ''; sort: 'relevance' | 'downloads' | 'updated'; page: number };

export async function searchProjects(filters: CatalogFilters): Promise<Result<{ projects: Project[]; total: number }>> {
  const facets = [(filters.kind ? [filters.kind] : kinds).map(kind => 'project_type:' + kind)];
  if (filters.mc) facets.push(['versions:' + filters.mc]);
  if (filters.loader && filters.kind !== 'resourcepack') {
    if (filters.kind) facets.push(['categories:' + filters.loader]);
    else facets.push(['categories:' + filters.loader, 'project_type:resourcepack']);
  }
  const params = new URLSearchParams({
    query: filters.q, facets: JSON.stringify(facets), index: filters.sort,
    limit: String(pageSize), offset: String((filters.page - 1) * pageSize),
  });
  const result = await get('/search', params, 300);
  const data = result.status === 'ok' ? obj(result.value) : null;
  if (!data || !Array.isArray(data.hits) || typeof data.total_hits !== 'number') return { status: 'unavailable' };
  return { status: 'ok', value: { projects: data.hits.map(parseProject).filter(row => row !== null), total: data.total_hits } };
}

export async function getProject(key: string): Promise<Result<Project>> {
  if (!projectKey(key)) return { status: 'missing' };
  const result = await get('/project/' + encodeURIComponent(key), new URLSearchParams(), 900);
  if (result.status !== 'ok') return result;
  const row = obj(result.value);
  if (row && !isKind(row.project_type)) return { status: 'missing' };
  const project = parseProject(row);
  return project ? { status: 'ok', value: project } : { status: 'unavailable' };
}

export async function getReleases(project: Project, target: Target): Promise<Result<Release[]>> {
  const params = new URLSearchParams({ include_changelog: 'false' });
  if (target.mc) params.set('game_versions', JSON.stringify([target.mc]));
  if (target.loader && project.kind !== 'resourcepack') params.set('loaders', JSON.stringify([target.loader]));
  const result = await get('/project/' + encodeURIComponent(project.id) + '/version', params, 600);
  if (result.status !== 'ok') return result;
  if (!Array.isArray(result.value)) return { status: 'unavailable' };
  const releases = result.value.map(row => parseRelease(row, project.id)).filter(row => row !== null)
    .filter(row => (!target.mc || row.gameVersions.includes(target.mc)) &&
      (!target.loader || project.kind === 'resourcepack' || row.loaders.includes(target.loader)));
  return { status: 'ok', value: releases.sort((a, b) => b.date.localeCompare(a.date)) };
}

export async function resolveDependencies(dependencies: Dependency[]): Promise<Dependency[]> {
  const versionIds = [...new Set(dependencies.filter(dep => !dep.projectId && dep.versionId).map(dep => dep.versionId!))].slice(0, 40);
  const versionProjects = new Map<string, string>();
  if (versionIds.length) {
    const response = await get('/versions', new URLSearchParams({ ids: JSON.stringify(versionIds) }), 3600);
    if (response.status === 'ok' && Array.isArray(response.value)) {
      for (const value of response.value) {
        const row = obj(value);
        if (row && idKey(row.id) && idKey(row.project_id)) versionProjects.set(row.id, row.project_id);
      }
    }
  }
  const resolved = dependencies.map(dep => ({ ...dep, projectId: dep.projectId ?? versionProjects.get(dep.versionId ?? '') ?? null }));
  const ids = [...new Set(resolved.flatMap(dep => dep.projectId ? [dep.projectId] : []))].slice(0, 40);
  if (!ids.length) return resolved;
  const response = await get('/projects', new URLSearchParams({ ids: JSON.stringify(ids) }), 3600);
  const names = new Map<string, string>();
  if (response.status === 'ok' && Array.isArray(response.value)) {
    for (const value of response.value) {
      const row = obj(value);
      if (row && idKey(row.id) && typeof row.title === 'string') names.set(row.id, text(row.title, 160));
    }
  }
  return resolved.map(dep => ({ ...dep, title: names.get(dep.projectId ?? '') ?? null }));
}
