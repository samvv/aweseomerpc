import { upgradeWebSocket } from "hono/bun";
import type { WSContext } from "hono/ws";
import type { Context } from "hono";

import { RPC } from "../rpc.js"
import { ReadBuffer, type Transport } from "../transport.js";
import type { Contract, Impl } from "../types.js";
import type { Logger } from "../logger.js";
import type { ServerWebSocket } from "bun";

const KEY_WEBSOCKET_DATA = 'awesomerpc'

class ServerWebSocketTransport implements Transport {

  private readBuffer = new ReadBuffer();

  public constructor(
    public ws: ServerWebSocket<any>,
  ) {
  }

  public feed(data: string): void {
    this.readBuffer.feed(data);
  }

  public read(): Promise<string> {
    return this.readBuffer.read();
  }

  public async write(data: string): Promise<void> {
    this.ws.send(data);
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
