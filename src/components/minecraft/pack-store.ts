'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { maxPlanEntries, readPlan, type PackPlan } from '@/lib/minecraft/plan';
import { isLoader, type PlanEntry, type Target } from '@/lib/minecraft/catalog';

const key = 'minecraft-atlas:pack:v1';
function snapshot() {
  try { return window.localStorage.getItem(key) ?? ''; } catch { return ''; }
}
function subscribe(notify: () => void) {
  const sync = (event: StorageEvent) => { if (event.key === key || event.key === null) notify(); };
  window.addEventListener('storage', sync);
  window.addEventListener(key, notify);
  return () => { window.removeEventListener('storage', sync); window.removeEventListener(key, notify); };
}
const emptySnapshot = () => '';
export function usePlan() {
  const raw = useSyncExternalStore(subscribe, snapshot, emptySnapshot);
  return useMemo(() => readPlan(raw), [raw]);
}
function save(plan: PackPlan) {
  try {
    window.localStorage.setItem(key, JSON.stringify(plan));
    window.dispatchEvent(new Event(key));
    return true;
  } catch { return false; }
}
export function saveTarget(target: Target) {
  return save({ ...readPlan(snapshot()), target });
}
export function removeProject(id: string) {
  const plan = readPlan(snapshot());
  return save({ ...plan, entries: plan.entries.filter(entry => entry.id !== id) });
}
export function addProject(entry: PlanEntry, target: Target): 'full' | 'storage' | null {
  const plan = readPlan(snapshot());
  const exists = plan.entries.some(other => other.id === entry.id);
  if (!exists && plan.entries.length >= maxPlanEntries) return 'full';
  const releaseLoader = entry.release.loaders.length === 1 ? entry.release.loaders[0] : '';
  const newTarget: Target = plan.entries.length > 0 ? plan.target : {
    mc: plan.target.mc || target.mc || (entry.release.gameVersions.length === 1 ? entry.release.gameVersions[0] : ''),
    loader: plan.target.loader || (entry.kind !== 'resourcepack' ? target.loader || (isLoader(releaseLoader) ? releaseLoader : '') : ''),
  };
  return save({ target: newTarget, entries: [...plan.entries.filter(other => other.id !== entry.id), entry] })
    ? null : 'storage';
}
