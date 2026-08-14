export const DEFAULT_DIRECTION = "n" as const;
export const DEFAULT_OFFSET: [number, number] = [0, 0];
export const DEFAULT_TRANSITION_DURATION = 200;

// SanitizerConfig for setHTMLUnsafe — mirrors the old sanitize.mts policy.
// removeAttributes: strings are matched by exact name; RegExp rules are tested against the attr name.
// NOTE: RegExp support in removeAttributes requires 'as unknown as SanitizerConfig' — the DOM
// SanitizerConfig.removeAttributes type is string[] only; the hand-rolled #sanitize() handles RegExp.
export const SANITIZER_CONFIG = {
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
  removeAttributes: ["srcdoc", "formaction", /^on/i] as (string | RegExp)[],
} as unknown as SanitizerConfig;
