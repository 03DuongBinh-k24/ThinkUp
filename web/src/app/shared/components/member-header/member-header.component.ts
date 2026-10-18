import { Component } from '@angular/core';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-member-header',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './member-header.component.html',
  styleUrl: './member-header.component.css',
})
export class MemberHeaderComponent {}
