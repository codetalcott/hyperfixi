// The bare 'lokascript' name is a placeholder claimed by the LokaScript project.
// It deliberately exports nothing — throwing here beats an empty export that
// would fail confusingly later.
throw new Error(
  "'lokascript' is a name placeholder, not the runtime. Install @hyperfixi/core (engine) and " +
    '@lokascript/semantic (multilingual parsing) instead. If you are using @hyperfixi/vite-plugin, ' +
    "`import 'lokascript'` is served by the plugin's virtual module and this package is never " +
    'loaded — seeing this error means the plugin is not active in your Vite config.'
);
