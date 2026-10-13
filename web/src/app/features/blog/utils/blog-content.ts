export function createBlogSlug(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, ''); }
export function countBlogWords(value: string): number { const text = value.replace(/<[^>]*>/g, ' ').trim(); return text ? text.split(/\s+/).length : 0; }
export function prepareBlogHtml(value: string, injectIds = true): string {
  const doc = new DOMParser().parseFromString(value, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed').forEach(node => node.remove());
  doc.body.querySelectorAll('*').forEach(node => { Array.from(node.attributes).forEach(attr => { if (attr.name.toLowerCase().startsWith('on') || (['href','src'].includes(attr.name.toLowerCase()) && /^\s*(javascript|vbscript):/i.test(attr.value))) node.removeAttribute(attr.name); }); });
  const ids = new Set<string>();
  if (injectIds) doc.querySelectorAll('h2,h3').forEach((node, index) => { const base = node.id || createBlogSlug(node.textContent || '') || `section-${index + 1}`; let id = base; let suffix = 1; while (ids.has(id)) id = `${base}-${suffix++}`; node.id = id; ids.add(id); });
  return doc.body.innerHTML;
}
export function getBlogHeadings(content: string): { id: string; text: string; level: number }[] { const doc = new DOMParser().parseFromString(content, 'text/html'); return Array.from(doc.querySelectorAll('h2[id],h3[id]')).map(node => ({ id: node.id, text: node.textContent || '', level: Number(node.tagName.substring(1)) })); }
