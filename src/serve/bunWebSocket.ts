import * as stream from "node:stream"
import type { ServerWebSocket } from "bun";

import { RPC } from "../rpc.js"
import type { Contract, Impl } from "../types.js";
import type { Logger } from "../logger.js";
import type { Transport } from "../transport.js";

class ServerWebSocketTransport implements Transport {

  public input: stream.Readable;
  public output: stream.Writable;

  public constructor(
    public ws: ServerWebSocket<any>,
  ) {
    this.input = new stream.Readable({
      read(_size) {

      },
    });
    this.output = new stream.Writable({
      write(chunk, encoding, callback) {
        if (chunk instanceof Buffer) {
          chunk = chunk.toString(encoding);
        }
        ws.send(chunk);
        callback();
      },
    });
  }

  public feed(data: string): void {
    this.input.push(data);
  }

  public async close(): Promise<void> {

  }

}

export type ServeOptions<
  L extends Contract,
  R extends Contract,
  S extends object
> = {
  impl: Impl<L, R, S>;
  createState: (ws: ServerWebSocket<unknown>) => S;
  port?: number;
  logger?: Logger;
  hostname?: string;
}

type WebSocketData<
  L extends Contract,
  R extends Contract,
  S extends object
> = {
  rpc: RPC<L, R, S>;
  transport: ServerWebSocketTransport;
}

export default function honoServe<
  L extends Contract,
  R extends Contract,
  S extends object
>({
  impl,
  logger,
  hostname = 'localhost',
  port = 8080,
  createState,
}: ServeOptions<L, R, S>) {

  return Bun.serve<WebSocketData<L, R, S> | null>({
    hostname,
    port,
    fetch(req, server) {
      if (server.upgrade(req, { data: null })) {
        return; // do not return a Response
      }
      return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
      open(ws) {
        const state = createState(ws);
        const transport = new ServerWebSocketTransport(ws);
        const rpc = new RPC(
          transport,
          impl,
          state,
          logger,
        );
        ws.data = { rpc, transport };
      },
      message(ws, message) {
        ws.data!.transport.feed(message.toString());
      },
      close(ws, _code, _message) {
        ws.data!.rpc.close();
        ws.data!.transport.close();
      },
    }
  });

}
