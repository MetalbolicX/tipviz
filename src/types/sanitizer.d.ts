// Minimal augmentation for the W3C Sanitizer API.
// Standard TS lib.dom does not yet include setHTML/Sanitizer in this environment.

export {};

declare global {
  interface SanitizerConfig {
    allowAttributes?: Record<string, string[]>;
    allowComments?: boolean;
    allowCustomElements?: boolean;
    allowElements?: string[];
    blockElements?: string[];
    dropAttributes?: Record<string, string[]>;
    removeAttributes?: string[];
    removeElements?: string[];
  }

  interface HTMLSanitizer {
    setHTML(input: string, options?: SetHTMLOptions): void;
  }

  interface HTMLElement extends HTMLSanitizer {}

  interface SetHTMLOptions {
    sanitizer?: Sanitizer;
  }

  class Sanitizer {
    constructor(config?: SanitizerConfig);
    static readonly _brand: unique symbol;
  }
}
