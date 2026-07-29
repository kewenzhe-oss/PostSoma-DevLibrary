/**
 * Public origin used by every crawlable, shareable, and machine-readable URL.
 * GitHub Pages redirects the apex domain to this host, so generated URLs must
 * point at the final destination rather than introduce an extra redirect.
 */
export const SITE_URL = "https://www.205022.xyz";

export const SITE_HOSTNAME = "www.205022.xyz";

export function absoluteSiteUrl(pathname = "/"): string {
  return new URL(pathname, `${SITE_URL}/`).toString();
}
