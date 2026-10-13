import { Component, computed, input } from '@angular/core';
import { BlogStatus } from '../../models/blog.model';
import { BLOG_STATUS_LABELS } from '../../data/blog-options';
@Component({selector:'app-blog-status-badge',standalone:true,templateUrl:'./blog-status-badge.component.html',styleUrl:'./blog-status-badge.component.css'})
export class BlogStatusBadgeComponent { readonly status=input<BlogStatus>('draft'); readonly label=computed(()=>BLOG_STATUS_LABELS[this.status()] || BLOG_STATUS_LABELS.draft); }
