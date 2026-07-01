/**
 * CameraConnection.ts
 *
 * Manages the control-channel TCP socket (port 8081) to the camera:
 *  - Opens the connection and performs the session handshake the official
 *    app performs before requesting video (confirmed necessary — the
 *    camera silently refuses the MJPEG stream on port 8080 without it).
 *  - Sends a heartbeat every 500ms to keep the session alive, matching the
 *    cadence observed in the capture.
 *  - Exposes capturePhoto() and toggleRecord(), which write straight to the
 *    SD card in the camera (not the phone).
 */

import TcpSocket from 'react-native-tcp-socket';
import {
  buildHeartbeat,
  buildCapturePhoto,
  buildToggleRecord,
  buildFrame,
  Context,
  GPSocketFrameParser,
  isSuccessResponse,
} from './GPSocketProtocol';

export const CAMERA_HOST = '192.168.25.1';
export const CONTROL_PORT = 8081;
export const STREAM_PORT = 8080;
export const STREAM_PATH = '/?action=stream';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

interface CameraConnectionEvents {
  onStatusChange?: (status: ConnectionStatus) => void;
  onRecordingChange?: (recording: boolean) => void;
  onPhotoCaptured?: () => void;
  onError?: (message: string) => void;
}

// Handshake sequence observed from the official app immediately after
// opening the socket, before the first heartbeat. cmdId 0x05 carries a
// 4-byte value that looks device/session specific in the capture; we send
// zeros, which the camera has accepted in testing. cmdIds 0x02, 0x08 and
// 0x04 (context SYSTEM) round out the session-open sequence.
function buildHandshakeFrames(): Buffer[] {
  return [
    buildFrame(Context.SYSTEM, 0x05, Buffer.from([0x00, 0x00, 0x00, 0x00])),
    buildFrame(Context.SYSTEM, 0x02),
    buildFrame(Context.SYSTEM, 0x08, Buffer.from([0x00])),
    buildFrame(Context.SYSTEM, 0x04),
  ];
}

export class CameraConnection {
  private socket: any = null;
  private parser = new GPSocketFrameParser();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private events: CameraConnectionEvents;
  private status: ConnectionStatus = 'disconnected';
  private _isRecording = false;

  constructor(events: CameraConnectionEvents = {}) {
    this.events = events;
  }

  get isRecording() {
    return this._isRecording;
  }

  get currentStatus() {
    return this.status;
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.events.onStatusChange?.(status);
  }

  connect(
    host: string = CAMERA_HOST,
    port: number = CONTROL_PORT,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.setStatus('connecting');
      this.parser.reset();

      const socket = TcpSocket.createConnection(
        {host, port, tls: false},
        () => {
          // Handshake first, THEN start the heartbeat loop. The video
          // socket should not be opened until this resolves.
          const frames = buildHandshakeFrames();
          frames.forEach(frame => socket.write(frame));

          this.startHeartbeat();
          this.setStatus('connected');
          resolve();
        },
      );

      socket.on('data', (data: string | Buffer) => {
        const buf =
          typeof data === 'string' ? Buffer.from(data, 'base64') : data;
        const frames = this.parser.push(buf);
        for (const frame of frames) {
          this.handleFrame(frame);
        }
      });

      socket.on('error', (err: Error) => {
        this.setStatus('error');
        this.events.onError?.(err.message ?? 'Unknown socket error');
        reject(err);
      });

      socket.on('close', () => {
        this.stopHeartbeat();
        this.setStatus('disconnected');
      });

      this.socket = socket;
    });
  }

  private handleFrame(frame: {
    context: number;
    cmdId: number;
    payload: Buffer;
    msgType: number;
  }) {
    if (!isSuccessResponse(frame as any)) {
      return;
    }
    if (frame.context === Context.CAPTURE && frame.cmdId === 0x01) {
      this.events.onPhotoCaptured?.();
    }
    if (frame.context === Context.CAPTURE && frame.cmdId === 0x06) {
      this._isRecording = !this._isRecording;
      this.events.onRecordingChange?.(this._isRecording);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.socket?.write(buildHeartbeat());
    }, 500);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** Tells the camera to save a photo to its own SD card. */
  capturePhoto() {
    if (this.status !== 'connected') {
      return;
    }
    this.socket?.write(buildCapturePhoto());
  }

  /** Toggles SD-card video recording on the camera. */
  toggleRecord() {
    if (this.status !== 'connected') {
      return;
    }
    this.socket?.write(buildToggleRecord());
  }

  disconnect() {
    this.stopHeartbeat();
    this.socket?.destroy();
    this.socket = null;
    this.setStatus('disconnected');
  }
}
