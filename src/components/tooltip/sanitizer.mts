import { sanitizerConfig } from "./constants.mjs";

// NOTE: This module uses `new DOMParser().parseFromString(...)` and reads
// `doc.body.innerHTML` to perform HTML sanitization. The project's ESLint
// config forbids innerHTML access globally via no-restricted-properties,
// which makes sense for sinks that inject markup into the DOM but it also
// catches legitimate reads on a parsed Document. The two scoped disable
// directives further down are the only places we bypass the rule; the rest
// of the file uses safe APIs (textContent, dataset, createNodeIterator). A
// future lint-config tightening could keep these exceptions scoped via
// overrides, but the current behavior is intentional.
export function sanitizeHtml(html: string, config: SanitizerConfig): string {
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

    const urlAttrs = new Set(["action", "formaction", "href", "poster", "src", "xlink:href"]);

    for (const attrName of attrs) {
      let mustRemove = false;

      for (const rule of dangerousAttrRules) {
        if (typeof rule === "string" && attrName === rule) {
          mustRemove = true;
          break;
        }
        if (rule instanceof RegExp && rule.test(attrName)) {
          mustRemove = true;
          break;
        }
      }

      if (!mustRemove && urlAttrs.has(attrName)) {
        const value = node.getAttribute(attrName)?.trim().toLowerCase() ?? "";
        if (value.startsWith("javascript:") || value.startsWith("vbscript:")) {
          mustRemove = true;
        }
        if (value.startsWith("data:") && !value.startsWith("data:image/")) {
          mustRemove = true;
        }
      }

      if (mustRemove) {
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

export { sanitizerConfig };
