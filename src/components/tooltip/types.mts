export type Direction = "e" | "n" | "ne" | "nw" | "s" | "se" | "sw" | "w";
export type Offset = [number, number];
export interface TooltipData extends Record<string, unknown> {}
export type OffsetCallback<TData extends TooltipData = TooltipData> =
  (data: TData, target: Element) => Offset;
export type DirectionFn<TData extends TooltipData = TooltipData> =
  (data: TData, target: Element) => Direction;
