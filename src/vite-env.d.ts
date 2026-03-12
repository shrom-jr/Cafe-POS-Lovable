/// <reference types="vite/client" />

declare global {
  interface BluetoothRemoteGATTCharacteristic {
    writeValue(value: BufferSource): Promise<void>;
    readValue(): Promise<DataView>;
  }

  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTServer {
    connect(): Promise<BluetoothRemoteGATTServer>;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
    disconnect(): void;
  }

  interface BluetoothDevice {
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
  }

  interface Bluetooth {
    requestDevice(options: {
      acceptAllDevices?: boolean;
      filters?: Array<{ services?: string[] }>;
      optionalServices?: string[];
    }): Promise<BluetoothDevice>;
  }

  interface Navigator {
    bluetooth: Bluetooth;
  }
}

export {};
