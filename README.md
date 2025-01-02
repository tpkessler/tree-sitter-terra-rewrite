# tree-sitter-terra-rewrite
Terra grammar for tree-sitter

## Install
Run the following to install the required packages and generates the C-parser file.
```
npm install
tree-sitter generate
```

Next, you can e.g. build a WebAssembly version of the parser, see [tree-sitter-build](https://tree-sitter.github.io/tree-sitter/cli/build.html)
```
tree-sitter build --wasm --output ./build/parser.wasm
```
Checkout the [tree-sitter documentation](https://tree-sitter.github.io/tree-sitter/index.html) for other formats