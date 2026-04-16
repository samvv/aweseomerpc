import stream from "node:stream"
import { Subject } from "rxjs";

export interface Transport {
  input: stream.Readable;
  output: stream.Writable;
  close(): Promise<void>;
}

export abstract class TransportError extends Error {
}

export abstract class WebSocketError extends TransportError {
}

export abstract class OpenWebSocketError extends WebSocketError {
}

export class TimeoutReachedWebSocketError extends OpenWebSocketError {
  public constructor() {
    super(`Timeout limit reached while trying to connect to WebSocket`);
  }
}

export class GenericOpenWebSocketError extends OpenWebSocketError {
  public constructor() {
    super(`Failed to connect to WebSocket`)
  }
}

export class GenericWebSocketError extends WebSocketError {
  public constructor() {
    super(`WebSocket error during communication`);
  }
}

const DEFAULT_WEBSOCKET_TIMEOUT = 10000;

export class WebSocketTransport implements Transport {

  public input = new stream.Readable({ read() { } });
  public output: stream.Writable;

  public readonly errors = new Subject<Error>();

  public constructor(public ws: WebSocket) {
    this.output = new stream.Writable({
      write(chunk, encoding, callback) {
        ws.send(chunk.toString(encoding));
        callback();
      },
    });
    ws.addEventListener('message', event => {
      this.input.push(event.data.toString());
    });
    ws.addEventListener('error', this.onError);
  }

  private onError = () => {
    this.errors.next(new GenericWebSocketError());
  }

  public static open(url: string, { timeout = DEFAULT_WEBSOCKET_TIMEOUT } = {}): Promise<WebSocketTransport> {
    return new Promise((accept, reject) => {
      const ws = new WebSocket(url);
      let didOpen = false;
      const interval = setTimeout(() => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
        ws.close();
        reject(new TimeoutReachedWebSocketError());
      }, timeout);
      const onError = () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
        clearTimeout(interval);
        reject(didOpen ? new GenericWebSocketError() : new GenericOpenWebSocketError());
      }
      const onOpen = () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
        didOpen = true;
        clearTimeout(interval);
        accept(new WebSocketTransport(ws));
      }
      ws.addEventListener('error', onError);
      ws.addEventListener('open', onOpen);
    });
  }

  public close(): Promise<void> {
    return new Promise(accept => {
      if (this.ws.readyState === WebSocket.CLOSED) {
        accept();
        return;
      }
      const onClose = () => {
        this.ws.removeEventListener('close', onClose);
        this.ws.removeEventListener('error', this.onError);
        accept();
      }
      this.ws.addEventListener('close', onClose);
      this.ws.close();
    });
  }

}
