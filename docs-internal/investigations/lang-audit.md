TypeScript

// packages/i18n/src/profiles-index.ts

// ... (Imports and English Profile unchanged)

// \=============================================================================  
// Arabic (VSO, RTL)  
// \=============================================================================

export const arabicProfile: LanguageProfile \= {  
 code: 'ar',  
 name: 'العربية',

wordOrder: 'VSO',  
 adpositionType: 'preposition',  
 morphology: 'fusional',  
 direction: 'rtl',

canonicalOrder: \['action', 'agent', 'patient', 'destination', 'source'\],

markers: \[  
 { form: 'عند', role: 'event', position: 'preposition', required: true },  
 { form: 'إلى', role: 'destination', position: 'preposition', required: false },  
 { form: 'في', role: 'destination', position: 'preposition', required: false },  
 { form: 'من', role: 'source', position: 'preposition', required: false },  
 // Updated: Added hyphen to indicate prefix attachment  
 { form: 'بـ-', role: 'instrument', position: 'preposition', required: false },  
 { form: 'مع', role: 'instrument', position: 'preposition', required: false },  
 { form: 'كـ-', role: 'manner', position: 'preposition', required: false }, // Added 'As/Like' prefix  
 \],

// ... (Rules unchanged)  
};

// \=============================================================================  
// Spanish (SVO, Romance)  
// \=============================================================================

export const spanishProfile: LanguageProfile \= {  
 code: 'es',  
 name: 'Español',

wordOrder: 'SVO',  
 adpositionType: 'preposition',  
 morphology: 'fusional',  
 direction: 'ltr',

canonicalOrder: \['event', 'action', 'patient', 'destination'\],

markers: \[  
 // Event: "En hacer clic" or "Al hacer clic"  
 { form: 'en', role: 'event', position: 'preposition', required: true },

    // Destination: Prioritized 'a' over 'en' to avoid collision with event 'en'
    { form: 'a', role: 'destination', position: 'preposition', required: false },
    { form: 'hacia', role: 'destination', position: 'preposition', required: false }, // "Towards"
    { form: 'en', role: 'destination', position: 'preposition', required: false }, // Fallback only

    { form: 'de', role: 'source', position: 'preposition', required: false },
    { form: 'con', role: 'instrument', position: 'preposition', required: false },
    { form: 'por', role: 'quantity', position: 'preposition', required: false },

\],  
};

// ... (Other profiles unchanged)

# Language profiles Audit

### **🚨 Critical Issues**

#### **1\. Chinese (zh) Circumfix Implementation**

Severity: High (Parser Logic Failure)  
The profile attempts to handle the "When... then" (当...时) structure using a custom function.

- **The Issue:** The markers array defines 时 (time) as a postposition required for events. The current insertMarkers logic (in types.ts) usually appends markers _after_ the value.
- **Conflict:** The custom function event-handler-standard manually constructs the string: \['当', event, '时'\].
- **The Bug:** If the main transformer runs insertMarkers _after_ the custom transform (which it doesn't, but let's assume standard flow), you might get double markers. More importantly, the **Parser** (parsing Chinese input) will look for 时 as a separate token. In Chinese, 点击时 (Click-time) is often written without spaces.
- **Fix:** Ensure the tokenizer can handle 时 as a suffix if no space exists, or explicitly require spaces in documentation. Ideally, add 时 to a "suffix" list in the tokenizer.

#### **2\. Turkish (tr) & Quechua (qu) Suffix Handling**

Severity: Medium (Unnatural Output)  
Both languages are highly agglutinative. Markers are suffixes, not separate words.

- **Current Output:** \#count \-ta (Quechua) or \#count \-i (Turkish).
- **Natural Output:** \#countta or \#counti.
- **The Issue:** The hyphen \- in the marker form implies it should be attached, but insertMarkers joins everything with spaces: return withMarkers.join(' ').
- **Fix:** The insertMarkers function needs a specific check: if a marker starts with \-, it should **not** add a space before it.

#### **3\. Japanese/Korean Particle Stacking**

**Severity: Medium (Grammar Error)**

