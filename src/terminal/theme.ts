type ThemeColor = ((s: string) => string) & Record<string, (s: string) => string>;

const identity = (s: string): string => s;

function makeColor(): ThemeColor {
  return new Proxy(identity as ThemeColor, {
    get(_target, _prop) {
      return identity;
    },
    apply(_target, _thisArg, args) {
      return args[0];
    },
  });
}

export const theme: Record<string, ThemeColor> = new Proxy({} as Record<string, ThemeColor>, {
  get(_target, _prop) {
    return makeColor();
  },
});

export function isRich(): boolean {
  return false;
}

// oxlint-disable-next-line typescript/no-explicit-any
export function colorize(_rich: boolean, _color: (input: string) => string, text: string): string {
  return text;
}

export const accent = identity;
