export interface ProgressLine {
  update: (msg: string) => void;
  stop: () => void;
}

export function createProgressLine(): ProgressLine {
  return {
    update: (_msg: string) => {},
    stop: () => {},
  };
}

export function clearActiveProgressLine(): void {
  // no-op
}

export function registerActiveProgressLine(_line: ProgressLine | NodeJS.WriteStream): void {
  // no-op
}

export function unregisterActiveProgressLine(_line: ProgressLine | NodeJS.WriteStream): void {
  // no-op
}
