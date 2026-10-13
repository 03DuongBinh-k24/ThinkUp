import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BlogService } from '../services/blog.service';
import { BlogPost, BlogStatus } from '../models/blog.model';
import { BlogIconComponent } from '../components/blog-icon/blog-icon.component';
import { BlogStatusBadgeComponent } from '../components/blog-status-badge/blog-status-badge.component';
import { BlogAuthModalComponent } from '../components/blog-auth-modal/blog-auth-modal.component';
import { AuthService } from '../../../core/services/auth.service';
@Component({selector:'app-manage-posts',standalone:true,imports:[RouterLink,FormsModule,BlogIconComponent,BlogStatusBadgeComponent,BlogAuthModalComponent],templateUrl:'./manage-posts.component.html',styleUrl:'./manage-posts.component.css'})
export class ManagePostsComponent {
  private readonly blog=inject(BlogService);private readonly router=inject(Router);private readonly auth=inject(AuthService);private readonly destroyRef=inject(DestroyRef);
  readonly search=signal('');readonly status=signal('all');readonly allPosts=signal<BlogPost[]>([]);readonly loading=signal(false);readonly error=signal('');readonly authModal=signal(!this.auth.isAuthenticated());
  readonly filters=[{value:'all',label:'Tất cả'},{value:'draft',label:'Bản nháp'},{value:'published',label:'Đã đăng'},{value:'updated',label:'Đã cập nhật'}];
  readonly posts=computed(()=>{const search=this.search().trim().toLocaleLowerCase('vi');return this.allPosts().filter(post=>(this.status()==='all'||post.status===this.status())&&(!search||`${post.title} ${post.slug}`.toLocaleLowerCase('vi').includes(search)));});
  constructor(){this.load();}
  load():void{const owner=this.blog.currentAuthor();if(!owner||!this.auth.isAuthenticated())return;this.loading.set(true);this.error.set('');this.blog.list({ownerEmail:owner.email,page:1,limit:50}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:result=>{this.allPosts.set(result.posts);this.loading.set(false);},error:()=>{this.loading.set(false);this.error.set('Không thể tải bài viết. Vui lòng thử lại.');}});}
  formatDate(value?:string):string{if(!value)return 'Chưa cập nhật';const date=new Date(value);return Number.isNaN(date.getTime())?'Chưa cập nhật':new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);}
  postStatus(post:BlogPost):BlogStatus{return post.status||'draft';}
  closeAuth():void{this.authModal.set(false);this.router.navigateByUrl('/main/blog');}
}
