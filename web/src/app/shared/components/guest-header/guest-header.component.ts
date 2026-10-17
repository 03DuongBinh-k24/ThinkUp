import { Component } from '@angular/core';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-guest-header',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './guest-header.component.html',
  styleUrl: './guest-header.component.css',
})
export class GuestHeaderComponent {}
