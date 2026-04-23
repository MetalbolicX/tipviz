export type Direction = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
export type Offset = [number, number];
export type TooltipData = Record<string, unknown>;
export type HtmlCallback<TData extends TooltipData = TooltipData> =
  (data: TData, target: Element) => string;
export type OffsetCallback<TData extends TooltipData = TooltipData> =
  (data: TData, target: Element) => Offset;
export type DirectionFn<TData extends TooltipData = TooltipData> =
  (data: TData, target: Element) => Direction;
export type SanitizerFn = (html: string) => string;
