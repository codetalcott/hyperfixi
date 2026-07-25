-- Fix Turkish (TR) translations
-- Pattern: [event] da [patient] i [action]
-- With destination: [event] da [destination] e [patient] i [action]

-- toggle-class-basic: .activei tıklamade değiştir -> tıklama da .active i değiştir
UPDATE pattern_translations
SET hyperscript = 'tıklama da .active i değiştir', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'toggle-class-basic' AND language = 'tr';

-- toggle-class-on-other: .openi tıklamade değiştir sonra #menude -> tıklama da #menu de .open i değiştir
UPDATE pattern_translations
SET hyperscript = 'tıklama da #menu de .open i değiştir', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'toggle-class-on-other' AND language = 'tr';

-- add-class-basic: .highlighti tıklamade ekle bene -> tıklama da .highlight i ekle
UPDATE pattern_translations
SET hyperscript = 'tıklama da .highlight i ekle', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'add-class-basic' AND language = 'tr';

-- add-class-to-other: .selectedi tıklamade ekle #iteme -> tıklama da #item e .selected i ekle
UPDATE pattern_translations
SET hyperscript = 'tıklama da #item e .selected i ekle', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'add-class-to-other' AND language = 'tr';

-- remove-class-basic: .highlighti tıklamade kaldır benden -> tıklama da .highlight i kaldır
UPDATE pattern_translations
SET hyperscript = 'tıklama da .highlight i kaldır', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'remove-class-basic' AND language = 'tr';

-- remove-class-from-all: .activei tıklamade kaldır .itemsden -> tıklama da .items den .active i kaldır
UPDATE pattern_translations
SET hyperscript = 'tıklama da .items den .active i kaldır', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'remove-class-from-all' AND language = 'tr';

-- set-text-basic: #output.innerTexti tıklamade ayarla "Hello World"e -> tıklama da #output.innerText i "Hello World" e ayarla
UPDATE pattern_translations
SET hyperscript = 'tıklama da #output.innerText i "Hello World" e ayarla', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'set-text-basic' AND language = 'tr';

-- set-attribute: @disabledi tıklamade ayarla doğrue -> tıklama da @disabled i doğru ya ayarla
UPDATE pattern_translations
SET hyperscript = 'tıklama da @disabled i doğru ya ayarla', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'set-attribute' AND language = 'tr';


-- Fix Korean (KO) translations
-- Pattern: [event] 할 때 [patient] 를 [action]
-- With destination: [event] 할 때 [destination] 에 [patient] 를 [action]

-- toggle-class-basic: .active 를 클릭 토글 -> 클릭 할 때 .active 를 토글
UPDATE pattern_translations
SET hyperscript = '클릭 할 때 .active 를 토글', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'toggle-class-basic' AND language = 'ko';

-- toggle-class-on-other: .open 를 클릭 토글 그러면 #menu -> 클릭 할 때 #menu 에 .open 를 토글
UPDATE pattern_translations
SET hyperscript = '클릭 할 때 #menu 에 .open 를 토글', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'toggle-class-on-other' AND language = 'ko';


-- Fix Quechua (QU) translations
-- Pattern: [event] pi [patient] ta [action]
-- With destination: [event] pi [destination] man [patient] ta [action]

-- toggle-class-basic: .activeta ñitiypi tikray -> ñit'iy pi .active ta t'ikray
UPDATE pattern_translations
SET hyperscript = 'ñit''iy pi .active ta t''ikray', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'toggle-class-basic' AND language = 'qu';

-- toggle-class-on-other: .openta ñitiypi tikray chayqa #menupi -> ñit'iy pi #menu pa .open ta t'ikray
UPDATE pattern_translations
SET hyperscript = 'ñit''iy pi #menu pa .open ta t''ikray', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'toggle-class-on-other' AND language = 'qu';

-- add-class-basic: .highlightta noqaman ñitiypi yapay -> ñit'iy pi .highlight ta yapay
UPDATE pattern_translations
SET hyperscript = 'ñit''iy pi .highlight ta yapay', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'add-class-basic' AND language = 'qu';

-- add-class-to-other: .selectedta #itemman ñitiypi yapay -> ñit'iy pi #item man .selected ta yapay
UPDATE pattern_translations
SET hyperscript = 'ñit''iy pi #item man .selected ta yapay', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'add-class-to-other' AND language = 'qu';

-- remove-class-basic: .highlightta noqamanta ñitiypi qichuy -> ñit'iy pi .highlight ta qichuy
UPDATE pattern_translations
SET hyperscript = 'ñit''iy pi .highlight ta qichuy', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'remove-class-basic' AND language = 'qu';

-- remove-class-from-all: .activeta .itemsmanta ñitiypi qichuy -> ñit'iy pi .items manta .active ta qichuy
UPDATE pattern_translations
SET hyperscript = 'ñit''iy pi .items manta .active ta qichuy', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'remove-class-from-all' AND language = 'qu';




-- =============================================================================
-- Redundant directional markers after a `go` keyword that already encodes
-- direction (2.9).
--
-- The grammar transformer applies ONE destination marker per language to every
-- command — it has no per-command knowledge — so it appends zh `到` / vi `vào`
-- after a verb that already means "go TO". The result reads as a doubled
-- preposition:
--   zh  前往 到 url     "proceed-to  to  url"   (前往 = proceed toward)
--   vi  đi đến vào url  "go-to  into  url"      (đi đến = go to)
-- No other language in the corpus has this shape: every other `go` keyword is a
-- bare motion verb (es ir, it andare, th ไป, he לך) that needs its preposition.
--
-- `goSchema.renderOverride` in @lokascript/semantic renders these two bare to
-- match. Parsing still accepts the old marker (goSchema.markerLegacy), so
-- pre-2.9 source is unaffected.
-- =============================================================================

-- go-url zh: 前往 到 url "/page" -> 前往 url "/page"
UPDATE pattern_translations
SET hyperscript = '当 点击 时 前往 url "/page"', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'go-url' AND language = 'zh';

-- go-url vi: đi đến vào url "/page" -> đi đến url "/page"
UPDATE pattern_translations
SET hyperscript = 'khi nhấp đi đến url "/page"', verified_parses = 0, updated_at = datetime('now')
WHERE code_example_id = 'go-url' AND language = 'vi';
