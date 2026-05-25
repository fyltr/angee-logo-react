// Stubs `.css` imports as empty modules. The published lib bundle
// (dist-lib/index.js) self-injects `import './style.css'` for browser
// consumers; under plain Node that side-effect import has no handler and throws
// ERR_UNKNOWN_FILE_EXTENSION. Asset scripts only use the pure render functions,
// so stubbing the stylesheet is safe. Use via:
//   node --import ./scripts/css-stub.mjs <script>
import { registerHooks } from 'node:module';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) {
      return { format: 'module', source: 'export default {};', shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
