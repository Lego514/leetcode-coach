// gifenc 沒有附型別，這裡只寫用到的部分（CommonJS，整包匯入）
declare module 'gifenc' {
  const gifenc: {
    GIFEncoder(): {
      writeFrame(index: Uint8Array, width: number, height: number, options: { palette: number[][]; delay?: number; repeat?: number }): void;
      finish(): void;
      bytes(): Uint8Array;
    };
    quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number): number[][];
    applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: number[][]): Uint8Array;
  };
  export default gifenc;
}
