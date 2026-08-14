// Minimal augmentation for the W3C Sanitizer API.
// Standard TS lib.dom does not yet include setHTML/Sanitizer in this environment.

export {};

declare global {
  interface SanitizerConfig {
    allowElements?: string[];
    blockElements?: string[];
    dropAttributes?: Record<string, string[]>;
    removeAttributes?: string[];
    removeElements?: string[];
    allowComments?: boolean;
    allowCustomElements?: boolean;
    allowAttributes?: Record<string, string[]>;
  }

  class Sanitizer {
    constructor(config?: SanitizerConfig);
  }

  interface SetHTMLOptions {
    sanitizer?: Sanitizer;
  }

  interface HTMLSanitizer {
    setHTML(input: string, options?: SetHTMLOptions): void;
  }

  interface HTMLElement extends HTMLSanitizer {}
}
