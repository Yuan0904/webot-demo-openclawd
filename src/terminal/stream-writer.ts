export interface StreamWriter {
  write: (text: string) => void;
  end: () => void;
}

export interface SafeStreamWriter {
  write: (stream: NodeJS.WritableStream, text: string) => boolean;
  writeLine: (stream: NodeJS.WritableStream, text: string) => boolean;
}

export function createStreamWriter(): StreamWriter {
  return {
    write: (_text: string) => {},
    end: () => {},
  };
}

// oxlint-disable-next-line typescript/no-explicit-any
export function createSafeStreamWriter(_opts?: Record<string, any>): SafeStreamWriter {
  return {
    write: (_stream: NodeJS.WritableStream, _text: string) => true,
    writeLine: (_stream: NodeJS.WritableStream, _text: string) => true,
  };
}
