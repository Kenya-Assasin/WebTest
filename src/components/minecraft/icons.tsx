type IconName = 'mod' | 'modpack' | 'resourcepack' | 'search' | 'arrow' | 'book' | 'check' | 'spark';
const paths: Record<IconName, React.ReactNode> = {
  mod: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></>,
  modpack: <><rect x="3.5" y="7.5" width="17" height="13" rx="2"/><path d="M8 7.5V5h8v2.5M3.5 13h17M10 13v3h4v-3"/></>,
  resourcepack: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4 4"/></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  book: <><path d="M12 5v15M3 4h5a4 4 0 0 1 4 3 4 4 0 0 1 4-3h5v14h-5a5 5 0 0 0-4 2 5 5 0 0 0-4-2H3z"/></>,
  spark: <path d="M12 2c0 6-4 10-10 10 6 0 10 4 10 10 0-6 4-10 10-10-6 0-10-4-10-10Z"/>,
  check: <path d="m5 12 4 4 10-9"/>,
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function AtlasSigil({ size = 33 }: { size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
    <path d="M18 2v4m0 24v4M2 18h4m24 0h4M18 5l13 13-13 13L5 18 18 5Z" opacity=".55" />
    <path d="m18 10 8 4.5v8.8L18 28l-8-4.7v-8.8L18 10Z" />
    <path d="m10 14.5 8 4.7 8-4.7M18 19.2V28m-8-10.5 3 1.8v2.2l2 1.1m11-5.1-3 1.8v2.2l-2 1.1" />
    <path d="m18 12.5 1.6 2-1.6 2-1.6-2 1.6-2Z" fill="currentColor" stroke="none" />
  </svg>;
}

export function VoxelRelic({ kind }: { kind: 'mod' | 'modpack' | 'resourcepack' }) {
  return <svg aria-hidden="true" width="40" height="40" viewBox="0 0 32 32" shapeRendering="crispEdges">
    {kind === 'mod' && <>
      <path fill="#463047" d="M4 6h24v22H4z" /><path fill="#96614c" d="M6 10h20v16H6z" />
      <path fill="#abdb8a" d="M6 8h20v7h-3v3h-4v-3h-5v5h-4v-4H6z" />
      <path fill="#5c8f68" d="M6 13h20v2h-3v3h-4v-3h-5v5h-4v-4H6z" />
      <path fill="#c88f68" d="M8 21h3v3H8zm8 0h2v2h-2zm5-2h3v4h-3z" />
      <path fill="#d4ef9c" d="M8 9h4v2H8zm9 1h5v2h-5z" />
    </>}
    {kind === 'modpack' && <>
      <path fill="#583a48" d="M4 9h24v18H4z" /><path fill="#bc7950" d="M6 11h20v14H6z" />
      <path fill="#e8b76b" d="M6 11h20v6H6z" /><path fill="#754a4a" d="M6 17h20v2H6zm3 4h5v2H9zm10 0h5v2h-5z" />
      <path fill="#fae5a1" d="M14 15h4v7h-4z" /><path fill="#9d684e" d="M15 18h2v3h-2z" />
    </>}
    {kind === 'resourcepack' && <>
      <path fill="#7765af" d="M5 11h21v17H5z" /><path fill="#b196e4" d="M7 8h21v17H7z" />
      <path fill="#eedbfc" d="M5 5h21v17H5z" /><path fill="#555998" d="M7 7h17v13H7z" />
      <path fill="#c7acf7" d="M19 9h3v3h-3zm-10 7h3v-3h4v3h2v2H9z" />
      <path fill="#78bdb6" d="M7 18h17v2H7zm10-2h4v2h-4z" />
    </>}
  </svg>;
}
