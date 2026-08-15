import { sanitizeHtml } from "../sanitizer.mjs";
import { sanitizerConfig } from "../constants.mjs";

/**
 * Parses HTML string into a DOM Document for querying.
 */
const parseHtml = (html: string): Document => {
  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html");
};

describe("sanitizeHtml — direct-call unit tests", () => {

  describe("default config — element removal", () => {
    it("removes script elements", () => {
      const result = sanitizeHtml(
        "<div><script>alert(1)</script><span>safe</span></div>",
        sanitizerConfig,
      );
      const doc = parseHtml(result);
      expect(doc.querySelector("script")).toBeNull();
      expect(doc.querySelector("span")?.textContent).toBe("safe");
    });

    it("removes iframe elements", () => {
      const result = sanitizeHtml(
        "<div><iframe srcdoc='<h1>evil</h1>'></iframe><p>ok</p></div>",
        sanitizerConfig,
      );
      const doc = parseHtml(result);
      expect(doc.querySelector("iframe")).toBeNull();
      expect(doc.querySelector("p")?.textContent).toBe("ok");
    });

    it("removes object elements", () => {
      const result = sanitizeHtml(
        "<div><object data='/embed.swf'></object><span>safe</span></div>",
        sanitizerConfig,
      );
      const doc = parseHtml(result);
      expect(doc.querySelector("object")).toBeNull();
      expect(doc.querySelector("span")?.textContent).toBe("safe");
    });
  });

  describe("default config — attribute removal on element removal", () => {
    it("removes iframe element entirely (srcdoc attribute is moot — parent gone)", () => {
      const result = sanitizeHtml(
        "<iframe srcdoc='<h1>evil</h1>' width='200'></iframe>",
        sanitizerConfig,
      );
      const doc = parseHtml(result);
      expect(doc.querySelector("iframe")).toBeNull();
    });

    it("removes button element entirely (formaction attribute is moot — parent gone)", () => {
      const result = sanitizeHtml(
        "<button formaction='https://evil.com'>submit</button>",
        sanitizerConfig,
      );
      const doc = parseHtml(result);
      expect(doc.querySelector("button")).toBeNull();
    });
  });

  describe("defense-in-depth — attribute rule works when element survives", () => {
    it("strips srcdoc from iframe when iframe is NOT in removeElements", () => {
      const config = {
        removeElements: [
          "script", "object", "embed", "link", "meta", "base", "form",
          "input", "button", "textarea", "select",
        ],
        removeAttributes: ["srcdoc", "formaction"],
      };
      const result = sanitizeHtml(
        "<iframe srcdoc='<h1>content</h1>' width='200'></iframe>",
        config as SanitizerConfig,
      );
      const doc = parseHtml(result);
      const iframe = doc.querySelector("iframe");
      expect(iframe).not.toBeNull();
      expect(iframe?.getAttribute("srcdoc")).toBeNull();
    });

    it("strips formaction from button when button is NOT in removeElements", () => {
      const config = {
        removeElements: [
          "script", "iframe", "object", "embed", "link", "meta", "base",
          "form", "input", "textarea", "select",
        ],
        removeAttributes: ["srcdoc", "formaction"],
      };
      const result = sanitizeHtml(
        "<button formaction='https://evil.com'>submit</button>",
        config as SanitizerConfig,
      );
      const doc = parseHtml(result);
      const button = doc.querySelector("button");
      expect(button).not.toBeNull();
      expect(button?.getAttribute("formaction")).toBeNull();
    });
  });

  describe("RED cases from Plan 002", () => {
    it("strips on* event-handler attributes by default", () => {
      const result = sanitizeHtml(
        "<img src='x' onerror='alert(1)' alt='x'>",
        sanitizerConfig,
      );
      const doc = parseHtml(result);
      expect(doc.querySelector("img")?.getAttribute("onerror")).toBeNull();
    });

    it("strips javascript: URLs from href by default", () => {
      const result = sanitizeHtml(
        "<a href='javascript:alert(1)'>click</a>",
        sanitizerConfig,
      );
      const doc = parseHtml(result);
      expect(doc.querySelector("a")?.getAttribute("href")).toBeNull();
    });
  });

  describe("URL scheme policy — new coverage", () => {
    it("strips bare data: URLs", () => {
      const result = sanitizeHtml(
        "<a href='data:text/html,<script>alert(1)</script>'>click</a>",
        sanitizerConfig,
      );
      const doc = parseHtml(result);
      expect(doc.querySelector("a")?.getAttribute("href")).toBeNull();
    });

    it("keeps data:image/ URLs", () => {
      const result = sanitizeHtml(
        "<a href='data:image/png;base64,abc'>image</a>",
        sanitizerConfig,
      );
      const doc = parseHtml(result);
      expect(doc.querySelector("a")?.getAttribute("href")).toBe("data:image/png;base64,abc");
    });

    it("strips vbscript: URLs", () => {
      const result = sanitizeHtml(
        "<a href='vbscript:msgbox(\"hi\")'>click</a>",
        sanitizerConfig,
      );
      const doc = parseHtml(result);
      expect(doc.querySelector("a")?.getAttribute("href")).toBeNull();
    });
  });
});
