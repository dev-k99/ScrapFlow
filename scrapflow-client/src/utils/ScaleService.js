/**
 * Utility for interacting with serial scales (e.g., Avery, Mettler Toledo)
 * using the Web Serial API.
 */
export class ScaleService {
  constructor() {
    this.port = null;
    this.reader = null;
    this.keepReading = false;
  }

  async connect() {
    try {
      // 1. Request port (triggers browser prompt)
      this.port = await navigator.serial.requestPort();
      
      // 2. Open port with typical scale settings
      await this.port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' });
      
      this.keepReading = true;
      return true;
    } catch (err) {
      console.error("Scale connection failed:", err);
      return false;
    }
  }

  async readWeight(onWeightRead) {
    if (!this.port) return;

    const decoder = new TextDecoderStream();
    const inputDone = this.port.readable.pipeTo(decoder.writable);
    const inputStream = decoder.readable;
    this.reader = inputStream.getReader();

    try {
      while (this.keepReading) {
        const { value, done } = await this.reader.read();
        if (done || !this.keepReading) break;
        
        // Typical scale output might be "ST,GS,  124.5kg\r\n"
        // Parse the numeric part
        const match = value.match(/[-+]?\d*\.?\d+/);
        if (match) {
          const weight = parseFloat(match[0]);
          if (!isNaN(weight)) {
            onWeightRead(weight);
          }
        }
      }
    } catch (err) {
      console.error("Scale read error:", err);
    } finally {
      this.reader.releaseLock();
    }
  }

  async disconnect() {
    this.keepReading = false;
    if (this.reader) {
      await this.reader.cancel();
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
  }

  // Simulation mode for testing without hardware
  static simulate(onWeightRead) {
    let weight = 0;
    const interval = setInterval(() => {
      // Simulate weight climbing as truck drives onto scale
      if (weight < 12450) {
        weight += Math.random() * 500;
        onWeightRead(Math.min(weight, 12450));
      } else {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }
}
