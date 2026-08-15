// Minimal augmentation for the W3C Sanitizer API.
// Standard TS lib.dom does not yet include setHTML/Sanitizer in this environment.

export {};

declare global {
  interface HTMLElement {
    setHTML(input: string, options?: SetHTMLOptions): void;
  }

  interface HTMLSanitizer {
    setHTML(input: string, options?: SetHTMLOptions): void;
  }

  type Sanitizer = new (config?: SanitizerConfig) => Sanitizer;

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

  interface SetHTMLOptions {
    sanitizer?: Sanitizer;
  }
}
