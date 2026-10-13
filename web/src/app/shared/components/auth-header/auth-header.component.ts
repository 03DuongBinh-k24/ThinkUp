import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommerceService } from '../../../core/services/commerce.service';

@Component({
  selector: 'app-auth-header',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './auth-header.component.html',
  styleUrl: './auth-header.component.css'
})
export class AuthHeaderComponent {
  private router = inject(Router);
  private commerceService = inject(CommerceService);

  readonly cartCount = this.commerceService.cartCount;
  searchQuery = '';

  handleSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/main/courses'], { queryParams: { query: this.searchQuery.trim() } });
    }
  }
}
