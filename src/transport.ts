import { firstValueFrom, Subject, Subscription } from "rxjs";

export abstract class TransportError extends Error {

}

export interface Transport {
  write(data: string): Promise<void>;
  read(): Promise<string>;
  close(): Promise<void>;
  readonly errors: Subject<Error>;
}

export class ReadBuffer {

  private buffer: string[] = [];
  private fillEvents = new Subject<void>();

  private async waitForData() {
    if (this.buffer.length > 0) {
      return;
    }
    return firstValueFrom(this.fillEvents);
  }

  public feed(data: string) {
    this.buffer.push(data);
    this.fillEvents.next();
  }

  public async read(): Promise<string> {
    await this.waitForData();
    return this.buffer.shift()!;
  }

}
export class DummyTransport implements Transport {

  private readBuffer = new ReadBuffer();
  private inputSub: Subscription;

  public readonly errors = new Subject<Error>();

  public constructor(
    public input: Subject<string>,
    public output: Subject<string>,
  ) {
    this.inputSub = input.subscribe(data => {
      this.readBuffer.feed(data);
    });
  }

  public async read(): Promise<string> {
    return this.readBuffer.read();
  }

  public async write(data: string): Promise<void> {
    this.output.next(data);
  }

  public async close() {
    this.inputSub.unsubscribe();
  }

}

export function createDuplex(): [Transport, Transport] {
  const left = new Subject<string>();
  const right = new Subject<string>();
  return [
    new DummyTransport(left, right),
    new DummyTransport(right, left),
  ];
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

  private readBuffer = new ReadBuffer();

  public readonly errors = new Subject<Error>();

  public constructor(public ws: WebSocket) {
    ws.addEventListener('message', event => {
      this.readBuffer.feed(event.data.toString());
    });
    ws.addEventListener('error', this.onError);
  }

  private onError = () => {
    this.errors.next(new GenericWebSocketError());
  }

  public read(): Promise<string> {
    return this.readBuffer.read();
  }

  public static open(url: string, { timeout = DEFAULT_WEBSOCKET_TIMEOUT } = {}): Promise<void> {
    return new Promise((accept, reject) => {
      const ws = new WebSocket(url);
      let didOpen = false;
      const interval = setTimeout(() => {
        ws.close();
        reject(new TimeoutReachedWebSocketError());
      }, timeout);
      const onError = () => {
        clearTimeout(interval);
        reject(didOpen ? new GenericWebSocketError() : new GenericOpenWebSocketError());
      }
      const onOpen = () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
        didOpen = true;
        clearTimeout(interval);
        accept();
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

  public async write(data: string): Promise<void> {
    this.ws!.send(data);
  }

}

