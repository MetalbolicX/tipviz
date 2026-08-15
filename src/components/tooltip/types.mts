export type Direction = "e" | "n" | "ne" | "nw" | "s" | "se" | "sw" | "w";
export type DirectionFn<TData extends TooltipData = TooltipData> =
  (data: TData, target: Element) => Direction;
export type Offset = [number, number];
export type OffsetCallback<TData extends TooltipData = TooltipData> =
  (data: TData, target: Element) => Offset;
export type TooltipData = Record<string, unknown>;
