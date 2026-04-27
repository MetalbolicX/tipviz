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
import type { SanitizerFn } from "./types.mjs";

export type { SanitizerFn };

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
const CSS_URL_PATTERN = /url\s*\(\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|(?:[^\s'"]+))\s*\)/gi;

/**
 * Strip URL() occurrences from an inline `style` attribute value.
 *
 * This uses CSS_URL_PATTERN to match url(...) tokens with single-quoted,
 * double-quoted, or unquoted contents and replaces them with the
 * inert `url()` token. The intent is to neutralize potentially dangerous
 * external/inline payloads (e.g. `javascript:` or non-image `data:` URIs)
 * that may otherwise be accepted by browsers when applied via `style`.
 *
 * SECURITY: This is a narrow, conservative transformation and is NOT a
 * full CSS sanitizer. Complex or obfuscated CSS may bypass this; combine
 * with a CSP and server-side validation for high-security contexts.
 *
 * @param styleValue - Raw value of the element's `style` attribute.
 * @returns The style string with any `url(...)` contents replaced by `url()`.
 * @example
 * ```ts
 * stripUrlFromStyle("background-image: url('javascript:alert(1)')")
 * // => "background-image: url()"
 * ```
 */
const stripUrlFromStyle = (styleValue: string): string =>
  styleValue.replace(CSS_URL_PATTERN, "url()");

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

  const it = doc.createNodeIterator(doc.body, NodeFilter.SHOW_ELEMENT);
  let node: Element | null;

  const removeQueue: Element[] = [];

  while ((node = it.nextNode() as Element | null)) {
    const tagName = node.tagName.toLowerCase();

    if (DANGEROUS_ELEMENTS.has(tagName)) {
      removeQueue.push(node);
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

    const styleValue = node.getAttribute("style");
    if (styleValue !== null) {
      const strippedStyle = stripUrlFromStyle(styleValue);
      if (strippedStyle !== styleValue) {
        node.setAttribute("style", strippedStyle);
      }
    }
  }

  for (const el of removeQueue) {
    el.remove();
  }

  return doc.body.innerHTML;
};
