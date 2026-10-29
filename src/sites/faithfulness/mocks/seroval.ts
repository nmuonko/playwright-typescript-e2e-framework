/**
 * Minimal codec for the seroval wire format used by TanStack Start server functions.
 * Covers the node types these forms actually exchange: strings, numbers, booleans, arrays, plain objects.
 */

type Node =
  | { t: 0; s: number }
  | { t: 1; s: string }
  | { t: 2; s: number }
  | { t: 9; i: number; a: Node[]; o: 0 }
  | { t: 10; i: number; p: { k: string[]; v: Node[] }; o: 0 };

// seroval "constant" node values
const CONSTANT = { null: 0, undefined: 1, true: 2, false: 3 } as const;

export type Plain = string | number | boolean | null | undefined | Plain[] | { [key: string]: Plain };

export function encode(value: Plain): Node {
  let id = 0;
  const walk = (v: Plain): Node => {
    if (v === null) return { t: 2, s: CONSTANT.null };
    if (v === undefined) return { t: 2, s: CONSTANT.undefined };
    if (typeof v === 'boolean') return { t: 2, s: v ? CONSTANT.true : CONSTANT.false };
    if (typeof v === 'number') return { t: 0, s: v };
    if (typeof v === 'string') return { t: 1, s: v };
    if (Array.isArray(v)) return { t: 9, i: id++, a: v.map(walk), o: 0 };
    const node: Node = { t: 10, i: id++, p: { k: [], v: [] }, o: 0 };
    for (const [key, child] of Object.entries(v)) {
      node.p.k.push(key);
      node.p.v.push(walk(child));
    }
    return node;
  };
  return walk(value);
}

export function decode(node: unknown): Plain {
  const n = node as Partial<Node> & { t?: number };
  switch (n.t) {
    case 0:
    case 1:
      return (n as { s: string | number }).s;
    case 2: {
      const s = (n as { s: number }).s;
      return s === CONSTANT.true
        ? true
        : s === CONSTANT.false
          ? false
          : s === CONSTANT.null
            ? null
            : undefined;
    }
    case 9:
      return (n as { a: unknown[] }).a.map(decode);
    case 10: {
      const { k, v } = (n as { p: { k: string[]; v: unknown[] } }).p;
      return Object.fromEntries(k.map((key, i) => [key, decode(v[i])]));
    }
    default:
      throw new Error(`Unsupported seroval node: ${JSON.stringify(node).slice(0, 120)}`);
  }
}

/** Server-function request bodies look like {"t": <node>, "f": <flags>, "m": []}; returns the `data` argument. */
export function decodeServerFnPayload(body: string | null): Record<string, Plain> {
  if (!body) throw new Error('Server function request had no body');
  const envelope = JSON.parse(body) as { t: unknown };
  const args = decode(envelope.t) as { data?: Record<string, Plain> };
  if (!args.data) throw new Error('Server function payload has no "data" argument');
  return args.data;
}

/** Server-function responses are a bare node of shape { result, error, context }. */
export function encodeServerFnResult(result: Plain): string {
  return JSON.stringify(encode({ result, error: undefined, context: {} }));
}
