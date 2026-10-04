const EXTENSION_ORIGIN_PREFIX = "chrome-extension://";

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && origin === appUrl) return true;

  if (origin.startsWith(EXTENSION_ORIGIN_PREFIX)) return true;

  return false;
}

export function isExtensionOrigin(origin: string | null): boolean {
  return !!origin && origin.startsWith(EXTENSION_ORIGIN_PREFIX);
}