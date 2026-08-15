export const defaultDirection = "n" as const;
export const defaultOffset: [number, number] = [0, 0];
export const defaultTransitionDuration = 200;

// SanitizerConfig for setHTMLUnsafe — mirrors the old sanitize.mts policy.
// removeAttributes: strings are matched by exact name; RegExp rules are tested against the attr name.
// NOTE: RegExp support in removeAttributes requires 'as unknown as SanitizerConfig' — the DOM
// SanitizerConfig.removeAttributes type is string[] only; the hand-rolled #sanitize() handles RegExp.
export const sanitizerConfig = {
  removeElements: [
    "base",
    "button",
    "embed",
    "form",
    "iframe",
    "input",
    "link",
    "meta",
    "object",
    "script",
    "select",
    "textarea",
  ],
  removeAttributes: ["srcdoc", "formaction", /^on/i] as (string | RegExp)[],
} as unknown as SanitizerConfig;
