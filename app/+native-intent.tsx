const INVESTMENT_ROUTE_ALIASES = new Set(['/investments']);

function normalizePath(path: string): string {
  if (!path) return '/';

  if (path.startsWith('/')) {
    return path;
  }

  if (path.includes('://')) {
    try {
      const url = new URL(path);
      const nextPath = `${url.pathname}${url.search}${url.hash}`;
      return nextPath || '/';
    } catch {
      return '/';
    }
  }

  return `/${path}`;
}

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  const normalizedPath = normalizePath(path);
  const pathname = normalizedPath.split(/[?#]/)[0] || '/';

  if (INVESTMENT_ROUTE_ALIASES.has(pathname)) {
    const suffix = normalizedPath.slice(pathname.length);
    return `/investment${suffix}`;
  }

  return normalizedPath;
}
