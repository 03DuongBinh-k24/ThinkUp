import { Component, computed, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { BLOG_ICONS } from '../../data/blog-icons';
@Component({ selector: 'app-blog-icon', standalone: true, imports: [LucideDynamicIcon], templateUrl: './blog-icon.component.html', styleUrl: './blog-icon.component.css' })
export class BlogIconComponent {
  readonly name = input('folder');
  readonly size = input(16);
  readonly icon = computed(() => BLOG_ICONS[this.name()] || BLOG_ICONS['folder']);
}
