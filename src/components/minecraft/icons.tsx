type IconName = 'mod' | 'modpack' | 'resourcepack' | 'search' | 'arrow' | 'book' | 'check';
const paths: Record<IconName, React.ReactNode> = {
  mod: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></>,
  modpack: <><rect x="3.5" y="7.5" width="17" height="13" rx="2"/><path d="M8 7.5V5h8v2.5M3.5 13h17M10 13v3h4v-3"/></>,
  resourcepack: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4 4"/></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  book: <><path d="M12 5v15M3 4h5a4 4 0 0 1 4 3 4 4 0 0 1 4-3h5v14h-5a5 5 0 0 0-4 2 5 5 0 0 0-4-2H3z"/></>,
  check: <path d="m5 12 4 4 10-9"/>,
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function AtlasArt() {
  return <svg className="mc-art" viewBox="0 0 550 360" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="atlas-grass" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#c5f077"/><stop offset="1" stopColor="#648936"/></linearGradient>
      <linearGradient id="atlas-ore" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop stopColor="#83e2c2"/><stop offset="1" stopColor="#4a8f74"/></linearGradient>
    </defs>
    <g stroke="#a5c86c" opacity=".19">
      <path d="m57 253 211-111 229 111-220 99L57 253Z"/>
      <path d="m100 230 221 102m-179-124 222 105m-179-127 224 107m-181-129 225 109M104 275l213-109M147 295l214-108M191 315l214-108M234 335l216-107"/>
      <circle cx="275" cy="170" r="126" strokeDasharray="3 7"/>
      <circle cx="275" cy="170" r="157"/>
    </g>
    <path d="m147 259 131-68 132 67-131 69z" fill="#080d09" opacity=".65"/>
    <g stroke="#101a12" strokeWidth="2" strokeLinejoin="round">
      <path d="m168 151 112-59 113 59-113 59z" fill="url(#atlas-grass)"/>
      <path d="m168 151 112 59v106l-112-57z" fill="#6d5033"/>
      <path d="m280 210 113-59v108l-113 57z" fill="#463624"/>
      <path d="m168 151 112 59v30l-24-12v8l-25-13v-14l-21-11v12l-24-12v-9l-18-9z" fill="#71983e"/>
      <path d="m280 210 113-59v28l-20 11v9l-18 9v-9l-22 12v12l-24 12v-10l-29 15z" fill="#526f2d"/>
    </g>
    <g opacity=".43">
      <path d="m186 207 23 12v17l-23-12zm37 33 22 11v16l-22-11zm-39 0 14 8v13l-14-7zm65-6 15 8v13l-15-8zm0 38 23 12v17l-23-12z" fill="#b38a59"/>
      <path d="m296 250 19-10v14l-19 10zm36-17 18-10v17l-18 10zm35-16 18-9v16l-18 10zm-49 59 24-12v18l-24 12z" fill="#90653a"/>
      <path d="m188 151 25-13 24 12-24 13zm49-25 24-13 25 13-24 13zm49 0 24-13 25 13-24 13zm-49 49 24-13 25 13-24 13zm74-14 23-12 23 12-24 13z" fill="#d9fb91"/>
      <path d="m260 149 25-13 24 12-24 13zm25 39 24-13 25 12-24 13z" fill="#3d5b29"/>
    </g>
    <g stroke="#101a12" strokeWidth="1.5" strokeLinejoin="round">
      <path d="m353 87 40-21 41 21-41 21z" fill="url(#atlas-ore)"/>
      <path d="m353 87 40 21v43l-40-21z" fill="#448a72"/>
      <path d="m393 108 41-21v43l-41 21z" fill="#2b604e"/>
      <path d="m101 146 25-13 26 13-26 13z" fill="#be965a"/>
      <path d="m101 146 25 13v26l-25-13z" fill="#8d683f"/>
      <path d="m126 159 26-13v26l-26 13z" fill="#614729"/>
    </g>
    <path d="m365 102 11 6v10l-11-6zm39 10 12-6v10l-12 6z" fill="#b7f7d7" opacity=".55"/>
    <g fill="#c4ec7d"><path d="M171 75h6v6h-6zM468 169h5v5h-5zM449 218h4v4h-4zM96 218h4v4h-4zM300 56h5v5h-5z"/><path d="M245 50h2v18h-2zm-8 8h18v2h-18zM456 61h2v16h-2zm-7 7h16v2h-16z" opacity=".7"/></g>
  </svg>;
}
