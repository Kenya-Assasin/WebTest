import {
  idKey, isGameVersion, isKind, isLoader, projectKey,
  type Dependency, type PlanEntry, type Release, type Target,
} from './catalog';

export const maxPlanEntries = 60;
export type PackPlan = { target: Target; entries: PlanEntry[] };
export type PlanIssue = { kind: 'minecraft' | 'loader' | 'missing' | 'wrong-version' | 'conflict'; dependency?: Dependency };
const asObject = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value)
  ? value as Record<string, unknown> : null;
const nullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';

function validDependency(value: unknown): value is Dependency {
  const dep = asObject(value);
  return !!dep && ['required', 'optional', 'incompatible', 'embedded'].some(relation => relation === dep.relation) &&
    (dep.projectId === null || idKey(dep.projectId)) && (dep.versionId === null || idKey(dep.versionId)) &&
    nullableString(dep.file) && nullableString(dep.title);
}
function validRelease(value: unknown): value is Release {
  const version = asObject(value);
  return !!version && idKey(version.id) && typeof version.number === 'string' && typeof version.date === 'string' &&
    ['release', 'beta', 'alpha'].some(channel => channel === version.channel) &&
    Array.isArray(version.gameVersions) && version.gameVersions.every(isGameVersion) &&
    Array.isArray(version.loaders) && version.loaders.every(loader => typeof loader === 'string') &&
    Array.isArray(version.dependencies) && version.dependencies.every(validDependency);
}
function validEntry(value: unknown): value is PlanEntry {
  const entry = asObject(value);
  return !!entry && idKey(entry.id) && projectKey(entry.slug) && isKind(entry.kind) &&
    typeof entry.title === 'string' && validRelease(entry.release);
}
export function readPlan(snapshot: string): PackPlan {
  let data: ReturnType<typeof asObject> = null;
  try { data = asObject(JSON.parse(snapshot)); } catch { /* An empty or stale browser store is fine. */ }
  const target = asObject(data?.target);
  const entries = Array.isArray(data?.entries) ? data.entries.filter(validEntry).slice(0, maxPlanEntries) : [];
  return {
    target: { mc: isGameVersion(target?.mc) ? target.mc : '', loader: isLoader(target?.loader) ? target.loader : '' },
    entries: [...new Map(entries.map(entry => [entry.id, entry])).values()],
  };
}

export function getPlanIssues(entry: PlanEntry, plan: PackPlan): PlanIssue[] {
  const { mc, loader } = plan.target;
  const issues: PlanIssue[] = [];
  if (mc && !entry.release.gameVersions.includes(mc)) issues.push({ kind: 'minecraft' });
  if (loader && entry.kind !== 'resourcepack' && !entry.release.loaders.includes(loader)) issues.push({ kind: 'loader' });
  for (const dependency of entry.release.dependencies) {
    if (dependency.relation !== 'required' && dependency.relation !== 'incompatible') continue;
    const otherEntries = plan.entries.filter(other => other.id !== entry.id);
    const match = otherEntries.some(other => dependency.versionId
      ? other.release.id === dependency.versionId && (!dependency.projectId || other.id === dependency.projectId)
      : Boolean(dependency.projectId) && other.id === dependency.projectId);
    if (dependency.relation === 'incompatible' && match) issues.push({ kind: 'conflict', dependency });
    if (dependency.relation === 'required' && !match) {
      issues.push({
        kind: dependency.versionId && dependency.projectId && otherEntries.some(other => other.id === dependency.projectId)
          ? 'wrong-version' : 'missing',
        dependency,
      });
    }
  }
  return issues;
}
