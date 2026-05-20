declare module 'qrcode' {
  type QRCodeToDataURLOptions = {
    width?: number
    margin?: number
    [key: string]: unknown
  }

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>

  const QRCode: {
    toDataURL: typeof toDataURL
  }

  export default QRCode
}
