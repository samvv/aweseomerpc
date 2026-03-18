import { Hono } from "hono";
import { websocket } from "hono/bun";
import serve from "awesomerpc/lib/serve/hono.js"
import { initClientState, serverImpl } from "./server/impl.js";
import pino from "pino";

const app = new Hono();

const logger = pino({
  level: process.env.AWESOMERPC_LOG_LEVEL || 'info',
}, process.stderr);

app.get('/ws', serve(serverImpl, initClientState, logger));

export default {
  fetch: app.fetch,
  websocket,
}

export type App = typeof app;
