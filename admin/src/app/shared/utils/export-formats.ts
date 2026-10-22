import type { jsPDF } from 'jspdf';

/** File formats exposed by the shared business-data export menu. */
export type ExportFormat = 'xlsx' | 'ods' | 'pdf' | 'html' | 'csv' | 'tsv';

export interface ExportFormatOption {
  format: ExportFormat;
  label: string;
}

/**
 * Danh sách định dạng hiển thị trong menu "Tải xuống".
 * Thứ tự ưu tiên: bảng tính trước, văn bản web sau, phân tách giá trị ở cuối.
 */
export const EXPORT_FORMAT_OPTIONS: ReadonlyArray<ExportFormatOption> = [
  { format: 'xlsx', label: 'Microsoft Excel (.xlsx)' },
  { format: 'ods', label: 'OpenDocument (.ods)' },
  { format: 'pdf', label: 'PDF (.pdf)' },
  { format: 'html', label: 'Trang web (.html)' },
  { format: 'csv', label: 'Giá trị được phân tách bằng dấu phẩy (.csv)' },
  { format: 'tsv', label: 'Giá trị được phân cách bằng dấu tab (.tsv)' }
];

/**
 * Ghi bảng dữ liệu ra file theo định dạng được chọn trong menu tải xuống.
 * Hàng đầu tiên của `rows` là tiêu đề cột.
 */
export async function downloadTable(format: ExportFormat, basename: string, rows: (string | number)[][]): Promise<void> {
  const [headers = [], ...values] = rows;
  if (format === 'csv') {
    downloadCsv(`${basename}.csv`, rows);
    return;
  }
  if (format === 'tsv') {
    downloadTsv(`${basename}.tsv`, rows);
    return;
  }
  if (format === 'html') {
    downloadHtml(`${basename}.html`, headers, values);
    return;
  }
  if (format === 'ods') {
    await downloadOds(`${basename}.ods`, headers, values);
    return;
  }
  if (format === 'pdf') {
    await downloadPdf(`${basename}.pdf`, headers, values);
    return;
  }
  await downloadXlsx(`${basename}.xlsx`, rows);
}

function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  downloadBlob(filename, csv, 'text/csv;charset=utf-8');
}

function downloadTsv(filename: string, rows: (string | number)[][]): void {
  const tsv = rows.map(row => row.map(value => String(value).replaceAll('\t', ' ').replaceAll('\r', ' ').replaceAll('\n', ' ')).join('\t')).join('\r\n');
  downloadBlob(filename, tsv, 'text/tab-separated-values;charset=utf-8');
}