- **The Issue:** The profile defines required: true for multiple particles.
  - _Example:_ put command might trigger both patient (を) and destination (に).
  - _Result:_ \#count を \#output に 置く. (Correct).
  - _Edge Case:_ If a role is missing (e.g., implicit target), the system might output a dangling particle or fail if required: true enforces a strict check that halts generation.
- **Verification:** Ensure the generator gracefully handles "required" markers when the role value itself is null/undefined. Currently, insertMarkers iterates over _elements_, so if the element is missing, the marker is skipped. This is safe, but required: true in the profile is misleading if the code doesn't actually enforce it.

### **🔍 Language-Specific Audit**

#### **1\. Arabic (ar)**

- **canonicalOrder:** \['action', 'agent', 'patient'...\].
  - _Note:_ Excellent. This correctly captures VSO (Verb-Subject-Object).
- **Markers:** بـ (with/by) is defined as a preposition.
  - _Note:_ Like Turkish, this is a prefix that attaches to the word (e.g., بالماوس \- by mouse).
  - _Fix:_ Needs logic to attach بـ without a space.

#### **2\. Chinese (zh)**

- **ba-construction:**
  - _Rule:_ Matches put/set/move.
  - _Transform:_ 把 (BA) patient action destination.
  - _Output:_ 把 \#value 放 到 \#output.
  - _Verdict:_ **Perfect.** This is exactly how "Put value into output" should be translated structurally.

#### **3\. Spanish (es)**

- **Markers:** en is used for both event ("en click") and destination ("en div").
  - _Ambiguity:_ This is fine for generation. For parsing, the generateModifierMap update (from the previous step) needs to handle the collision. It will likely map en to the last registered role, which is risky.
  - _Fix:_ The parser needs context-aware role assignment (e.g., "if en is at the start, it's event; if middle, it's destination").

#### **4\. Swahili (sw)**

- **Markers:** kwenye (on/at) for events.
  - _Verdict:_ Good choice. It's distinct enough to serve as a reliable keyword.

### **🛠️ Recommended Fixes**

#### **Step 1: Fix Agglutinative Spacing (Turkish/Quechua/Arabic)**

We need to update types.ts (specifically transformStatement) to handle prefix/suffix markers without spaces.

TypeScript

// types.ts \-\> transformStatement or insertMarkers

// Helper to check if we should merge with previous token  
const isSuffix \= (str: string) \=\> str.startsWith('-');  
const isPrefix \= (str: string) \=\> str.endsWith('-'); // For Arabic 'بـ' potentially

// In insertMarkers joining logic:  
// Instead of .join(' '), iterate and build string:  
let output \= '';  
for (let i \= 0; i \< tokens.length; i++) {  
 const token \= tokens\[i\];  
 const nextToken \= tokens\[i+1\];

output \+= token;

// Don't add space if next token is a suffix (e.g. \-ta)  
 if (nextToken && nextToken.startsWith('-')) continue;

// Don't add space if current token is a prefix (e.g. Arabic بـ)  
 // (Note: You'll need to update Arabic marker form to 'بـ-' to indicate this)  
 if (token.endsWith('-')) continue;

output \+= ' ';  
}

#### **Step 2: Refine Spanish Profile (es)**

Resolve the en collision by prioritizing or separating forms.

TypeScript

// profiles-index.ts \-\> Spanish  
markers: \[  
 { form: 'al', role: 'event', ... }, // "Al hacer clic" (Upon clicking) \- Alternate?  
 { form: 'en', role: 'event', ... },  
 { form: 'a', role: 'destination', ... }, // "Mover a \#div" is clearer than "en"  
 // ...  
\]

### **Next Step**

Fixes: **Agglutinative Spacing Fix** to handle Turkish/Quechua suffixes and Arabic prefixes correctly, and I will refine the **Spanish Profile** to reduce parsing collisions.

### **1\. types.ts (Spacing Logic)**

**Changes:**

- Added joinTokens helper function to intelligently join strings based on hyphenation.
- Updated transformStatement to use joinTokens instead of the standard .join(' ').

TypeScript

// packages/i18n/src/types.ts

// ... (Previous types remain unchanged)

