const API_BASE =
  (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

export const PLACEHOLDER_IMAGE = `${API_BASE}/images/placeholder.png`;

export function resolvePlantImageSrc(img?: string | null): string {
  if (!img) return PLACEHOLDER_IMAGE;

  // Full external URL
  if (img.startsWith("http://") || img.startsWith("https://")) {
    return img;
  }

  // Server-relative path like "/images/tomato.png"
  if (img.startsWith("/")) {
    return `${API_BASE}${img}`;
  }

  // Bare filename like "tomato.png"
  return `${API_BASE}/images/${img}`;
}

export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>
) {
  e.currentTarget.src = PLACEHOLDER_IMAGE;
}