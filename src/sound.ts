export interface ISoundGeneratorConfigProvider {
  get volume(): number;
}

class SoundGenerator {
  private audioContext: AudioContext;

  public constructor(private readonly configProvider: ISoundGeneratorConfigProvider) {
    this.audioContext = new window.AudioContext();
  }

  public playBasicGunshot(): void {
    this.createGunfireSound(0.1, 600, 1000); // Basic: mid-pitch, short burst
  }

  public playSniperGunshot(): void {
    this.createGunfireSound(0.3, 300, 800); // Sniper: deeper, longer blast
  }

  public playMachinegunGunshot(): void {
    this.createGunfireSound(0.05, 1000, 2000); // Machinegun: high-pitch, sharp burst
  }

  public playPlacement(): void {
    this.createSingleTone(0.02, 1800, "square");
    this.createSingleTone(0.05, 800, "square");
  }

  public playInvalidPlacement(): void {
    this.createSingleTone(0.2, 200, "square");
    this.createSingleTone(0.4, 150, "square");
  }

  public playRemovePlacement(): void {
    this.createSingleTone(0.5, 400, "triangle"); // Deeper scrap sound
  }

  public playNotEnoughMoney(): void {
    this.createSingleTone(0.2, 200, "sine");
    this.createSingleTone(0.4, 150, "sine");
  }

  private createSingleTone(duration: number, oscFreq: number, oscType: OscillatorType): void {
    const currentTime = this.audioContext.currentTime;

    const oscillator = this.audioContext.createOscillator();
    oscillator.type = oscType;
    oscillator.frequency.setValueAtTime(oscFreq, currentTime);

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(this.configProvider.volume, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(currentTime + duration);
  }

  // Function to create gunfire sounds with noise and pitch drop for crack effect
  private createGunfireSound(duration: number, oscFreq: number, noiseFilterFreq: number): void {
    const currentTime = this.audioContext.currentTime;

    // Create white noise buffer for the blast
    const bufferSize = this.audioContext.sampleRate * duration;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Fill buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // Create noise source
    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Create a low-pass filter for the noise to simulate muzzle blast
    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(noiseFilterFreq, currentTime);

    // Create an oscillator for the crack of the gunfire
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = "triangle"; // Sharp, but not overly harsh
    oscillator.frequency.setValueAtTime(oscFreq, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(oscFreq / 10, currentTime + duration); // Quick pitch drop

    // Gain node for volume envelope
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(this.configProvider.volume, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    // Connect the noise source and oscillator to the gain node and then to destination
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(gainNode);
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Start sources
    noiseSource.start();
    noiseSource.stop(currentTime + duration);

    oscillator.start();
    oscillator.stop(currentTime + duration);
  }
}

export type SoundContext = {
  soundGenerator: SoundGenerator;
};

export const createSoundEngine = (configProvider: ISoundGeneratorConfigProvider): SoundContext => {
  return { soundGenerator: new SoundGenerator(configProvider) };
};