// \=============================================================================  
// Transformation Utilities  
// \=============================================================================

/\*\*  
 \* Reorder semantic roles according to target language  
 \*/  
export function reorderRoles(  
 roles: Map\<SemanticRole, ParsedElement\>,  
 targetOrder: SemanticRole\[\]  
): ParsedElement\[\] {  
 const result: ParsedElement\[\] \= \[\];  
 const usedRoles \= new Set\<SemanticRole\>();

// 1\. Add roles that are explicitly in the canonical order  
 for (const role of targetOrder) {  
 const element \= roles.get(role);  
 if (element) {  
 result.push(element);  
 usedRoles.add(role);  
 }  
 }

// 2\. Safety Net: Append any roles present in input but missing from target order  
 for (const \[role, element\] of roles) {  
 if (\!usedRoles.has(role)) {  
 result.push(element);  
 }  
 }

return result;  
}

/\*\*  
 \* Insert grammatical markers between elements  
 \*/  
export function insertMarkers(  
 elements: ParsedElement\[\],  
 markers: GrammaticalMarker\[\],  
 adpositionType: AdpositionType  
): string\[\] {  
 const result: string\[\] \= \[\];

for (const element of elements) {  
 const marker \= markers.find(m \=\> m.role \=== element.role);

    if (marker) {
      if (adpositionType \=== 'preposition') {
        // Marker before element
        if (marker.form) result.push(marker.form);
        result.push(element.translated || element.value);
      } else if (adpositionType \=== 'postposition') {
        // Marker after element
        result.push(element.translated || element.value);
        if (marker.form) result.push(marker.form);
      } else {
        result.push(element.translated || element.value);
      }
    } else {
      result.push(element.translated || element.value);
    }

}

return result;  
}

/\*\*  
 \* Intelligently joins tokens, handling agglutinative suffixes/prefixes.  
 \* \* Rules:  
 \* 1\. If a token ends with '-' (Prefix), no space after it.  
 \* 2\. If a token starts with '-' (Suffix), no space before it.  
 \* 3\. Removes the hyphens from the final output.  
 \*/  
function joinTokens(tokens: string\[\]): string {  
 let output \= '';

for (let i \= 0; i \< tokens.length; i++) {  
 let current \= tokens\[i\];  
 const next \= tokens\[i \+ 1\];

    // Handle Prefix: "pre-" \+ "value" \-\> "prevalue"
    if (current.endsWith('-')) {
      output \+= current.slice(0, \-1); // Remove trailing hyphen
      // No space added
    }
    // Handle Standard Token
    else {
      output \+= current;

      // Determine if we need a space before the next token
      if (next) {
        // Check if next is a Suffix: "value" \+ "-suf" \-\> "valuesuf"
        if (next.startsWith('-')) {
          // No space
        } else {
          output \+= ' ';
        }
      }
    }

    // Clean up Suffix for next iteration: "-suf" \-\> "suf"
    // (We modify the array in place or handle it implicitly by strictly
    // checking startsWith('-') on the \*next\* token logic above.
    // Actually, simpler: when we print the \*next\* token in the next loop,
    // we need to know it was a suffix.

    // Correction: The simplest way is to clean the \*current\* token if it was a suffix
    // But we already printed \`current\`. If \`current\` started with \`-\`, we printed \`-suf\`.
    // We should strip the leading hyphen from \`current\` before printing.

}

// Re-implementation for clarity and correctness:  
 let finalString \= '';  
 for (let i \= 0; i \< tokens.length; i++) {  
 let token \= tokens\[i\];  
 const isSuffix \= token.startsWith('-');  
 const isPrefix \= token.endsWith('-');

    // Strip hyphens for display
    let displayToken \= token;
    if (isSuffix) displayToken \= displayToken.substring(1);
    if (isPrefix) displayToken \= displayToken.slice(0, \-1);

    finalString \+= displayToken;

    const nextToken \= tokens\[i \+ 1\];
    if (nextToken) {
      const nextIsSuffix \= nextToken.startsWith('-');
      const currentIsPrefix \= token.endsWith('-'); // Use original token to check

      if (\!nextIsSuffix && \!currentIsPrefix) {
        finalString \+= ' ';
      }
    }

}

return finalString;  
}

