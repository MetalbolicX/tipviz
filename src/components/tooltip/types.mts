export type Direction = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
export type Offset = [number, number];
export type DirectionCallback = (target: Element) => { top: number; left: number };
export type HtmlCallback = (...args: any[]) => string;
export type OffsetCallback = (...args: any[]) => Offset;
export type DirectionFn = (...args: any[]) => Direction;
