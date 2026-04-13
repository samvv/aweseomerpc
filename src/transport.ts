import stream from "node:stream"

export interface Transport {
  input: stream.Readable;
  output: stream.Writable;
  close(): Promise<void>;
}
