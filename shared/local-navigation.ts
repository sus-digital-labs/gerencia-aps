export function localReturnPath(candidate: unknown): string {
  if (typeof candidate !== "string" || candidate.length > 1500 || !candidate.startsWith("/") ||
      /^\/\//.test(candidate) || /[\\\x00-\x20]/.test(candidate)) return "/";
  const url = new URL(candidate, "http://localhost");
  if (url.origin !== "http://localhost" || url.pathname.startsWith("//") ||
      /^\/(?:api|assets|login)(?:\/|$)/i.test(url.pathname)) return "/";
  return url.pathname + url.search;
}
