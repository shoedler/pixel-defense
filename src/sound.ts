export interface ISoundGeneratorConfigProvider {
  get volume(): number;
}

class SoundGenerator {
  private audioContext: AudioContext;

  public constructor(private readonly configProvider: ISoundGeneratorConfigProvider) {
    this.audioContext = new window.AudioContext();
  }

  public playBasicGunshot(): void {
    this.createGunfireSound(0.1, 800, 400, "square");
  }

  public playSniperGunshot(): void {
    this.createGunfireSound(0.2, 600, 200, "square");
  }

  public playMachinegunGunshot(): void {
    this.createGunfireSound(0.05, 1000, 800, "square");
  }

  public playMortarShot(): void {
    // Deep launch sound with rising pitch
    const duration = 0.5;
    const currentTime = this.audioContext.currentTime;

    const oscillator = this.audioContext.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(100, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, currentTime + duration);

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(this.configProvider.volume, currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    oscillator.connect(gainNode).connect(this.audioContext.destination);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);
  }

  public playMortarExplosion(): void {
    // Explosion with noise burst and low-frequency rumble
    const duration = 1;
    const currentTime = this.audioContext.currentTime;

    // Noise burst
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(1000, currentTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(100, currentTime + duration);

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(this.configProvider.volume, currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    noiseSource.connect(noiseFilter).connect(noiseGain).connect(this.audioContext.destination);

    noiseSource.start(currentTime);
    noiseSource.stop(currentTime + duration);

    // Low-frequency rumble
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(50, currentTime);

    const oscillatorGain = this.audioContext.createGain();
    oscillatorGain.gain.setValueAtTime(this.configProvider.volume * 0.5, currentTime);
    oscillatorGain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    oscillator.connect(oscillatorGain).connect(this.audioContext.destination);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);
  }

  public playPlacement(): void {
    const notes = [800, 1000, 1200];
    const duration = 0.05;
    notes.forEach((freq, i) => {
      this.createSingleToneAtTime(duration, freq, "square", this.audioContext.currentTime + i * duration);
    });
  }

  public playInvalidPlacement(): void {
    const notes = [600, 500, 400];
    const duration = 0.05;
    notes.forEach((freq, i) => {
      this.createSingleToneAtTime(duration, freq, "square", this.audioContext.currentTime + i * duration);
    });
  }

  public playRemovePlacement(): void {
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

  public playNotEnoughMoney(): void {
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

  private createGunfireSound(duration: number, startFreq: number, endFreq: number, oscType: OscillatorType): void {
    const currentTime = this.audioContext.currentTime;

    // Noise component for the bang
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(this.configProvider.volume, currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    noiseSource.connect(noiseGain).connect(this.audioContext.destination);

    noiseSource.start(currentTime);
    noiseSource.stop(currentTime + duration);

    // Oscillator component for the crack
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = oscType;

    oscillator.frequency.setValueAtTime(startFreq, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, currentTime + duration);

    const oscillatorGain = this.audioContext.createGain();
    oscillatorGain.gain.setValueAtTime(this.configProvider.volume * 0.5, currentTime);
    oscillatorGain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    oscillator.connect(oscillatorGain).connect(this.audioContext.destination);

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
