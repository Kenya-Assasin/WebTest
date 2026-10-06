const returnPaths = new Set(['/', '/kho-du-lieu', '/chi-tiet-sinh-vat', '/tao-ho-so',
  '/dieu-tra-vien', '/admin', '/admin-chi-tiet', '/admin-nguon-goc', '/admin-phan-loai']);

/** Allow only known local pages. Never redirect to a URL supplied by an external party. */
export function safeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  try {
    const parsed = new URL(value, 'https://mca.invalid');
    if (parsed.origin !== 'https://mca.invalid' || !returnPaths.has(parsed.pathname)) return '/';
    return parsed.pathname + parsed.search;
  } catch {
    return '/';
  }
}

