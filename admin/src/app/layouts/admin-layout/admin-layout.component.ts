import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  template: `
    <div class="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div class="max-w-md p-8 bg-slate-800 rounded-xl shadow-lg border border-slate-700">
        <h1 class="text-2xl font-bold text-amber-400 mb-2">ThinkUp Admin Portal</h1>
        <p class="text-slate-400 text-sm mb-4">
          Cấu trúc khung độc lập của ứng dụng Quản trị viên (Angular 21 Skeleton).
        </p>
        <span class="inline-block px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full text-xs font-semibold">
          Ready for future admin migration
        </span>
      </div>
    </div>
  `
})
export class AdminLayoutComponent {}
