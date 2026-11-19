import { Component, input } from "@angular/core";
import { LucideSparkles } from "@lucide/angular";

@Component({
  selector: "app-room-match-loading",
  standalone: true,
  imports: [LucideSparkles],
  templateUrl: "./room-match-loading.component.html",
  styleUrl: "./room-match-loading.component.css",
})
export class RoomMatchLoadingComponent {
  readonly quote = input.required<string>();
}
