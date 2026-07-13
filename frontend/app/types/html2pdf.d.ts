declare module 'html2pdf.js' {
  type Html2PdfOptions = {
    margin?: number | [number, number] | [number, number, number, number]
    filename?: string
    image?: { type?: 'jpeg' | 'png' | 'webp', quality?: number }
    enableLinks?: boolean
    html2canvas?: Record<string, unknown>
    jsPDF?: { unit?: string, format?: string | number[], orientation?: 'portrait' | 'landscape' }
    pagebreak?: { mode?: string | string[], before?: string, after?: string, avoid?: string }
  }

  interface Html2PdfWorker extends Promise<void> {
    set(options: Html2PdfOptions): Html2PdfWorker
    from(element: HTMLElement | string): Html2PdfWorker
    save(filename?: string): Html2PdfWorker
    output(type?: string, options?: unknown): Promise<unknown>
  }

  export default function html2pdf(): Html2PdfWorker
}