/** Xuất bảng thành một tài liệu HTML độc lập, mở được bằng trình duyệt. */
function downloadHtml(filename: string, headers: (string | number)[], values: (string | number)[][]): void {
  const head = headers.map(header => `<th>${escapeHtml(header)}</th>`).join('');
  const body = values.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('\n          ');
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Dữ liệu xuất từ ThinkUp Admin</title>
<style>
  body { margin: 24px; color: #182c51; font-family: 'Segoe UI', Arial, sans-serif; }
  h1 { margin: 0 0 16px; font-size: 18px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #dde5ee; padding: 8px 10px; font-size: 13px; text-align: left; }
  th { background: #f2f6fb; font-weight: 600; }
  td { font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<h1>Dữ liệu xuất từ ThinkUp Admin</h1>
<table>
  <thead><tr>${head}</tr></thead>
  <tbody>
          ${body}
  </tbody>
</table>
</body>
</html>`;
  downloadBlob(filename, html, 'text/html;charset=utf-8', false);
}

async function downloadXlsx(filename: string, rows: (string | number)[][]): Promise<void> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Dữ liệu');
  worksheet.addRows(rows);
  worksheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(filename, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/**
 * Xuất bảng thành tài liệu OpenDocument Spreadsheet.
 * Gói ODS là một file ZIP: `mimetype` phải là entry đầu tiên và không nén.
 */
async function downloadOds(filename: string, headers: (string | number)[], values: (string | number)[][]): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  zip.file('mimetype', 'application/vnd.oasis.opendocument.spreadsheet', { compression: 'STORE' });
  zip.file('META-INF/manifest.xml', odsManifest());
  zip.file('content.xml', odsContent(headers, values));
  zip.file('styles.xml', odsStyles());
  zip.file('meta.xml', odsMeta());
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.oasis.opendocument.spreadsheet' });
  downloadBlob(filename, blob, 'application/vnd.oasis.opendocument.spreadsheet', false);
}

function odsManifest(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.spreadsheet"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;
}

function odsContent(headers: (string | number)[], values: (string | number)[][]): string {
  const cell = (value: string | number): string => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return `<table:table-cell office:value-type="float" office:value="${value}"><text:p>${escapeXml(String(value))}</text:p></table:table-cell>`;
    }
    return `<table:table-cell office:value-type="string"><text:p>${escapeXml(String(value))}</text:p></table:table-cell>`;
  };
  const row = (cells: (string | number)[]): string => `<table:table-row>${cells.map(cell).join('')}</table:table-row>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2">
  <office:body>
    <office:spreadsheet>
      <table:table table:name="Dữ liệu">
        ${row(headers)}
        ${values.map(row).join('\n        ')}
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document-content>`;
}

function odsStyles(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.2"><office:styles/></office:document-styles>`;
}

function odsMeta(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.2"><office:meta><meta:generator>ThinkUp Admin</meta:generator></office:meta></office:document-meta>`;
}

/** Xuất bảng thành PDF ngang, tự chia trang và lặp lại hàng tiêu đề. */
async function downloadPdf(filename: string, headers: (string | number)[], values: (string | number)[][]): Promise<void> {
  const { jsPDF: JsPdf } = await import('jspdf');
  const pdf = new JsPdf({ unit: 'mm', format: 'a4', orientation: 'landscape', compress: true });
  await registerPdfFont(pdf);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const rowHeight = 7;
  const widths = columnWidths(headers, values, contentWidth);

  let y = margin;
  pdf.setFontSize(12);
  pdf.setTextColor(7, 27, 72);
  pdf.text('Dữ liệu xuất từ ThinkUp Admin', margin, y + 4);
  y += 12;

  const drawHead = (): void => {
    pdf.setFillColor(242, 246, 251);
    pdf.rect(margin, y, contentWidth, rowHeight, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(38, 61, 96);
    let x = margin;
    headers.forEach((header, index) => {
      pdf.text(clipPdfText(pdf, String(header), widths[index] - 3), x + 1.5, y + 4.8);
      x += widths[index];
    });
    pdf.setDrawColor(226, 234, 244);
    pdf.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
    y += rowHeight;
  };

  drawHead();
  pdf.setFontSize(7.5);
  pdf.setTextColor(56, 82, 116);
  for (const row of values) {
    if (y + rowHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      drawHead();
      pdf.setFontSize(7.5);
      pdf.setTextColor(56, 82, 116);
    }
    let x = margin;
    row.forEach((value, index) => {
      pdf.text(clipPdfText(pdf, String(value ?? ''), widths[index] - 3), x + 1.5, y + 4.8);
      x += widths[index];
    });
    y += rowHeight;
  }
  pdf.save(filename);
}

/** Chia bề rộng cột theo độ dài nội dung, giữ tổng bằng bề rộng khả dụng. */
function columnWidths(headers: (string | number)[], values: (string | number)[][], contentWidth: number): number[] {
  const weights = headers.map((header, index) => {
    const longest = values.reduce((max, row) => Math.max(max, String(row[index] ?? '').length), String(header).length);
    return Math.min(Math.max(longest, 8), 34);
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  return weights.map(weight => (weight / total) * contentWidth);
}

/** Cắt chữ vừa một dòng, thêm dấu "…" khi nội dung bị tràn. */
function clipPdfText(pdf: jsPDF, text: string, width: number): string {
  const lines = pdf.splitTextToSize(text, width) as string[];
  if (lines.length <= 1) return text;
  return `${lines[0].slice(0, -1)}…`;
}

let pdfFontData: Promise<string> | undefined;
const pdfWithFont = new WeakSet<object>();

/**
 * Nạp phông có dấu tiếng Việt cho PDF. Nếu tải phông thất bại thì lùi về phông mặc định.
 */
function registerPdfFont(pdf: jsPDF): Promise<void> {
  if (pdfWithFont.has(pdf)) {
    pdf.setFont('DejaVuSans', 'normal');
    return Promise.resolve();
  }
  pdfFontData ??= fetch('/assets/fonts/DejaVuSans.ttf')
    .then(response => {
      if (!response.ok) throw new Error('Không tải được phông chữ xuất PDF.');
      return response.arrayBuffer();
    })
    .then(buffer => toBase64(buffer));
  return pdfFontData
    .then(font => {
      pdf.addFileToVFS('DejaVuSans.ttf', font);
      pdf.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
      pdf.setFont('DejaVuSans', 'normal');
      pdfWithFont.add(pdf);
    })
    .catch(() => { pdf.setFont('helvetica', 'normal'); });
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(binary);
}

function downloadBlob(filename: string, content: BlobPart, type: string, bom = true): void {
  const blob = new Blob(bom ? ['\ufeff', content] : [content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
