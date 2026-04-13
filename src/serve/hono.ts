import { upgradeWebSocket } from "hono/bun";
import type { WSContext } from "hono/ws";
import type { Context } from "hono";
import * as stream from "node:stream"
import type { ServerWebSocket } from "bun";

import { RPC } from "../rpc.js"
import type { Contract, Impl } from "../types.js";
import type { Logger } from "../logger.js";
import type { Transport } from "../transport.js";

const KEY_WEBSOCKET_DATA = 'awesomerpc'

class ServerWebSocketTransport implements Transport {

  public input = new stream.Readable();
  public output: stream.Writable;

  public constructor(
    public ws: ServerWebSocket<any>,
  ) {
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

export default function honoServe<
  L extends Contract,
  R extends Contract,
  S extends object
>(impl: Impl<L, R, S>, createState: (ctx: Context, ws: WSContext) => S, logger: Logger) {

  interface Session {
    rpc: RPC<L, R, S>;
    transport: ServerWebSocketTransport;
  }

  interface ServerWebSocketData {
    [KEY_WEBSOCKET_DATA]: Session;
  }

  function getSession(ws: WSContext): Session {
    return (ws.raw as Bun.ServerWebSocket<ServerWebSocketData>).data[KEY_WEBSOCKET_DATA];
  }

  return upgradeWebSocket(ctx => {
    return {
      onOpen(_evt, ws) {
        const state = createState(ctx, ws);
        const sws = ws.raw as Bun.ServerWebSocket<ServerWebSocketData>;
        const transport = new ServerWebSocketTransport(sws);
        const rpc = new RPC(
          transport,
          impl,
          state,
          logger,
        );
        sws.data[KEY_WEBSOCKET_DATA] = { rpc, transport };
      },
      onMessage(evt, ws) {
        getSession(ws).transport.feed(evt.data.toString());
      },
      onClose(_evt, ws) {
        const data = getSession(ws);
        data.rpc.close();
        data.transport.close();
      },
    }
  });
}
