/**
 * A function that accepts an HTML string and returns a sanitized HTML string.
 *
 * Use this to provide a drop-in sanitizer implementation when different
 * sanitization policies are required by consumers. Implementations MUST
 * return a string suitable for insertion into innerHTML.
 *
 * @example
 * const mySanitizer: SanitizerFn = (html) => sanitize(html);
 */
export type SanitizerFn = (html: string) => string;

const DANGEROUS_ELEMENTS = new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "base",
  "form",
  "input",
  "button",
  "textarea",
  "select",
]);

const DANGEROUS_ATTRS = /^(on\S+|srcdoc|formaction)$/i;

const DANGEROUS_SCHEMES = /^javascript:/i;
const DANGEROUS_DATA_PATTERN = /^data:(?!image\/)/i;

/**
 * Validate and sanitize a single attribute on an element.
 *
 * This function enforces the sanitizer policy used by sanitize():
 * - Removes event handler attributes (e.g. `onclick`) and other
 *   explicitly dangerous attributes matched by DANGEROUS_ATTRS.
 * - Rejects attribute values that use the `javascript:` scheme or
 *   `data:` URIs that are not images (to avoid inline script payloads).
 *
 * Returns the (possibly unchanged) attribute value to keep, or `null`
 * to indicate the attribute should be removed.
 *
 * SECURITY: callers must remove the attribute when `null` is returned.
 *
 * @param name - The attribute name (case-insensitive checks are applied).
 * @param value - The attribute value to validate and possibly normalize.
 * @returns The original value to keep, or `null` to signal removal.
 */
const sanitizeAttribute = (name: string, value: string): string | null => {
  if (DANGEROUS_ATTRS.test(name)) return null;

  const lowerValue = value.toLowerCase().trim();

  if (DANGEROUS_SCHEMES.test(lowerValue)) return null;
  if (DANGEROUS_DATA_PATTERN.test(lowerValue)) return null;

  return value;
};

/**
 * Sanitize an HTML string according to the local sanitizer policy and
 * return a string safe for insertion into innerHTML.
 *
 * Behavior:
 * - Removes blacklisted elements (script, iframe, object, embed, etc.).
 * - Strips dangerous attributes (event handlers like `onclick`, `formaction`,
 *   and attributes that can contain script payloads such as `srcdoc`).
 * - Rejects attribute values that use the `javascript:` scheme or
 *   `data:` URIs that are not images.
 * - Removes `href` on <a>/<area> and `src` on <img> when they use disallowed
 *   schemes.
 *
 * SECURITY: callers must treat the returned string as untrusted HTML only
 * suitable for innerHTML insertion after this transformation. This function
 * performs conservative removals but is not a replacement for a hardened CSP
 * or server-side validation for high-security contexts.
 *
 * @param html - The input HTML string to sanitize.
 * @returns A sanitized HTML string safe for assigning to element.innerHTML.
 * @example
 * ```ts
 * const clean = sanitize('<a href="javascript:alert(1)">x</a>');
 * ```
 */
export const sanitize: SanitizerFn = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // Iterate elements inside the body only.
  const it = doc.createNodeIterator(doc.body, NodeFilter.SHOW_ELEMENT);
  let node: Element | null;

  let removeQueue: Element[] = [];

  while ((node = it.nextNode() as Element | null)) {
    const tagName = node.tagName.toLowerCase();

    if (DANGEROUS_ELEMENTS.has(tagName)) {
      removeQueue = [...removeQueue, node];
      continue;
    }

    const attrs: string[] = Array.from(node.attributes, ({ name }) => name);

    for (const attrName of attrs) {
      const attrValue = node.getAttribute(attrName) ?? "";
      const sanitized = sanitizeAttribute(attrName, attrValue);

      if (sanitized === null) {
        node.removeAttribute(attrName);
      } else if (sanitized !== attrValue) {
        node.setAttribute(attrName, sanitized);
      }
    }

    const tag = tagName;
    if (tag === "a" || tag === "area") {
      const href = node.getAttribute("href") ?? "";
      const lowerHref = href.toLowerCase().trim();
      if (
        DANGEROUS_SCHEMES.test(lowerHref) ||
        DANGEROUS_DATA_PATTERN.test(lowerHref)
      ) {
        node.removeAttribute("href");
      }
    }

    if (tag === "img") {
      const src = node.getAttribute("src") ?? "";
      const lowerSrc = src.toLowerCase().trim();
      if (DANGEROUS_SCHEMES.test(lowerSrc) || DANGEROUS_DATA_PATTERN.test(lowerSrc)) {
        node.removeAttribute("src");
      }
    }
  }

  for (const el of removeQueue) {
    el.remove();
  }

  return doc.body.innerHTML;
};
