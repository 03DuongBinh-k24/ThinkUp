import { Pipe, PipeTransform } from '@angular/core';
const WIDTHS = [16,32,48,64,96,128,256,384,640,750,828,1080,1200,1920,2048,3840];
@Pipe({name:'blogImageSrcset',standalone:true})
export class BlogImageSrcsetPipe implements PipeTransform {
  transform(src:string, responsive=false, thumbnail=false):string|null {
    const match=/^\/assets\/blog\/(article-[1-4])\.jpg$/.exec(src);
    if(!match)return null;
    return WIDTHS.filter(width=>!responsive||width>=640).map(width=>`/assets/blog/optimized/${match[1]}-${width}.webp${thumbnail ? "?thumbnail=1" : ""} ${width}w`).join(', ');
  }
}
