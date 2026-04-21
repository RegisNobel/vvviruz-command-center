declare module "music-metadata/lib/index.js" {
  export function parseFile(
    filePath: string,
    options?: Record<string, unknown>
  ): Promise<{
    format: {
      duration?: number;
    };
  }>;
}
