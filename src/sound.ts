import { TowerType } from "./state";

export class SoundGenerator {
  private readonly audioContext: AudioContext;

  public constructor() {
    // Create an AudioContext for playing sounds
    this.audioContext = new window.AudioContext();
  }

  public playGunshot(type: TowerType): void {
    const currentTime = this.audioContext.currentTime;

    // Create a common function to play noise and oscillators
    const createGunfireSound = (
      duration: number,
      noiseFreq: number,
      oscFreq: number,
      oscType: OscillatorType,
      filterFreq: number,
      delay: number
    ) => {
      // Create white noise buffer
      const bufferSize = this.audioContext.sampleRate * duration;
      const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Fill buffer with white noise
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1; // White noise between -1 and 1
      }

      // Create noise source
      const noiseSource = this.audioContext.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Create filter for the noise
      const noiseFilter = this.audioContext.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = noiseFreq;

      // Oscillator for gun crack sound
      const oscillator = this.audioContext.createOscillator();
      oscillator.type = oscType;
      oscillator.frequency.setValueAtTime(oscFreq, currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(oscFreq / 10, currentTime + duration); // Pitch drop

      // Gain node for volume envelope
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(1, currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

      // Optional delay for reverb
      const delayNode = this.audioContext.createDelay();
      delayNode.delayTime.value = delay;

      // Connect nodes
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(gainNode);
      oscillator.connect(gainNode);
      gainNode.connect(delayNode);
      delayNode.connect(this.audioContext.destination);

      // Start sources
      noiseSource.start();
      noiseSource.stop(currentTime + duration);

      oscillator.start();
      oscillator.stop(currentTime + duration);
    };

    // Choose settings based on tower type
    switch (type) {
      case TowerType.Basic:
        createGunfireSound(0.1, 1000, 400, "square", 1500, 0.02); // Basic: moderate duration and pitch
        break;

      case TowerType.Sniper:
        createGunfireSound(0.3, 800, 200, "triangle", 500, 0.1); // Sniper: longer, deep pitch, with reverb
        break;

      case TowerType.Machinegun:
        createGunfireSound(0.05, 2000, 600, "sawtooth", 2000, 0); // Machinegun: short, sharp, high pitch
        break;

      default:
        console.error("Invalid tower type");
        break;
    }
  }
}