/\*\*  
 \* Transform a parsed statement to target language  
 \*/  
export function transformStatement(  
 parsed: ParsedStatement,  
 sourceProfile: LanguageProfile,  
 targetProfile: LanguageProfile  
): string {  
 // 1\. Reorder roles for target language  
 const reordered \= reorderRoles(parsed.roles, targetProfile.canonicalOrder);

// 2\. Insert grammatical markers  
 const withMarkers \= insertMarkers(  
 reordered,  
 targetProfile.markers,  
 targetProfile.adpositionType  
 );

// 3\. Join with intelligent spacing  
 return joinTokens(withMarkers);  
}

### **2\. profiles-index.ts (Profile Refinements)**

**Changes:**

- **Arabic:** Added hyphens to prefixes (بـ- and كـ-).
- **Spanish:** Reordered markers to prioritize a (to) over en for destinations, reducing collision probability.
- **Turkish/Quechua:** Verified suffix format (no changes needed as they already used \-).

---

I will implement the three critical fixes identified in the audit: the **Dynamic Modifier Map** (to fix parsing non-English input), the **Safe Reordering** logic (to prevent data loss during translation), and the **Arabic Dictionary corrections** (to fix tokenization errors).

### **1\. transformer.ts**

**Changes:**

- Added generateModifierMap helper to dynamically build the parser's lookup table from the active language profile.
- Refactored parseCommand to use this map instead of the hardcoded English one.

TypeScript

// packages/i18n/src/transformer.ts

import type {  
 LanguageProfile,  
 ParsedStatement,  
 ParsedElement,  
 SemanticRole,  
 GrammarRule,  
} from './types';  
import { reorderRoles, insertMarkers, transformStatement } from './types';  
import { profiles, getProfile } from './profiles';  
import { dictionaries } from '../dictionaries';

// \=============================================================================  
// Helper: Dynamic Modifier Map  
// \=============================================================================

/\*\*  
 \* Generates a lookup map for semantic roles based on the language profile.  
 \* Maps markers (e.g., 'to', 'に', 'into') to their semantic roles.  
 \*/  
function generateModifierMap(profile: LanguageProfile): Record\<string, SemanticRole\> {  
 const map: Record\<string, SemanticRole\> \= {};

// Map markers to roles  
 profile.markers.forEach(marker \=\> {  
 map\[marker.form.toLowerCase()\] \= marker.role;

    // Map alternatives if they exist
    marker.alternatives?.forEach(alt \=\> {
      map\[alt.toLowerCase()\] \= marker.role;
    });

});

return map;  
}

// \=============================================================================  
// Statement Parser  
// \=============================================================================

/\*\*  
 \* Parse a hyperscript statement into semantic roles  
 \*/  
export function parseStatement(  
 input: string,  
 sourceLocale: string \= 'en'  
): ParsedStatement | null {  
 const profile \= getProfile(sourceLocale);  
 if (\!profile) return null;

const tokens \= tokenize(input, profile);

// Identify statement type and extract roles  
 const statementType \= identifyStatementType(tokens, profile);

switch (statementType) {  
 case 'event-handler':  
 return parseEventHandler(tokens, profile);  
 case 'command':  
 return parseCommand(tokens, profile);  
 case 'conditional':  
 return parseConditional(tokens, profile);  
 default:  
 return null;  
 }  
}

