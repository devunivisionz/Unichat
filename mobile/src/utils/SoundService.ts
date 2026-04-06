import { Audio } from 'expo-av';

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

class SoundService {
  private sound: Audio.Sound | null = null;
  private isLoading: boolean = false;

  async init() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.warn('SoundService: Failed to set audio mode:', error);
    }
  }

  async load() {
    if (this.sound || this.isLoading) return;
    this.isLoading = true;
    try {
      await this.init();
      const { sound } = await Audio.Sound.createAsync(
        { uri: NOTIFICATION_SOUND_URL },
        { shouldPlay: false, volume: 1.0 }
      );
      this.sound = sound;
      console.log('SoundService: Notification sound loaded successfully');
    } catch (error) {
      console.warn('SoundService: Failed to load notification sound:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async playNotification() {
    console.log('SoundService: playNotification called');
    try {
      if (!this.sound) {
        await this.load();
      }
      
      if (this.sound) {
        await this.sound.setPositionAsync(0);
        await this.sound.playAsync();
      } else {
        console.warn('SoundService: Sound object not available for playback');
      }
    } catch (error) {
      console.warn('SoundService: Error playing notification sound:', error);
    }
  }

  async unload() {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }
}

export const soundService = new SoundService();
