import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-brand-only-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './brand-only-header.component.html',
  styleUrl: './brand-only-header.component.css'
})
export class BrandOnlyHeaderComponent {}
