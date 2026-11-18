import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { BlogIconComponent } from '../../../components/blog-icon/blog-icon.component';
import { BlogService } from '../../../services/blog.service';
import { countBlogWords } from '../../../utils/blog-content';

interface FormatAction {
  command: string;
  label: string;
  icon: string;
  value?: string;
  /** `document.queryCommandState` name used to reflect the active state. */
  state?: string;
}

interface MediaTarget {
  element: HTMLElement;
  label: string;
  top: number;
  left: number;
}

const BLOCK_TAGS = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'FIELDSET', 'FIGCAPTION', 'FIGURE',
  'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV',
  'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'UL',
]);

const ALLOWED_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [BlogIconComponent],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.css',
})
export class RichTextEditorComponent implements AfterViewInit {
  private readonly blog = inject(BlogService);

  readonly value = model('');
  readonly error = input('');

  readonly editor = viewChild<ElementRef<HTMLDivElement>>('editor');
  private readonly surface = viewChild<ElementRef<HTMLDivElement>>('surface');

  readonly prompt = signal<'link' | 'image' | null>(null);
  readonly uploading = signal(false);
  readonly uploadError = signal('');
  readonly url = signal('');
  readonly block = signal('p');
  readonly selectedMedia = signal<MediaTarget | null>(null);

  readonly boldActive = signal(false);
  readonly italicActive = signal(false);
  readonly underlineActive = signal(false);
  readonly strikeActive = signal(false);
  readonly imageInput = viewChild<ElementRef<HTMLInputElement>>('imageInput');

  private savedRange: Range | null = null;

  readonly actions: FormatAction[] = [
    { command: 'bold', label: 'In đậm', icon: 'bold', state: 'bold' },
    { command: 'italic', label: 'In nghiêng', icon: 'italic', state: 'italic' },
    { command: 'underline', label: 'Gạch chân', icon: 'underline', state: 'underline' },
    { command: 'strikeThrough', label: 'Gạch ngang', icon: 'strike', state: 'strikeThrough' },
    { command: 'createLink', label: 'Chèn liên kết', icon: 'link' },
    { command: 'formatBlock', value: '<blockquote>', label: 'Trích dẫn', icon: 'quote' },
    { command: 'insertUnorderedList', label: 'Danh sách ký hiệu', icon: 'list' },
    { command: 'insertOrderedList', label: 'Danh sách đánh số', icon: 'ordered' },
    { command: 'insertImage', label: 'Chèn ảnh', icon: 'image' },
    { command: 'insertTable', label: 'Chèn bảng', icon: 'table' },
  ];


  constructor() {
    effect(() => {
      const value = this.value();
      const editor = this.editor()?.nativeElement;
      if (!editor) return;
      // Never rewrite the DOM while the user is typing: it would collapse the selection.
      if (document.activeElement === editor) return;
      const next = value ?? '';
      if (editor.innerHTML === next) return;
      editor.innerHTML = next;
      this.ensureBlocks(editor);
    });
  }

  ngAfterViewInit(): void {
    const editor = this.editor()?.nativeElement;
    if (!editor) return;
    document.execCommand('defaultParagraphSeparator', false, 'p');
    if (this.value() && editor.innerHTML !== this.value()) {
      editor.innerHTML = this.value();
      this.ensureBlocks(editor);
    }
    if (!editor.innerHTML.trim()) editor.innerHTML = '<p><br></p>';
  }

  words(): number {
    return countBlogWords(this.value());
  }

  inputContent(): void {
    this.syncValue();
  }

  /** Keeps the caret stable when a toolbar control steals focus. */
  captureSelection(): void {
    const editor = this.editor()?.nativeElement;
    const selection = window.getSelection();
    if (!editor || !selection || !selection.rangeCount) {
      this.savedRange = null;
      return;
    }
    const range = selection.getRangeAt(0);
    this.savedRange = editor.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
  }

  execute(event: MouseEvent, action: FormatAction): void {
    event.preventDefault();
    event.stopPropagation();
    this.captureSelection();

    if (action.command === 'createLink' || action.command === 'insertImage') {
      if (action.command === 'createLink') {
        this.editor()?.nativeElement.focus();
        const anchor = this.closestAnchor();
        this.url.set(anchor?.getAttribute('href') ?? '');
        this.uploadError.set('');
        this.prompt.set('link');
      } else {
        this.uploadError.set('');
        this.imageInput()?.nativeElement.click();
      }
      return;
    }

    this.editor()?.nativeElement.focus();

    if (action.command === 'insertTip') {
      this.insertHtml('<blockquote>💡 Nhập nội dung ghi chú tại đây...</blockquote><p><br></p>');
      return;
    }

    this.runCommand(action.command, action.value);
  }

