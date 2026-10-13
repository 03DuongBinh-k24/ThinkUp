import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-legal-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.css'
})
export class LegalComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly isPolicy = signal<boolean>(false);

  ngOnInit(): void {
    this.route.url.subscribe((segments) => {
      const path = segments.map((s) => s.path).join('/');
      this.isPolicy.set(path.includes('policy'));
    });
  }
}
