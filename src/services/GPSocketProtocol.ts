/**
 * GPSocketProtocol.ts
 *
 * Byte-level implementation of the camera's proprietary "GPSOCKET" control
 * protocol (GeneralPlus GPCamLib SDK), reverse engineered from a packet
 * capture of the official GoPlusCam app talking to the camera on TCP 8081.
 *
 * Frame layout (all requests we send use msgType = REQUEST):
 *
 *   Offset  Size  Field
 *   0       8     ASCII magic "GPSOCKET"
 *   8       1     msgType   (0x01 = request, 0x02 = response)
 *   9       1     reserved  (always 0x00 on requests we send)
 *   10      1     context   (0x00 = session/system, 0x03 = capture/record)
 *   11      1     cmdId     (command identifier, see below)
 *   12+     n     payload   (command-specific, may be empty)
 *
 * Confirmed from the capture:
 *   - Heartbeat / keepalive : ctx=0x00 cmdId=0x01                (~every 500ms)
 *   - Capture photo         : ctx=0x03 cmdId=0x01 payload=[0x41]
 *   - Toggle video record   : ctx=0x03 cmdId=0x06 payload=[0x41]
 *
 * The camera replies to every request with an ack of the same shape:
 *   GPSOCKET 02 00 <ctx> <cmdId> 00 00      (status 0x0000 = success)
 */

import {Buffer} from 'buffer';

export const GP_MAGIC = 'GPSOCKET';
export const GP_MAGIC_BYTES = Buffer.from(GP_MAGIC, 'ascii');

export enum MsgType {
  REQUEST = 0x01,
  RESPONSE = 0x02,
}

export enum Context {
  SYSTEM = 0x00,
  CAPTURE = 0x03,
}

export enum CmdId {
  HEARTBEAT = 0x01,
  CAPTURE_PHOTO = 0x01, // same numeric id, disambiguated by context
  TOGGLE_RECORD = 0x06,
}

// The trailing byte the real app always sends with capture/record commands.
// We don't know its semantic meaning (SDK constant / camera-selector /
// confirm-flag) but it was 0x41 on every single observed call, so we
// replicate it verbatim rather than guess.
const CAPTURE_PAYLOAD = Buffer.from([0x41]);

export interface GPSocketFrame {
  msgType: number;
  reserved: number;
  context: number;
  cmdId: number;
  payload: Buffer;
}

/** Build a raw GPSOCKET request frame ready to write to the TCP socket. */
export function buildFrame(
  context: number,
  cmdId: number,
  payload: Buffer = Buffer.alloc(0),
): Buffer {
  const header = Buffer.from([MsgType.REQUEST, 0x00, context, cmdId]);
  return Buffer.concat([GP_MAGIC_BYTES, header, payload]);
}

export function buildHeartbeat(): Buffer {
  return buildFrame(Context.SYSTEM, CmdId.HEARTBEAT);
}

export function buildCapturePhoto(): Buffer {
  return buildFrame(Context.CAPTURE, CmdId.CAPTURE_PHOTO, CAPTURE_PAYLOAD);
}

export function buildToggleRecord(): Buffer {
  return buildFrame(Context.CAPTURE, CmdId.TOGGLE_RECORD, CAPTURE_PAYLOAD);
}

/**
 * Incrementally feeds raw socket bytes in and yields fully-parsed GPSOCKET
 * frames out. Handles frames arriving split across multiple TCP chunks.
 */
export class GPSocketFrameParser {
  private buffer: Buffer = Buffer.alloc(0);

  push(chunk: Buffer): GPSocketFrame[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const frames: GPSocketFrame[] = [];

    // Every observed response is short (<= ~20 bytes) and there is no
    // explicit length field in the header, so we frame on the next
    // occurrence of the magic bytes (or end of buffer for the last one).
    // This is conservative but matches all traffic seen in the capture.

    while (true) {
      const start = this.buffer.indexOf(GP_MAGIC_BYTES);
      if (start === -1 || this.buffer.length < start + 12) {
        break;
      }
      const next = this.buffer.indexOf(
        GP_MAGIC_BYTES,
        start + GP_MAGIC_BYTES.length,
      );
      const end = next === -1 ? this.buffer.length : next;
      const raw = this.buffer.subarray(start, end);

      if (raw.length < 12) {
        break;
      }

      frames.push({
        msgType: raw[8],
        reserved: raw[9],
        context: raw[10],
        cmdId: raw[11],
        payload: raw.subarray(12),
      });

      if (next === -1) {
        this.buffer = Buffer.alloc(0);
        break;
      }
      this.buffer = this.buffer.subarray(next);
    }

    return frames;
  }

  reset() {
    this.buffer = Buffer.alloc(0);
  }
}

/** True if a response frame reports success (status bytes 00 00). */
export function isSuccessResponse(frame: GPSocketFrame): boolean {
  return (
    frame.msgType === MsgType.RESPONSE &&
    frame.payload.length >= 2 &&
    frame.payload[0] === 0x00 &&
    frame.payload[1] === 0x00
  );
}