  runCommand(command: string, value?: string): void {
    const editor = this.editor()?.nativeElement;
    if (!editor) return;
    editor.focus();
    if (!this.restoreSelection()) return;
    if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
      this.toggleList(command === 'insertOrderedList' ? 'ol' : 'ul');
      return;
    }
    // Prefer semantic tags over inline styles so saved HTML stays clean.
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(command, false, value);
    this.ensureBlocks(editor);
    this.syncValue();
    this.captureSelection();
    this.refreshState();
  }

  changeBlock(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.block.set(value);
    const editor = this.editor()?.nativeElement;
    if (!editor || !this.restoreSelection()) return;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || !editor.contains(range.commonAncestorContainer)) return;
    const selectedText = range.toString();
    const block = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement).closest('p,h2,h3,pre,blockquote')
      : range.startContainer.parentElement?.closest('p,h2,h3,pre,blockquote');
    const replacement = document.createElement(value);
    if (selectedText) {
      replacement.textContent = selectedText;
      range.deleteContents();
      range.insertNode(replacement);
    } else if (block && editor.contains(block)) {
      while (block.firstChild) replacement.appendChild(block.firstChild);
      block.replaceWith(replacement);
    } else {
      replacement.innerHTML = '<br>';
      range.insertNode(replacement);
    }
    this.moveCaretToEnd(replacement);
    this.ensureBlocks(editor);
    this.syncValue();
  }

  /** ---------- Link / image insertion ---------- */

  insertUrl(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const kind = this.prompt();
    if (!kind) return;
    const raw = this.url().trim();
    if (!raw) {
      this.uploadError.set(kind === 'image' ? 'Vui lòng chọn ảnh hoặc nhập đường dẫn ảnh.' : 'Vui lòng nhập đường dẫn liên kết.');
      return;
    }

    const href = this.normalizeLink(raw);
    if (!href) {
      this.uploadError.set('Đường dẫn không hợp lệ. Dùng http(s), mailto hoặc tel.');
      return;
    }

    this.insertLink(href);
    this.closePrompt();
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      this.uploadError.set('Vui lòng chọn ảnh tối đa 5MB.');
      input.value = '';
      return;
    }
    this.uploading.set(true);
    this.uploadError.set('');
    this.blog.upload(file, 'content').subscribe({
      next: (url) => {
        this.uploading.set(false);
        if (!url) {
          this.uploadError.set('Máy chủ không trả về đường dẫn ảnh.');
          return;
        }
        this.insertHtml(`<figure class="rte-figure"><img src="${this.escapeAttribute(url)}" alt=""></figure>`);
        this.closePrompt();
      },
      error: () => {
        this.uploading.set(false);
        this.uploadError.set('Không thể tải ảnh lên.');
      },
    });
  }

  closePrompt(): void {
    this.prompt.set(null);
    this.uploadError.set('');
    this.url.set('');
    this.editor()?.nativeElement.focus();
  }

  /** ---------- Paste sanitising (fixes pasted font/colour overrides) ---------- */

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const clipboard = event.clipboardData;
    if (!clipboard) return;

    const html = clipboard.getData('text/html');
    const text = clipboard.getData('text/plain');

    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('script,style,meta,link,title').forEach((node) => node.remove());
      // Keep the text inside deprecated <font> tags, only drop the typeface.
      doc.querySelectorAll('font').forEach((node) => node.replaceWith(...Array.from(node.childNodes)));
      doc.body.querySelectorAll('*').forEach((element) => {
        Array.from(element.attributes).forEach((attribute) => {
          const name = attribute.name.toLowerCase();
          if (name.startsWith('on') || name === 'style' || name === 'class' || name === 'id') {
            element.removeAttribute(attribute.name);
          }
        });
      });
      this.insertHtml(doc.body.innerHTML);
      return;
    }

    this.insertHtml(this.escapeHtml(text).replace(/\r?\n/g, '<br>'));
  }

  /** ---------- Media delete affordance ---------- */

  onEditorClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      this.selectedMedia.set(null);
      return;
    }
    if (target.tagName === 'IMG') {
      this.selectMedia(target, 'Xóa ảnh');
      return;
    }
    if (target.tagName === 'TABLE') {
      this.selectMedia(target, 'Xóa bảng');
      return;
    }
    const figure = target.closest('figure');
    if (figure instanceof HTMLElement && figure.querySelector('img')) {
      this.selectMedia(figure, 'Xóa ảnh');
      return;
    }
    this.selectedMedia.set(null);
  }

  removeSelectedMedia(): void {
    const selected = this.selectedMedia();
    if (!selected) return;
    const removable = selected.element.closest('figure') ?? selected.element;
    removable.remove();
    this.selectedMedia.set(null);
    this.ensureBlocks(this.editor()?.nativeElement ?? null);
    this.syncValue();
    const editor = this.editor()?.nativeElement;
    if (editor) {
      editor.focus();
      this.moveCaretToEnd(editor);
    }
  }

  private selectMedia(element: HTMLElement, label: string): void {
    const surface = this.surface()?.nativeElement;
    if (!surface) return;
    const rect = element.getBoundingClientRect();
    const host = surface.getBoundingClientRect();
    this.selectedMedia.set({
      element,
      label,
      top: Math.max(0, rect.top - host.top - 14),
      left: Math.min(host.width - 8, rect.right - host.left),
    });
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange(): void {
    if (this.selectedMedia()) this.selectedMedia.set(null);
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.selectedMedia()) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.removeSelectedMedia();
      return;
    }
    if (event.key === 'Escape') this.selectedMedia.set(null);
  }

  @HostListener('document:selectionchange')
  onSelectionChange(): void {
    const editor = this.editor()?.nativeElement;
    const selection = window.getSelection();
    if (!editor || !selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    this.savedRange = range.cloneRange();
    this.refreshState();

    const block = String(document.queryCommandValue('formatBlock') ?? '').toLowerCase();
    this.block.set(['h2', 'h3', 'pre'].includes(block) ? block : 'p');
  }

  /** ---------- Helpers ---------- */

  private syncValue(): void {
    const editor = this.editor()?.nativeElement;
    if (!editor) return;
    const html = editor.innerHTML;
    this.value.set(this.isVisuallyEmpty(editor) ? '' : html);
  }

  private isVisuallyEmpty(editor: HTMLElement): boolean {
    return !editor.querySelector('img,table,hr,figure,blockquote,ul,ol') && !editor.textContent?.trim();
  }

  /** Guarantees every top-level run of inline content sits inside a paragraph. */
  private ensureBlocks(editor: HTMLElement | null): void {
    if (!editor) return;
    const nodes = Array.from(editor.childNodes);
    if (!nodes.length) {
      editor.innerHTML = '<p><br></p>';
      return;
    }

    let needsWrapping = false;
    for (const node of nodes) {
      if (node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((node as HTMLElement).tagName)) continue;
      if (node.nodeType === Node.TEXT_NODE && !(node.textContent ?? '').trim()) continue;
      needsWrapping = true;
      break;
    }
    if (!needsWrapping) return;

    const fragment = document.createDocumentFragment();
    let buffer: Node[] = [];
    const flush = () => {
      if (!buffer.length) return;
      const paragraph = document.createElement('p');
      buffer.forEach((node) => paragraph.appendChild(node));
      if (!paragraph.childNodes.length) paragraph.appendChild(document.createElement('br'));
      fragment.appendChild(paragraph);
      buffer = [];
    };

    for (const node of nodes) {
      const isBlock = node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((node as HTMLElement).tagName);
      if (isBlock) {
        flush();
        fragment.appendChild(node);
      } else {
        buffer.push(node);
      }
    }
    flush();
    editor.replaceChildren(fragment);
  }

  private insertHtml(html: string): void {
    const editor = this.editor()?.nativeElement;
    if (!editor) return;
    editor.focus();
    if (!this.restoreSelection()) return;

    const selection = window.getSelection();
    const range = this.savedRange && editor.contains(this.savedRange.commonAncestorContainer)
      ? this.savedRange
      : this.caretRangeAtEnd(editor);

    range.deleteContents();
    const fragment = range.createContextualFragment(html);
    const last = fragment.lastChild;
    range.insertNode(fragment);

    if (last) {
      const after = document.createRange();
      after.setStartAfter(last);
      after.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(after);
      this.savedRange = after.cloneRange();
    }

    this.ensureBlocks(editor);
    this.syncValue();
    this.refreshState();
  }

  private insertLink(href: string): void {
    const editor = this.editor()?.nativeElement;
    const hasSelection = !!(editor && this.savedRange && editor.contains(this.savedRange.commonAncestorContainer) && !this.savedRange.collapsed);
    if (!hasSelection) {
      const link = document.createElement('a');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = href;
      this.styleLink(link);
      const range = editor && this.savedRange && editor.contains(this.savedRange.commonAncestorContainer)
        ? this.savedRange
        : editor ? this.caretRangeAtEnd(editor) : null;
      if (!editor || !range) return;
      range.insertNode(link);
      const space = document.createTextNode('\u00a0');
      link.after(space);
      const caret = document.createRange();
      caret.setStartAfter(space);
      caret.collapse(true);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(caret);
      this.savedRange = caret.cloneRange();
      this.ensureBlocks(editor);
      this.syncValue();
      return;
    }

    if (!editor || !this.restoreSelection()) return;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || range.collapsed) return;
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    this.styleLink(anchor);
    try { range.surroundContents(anchor); }
    catch {
      anchor.appendChild(range.extractContents());
      range.insertNode(anchor);
    }
    const caret = document.createRange();
    caret.selectNodeContents(anchor);
    caret.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(caret);
    this.savedRange = caret.cloneRange();
    this.syncValue();
    this.refreshState();
  }

  private closestAnchor(): HTMLAnchorElement | null {
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    if (!node) return null;
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
    return element?.closest('a') ?? null;
  }

  private styleLink(anchor: HTMLAnchorElement): void {
    anchor.style.color = '#1e64ef';
    anchor.style.textDecoration = 'underline';
    anchor.style.textUnderlineOffset = '2px';
  }

  private normalizeLink(raw: string): string | null {
    const value = raw.trim();
    if (!value) return null;
    if (value.startsWith('/') || value.startsWith('#')) return value;
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
    try {
      const parsed = new URL(candidate);
      return ALLOWED_LINK_PROTOCOLS.includes(parsed.protocol) ? parsed.toString() : null;
    } catch {
      return null;
    }
  }

  private restoreSelection(): boolean {
    const editor = this.editor()?.nativeElement;
    if (!editor) return false;
    const selection = window.getSelection();
    if (this.savedRange && editor.contains(this.savedRange.commonAncestorContainer)) {
      selection?.removeAllRanges();
      selection?.addRange(this.savedRange);
      return true;
    }
    return false;
  }

  private moveCaretToEnd(editor: HTMLElement): void {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    this.savedRange = range.cloneRange();
  }

  private caretRangeAtEnd(editor: HTMLElement): Range {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    return range;
  }

  private toggleList(tag: 'ul' | 'ol'): void {
    const editor = this.editor()?.nativeElement;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!editor || !range) return;
    const current = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as HTMLElement).closest('ul,ol')
      : range.startContainer.parentElement?.closest('ul,ol');
    if (current && editor.contains(current)) {
      if (current.tagName.toLowerCase() === tag) {
        const fragment = document.createDocumentFragment();
        Array.from(current.children).forEach((item) => {
          const paragraph = document.createElement('p');
          paragraph.innerHTML = item.innerHTML || '<br>';
          fragment.appendChild(paragraph);
        });
        current.replaceWith(fragment);
      } else {
        const replacement = document.createElement(tag);
        while (current.firstChild) replacement.appendChild(current.firstChild);
        current.replaceWith(replacement);
      }
    } else {
      const text = range.toString();
      const list = document.createElement(tag);
      const item = document.createElement('li');
      item.textContent = text || 'Mục danh sách';
      list.appendChild(item);
      range.deleteContents();
      range.insertNode(list);
      const caret = document.createRange();
      caret.selectNodeContents(item);
      caret.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(caret);
      this.savedRange = caret.cloneRange();
    }
    this.syncValue();
  }

  private refreshState(): void {
    this.boldActive.set(this.commandState('bold'));
    this.italicActive.set(this.commandState('italic'));
    this.underlineActive.set(this.commandState('underline'));
    this.strikeActive.set(this.commandState('strikeThrough'));
  }

  private commandState(command: string): boolean {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value);
  }
}
