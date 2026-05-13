export const DEFAULT_DIRECTION = "n" as const;
export const DEFAULT_OFFSET: [number, number] = [0, 0];
export const DEFAULT_TRANSITION_DURATION = 200;

// SanitizerConfig for setHTMLUnsafe — mirrors the old sanitize.mts policy
// removeAttributes uses string names; the inline #sanitize() handles regex pattern matching
export const SANITIZER_CONFIG: SanitizerConfig = {
  removeElements: [
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
  ],
  removeAttributes: ["srcdoc", "formaction"],
};
