declare module 'qrcode-terminal' {
  export interface GenerateOptions {
    small?: boolean;
  }

  export function generate(
    qr: string,
    options?: GenerateOptions,
    callback?: (qrcode: string) => void
  ): void;

  const qrcodeTerminal: {
    generate: typeof generate;
  };

  export default qrcodeTerminal;
}
