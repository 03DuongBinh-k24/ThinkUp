import { Component, ElementRef, OnDestroy, computed, viewChild, signal, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LucideHeart, LucidePlay, LucidePause, LucideShuffle, LucideVolume2 } from '@lucide/angular';

interface Track { name: string; src: string; collection: 'lofi' | 'instrumental' | 'nature' | 'noise'; }

@Component({ selector: 'app-lofi-player', standalone: true, imports: [DecimalPipe, LucideHeart, LucidePlay, LucidePause, LucideShuffle, LucideVolume2], templateUrl: './lofi-player.component.html', styleUrl: './lofi-player.component.css' })
export class LofiPlayerComponent implements OnDestroy {
  readonly close = output<void>();
  readonly playingChange = output<boolean>();
  readonly audio = viewChild<ElementRef<HTMLAudioElement>>('audio');
  readonly ambientAudio = viewChild<ElementRef<HTMLAudioElement>>('ambientAudio');
  readonly playing = signal(false);
  readonly collection = signal<Track['collection']>('lofi');
  readonly selected = signal(0);
  readonly selectedAmbient = signal<number | null>(null);
  readonly volume = signal(0.32);
  readonly ambientMix = signal(0.5);
  readonly favorites = signal<ReadonlySet<number>>(new Set([0]));
  readonly audioError = signal('');
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
    { name: 'Tiếng ồn trắng dịu', collection: 'noise', src: '/assets/study-room/music/soft-white-noise.wav' },
    { name: 'Tiếng ồn nâu', collection: 'noise', src: '/assets/study-room/music/soft-brown-noise.wav' },
    { name: 'Meditation Ambience', collection: 'noise', src: '/assets/study-room/music/leberch-meditation-ambience-262905.mp3' }
  ];
  readonly visibleTracks = computed(() => this.tracks.map((track, index) => ({ ...track, index })).filter(track => track.collection === this.collection()));
  readonly musicTrack = computed(() => this.tracks[this.selected()]);
  readonly ambientTrack = computed(() => this.selectedAmbient() === null ? null : this.tracks[this.selectedAmbient() as number]);
  readonly subtitle = computed(() => [this.musicTrack()?.name, this.ambientTrack()?.name].filter(Boolean).join(' + ') || 'Đang tắt');
  private loadedMusicSrc = '';
  private loadedAmbientSrc = '';

  private playbackRequest = 0;

  ngOnDestroy(): void {
    this.playbackRequest++;
    this.pauseAll();
  }

  private applyVolumes(): void {
    const music = this.audio()?.nativeElement;
    const ambient = this.ambientAudio()?.nativeElement;
    const mix = this.ambientTrack() ? this.ambientMix() : 0;
    if (music) music.volume = this.volume() * (1 - mix * 0.7);
    if (ambient) ambient.volume = this.volume() * mix * 0.9;
  }

  async toggle(): Promise<void> {
    if (this.playing()) {
      this.playbackRequest++;
      this.pauseAll();
      this.setPlaying(false);
      return;
    }
    await this.startPlayback();
  }

  async choose(index: number): Promise<void> {
    const track = this.tracks[index];
    if (!track) return;
    const ambientChoice = track.collection === 'nature' || track.collection === 'noise';

    if (ambientChoice) {
      if (this.selectedAmbient() === index) {
        this.selectedAmbient.set(null);
        this.syncAmbientSource();
        this.applyVolumes();
        this.audioError.set('');
        return;
      }
      this.selectedAmbient.set(index);
      await this.startPlayback();
      return;
    }

    if (this.selected() === index) {
      await this.toggle();
      return;
    }
    this.selected.set(index);
    await this.startPlayback();
  }

  async chooseCollection(collection: Track['collection']): Promise<void> {
    this.collection.set(collection);
    const first = this.tracks.findIndex(track => track.collection === collection);
    if (first < 0) return;

    if (collection === 'lofi' || collection === 'instrumental') {
      this.selected.set(first);
    } else {
      this.selectedAmbient.set(first);
    }
    await this.startPlayback();
  }

  async shuffle(): Promise<void> {
    const activeIndex = this.collection() === 'lofi' || this.collection() === 'instrumental' ? this.selected() : this.selectedAmbient();
    const visible = this.visibleTracks();
    const choices = visible.filter(track => track.index !== activeIndex);
    const pool = choices.length ? choices : visible;
    if (pool.length) await this.choose(pool[Math.floor(Math.random() * pool.length)].index);
  }

  toggleFavorite(index: number): void { this.favorites.update(current => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; }); }
  setVolume(event: Event): void { this.volume.set(Number((event.target as HTMLInputElement).value)); this.applyVolumes(); }
  setAmbientMix(event: Event): void { this.ambientMix.set(Number((event.target as HTMLInputElement).value)); this.applyVolumes(); }

  private async startPlayback(): Promise<void> {
    const music = this.audio()?.nativeElement;
    const ambient = this.ambientAudio()?.nativeElement;
    if (!music || !ambient) return;

    const request = ++this.playbackRequest;
    this.syncMusicSource();
    this.syncAmbientSource();
    this.applyVolumes();
    this.audioError.set('');
    this.setPlaying(true);
    // Start both layers in the same user gesture, before awaiting media loading.
    const [musicResult, ambientResult] = await Promise.allSettled([
      music.play(),
      this.ambientTrack() ? ambient.play() : undefined,
    ]);
    if (request !== this.playbackRequest) return;
    this.setPlaying(!music.paused || !ambient.paused);
    if (musicResult.status === 'rejected') {
      this.audioError.set('Không phát được bài nhạc này. Hãy chọn bài khác hoặc thử phát lại.');
    } else if (ambientResult.status === 'rejected' && this.ambientTrack()) {
      this.audioError.set('Không phát được âm thanh môi trường. Hãy chọn âm thanh khác.');
    }
  }

  private pauseAll(): void {
    this.audio()?.nativeElement.pause();
    this.ambientAudio()?.nativeElement.pause();
  }

  /** Chỉ đổi nguồn của đúng phần tử vừa đổi để không làm gián đoạn track còn lại. */
  private syncMusicSource(): void {
    const music = this.audio()?.nativeElement;
    const src = this.musicTrack()?.src;
    if (!music || !src || (this.loadedMusicSrc === src && !music.error)) return;
    this.loadedMusicSrc = src;
    music.src = src;
    music.load();
  }

  private syncAmbientSource(): void {
    const ambient = this.ambientAudio()?.nativeElement;
    const src = this.ambientTrack()?.src || '';
    if (!ambient) return;
    if (this.loadedAmbientSrc === src && !ambient.error) return;
    this.loadedAmbientSrc = src;
    if (src) {
      ambient.src = src;
      ambient.load();
      return;
    }
    ambient.pause();
    ambient.removeAttribute('src');
    ambient.load();
  }

  private setPlaying(value: boolean): void { this.playing.set(value); this.playingChange.emit(value); }
}
