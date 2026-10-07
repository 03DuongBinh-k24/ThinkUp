import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './shared/components/header/header.component';
import { AuthHeaderComponent } from './shared/components/auth-header/auth-header.component';
import { FooterComponent } from './shared/components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, AuthHeaderComponent, FooterComponent],
  template: `
    <div class="flex flex-col min-h-screen">
      @if (!isOnboardingPage()) {
        @if (isAuthPage()) {
          <app-auth-header />
        } @else {
          <app-header />
        }
      }
      <div class="flex-1 flex flex-col">
        <router-outlet />
      </div>
      @if (!isOnboardingPage()) {
        <app-footer />
      }
    </div>
  `,
  styles: [':host { display: block; min-height: 100vh; }']
})
export class AppComponent {
  private router = inject(Router);
  readonly isAuthPage = signal(false);
  readonly isOnboardingPage = signal(false);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url || '';
      this.isAuthPage.set(url.startsWith('/auth'));
      this.isOnboardingPage.set(url.includes('onboarding'));
    });
  }
}

