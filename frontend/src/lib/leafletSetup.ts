'use client';

const ICON_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
    <path fill="#2563eb" stroke="#ffffff" stroke-width="1.5" d="M12.5 0C7.25 0 3 4.25 3 9.5 3 16.25 12.5 41 12.5 41S22 16.25 22 9.5C22 4.25 17.75 0 12.5 0z"/>
    <circle cx="12.5" cy="9.5" r="4.25" fill="#ffffff" opacity="0.95"/>
  </svg>
`)}`;

const SHADOW_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="41" height="41" viewBox="0 0 41 41">
    <ellipse cx="20.5" cy="30" rx="10" ry="4" fill="#000000" opacity="0.18"/>
  </svg>
`)}`;

export function ensureLeafletSetup() {
  if (typeof window !== 'undefined') {
    const L = require('leaflet');
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: ICON_SVG,
      iconUrl: ICON_SVG,
      shadowUrl: SHADOW_SVG,
    });
    return L;
  }
  return null;
}