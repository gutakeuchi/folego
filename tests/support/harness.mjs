import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

export function harness(file, modules = {}, globals = {}) {
  const slots = [],
    effects = [],
    cleanups = [];
  let cursor = 0,
    changed = false;
  const same = (a, b) =>
    a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots))
        slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        slots[i],
        (value) => {
          const next = typeof value === "function" ? value(slots[i]) : value;
          if (!Object.is(next, slots[i])) {
            slots[i] = next;
            changed = true;
          }
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      return (slots[i] ??= { current: initial });
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { fn, deps };
      return slots[i].fn;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!same(slots[i], deps)) {
        slots[i] = deps;
        effects.push(() => {
          cleanups[i]?.();
          cleanups[i] = fn();
        });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  const source = ts.transpileModule(
    fs.readFileSync(new URL("../../" + file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const context = {
    module,
    exports: module.exports,
    console,
    URL,
    crypto,
    TextEncoder,
    Error,
    JSON,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    ...globals,
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime")
        return { jsx, jsxs: jsx, Fragment: "fragment" };
      if (name in modules) return modules[name];
      if (name === "lucide-react")
        return new Proxy({}, { get: (_, key) => key });
      if (name === "./ui") return { Button: "button", Card: "section" };
      throw new Error("Unexpected import " + name);
    },
  };
  vm.runInNewContext(
    source.replaceAll("import.meta.env.BASE_URL", '"./"'),
    context,
    { filename: file },
  );
  let fn, args, result;
  function render() {
    cursor = 0;
    changed = false;
    result = fn(args);
    while (effects.length) effects.shift()();
    return result;
  }
  return {
    start(name, props) {
      fn = module.exports[name];
      args = props;
      return render();
    },
    async flush() {
      for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setImmediate(resolve));
        if (changed) render();
        else {
          await new Promise((resolve) => setImmediate(resolve));
          if (!changed) return result;
        }
      }
      throw new Error("Render did not settle");
    },
    get current() {
      return result;
    },
    close() {
      cleanups.forEach((fn) => fn?.());
    },
  };
}
export function nodes(tree) {
  return [
    tree,
    ...(tree && typeof tree === "object"
      ? Object.values(tree.props ?? {}).flatMap((v) =>
          Array.isArray(v)
            ? v.flatMap(nodes)
            : v && typeof v === "object"
              ? nodes(v)
              : [],
        )
      : []),
  ].filter((v) => v && typeof v === "object" && v.props);
}
export function text(tree) {
  if (tree == null || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  if (Array.isArray(tree)) return tree.map(text).join(" ");
  return text(tree.props?.children);
}
