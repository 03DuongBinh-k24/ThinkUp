import { Component, ElementRef, computed, viewChild, signal, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LucideHeart, LucidePlay, LucidePause, LucideShuffle, LucideVolume2 } from '@lucide/angular';

interface Track { name: string; src: string; collection: 'lofi' | 'instrumental' | 'nature' | 'noise'; }

@Component({ selector: 'app-lofi-player', standalone: true, imports: [DecimalPipe, LucideHeart, LucidePlay, LucidePause, LucideShuffle, LucideVolume2], templateUrl: './lofi-player.component.html', styleUrl: './lofi-player.component.css' })
export class LofiPlayerComponent {
  readonly close = output<void>();
  readonly audio = viewChild<ElementRef<HTMLAudioElement>>('audio');
  readonly ambientAudio = viewChild<ElementRef<HTMLAudioElement>>('ambientAudio');
  readonly playing = signal(false);
  readonly collection = signal<Track['collection']>('lofi');
  readonly selected = signal(0);
  readonly selectedAmbient = signal(10);
  readonly volume = signal(0.32);
  readonly ambientMix = signal(0.5);
  readonly favorites = signal<ReadonlySet<number>>(new Set([0]));
  readonly tracks: Track[] = [
    { name: 'Lofi Chillhop & Jazz Cafe', collection: 'lofi', src: '/assets/study-room/music/alex-morgan-chillhop-jazz-coffee-shop-552792.mp3' },
    { name: 'Jazz Focus Study', collection: 'lofi', src: '/assets/study-room/music/alex-morgan-jazz-focus-study-music-556237.mp3' },
    { name: 'Study Music Session', collection: 'lofi', src: '/assets/study-room/music/alex-morgan-study-music-session-559993.mp3' },
    { name: 'Golden Hour Haze', collection: 'lofi', src: '/assets/study-room/music/elijah_k-golden-hour-haze-320837.mp3' },
    { name: 'The Mountain Lofi', collection: 'lofi', src: '/assets/study-room/music/the_mountain-lofi-lofi-music-496553.mp3' },
    { name: 'Lazy Sunday Morning', collection: 'lofi', src: '/assets/study-room/music/tramp963-lazy-sunday-morning-lo-fi-music-272649.mp3' },
    { name: 'Absolute Violin', collection: 'instrumental', src: '/assets/study-room/music/absolutesound-violin-violin-music-533061.mp3' },
    { name: 'Midnight Library Stacks', collection: 'instrumental', src: '/assets/study-room/music/cfl_turningpages-midnight-library-stacks-555540.mp3' },
    { name: 'Frosty Morning', collection: 'instrumental', src: '/assets/study-room/music/leberch-frosty-morning-252208.mp3' },
    { name: 'Soft Piano', collection: 'instrumental', src: '/assets/study-room/music/leberch-soft-piano-501446.mp3' },
    { name: 'Golden Forest & Stream', collection: 'nature', src: '/assets/study-room/music/38534292-golden-forest-with-birds-and-running-stream-sounds-171319.mp3' },
    { name: 'Chill Ocean Waves', collection: 'nature', src: '/assets/study-room/music/alex-morgan-ocean-waves-chill-537452.mp3' },
    { name: 'Soft Wind', collection: 'nature', src: '/assets/study-room/music/caryna67-in-the-wind-395151.mp3' },
    { name: 'Pink Noise Rain Cloud', collection: 'noise', src: '/assets/study-room/music/mrwashingt0n-static-pink-noise-rain-cloud-491916.mp3' },
    { name: '16Hz Beta Binaural + White Noise', collection: 'noise', src: '/assets/study-room/music/purebinaural-purebinaural-16-hz-beta-binaural-beats-with-white-noise-484860.mp3' },
    { name: '40Hz Gamma Binaural + Brown Noise', collection: 'noise', src: '/assets/study-room/music/purebinaural-purebinaural-40-hz-gamma-binaural-beats-with-brown-noise-526498.mp3' },
    { name: 'Meditation Ambience', collection: 'noise', src: '/assets/study-room/music/leberch-meditation-ambience-262905.mp3' }
  ];
  readonly visibleTracks = computed(() => this.tracks.map((track, index) => ({ ...track, index })).filter(track => track.collection === this.collection()));
  readonly subtitle = computed(() => `${this.tracks[this.selected()].name} + ${this.tracks[this.selectedAmbient()].name}`);
  private applyVolumes(): void {
    const music = this.audio()?.nativeElement;
    const ambient = this.ambientAudio()?.nativeElement;
    if (music) music.volume = this.volume() * Math.max(0.1, 1 - this.ambientMix() * 0.7);
    if (ambient) ambient.volume = this.volume() * this.ambientMix() * 0.9;
  }
  async toggle(): Promise<void> {
    const music = this.audio()?.nativeElement;
    const ambient = this.ambientAudio()?.nativeElement;
    if (!music || !ambient) return;
    if (this.playing()) { music.pause(); ambient.pause(); this.playing.set(false); return; }
    this.applyVolumes();
    try { await Promise.all([music.play(), ambient.play()]); this.playing.set(true); }
    catch { music.pause(); ambient.pause(); this.playing.set(false); }
  }
  async choose(index: number): Promise<void> {
    if (this.tracks[index].collection === 'nature' || this.tracks[index].collection === 'noise') this.selectedAmbient.set(index);
    else this.selected.set(index);
    const music = this.audio()?.nativeElement;
    const ambient = this.ambientAudio()?.nativeElement;
    music?.load(); ambient?.load(); this.applyVolumes();
    if (this.playing()) { try { await Promise.all([music?.play(), ambient?.play()]); } catch { this.playing.set(false); } }
  }
  async shuffle(): Promise<void> {
    const choices = this.visibleTracks();
    if (choices.length) await this.choose(choices[Math.floor(Math.random() * choices.length)].index);
  }
  toggleFavorite(index: number): void { this.favorites.update(current => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; }); }
  setVolume(event: Event): void { this.volume.set(Number((event.target as HTMLInputElement).value)); this.applyVolumes(); }
  setAmbientMix(event: Event): void { this.ambientMix.set(Number((event.target as HTMLInputElement).value)); this.applyVolumes(); }
}
