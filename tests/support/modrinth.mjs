const projects = [
  ['LNytGWDc', 'create', 'Create', 'mod', 'Mechanical automation', ['forge', 'neoforge'], ['1.20.1', '1.21.1']],
  ['YL57xq9U', 'iris', 'Iris Shaders', 'mod', 'Shader support for Minecraft', ['fabric'], ['1.20.1']],
  ['AANobbMI', 'sodium', 'Sodium', 'mod', 'Rendering performance', ['fabric'], ['1.20.1']],
  ['w0TnApzs', 'faithful-32x', 'Faithful 32x', 'resourcepack', 'Original textures in 32x', ['32x'], ['1.20.1']],
  ['1KVo5zza', 'fabulously-optimized', 'Fabulously Optimized', 'modpack', 'Optimized modpack', ['fabric'], ['1.20.1']],
].map(([id, slug, title, project_type, description, categories, game_versions]) => ({
  id, slug, title, project_type, description, categories, game_versions, downloads: 4210, icon_url: null,
}));
const dependency = (dependency_type, project_id = null, version_id = null, file_name = null) =>
  ({ dependency_type, project_id, version_id, file_name });
const release = (id, project_id, version_number, loaders, game_versions, date_published, dependencies = []) => ({
  id, project_id, version_number, loaders, game_versions, date_published, dependencies, version_type: 'release', status: 'listed',
});
const releases = [
  release('Create21', 'LNytGWDc', '6.0.6', ['neoforge'], ['1.21.1'], '2026-09-01'),
  release('Create20', 'LNytGWDc', '6.0.4', ['forge'], ['1.20.1'], '2026-08-01'),
  release('IrisTest', 'YL57xq9U', '1.7.6', ['fabric'], ['1.20.1'], '2026-07-01', [
    dependency('required', null, 'SodReq01'),
    dependency('optional', null, null, 'optional-example.jar'),
  ]),
  release('SodReq01', 'AANobbMI', '0.5.11', ['fabric'], ['1.20.1'], '2026-07-01'),
  release('SodOld01', 'AANobbMI', '0.5.10', ['fabric'], ['1.20.1'], '2026-06-01'),
  release('PackTest', 'w0TnApzs', '1.20.1', ['minecraft'], ['1.20.1'], '2026-06-01'),
  release('FopTest1', '1KVo5zza', '5.0', ['fabric'], ['1.20.1'], '2026-07-01'),
];

export function modrinthFixture(url, send, unavailable) {
  if (unavailable) return send(503, { error: 'Fixture outage' });
  const path = url.pathname.replace('/__modrinth', '');
  const array = (key) => JSON.parse(url.searchParams.get(key) || '[]');
  if (path === '/projects') return send(200, projects.filter(project => array('ids').includes(project.id)));
  if (path === '/versions') return send(200, releases.filter(version => array('ids').includes(version.id)));
  if (path === '/search') {
    const q = (url.searchParams.get('query') || '').toLowerCase();
    const facets = array('facets');
    const offset = Number(url.searchParams.get('offset'));
    const limit = Number(url.searchParams.get('limit'));
    const matched = projects.filter(project => (project.title + ' ' + project.description).toLowerCase().includes(q) &&
      facets.every(group => group.some(facet => {
        const [key, value] = facet.split(':');
        return key === 'project_type' ? project.project_type === value :
          key === 'categories' ? project.categories.includes(value) :
          key === 'versions' && project.game_versions.includes(value);
      })));
    return send(200, { hits: matched.slice(offset, offset + limit).map(project => ({
      ...project, project_id: project.id, versions: project.game_versions,
    })), total_hits: matched.length });
  }
  const match = /^\/project\/([^/]+)(\/version)?$/.exec(path);
  const key = match && decodeURIComponent(match[1]);
  const project = projects.find(entry => entry.id === key || entry.slug === key);
  if (!project) return send(404, { error: 'not_found' });
  if (!match[2]) return send(200, project);
  const versions = array('game_versions');
  const loaders = array('loaders');
  return send(200, releases.filter(release => release.project_id === project.id &&
    (!versions.length || release.game_versions.some(version => versions.includes(version))) &&
    (!loaders.length || release.loaders.some(loader => loaders.includes(loader)))));
}
