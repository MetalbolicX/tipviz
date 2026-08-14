import { SANITIZER_CONFIG } from "./constants.mjs";

// NOTE: doc.body.innerHTML triggers ESLint no-restricted-properties.
// The existing eslint-disable strategy from the project is inherited here.
export function sanitizeHtml(html: string, config: SanitizerConfig): string {
  // eslint-disable-next-line no-restricted-properties
  const doc = new DOMParser().parseFromString(html, "text/html");
  const it = doc.createNodeIterator(doc.body, NodeFilter.SHOW_ELEMENT);
  let node: Element | null;

  const removeQueue: Element[] = [];

  const dangerousElements = new Set(config.removeElements ?? []);
  const dangerousAttrRules = config.removeAttributes ?? [];

  while ((node = it.nextNode() as Element | null)) {
    const tagName = node.tagName.toLowerCase();

    if (dangerousElements.has(tagName)) {
      removeQueue.push(node);
      continue;
    }

    const attrs = Array.from(node.attributes, ({ name }) => name);

    const urlAttrs = new Set(["href", "src", "xlink:href", "action", "formaction", "background", "poster"]);

    for (const attrName of attrs) {
      let shouldRemove = false;

      for (const rule of dangerousAttrRules) {
        if (typeof rule === "string" && attrName === rule) {
          shouldRemove = true;
          break;
        }
        if (rule instanceof RegExp && rule.test(attrName)) {
          shouldRemove = true;
          break;
        }
      }

      if (!shouldRemove && urlAttrs.has(attrName)) {
        const value = node.getAttribute(attrName)?.trim().toLowerCase() ?? "";
        if (value.startsWith("javascript:") || value.startsWith("vbscript:")) {
          shouldRemove = true;
        }
        if (value.startsWith("data:") && !value.startsWith("data:image/")) {
          shouldRemove = true;
        }
      }

      if (shouldRemove) {
        node.removeAttribute(attrName);
      }
    }
  }

  for (const el of removeQueue) {
    el.remove();
  }

  // eslint-disable-next-line no-restricted-properties
  return doc.body.innerHTML;
}

export { SANITIZER_CONFIG };
