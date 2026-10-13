import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BlogIconComponent } from '../blog-icon/blog-icon.component';
@Component({selector:'app-blog-tag-input',standalone:true,imports:[FormsModule,BlogIconComponent],templateUrl:'./blog-tag-input.component.html',styleUrl:'./blog-tag-input.component.css'})
export class BlogTagInputComponent {
  readonly value=model<string[]>([]); readonly placeholder=input('Nhập thẻ và nhấn Enter...'); readonly hint=input(''); readonly label=input('Thẻ bài viết'); draft='';
  commit():void {const value=this.draft.trim().replace(/^#/,'');if(value&&!this.value().some(item=>item.toLocaleLowerCase()===value.toLocaleLowerCase()))this.value.update(items=>[...items,value]);this.draft='';}
  remove(value:string):void {this.value.update(items=>items.filter(item=>item!==value));}
  keydown(event:KeyboardEvent):void {if(event.key==='Enter'||event.key===','){event.preventDefault();this.commit();}else if(event.key==='Backspace'&&!this.draft)this.value.update(items=>items.slice(0,-1));}
}
