import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { BlogService } from '../../services/blog.service';
import { BlogIconComponent } from '../blog-icon/blog-icon.component';
@Component({ selector: 'app-newsletter-subscribe', standalone: true, imports: [FormsModule, BlogIconComponent], templateUrl: './newsletter-subscribe.component.html', styleUrl: './newsletter-subscribe.component.css' })
export class NewsletterSubscribeComponent {
  private readonly blog = inject(BlogService);
  email = '';
  readonly status = signal<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle');
  readonly error = signal('');
  submit(): void {
    if (!this.email.trim() || this.status() === 'loading') return;
    this.status.set('loading'); this.error.set('');
    this.blog.subscribe(this.email.trim()).pipe(finalize(() => { if (this.status() === 'loading') this.status.set('idle'); })).subscribe({ next: data => { if (data.alreadySubscribed) this.status.set('already'); else if (data.success) this.status.set('success'); else { this.status.set('error'); this.error.set(data.message || 'Có lỗi xảy ra, vui lòng thử lại.'); } }, error: () => { this.status.set('error'); this.error.set('Không thể kết nối máy chủ. Vui lòng thử lại sau.'); } });
  }
}
