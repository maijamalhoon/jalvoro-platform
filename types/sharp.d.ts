declare module "sharp" {
  type ImageFormat = "jpeg" | "png" | "webp" | string;

  type Metadata = {
    format?: ImageFormat;
    width?: number;
    height?: number;
    pages?: number;
  };

  type SharpOptions = {
    failOn?: "none" | "truncated" | "error" | "warning";
    limitInputPixels?: number | boolean;
    sequentialRead?: boolean;
  };

  type ResizeOptions = {
    width?: number;
    height?: number;
    fit?: "cover" | "contain" | "fill" | "inside" | "outside";
    withoutEnlargement?: boolean;
  };

  type JpegOptions = { quality?: number; mozjpeg?: boolean };
  type PngOptions = { compressionLevel?: number };
  type WebpOptions = { quality?: number };

  interface SharpPipeline {
    rotate(): SharpPipeline;
    metadata(): Promise<Metadata>;
    resize(options: ResizeOptions): SharpPipeline;
    jpeg(options?: JpegOptions): SharpPipeline;
    png(options?: PngOptions): SharpPipeline;
    webp(options?: WebpOptions): SharpPipeline;
    toBuffer(): Promise<Buffer>;
  }

  export default function sharp(
    input: Uint8Array | Buffer,
    options?: SharpOptions,
  ): SharpPipeline;
}
