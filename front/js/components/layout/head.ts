import { DOMAIN_METADATA } from "../../config/domainFeatures.js";

export interface DomainMetadata {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  logo?: string;
  theme?: string;
}

export interface HeadOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

/** Default fallback metadata */
const DEFAULT_META: Required<Pick<DomainMetadata, "title" | "description" | "image" | "favicon">> = {
  title: "App",
  description: "Dynamic feature-based community hub",
  image: "/assets/og-default.jpg",
  favicon: "/favicon.ico"
};

/**
 * Gets active domain-specific branding/metadata defaults
 */
function getDomainMetadata(): DomainMetadata {
  const hostname = window.location.hostname;
  return (DOMAIN_METADATA as Record<string, DomainMetadata>)?.[hostname] || DEFAULT_META;
}

/**
 * Resolves any image path or fallback asset into a fully qualified absolute URL 
 * required by Open Graph crawlers.
 */
export function resolveAbsoluteOgImage(
  imagePath?: string | null,
  fallbackPath: string = DEFAULT_META.image
): string {
  let target = imagePath && typeof imagePath === "string" ? imagePath.trim() : fallbackPath;

  // Reject temporary browser-only Blob or Data URLs
  if (target.startsWith("blob:") || target.startsWith("data:")) {
    target = fallbackPath;
  }

  // If already fully qualified HTTP/HTTPS, return as-is
  if (/^https?:\/\//i.test(target)) {
    return target;
  }

  // Resolve relative paths against current origin
  try {
    return new URL(target, window.location.origin).href;
  } catch (err) {
    console.warn("Failed to construct absolute OG image URL:", err);
    return `${window.location.origin}${fallbackPath}`;
  }
}

/**
 * Utility to find or create a meta/link element in <head>
 */
function ensureHeadElement<T extends HTMLElement>(
  selector: string,
  tagName: string,
  attributes: Record<string, string | undefined | null>
): T {
  let element = document.head.querySelector<T>(selector);
  if (!element) {
    element = document.createElement(tagName) as T;
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      element!.setAttribute(key, value);
    }
  });
  return element;
}

/**
 * Updates document head elements (Title, Meta, Favicon, OG Tags)
 */
export function updateHead({ title, description, image, url }: HeadOptions = {}): void {
  const domainMeta = getDomainMetadata();

  // 1. Document Title ("Page Title | Domain App Name")
  const appName = domainMeta.title || DEFAULT_META.title;
  const pageTitle = title ? `${title} | ${appName}` : appName;
  document.title = pageTitle;

  // 2. Meta Description
  const metaDescription = description || domainMeta.description || DEFAULT_META.description;
  ensureHeadElement<HTMLMetaElement>('meta[name="description"]', 'meta', {
    name: "description",
    content: metaDescription
  });

  // 3. OpenGraph & Twitter Cards
  const absoluteOgImage = resolveAbsoluteOgImage(image, domainMeta.logo || DEFAULT_META.image);
  const currentUrl = url || window.location.href;

  ensureHeadElement<HTMLMetaElement>('meta[property="og:title"]', 'meta', {
    property: "og:title",
    content: pageTitle
  });

  ensureHeadElement<HTMLMetaElement>('meta[property="og:description"]', 'meta', {
    property: "og:description",
    content: metaDescription
  });

  ensureHeadElement<HTMLMetaElement>('meta[property="og:image"]', 'meta', {
    property: "og:image",
    content: absoluteOgImage
  });

  ensureHeadElement<HTMLMetaElement>('meta[property="og:url"]', 'meta', {
    property: "og:url",
    content: currentUrl
  });

  // Twitter Card fallback tags
  ensureHeadElement<HTMLMetaElement>('meta[name="twitter:card"]', 'meta', {
    name: "twitter:card",
    content: "summary_large_image"
  });

  ensureHeadElement<HTMLMetaElement>('meta[name="twitter:title"]', 'meta', {
    name: "twitter:title",
    content: pageTitle
  });

  ensureHeadElement<HTMLMetaElement>('meta[name="twitter:description"]', 'meta', {
    name: "twitter:description",
    content: metaDescription
  });

  ensureHeadElement<HTMLMetaElement>('meta[name="twitter:image"]', 'meta', {
    name: "twitter:image",
    content: absoluteOgImage
  });

  // 4. Canonical Link
  ensureHeadElement<HTMLLinkElement>('link[rel="canonical"]', 'link', {
    rel: "canonical",
    href: currentUrl
  });

  // 5. Dynamic Favicon based on Domain
  const favicon = domainMeta.favicon || DEFAULT_META.favicon;
  ensureHeadElement<HTMLLinkElement>('link[rel="icon"]', 'link', {
    rel: "icon",
    href: favicon
  });
}

/**
 * Applies domain-specific CSS theme variables on boot
 */
export function initDomainTheme(): void {
  const domainMeta = getDomainMetadata();
  if (domainMeta.theme) {
    document.documentElement.className = domainMeta.theme;
  }
}