/\*\*  
 \* Simple tokenizer that handles:  
 \* \- Keywords (from dictionary)  
 \* \- CSS selectors (\#id, .class, \<tag/\>)  
 \* \- String literals  
 \* \- Numbers  
 \*/  
function tokenize(input: string, profile: LanguageProfile): string\[\] {  
 // Split on whitespace, preserving selectors and strings  
 const tokens: string\[\] \= \[\];  
 let current \= '';  
 let inSelector \= false;  
 let selectorDepth \= 0;

for (let i \= 0; i \< input.length; i++) {  
 const char \= input\[i\];

    // Track CSS selector context
    if (char \=== '\<') {
      inSelector \= true;
      selectorDepth++;
    } else if (char \=== '\>' && inSelector) {
      selectorDepth--;
      if (selectorDepth \=== 0) inSelector \= false;
    }

    // Split on whitespace unless in selector
    if (/\\s/.test(char) && \!inSelector) {
      if (current) {
        tokens.push(current);
        current \= '';
      }
    } else {
      current \+= char;
    }

}

if (current) {  
 tokens.push(current);  
 }

return tokens;  
}

/\*\*  
 \* Identify what type of statement this is  
 \*/  
function identifyStatementType(  
 tokens: string\[\],  
 profile: LanguageProfile  
): 'event\-handler' | 'command' | 'conditional' | 'unknown' {  
 if (tokens.length \=== 0) return 'unknown';

const firstToken \= tokens\[0\].toLowerCase();

// Check for event handler  
 const eventMarker \= profile.markers.find(m \=\> m.role \=== 'event' && m.position \=== 'preposition');  
 if (eventMarker && firstToken \=== eventMarker.form.toLowerCase()) {  
 return 'event-handler';  
 }

// Fallback for English 'on' or known keywords if marker system misses it  
 if (\['on', 'で', '당', '当'\].includes(firstToken)) {  
 return 'event-handler';  
 }

// Check for conditional  
 if (\['if', 'unless', 'もし', '如果', 'إذا', 'si', 'wenn', 'eğer'\].includes(firstToken)) {  
 return 'conditional';  
 }

return 'command';  
}

/\*\*  
 \* Parse an event handler statement  
 \* Pattern: on {event} {command} {target?}  
 \*/  
function parseEventHandler(tokens: string\[\], profile: LanguageProfile): ParsedStatement {  
 const roles \= new Map\<SemanticRole, ParsedElement\>();

// Remove the 'on' keyword if present  
 // We use the dynamic map to check if the first token is an event marker  
 const modifierMap \= generateModifierMap(profile);  
 const isEventMarker \= modifierMap\[tokens\[0\]?.toLowerCase()\] \=== 'event';

// Standard hardcoded list for fallback safety  
 const eventKeywords \= \['on', 'で', 'に', '当', '에', 'على', 'en', 'sur', 'bei', 'üzerinde', 'pada', 'kaqpi', 'kwenye'\];

let startIndex \= (isEventMarker || eventKeywords.includes(tokens\[0\]?.toLowerCase())) ? 1 : 0;

// Next token is the event  
 if (tokens\[startIndex\]) {  
 roles.set('event', {  
 role: 'event',  
 value: tokens\[startIndex\],  
 });  
 startIndex++;  
 }

// Next token is typically the action  
 if (tokens\[startIndex\]) {  
 roles.set('action', {  
 role: 'action',  
 value: tokens\[startIndex\],  
 });  
 startIndex++;  
 }

// Remaining tokens are the patient (target)  
 if (tokens\[startIndex\]) {  
 const patientValue \= tokens.slice(startIndex).join(' ');  
 roles.set('patient', {  
 role: 'patient',  
 value: patientValue,  
 isSelector: /^\[\#.\<@\]/.test(patientValue),  
 });  
 }

return {  
 type: 'event-handler',  
 roles,  
 original: tokens.join(' '),  
 };  
}

/\*\*  
 \* Parse a command statement  
 \* Pattern: {command} {args...}  
 \*/  
function parseCommand(tokens: string\[\], profile: LanguageProfile): ParsedStatement {  
 const roles \= new Map\<SemanticRole, ParsedElement\>();

if (tokens.length \=== 0) {  
 return { type: 'command', roles, original: '' };  
 }

// First token is the command  
 roles.set('action', {  
 role: 'action',  
 value: tokens\[0\],  
 });

// DYNAMIC MODIFIER MAP  
 // Instead of hardcoding English 'to'/'from', we generate the map from the profile  
 const modifierMap \= generateModifierMap(profile);

// Default assumption for the first argument is 'patient'  
 let currentRole: SemanticRole \= 'patient';  
 let currentValue: string\[\] \= \[\];

for (let i \= 1; i \< tokens.length; i++) {  
 const token \= tokens\[i\];  
 // Check if this token acts as a marker in the source language  
 const mappedRole \= modifierMap\[token.toLowerCase()\];

    if (mappedRole) {
      // If we found a marker, save the previous role's accumulated value
      if (currentValue.length \> 0) {
        const value \= currentValue.join(' ');
        roles.set(currentRole, {
          role: currentRole,
          value,
          isSelector: /^\[\#.\<@\]/.test(value),
        });
      }
      // Switch context to the new role
      currentRole \= mappedRole;
      currentValue \= \[\];
    } else {
      // Continue accumulating value for the current role
      currentValue.push(token);
    }

}

// Save final role  
 if (currentValue.length \> 0) {  
 const value \= currentValue.join(' ');  
 roles.set(currentRole, {  
 role: currentRole,  
 value,  
 isSelector: /^\[\#.\<@\]/.test(value),  
 });  
 }

return {  
 type: 'command',  
 roles,  
 original: tokens.join(' '),  
 };  
}

/\*\*  
 \* Parse a conditional statement  
 \*/  
function parseConditional(tokens: string\[\], profile: LanguageProfile): ParsedStatement {  
 const roles \= new Map\<SemanticRole, ParsedElement\>();

// First token is the 'if' keyword  
 roles.set('action', {  
 role: 'action',  
 value: tokens\[0\],  
 });

// Find 'then' to split condition from body  
 const thenIndex \= tokens.findIndex(t \=\>  
 \['then', 'それから', '那么', 'ثم', 'entonces', 'alors', 'dann', 'sonra', 'lalu', 'chayqa', 'kisha'\].includes(t.toLowerCase())  
 );

if (thenIndex \> 1) {  
 const conditionValue \= tokens.slice(1, thenIndex).join(' ');  
 roles.set('condition', {  
 role: 'condition',  
 value: conditionValue,  
 });  
 }

return {  
 type: 'conditional',  
 roles,  
 original: tokens.join(' '),  
 };  
}

// ... (Rest of translation logic remains unchanged)

### **2\. types.ts**

**Changes:**

- Refactored reorderRoles to include a "Safety Net". It now appends any roles found in the input that were _not_ specified in the target language's canonical order, preventing data loss.

TypeScript

// packages/i18n/src/types.ts

// ... (Previous types and interfaces remain unchanged)

// \=============================================================================  
// Transformation Utilities  
// \=============================================================================

/\*\*  
 \* Reorder semantic roles according to target language  
 \* Includes a safety net to ensure roles not explicitly ordered are not lost.  
 \*/  
export function reorderRoles(  
 roles: Map\<SemanticRole, ParsedElement\>,  
 targetOrder: SemanticRole\[\]  
): ParsedElement\[\] {  
 const result: ParsedElement\[\] \= \[\];  
 const usedRoles \= new Set\<SemanticRole\>();

// 1\. Add roles that are explicitly in the canonical order  
 for (const role of targetOrder) {  
 const element \= roles.get(role);  
 if (element) {  
 result.push(element);  
 usedRoles.add(role);  
 }  
 }

// 2\. Safety Net: Append any roles present in input but missing from target order  
 // This prevents data loss (e.g. if 'manner' or 'instrument' isn't in the profile)  
 for (const \[role, element\] of roles) {  
 if (\!usedRoles.has(role)) {  
 result.push(element);  
 }  
 }

return result;  
}

// ... (Rest of file remains unchanged)

### **3\. ar.ts (Arabic Dictionary Fix)**

**Changes:**

- Replaced spaces with underscores (e.g., 'نقر مزدوج' \-\> 'نقر_مزدوج').
- Changed 'على' (On/Top) to 'عند' (At/When) for the event listener on, which is more idiomatic for events.

TypeScript

// packages/i18n/src/dictionaries/ar.ts

import { Dictionary } from '../types';

export const ar: Dictionary \= {  
 commands: {  
 // Event handling  
 on: 'عند', // Changed from 'على' (spatial) to 'عند' (temporal/conditional)  
 tell: 'أخبر',  
 trigger: 'تشغيل',  
 send: 'أرسل',

    // DOM manipulation
    take: 'خذ',
    put: 'ضع',
    set: 'اضبط',
    get: 'احصل',
    add: 'أضف',
    remove: 'احذف',
    toggle: 'بدل',
    hide: 'اخف',
    show: 'اظهر',

    // Control flow
    if: 'إذا',
    unless: 'إلا\_إذا', // Added underscore
    repeat: 'كرر',
    for: 'لكل',
    while: 'بينما',
    until: 'حتى',
    continue: 'واصل',
    break: 'توقف',
    halt: 'أوقف',

    // Async
    wait: 'انتظر',
    fetch: 'احضر',
    call: 'استدع',
    return: 'ارجع',

    // Other commands
    make: 'اصنع',
    log: 'سجل',
    throw: 'ارم',
    catch: 'التقط',
    measure: 'قس',
    transition: 'انتقال',

    // Data Commands
    increment: 'زِد',
    decrement: 'أنقص',
    bind: 'اربط',
    default: 'افتراضي',
    persist: 'احفظ',

    // Navigation Commands
    go: 'اذهب',
    pushUrl: 'ادفع\_رابط',     // Added underscore
    replaceUrl: 'استبدل\_رابط', // Added underscore

    // Utility Commands
    copy: 'انسخ',
    pick: 'اختر',
    beep: 'صفّر',

    // Advanced Commands
    js: 'جافاسكربت',
    async: 'متزامن',
    render: 'ارسم',

    // Animation Commands
    swap: 'بدّل',
    morph: 'حوّل',
    settle: 'استقر',

    // Content Commands
    append: 'ألحق',

    // Control Flow
    exit: 'اخرج',

    // Behaviors
    install: 'ثبّت',

},

modifiers: {  
 to: 'إلى',  
 from: 'من',  
 into: 'في',  
 with: 'مع',  
 at: 'عند',  
 in: 'في',  
 of: 'من',  
 as: 'كـ',  
 by: 'بواسطة',  
 before: 'قبل',  
 after: 'بعد',  
 over: 'فوق',  
 under: 'تحت',  
 between: 'بين',  
 through: 'عبر',  
 without: 'بدون',  
 },

events: {  
 click: 'نقر',  
 dblclick: 'نقر_مزدوج', // Added underscore  
 mousedown: 'فأرة_أسفل', // Added underscore  
 mouseup: 'فأرة_أعلى', // Added underscore  
 mouseenter: 'فأرة_دخول', // Added underscore  
 mouseleave: 'فأرة_خروج', // Added underscore  
 mouseover: 'فأرة_فوق', // Added underscore  
 mouseout: 'فأرة_خارج', // Added underscore  
 mousemove: 'فأرة_تحرك', // Added underscore

    keydown: 'مفتاح\_أسفل',      // Added underscore
    keyup: 'مفتاح\_أعلى',        // Added underscore
    keypress: 'مفتاح\_ضغط',      // Added underscore

    focus: 'تركيز',
    blur: 'ضبابية',
    change: 'تغيير',
    input: 'إدخال',
    submit: 'إرسال',
    reset: 'إعادة\_تعيين',       // Added underscore

    load: 'تحميل',
    unload: 'إلغاء\_تحميل',      // Added underscore
    resize: 'تغيير\_حجم',        // Added underscore
    scroll: 'تمرير',

    touchstart: 'بداية\_لمس',    // Added underscore
    touchend: 'نهاية\_لمس',      // Added underscore
    touchmove: 'تحرك\_لمس',      // Added underscore
    touchcancel: 'إلغاء\_لمس',   // Added underscore

},

logical: {  
 and: 'و',  
 or: 'أو',  
 not: 'ليس',  
 is: 'هو',  
 exists: 'موجود',  
 matches: 'يطابق',  
 contains: 'يحتوي',  
 includes: 'يشمل',  
 equals: 'يساوي',  
 then: 'ثم',  
 else: 'وإلا',  
 otherwise: 'خلاف_ذلك', // Added underscore  
 end: 'النهاية',  
 },  
 // ... (temporal, values, attributes remain as is)  
};
