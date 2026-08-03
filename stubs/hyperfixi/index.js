// The bare 'hyperfixi' name is a placeholder claimed by the HyperFixi project.
// It deliberately exports nothing — throwing here beats an empty export that
// would fail confusingly later.
throw new Error(
  "'hyperfixi' is a name placeholder, not the engine. Install @hyperfixi/core instead. " +
    "If you are using @hyperfixi/vite-plugin, `import 'hyperfixi'` is served by the plugin's " +
    'virtual module and this package is never loaded — seeing this error means the plugin ' +
    'is not active in your Vite config.'
);
