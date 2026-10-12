import { Component, effect, input, model, OnDestroy, signal } from '@angular/core';
import { BlogIconComponent } from '../blog-icon/blog-icon.component';
@Component({selector:'app-blog-image-upload',standalone:true,imports:[BlogIconComponent],templateUrl:'./blog-image-upload.component.html',styleUrl:'./blog-image-upload.component.css'})
export class BlogImageUploadComponent implements OnDestroy {
  readonly value=model<File|string|null>(null);readonly error=input('');readonly maxSizeMb=input(2);readonly dragging=signal(false);readonly fileError=signal('');readonly preview=signal('');private objectUrl='';
  constructor(){effect(()=>{if(this.objectUrl)URL.revokeObjectURL(this.objectUrl);const value=this.value();this.objectUrl=value instanceof File?URL.createObjectURL(value):'';this.preview.set(typeof value==='string'?value:this.objectUrl);});}
  ngOnDestroy():void{if(this.objectUrl)URL.revokeObjectURL(this.objectUrl);}
  choose(event:Event):void{const input=event.target as HTMLInputElement;this.accept(input.files);input.value='';}
  drop(event:DragEvent):void{event.preventDefault();this.dragging.set(false);this.accept(event.dataTransfer?.files || null);}
  private accept(files:FileList|null):void{const file=files?.item(0);if(!file)return;if(!file.type.startsWith('image/')){this.fileError.set('Vui lòng chọn đúng định dạng ảnh');return;}if(file.size>this.maxSizeMb()*1024*1024){this.fileError.set(`Ảnh không được vượt quá ${this.maxSizeMb()}MB`);return;}this.fileError.set('');this.value.set(file);}
}
