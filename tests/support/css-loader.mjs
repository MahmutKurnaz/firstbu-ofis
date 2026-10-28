// The loader hook css.mjs registers: any .css import is an empty module, and a model (.glb?url, which Vite
// turns into its address) is its own url, so a test can import modules that list the models.
export async function load(url, context, next) {
  const { pathname } = new URL(url);
  if (pathname.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
  if (pathname.endsWith('.glb')) return { format: 'module', source: `export default ${JSON.stringify(url)};`, shortCircuit: true };
  return next(url, context);
}
