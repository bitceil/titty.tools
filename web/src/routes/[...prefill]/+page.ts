// this route catches direct url prefills like /https://example.com/video.
// it can't be prerendered (infinite possible paths), so it runs as part
// of the spa fallback instead.
export const prerender = false;
