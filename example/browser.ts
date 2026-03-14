import { WebSocketTransport, RPC } from "awesomerpc";
import { petStoreClientImpl } from "./client.js";
import { petStoreServer } from "./contracts.js";

const transport = new WebSocketTransport(`http://localhost:8080/ws`);
transport.open();

const rpc = new RPC(transport, petStoreClientImpl, petStoreServer, {});

console.log(`Available products: ${await rpc.callMethod('getProducts', [])}`);
