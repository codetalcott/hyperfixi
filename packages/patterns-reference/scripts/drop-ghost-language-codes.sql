-- Drop ghost language codes from pattern_translations.
--
-- Background:
--   * `hebrew` rows are an older, lower-quality variant of `he` — they leave
--     the English keyword `my` untranslated, where `he` correctly renders it
--     as `שלי`. Spot-checked across the 19 differing rows; pattern is
--     consistent.
--   * `es-MX` is real Mexican Spanish data (112/114 rows substantively
--     differ from `es`), but the Spain-vs-Mexico variant split is not on
--     the current roadmap. We drop these for now and re-collect cleanly if
--     the regional dialect work comes back into scope.
--
-- After this migration:
--   - totalLanguages drops from 26 to 24 (matches the chip strip's canonical
--     set: ar, bn, de, en, es, fr, he, hi, id, it, ja, ko, ms, pl, pt, qu,
--     ru, sw, th, tl, tr, uk, vi, zh).
--   - 228 rows total deleted (114 hebrew + 114 es-MX).

DELETE FROM pattern_translations WHERE language = 'hebrew';
DELETE FROM pattern_translations WHERE language = 'es-MX';
