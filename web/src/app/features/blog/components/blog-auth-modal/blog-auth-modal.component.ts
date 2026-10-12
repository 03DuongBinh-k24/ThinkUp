import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BlogIconComponent } from '../blog-icon/blog-icon.component';
@Component({ selector: 'app-blog-auth-modal', standalone: true, imports: [RouterLink, BlogIconComponent], templateUrl: './blog-auth-modal.component.html', styleUrl: './blog-auth-modal.component.css' })
export class BlogAuthModalComponent { readonly open = input(false); readonly closed = output<void>(); }
