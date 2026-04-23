import { describe, it, expect } from "vitest";
import { sanitize } from "../sanitize.mjs";

describe("sanitize", () => {
  describe("dangerous elements are removed", () => {
    const dangerousElements = [
      "script", "iframe", "object", "embed", "link", "meta",
      "base", "form", "input", "button", "textarea", "select"
    ] as const;

    for (const tag of dangerousElements) {
      it(`removes <${tag}>`, () => {
        const result = sanitize(`<div><${tag}></${tag}><p>text</p></div>`);
        expect(result).not.toContain(`<${tag}`);
        expect(result).toContain("<p>text</p>");
      });
    }
  });

  describe("event handler attributes are stripped", () => {
    const eventHandlers = [
      "onclick", "onerror", "onload", "onmouseover",
      "onfocus", "onblur", "onkeydown", "oninput"
    ] as const;

    for (const attr of eventHandlers) {
      it(`strips ${attr} attribute`, () => {
        const result = sanitize(`<div ${attr}="alert(1)">text</div>`);
        expect(result).not.toContain(attr);
        expect(result).toContain("<div>text</div>");
      });
    }

    it("strips partial event handler matches", () => {
      const result = sanitize('<div onanything="alert(1)">test</div>');
      expect(result).not.toContain("onanything");
    });
  });

  describe("scheme blocking in href", () => {
    it("strips javascript: href on <a>", () => {
      const result = sanitize('<a href="javascript:alert(1)">click</a>');
      expect(result).not.toContain('href="javascript:');
    });

    it("strips javascript: href on <area>", () => {
      const result = sanitize('<map><area href="javascript:alert(1)"></map>');
      expect(result).not.toContain('href="javascript:');
    });

    it("strips data: (non-image) href on <a>", () => {
      const result = sanitize('<a href="data:text/html,<script>alert(1)</script>">x</a>');
      expect(result).not.toContain('href="data:');
    });

    it("preserves http/https href", () => {
      const result = sanitize('<a href="https://example.com">link</a>');
      expect(result).toContain('href="https://example.com"');
    });

    it("preserves relative href", () => {
      const result = sanitize('<a href="/path">link</a>');
      expect(result).toContain('href="/path"');
    });
  });

  describe("scheme blocking in src", () => {
    it("strips javascript: src on <img>", () => {
      const result = sanitize('<img src="javascript:alert(1)">');
      expect(result).not.toContain('src="javascript:');
    });

    it("strips data: (non-image) src on <img>", () => {
      const result = sanitize('<img src="data:text/html,<script>alert(1)</script>">');
      expect(result).not.toContain('src="data:');
    });

    it("preserves http/https src", () => {
      const result = sanitize('<img src="https://example.com/img.png">');
      expect(result).toContain('src="https://example.com/img.png"');
    });

    it("preserves relative src", () => {
      const result = sanitize('<img src="/img.png">');
      expect(result).toContain('src="/img.png"');
    });
  });

  describe("data: image URIs are preserved", () => {
    it("preserves data:image/png", () => {
      const src = "data:image/png;base64,iVBORw0KGgo=";
      const result = sanitize(`<img src="${src}">`);
      expect(result).toContain(src);
    });

    it("preserves data:image/svg+xml", () => {
      const src = "data:image/svg+xml,<svg></svg>";
      const result = sanitize(`<img src="${src}">`);
      expect(result).toContain(src);
    });

    it("preserves data:image/gif", () => {
      const src = "data:image/gif;base64,R0lGODlh";
      const result = sanitize(`<img src="${src}">`);
      expect(result).toContain(src);
    });
  });

  describe("other dangerous attributes", () => {
    it("strips srcdoc attribute", () => {
      const result = sanitize('<iframe srcdoc="<script>alert(1)</script>"></iframe>');
      expect(result).not.toContain("srcdoc");
    });

    it("strips formaction attribute", () => {
      const result = sanitize('<button formaction="javascript:alert(1)">x</button>');
      expect(result).not.toContain("formaction");
    });

    it("strips srcdoc from iframe even if iframe itself is stripped", () => {
      const result = sanitize('<div><iframe srcdoc="x"></iframe></div>');
      expect(result).not.toContain("srcdoc");
      expect(result).not.toContain("<iframe");
    });
  });

  describe("safe HTML is preserved", () => {
    it("preserves simple div with text", () => {
      const result = sanitize("<div>hello world</div>");
      expect(result).toContain("hello world");
    });

    it("preserves class attribute", () => {
      const result = sanitize('<div class="my-class">text</div>');
      expect(result).toContain('class="my-class"');
    });

    it("preserves style attribute", () => {
      const result = sanitize('<div style="color:red">text</div>');
      expect(result).toContain('style="color:red"');
    });

    it("preserves id attribute", () => {
      const result = sanitize('<div id="my-id">text</div>');
      expect(result).toContain('id="my-id"');
    });

    it("preserves title attribute", () => {
      const result = sanitize('<span title="my title">text</span>');
      expect(result).toContain('title="my title"');
    });

    it("preserves data attributes", () => {
      const result = sanitize('<div data-value="test">text</div>');
      expect(result).toContain('data-value="test"');
    });

    it("preserves nested safe elements", () => {
      const input = '<div><p><span>deep <strong>text</strong></span></p></div>';
      const result = sanitize(input);
      expect(result).toContain("<p>");
      expect(result).toContain("<strong>text</strong>");
    });
  });

  describe("mixed malicious and safe content", () => {
    it("removes script but keeps surrounding safe content", () => {
      const result = sanitize('<div>safe <script>alert(1)</script> text</div>');
      expect(result).not.toContain("<script>");
      expect(result).toContain("safe");
      expect(result).toContain("text");
    });

    it("handles event handler on safe element", () => {
      const result = sanitize('<div onclick="alert(1)" class="keep">text</div>');
      expect(result).not.toContain("onclick");
      expect(result).toContain('class="keep"');
    });

    it("handles multiple dangerous attrs on one element", () => {
      const result = sanitize('<div onmouseover="alert(1)" onload="alert(2)">text</div>');
      expect(result).not.toContain("onmouseover");
      expect(result).not.toContain("onload");
      expect(result).toContain("<div>text</div>");
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const result = sanitize("");
      expect(result).toBe("");
    });

    it("handles plain text (no HTML tags)", () => {
      const result = sanitize("just some plain text");
      expect(result).toBe("just some plain text");
    });

    it("handles only whitespace", () => {
      const result = sanitize("   ");
      expect(result).toBe("");
    });

    it("handles malformed HTML gracefully", () => {
      const result = sanitize("<div><p>unclosed");
      expect(result).toContain("<p>unclosed</p>");
    });

    it("does not strip img src for data:image/*", () => {
      const result = sanitize('<img src="data:image/webp;base64,UklGR">');
      expect(result).toContain("data:image/webp");
    });

    it("strips data:application/javascript src", () => {
      const result = sanitize('<img src="data:application/javascript,alert(1)">');
      expect(result).not.toContain("data:");
    });
  });
});