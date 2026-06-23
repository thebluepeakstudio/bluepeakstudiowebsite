/** Append ImageKit transform params for responsive, compressed delivery. */
export function imageKitUrl(url, w = 800) {
  if (!url || !url.includes("ik.imagekit.io")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}tr=w-${w},q-80`;
}
