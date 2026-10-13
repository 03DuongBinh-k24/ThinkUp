import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-and-suggestions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-and-suggestions.component.html',
  styleUrl: './search-and-suggestions.component.css'
})
export class SearchAndSuggestionsComponent {
  @Input() searchQuery = '';
  @Input() suggestedTags: string[] = [];
  @Input() selectedTags: string[] = [];
  @Output() search = new EventEmitter<string>();
  @Output() tagToggle = new EventEmitter<string>();

  submitSearch(): void {
    this.search.emit(this.searchQuery);
  }

  toggleTag(tag: string): void {
    this.tagToggle.emit(tag);
  }
}
