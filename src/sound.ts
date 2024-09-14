export interface ISoundGeneratorConfigProvider {
  get volume(): number;
}

class SoundGenerator {
  private audioContext: AudioContext;

  public constructor(private readonly configProvider: ISoundGeneratorConfigProvider) {
    this.audioContext = new window.AudioContext();
  }

  public playBasicGunshot(): void {
    this.createGunfireSound(0.1, 1000, 500); // Mid-pitch, quick drop
  }

  public playSniperGunshot(): void {
    this.createGunfireSound(0.2, 800, 200); // Deeper, longer drop
  }

  public playMachinegunGunshot(): void {
    this.createGunfireSound(0.05, 1200, 800); // High-pitch, slight drop
  }

  public playPlacement(): void {
    // Ascending arpeggio for placement
    const notes = [800, 1000, 1200];
    const duration = 0.05;
    notes.forEach((freq, i) => {
      this.createSingleToneAtTime(duration, freq, "square", this.audioContext.currentTime + i * duration);
    });
  }

  public playNotEnoughMoney(): void {
    // Descending arpeggio for insufficient funds
    const notes = [600, 500, 400];
    const duration = 0.05;
    notes.forEach((freq, i) => {
      this.createSingleToneAtTime(duration, freq, "square", this.audioContext.currentTime + i * duration);
    });
  }

  public playRemovePlacement(): void {
    // Deep tone with frequency drop
    const duration = 0.3;
    const currentTime = this.audioContext.currentTime;

    const oscillator = this.audioContext.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(500, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, currentTime + duration);

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(this.configProvider.volume, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    oscillator.connect(gainNode).connect(this.audioContext.destination);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);
  }

  public playInvalidPlacement(): void {
    // Buzzer sound for invalid placement
    const duration = 0.2;
    const currentTime = this.audioContext.currentTime;

    const oscillator = this.audioContext.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(150, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, currentTime + duration);

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(this.configProvider.volume, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    oscillator.connect(gainNode).connect(this.audioContext.destination);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);
  }

  private createSingleTone(duration: number, startFreq: number, oscType: OscillatorType): void {
    const currentTime = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = oscType;

    // Frequency modulation for pixely effect
    oscillator.frequency.setValueAtTime(startFreq, currentTime);
    oscillator.frequency.linearRampToValueAtTime(startFreq * 1.2, currentTime + duration / 2);
    oscillator.frequency.linearRampToValueAtTime(startFreq, currentTime + duration);

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(this.configProvider.volume, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    oscillator.connect(gainNode).connect(this.audioContext.destination);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);
  }

  private createSingleToneAtTime(duration: number, frequency: number, oscType: OscillatorType, startTime: number): void {
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = oscType;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(this.configProvider.volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.connect(gainNode).connect(this.audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  private createGunfireSound(duration: number, startFreq: number, endFreq: number): void {
    const currentTime = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = "square"; // Retro square wave

    // Frequency sweep for gunfire effect
    oscillator.frequency.setValueAtTime(startFreq, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, currentTime + duration);

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(this.configProvider.volume, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    oscillator.connect(gainNode).connect(this.audioContext.destination);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);
  }
}

export type SoundContext = {
  soundGenerator: SoundGenerator;
};

export const createSoundEngine = (configProvider: ISoundGeneratorConfigProvider): SoundContext => {
  return { soundGenerator: new SoundGenerator(configProvider) };
};
