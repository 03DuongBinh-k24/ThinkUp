import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './shared/components/header/header.component';
import { AuthHeaderComponent } from './shared/components/auth-header/auth-header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, AuthHeaderComponent, FooterComponent, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private router = inject(Router);
  readonly isAuthPage = signal(false);
  readonly isOnboardingPage = signal(false);
  readonly hideFooter = signal(false);
  readonly hideShell = signal(false);
  readonly isStudyLobby = signal(false);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url || '';
      this.isAuthPage.set(url.startsWith('/auth'));
      this.isOnboardingPage.set(url.includes('onboarding'));
      this.isStudyLobby.set(url.startsWith('/learning/study-room') && !/^\/learning\/study-room\/[^/]+/.test(url));
      let activeRoute = this.router.routerState.snapshot.root;
      while (activeRoute.firstChild) activeRoute = activeRoute.firstChild;
      this.hideShell.set(activeRoute.data['hideShell'] === true);
      this.hideFooter.set(activeRoute.data['hideFooter'] === true);
    });
  }
}

