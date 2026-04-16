
import type { RPC } from "./rpc.js";
import type { ClientObj, Contract } from "./types.js";

export function createProxy<L extends Contract, R extends Contract, S>(rpc: RPC<L, R, S>): ClientObj<L, R, S> {
  // FIXME This `any` cast looks like a hack
  return new Proxy(rpc as any, {
    get(target, p, receiver) {
      if (typeof(p) === 'string') {
        if (rpc.impl.remote.hasMethod(p)) {
          return (...args: any[]) => rpc.callMethod(p, args as any);
        }
        if (rpc.impl.local.hasEvent(p)) {
          return rpc.getEvent(p);
        }
      }
      return Reflect.get(target, p, receiver);
    },
  });
}
