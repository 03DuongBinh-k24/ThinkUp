import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BlogService } from '../services/blog.service';
import { BlogPost, BlogStatus } from '../models/blog.model';
import { BlogIconComponent } from '../components/blog-icon/blog-icon.component';
import { BlogStatusBadgeComponent } from '../components/blog-status-badge/blog-status-badge.component';
import { AuthRequiredModalComponent } from '../../../shared/components/auth-required-modal/auth-required-modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { EMPTY, Subject, catchError, debounceTime, startWith, switchMap, tap } from 'rxjs';
@Component({selector:'app-manage-posts',standalone:true,imports:[RouterLink,FormsModule,BlogIconComponent,BlogStatusBadgeComponent,AuthRequiredModalComponent],templateUrl:'./manage-posts.component.html',styleUrl:'./manage-posts.component.css'})
export class ManagePostsComponent {
  private readonly blog=inject(BlogService);private readonly router=inject(Router);private readonly auth=inject(AuthService);private readonly destroyRef=inject(DestroyRef);
  private readonly reload$=new Subject<void>();
  readonly search=signal('');readonly status=signal('all');readonly allPosts=signal<BlogPost[]>([]);readonly loading=signal(false);readonly error=signal('');readonly authModal=signal(!this.auth.isAuthenticated());
  readonly filters=[{value:'all',label:'Tất cả'},{value:'draft',label:'Bản nháp'},{value:'published',label:'Đã đăng'},{value:'updated',label:'Đã cập nhật'}];
  readonly posts=computed(()=>this.allPosts());
  constructor(){this.reload$.pipe(debounceTime(180),startWith(void 0),switchMap(()=>{const owner=this.blog.currentAuthor();if(!owner||!this.auth.isAuthenticated())return EMPTY;this.loading.set(true);this.error.set('');return this.blog.list({ownerEmail:owner.email,page:1,limit:50,status:this.status()==='all'?'':this.status(),search:this.search().trim()}).pipe(tap(result=>{this.allPosts.set(result.posts);this.loading.set(false);}),catchError(()=>{this.loading.set(false);this.error.set('Không thể tải bài viết. Vui lòng thử lại.');return EMPTY;}));}),takeUntilDestroyed(this.destroyRef)).subscribe();}
  load():void{this.reload$.next();}
  setSearch(value:string):void{this.search.set(value);this.load();}
  setStatus(value:string):void{this.status.set(value);this.load();}
  formatDate(value?:string):string{if(!value)return 'Chưa cập nhật';const date=new Date(value);return Number.isNaN(date.getTime())?'Chưa cập nhật':new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);}
  postStatus(post:BlogPost):BlogStatus{return post.status||'draft';}
  closeAuth():void{this.authModal.set(false);this.router.navigateByUrl('/main/blog');}
}
