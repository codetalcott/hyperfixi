# **Technical Audit of Natural Language Parsing Logic: Arabic, Turkish, and Brazilian Portuguese**

## **Executive Summary**

The following report constitutes a comprehensive linguistic and technical audit of the NATIVE_REVIEW_NEEDED.md technical document, specifically addressing the proposed logic for parsing natural language lists, dates, and times in Arabic (Modern Standard), Turkish, and Brazilian Portuguese. As the Senior Computational Linguist and Localization Engineer tasked with this review, I have evaluated the proposed "Verified Patterns" and "Needs Review" items against a rigorous framework of grammatical theory, modern orthographic conventions, and computational standards such as the Common Locale Data Repository (CLDR).

The analysis reveals that while the foundational logic of the proposed patterns is often sound in an Anglocentric context, it frequently fails to account for the morphological density of the target languages. Specifically, the Arabic parsing logic relies on tokenization assumptions that contradict standard orthography; the Turkish logic underestimates the computational complexity of vowel harmony and the syntactic role of converbs; and the Portuguese date logic requires a stricter adherence to prepositional contractions and capitalization standards that differ significantly from English.

This document details these findings, offering confirmed verdicts, corrected logic, and extensive linguistic rationales for every item flagged for review.

## ---

**1\. Arabic Analysis: The Morpho-Syntactic Landscape of Coordination**

Arabic, specifically Modern Standard Arabic (MSA), presents a unique set of challenges for computational parsing due to its derivational morphology and the orthographic treatment of clitics. The "Needs Review" items regarding conjunctions and list separators touch upon fundamental aspects of Arabic syntax that cannot be resolved with simple whitespace-delimited regex patterns.

### **1.1 The Disjunctive Dichotomy: Analysis of Aw (أو) and Am (أم)**

**Verdict: Nuanced**

The initial query posits a need to distinguish between aw (أو) and am (أم), both of which translate to the English conjunction "or." From a computational perspective, treating these as interchangeable synonyms for a boolean OR operator is a critical error in natural language understanding (NLU) systems. The distinction is not merely stylistic but strictly grammatical, governed by the semantic nature of the clause—specifically, the dichotomy between **declarative coordination** and **interrogative specification**.

#### **1.1.1 Aw (أو): The General Disjunctive**

The particle aw acts as the primary coordinating conjunction for disjunction in declarative sentences and general imperatives. It functionally maps to the inclusive OR logic found in most programming languages. When a speaker presents a choice where the options are open, or when expressing doubt (_shakk_), ambiguity (_ibham_), or permission (_ibaha_), aw is the required particle.1

In the context of a list parser (e.g., parsing a user's input of "Monday, Tuesday, or Wednesday"), aw is the anticipated delimiter. It connects nouns, verbs, and phrases without implying that the options are mutually exclusive or exhaustive in the way am does in questions. For example, in the sentence "I want orange or lemon juice" (_uridu 'asira burtuqal aw laymun_), the use of aw indicates a simple preference or availability.1 It functions to link meaningful ideas in a linear, additive fashion, distinct from the logical exclusive disjunction.

#### **1.1.2 Am (أم): The Interrogative Specification**

The particle am, often referred to as the "connected am" (_am al-muttasila_), operates exclusively within **interrogative contexts** asking for specification (_ta'yin_) or in "equalization" contexts (_taswiyah_). Its usage is syntactically constrained: it typically follows the interrogative particle a- (the Hamza) rather than the particle hal.1

This distinction is critical for dialogue systems. If the system is parsing a user's question, such as "Do you want to eat or sleep?", the grammar changes based on the particle used. If the question starts with the Hamza (a-), it demands am for the coordination of the second option: _A-turidu an takula **am** turidu an tanam?_.1 Here, am essentially forces a selection between two defined entities; it transforms the logic from a Yes/No question into a selector function. Conversely, using aw in a question typically retains the Yes/No nature of the query (e.g., "Do you want \[either\] X or Y?"), whereas am asks "Which of these two is it?".2

#### **1.1.3 Implications for Parsing Logic**

The file NATIVE_REVIEW_NEEDED.md must reflect that a static pattern matching "or" cannot simply look for aw OR am. It must be context-aware.

| Context                       | Recommended Particle | Parsing Expectation             |
| :---------------------------- | :------------------- | :------------------------------ |
| **Declarative List**          | aw (أو)              | Default for "A, B, or C" logic. |
| **Imperative**                | aw (أو)              | "Select A or B."                |
| **Interrogative (Selection)** | am (أم)              | Only if preceded by a- (Hamza). |
| **Interrogative (Yes/No)**    | aw (أو)              | Used with hal (هل).             |

For the specific task of parsing natural language lists in technical documentation or standard inputs, **aw is the Verified Pattern**. Am should be reserved for modules processing interrogative dialogue.

### **1.2 The "Wa" (و) Prefix: Orthography and Tokenization**

**Verdict: Incorrect**

The proposed regex pattern (?\<\!\\d)+ \\u0648 \+(?\!(?=\\d)+ assumes that the conjunction wa (and) is a standalone token surrounded by whitespace (i.e., space \+ wa \+ space). This assumption is linguistically invalid for Standard Arabic and represents a "anglicization" of Arabic morphology.

#### **1.2.1 The Proclitic Nature of Wa**

In Arabic orthography, wa is a **proclitic**—a morpheme that is phonologically dependent on the following word and is written attached to it.4 It does not stand alone. The correct written form for "A and B" is A wa-B (written as A waB), not A wa B.

- **Correct:** _wa-kitab_ (وكتاب) – The wa connects directly to kitab.
- **Incorrect:** _wa kitab_ (و كتاب) – A space separates the conjunction from the noun.

This attachment rule applies to almost all single-letter conjunctions and prepositions in Arabic, including bi-, li-, fa-, and ka-.6 By enforcing a space in the regex (\\u0648), the proposed pattern will fail to match the vast majority of "and" instances in correctly typed Modern Standard Arabic text.

#### **1.2.2 Modern Digital Variations and "Noise"**

Research into digital typing habits indicates a small but persistent deviation in user-generated content, particularly in Egyptian colloquial typing, where users may insert a space after wa due to mobile autocorrect features or a lack of strict adherence to orthographic standards.5 However, this is considered a spelling error or a colloquialism, not a standard variation. A parser designed for "Verified Patterns" must prioritize the standard form.

Furthermore, sophisticated NLP tokenizers for Arabic 38 explicitly include a segmentation step to separate these proclitics from the stem. They do not rely on whitespace. For instance, the tokenization algorithm described in 38 groups tokens specifically to handle the "non-joiner" nature of certain characters, but wa is strictly handled as a prefix to be stripped or analyzed, not as a separate word delimited by spaces.

#### **1.2.3 Corrected Regex Logic**

To accurately parse "and" in an Arabic list, the logic must identify wa as a prefix. This is computationally expensive because wa is also a common root letter (e.g., _walad_ \- boy, _wasala_ \- arrived). A naive regex \\s+wa might inadvertently slice off the first letter of a word starting with w.

However, within the constraints of a regex-based list parser (where we assume the structure A, B, and C), the most reliable pattern is to look for wa preceded by a whitespace (or punctuation) and _immediately followed_ by a non-whitespace character.

- **Proposed Logic:** (?\<=\\s|^|\\p{P})\\u0648(?=\\p{L})
  - (?\<=\\s|^|\\p{P}): Lookbehind ensures the wa is at the start of a new token (preceded by space, start of string, or punctuation).
  - \\u0648: Matches the Arabic letter Waw.
  - (?=\\p{L}): Lookahead ensures it is followed immediately by a letter (no space).

### **1.3 The Oxford Comma and Polysyndetic Coordination**

**Verdict: Oxford Comma \= No / Polysyndeton \= Yes**

The query regarding the existence of an "Oxford comma" in Arabic reveals a fundamental difference in rhetorical structure between English and Arabic.

#### **1.3.1 Polysyndeton vs. Asyndeton**

English standard lists are **asyndetic** (no conjunctions) for the initial items and **syndetic** (conjunction present) only for the final item: "A, B, and C." The Oxford comma is the punctuation mark placed before that final conjunction.

Arabic, by contrast, favors **polysyndetic coordination** in its classical and standard forms. This means the conjunction wa is repeated between _every_ item in the list: "A and B and C" (_A wa-B wa-C_).1

- **Example:** "Books, parcels, and papers" is translated as _kutubun wa-turudun wa-awraqun_ (literally: "Books and parcels and papers").8
- **Rhetorical Function:** This repetition serves a rhythmic and emphatic function, treating each item as an equal, distinct entity. It avoids the ambiguity that the Oxford comma seeks to resolve in English because the conjunction explicitly separates every item.10

#### **1.3.2 The Role of the Comma (،)**

While modern Arabic punctuation has adopted the comma (_fasla_) from European languages 11, it is primarily used to separate clauses or long phrases, not necessarily simple list items. In a list of short nouns, the repetition of wa remains the dominant separator. When commas are used in modern media (often due to English influence), they may appear as A، B، wa-C. However, there is no grammatical rule enforcing a comma before the final wa equivalent to the Oxford comma rule. In fact, using a comma _and_ wa together is often considered redundant in traditional grammar, though acceptable in modern typography.12

#### **1.3.3 Parsing Implications**

The list parsing logic for Arabic cannot rely on the English pattern comma \+ space \+ final_conjunction. It must be flexible enough to handle:

1. **Polysyndetic:** A wa-B wa-C (Most common/Standard).
2. **Modern Mixed:** A، B، wa-C (Common in media/translations).

The parser should treat the sequence \\s+wa (space \+ wa-prefix) as the primary delimiter for list items, essentially ignoring the comma if wa is present between every item.

## ---

**2\. Turkish Analysis: Agglutination and Vowel Harmony**

Turkish acts as a paradigmatic agglutinative language. Parsing it requires a shift from word-based logic to morpheme-based logic. The "Needs Review" items highlight the difficulty of mapping English "list separators" to Turkish suffixes.

### **2.1 Suffixes vs. Conjunctions: \-ip, \-erek, \-meden**

**Verdict: Confirmed (Critical for Parsing)**

The document correctly identifies that Turkish often uses suffixes to link ideas where English would use conjunctions. However, distinguishing between _coordination_ (lists) and _subordination_ (adverbials) is vital for accurate extraction.

#### **2.1.1 The \-ip Suffix: The Serial Connector**

The suffix \-ip (and its harmonic variants \-ıp/-up/-üp) is the true functional equivalent of "and" in sequential verb lists. It allows for the "suspension of affixation," a feature where the tense, person, and number suffixes are omitted from all but the last verb in a series.14

- **Mechanism:** In a list of actions like "He came, sat, and talked," Turkish might say _Gelip, oturup, konuştu._
  - _Gel_ (Come) \+ _ip_ (and)
  - _Otur_ (Sit) \+ _up_ (and)
  - _Konuş_ (Talk) \+ _tu_ (Past tense 3sg).
- **Parsing Logic:** The parser must treat \-ip as a coordinate conjunction for verbs. Crucially, it must infer the metadata (tense/person) of the \-ip marked verbs from the final verb in the chain. If the document logic parses these as "infinitives" or "stems," it will lose the temporal information. The \-ip suffix effectively says "Hold the state; look to the end of the chain for context."

#### **2.1.2 \-erek vs. \-meden: Subordination, Not Coordination**

While \-ip links sequential events (A then B), \-erek (and \-arak) creates an adverbial bond (B _by_ A). It answers "How?" rather than "What next?".17

- _Koşarak geldi_ ("He came running" / "He came by running").
- **Verdict:** This is not a list separator. It is a modifier.

Similarly, \-meden (and \-madan) implies "Without" or "Before".14 It establishes a negative or temporal condition (_Bakmadan geçti_ \- "He passed without looking"). It should be excluded from any logic designed to parse additive lists (A, B, and C).

### **2.2 Clause Chaining: \-se/-sa and \-ince**

**Verdict: Subordination**

The query asks if \-se (conditional) and \-ince (temporal) act as list separators.

- **\-ince (When/Upon):** This suffix creates a temporal subordinate clause. _Eve gidince..._ ("When I go home..."). While one could list temporal conditions (_gidince, görünce..._ \- "when I go, when I see..."), these are stacked dependent clauses, not a coordinate list of entities.18
- **\-se/-sa (If):** This marks the protasis of a conditional sentence. _Gelirse..._ ("If he comes..."). Like \-ince, it creates dependency.20

**Parsing Recommendation:** These should be treated as **sentence boundaries** or **clause delimiters** in complex sentence parsing, but they do not function as the "comma" or "and" in a standard item list.

### **2.3 The \-ken Suffix: Temporal Adverbials**

**Verdict: Nuanced (Temporal Conjunction)**

The suffix \-ken (while) is unique because it is one of the few Turkish suffixes that is generally invariant (it does not follow A-Type vowel harmony, though it accepts a buffer y after vowels: \-(y)ken).18

- **Function:** It establishes a background temporal state. _Yürürken_ ("While walking").
- **List Logic:** In a list of events, a segment ending in \-ken sets the timeline context. It is not an item _in_ the list but the _container_ for the list's timeline. For example, "While I was walking (Yürürken), I saw A, B, and C." The \-ken suffix marks the end of the introductory temporal clause.
- **Implementation:** The parser should recognize \\w+(y?)ken\\b as a delimiter separating the _context_ from the _content_.

### **2.4 Vowel Harmony and Regex Verification**

**Verdict: Insufficient (Static Patterns Fail)**

The most critical finding for Turkish is that static regex patterns (e.g., matching the literal string "ip" or "ile") are mathematically guaranteed to fail in an agglutinative system governed by vowel harmony.

#### **2.4.1 The Mechanism of Harmony**

Turkish suffixes mutate to match the last vowel of the root word to ensure ease of pronunciation.

1. **2-Way Harmony (A/E):** Suffixes take either a or e. (e.g., Plural \-lar/-ler).
2. **4-Way Harmony (I/İ/U/Ü):** Suffixes take ı, i, u, or ü. (e.g., \-ip).

#### **2.4.2 Regex Failures and Corrections**

The file's patterns must be updated to dynamic character classes.

| Concept                 | Static (Incorrect) | Logic                     | Correct Regex Pattern |
| :---------------------- | :----------------- | :------------------------ | :-------------------- |
| **"With/And" (Suffix)** | la, le             | 2-Way Harmony \+ Buffer y | \`(y)?(la             |
| **"And" (Sequential)**  | ip                 | 4-Way Harmony             | \`(ıp                 |
| **"With" (Word)**       | ile                | Invariant Word            | \\sile\\s             |
| **"And" (Word)**        | ve                 | Invariant Word            | \\sve\\s              |

**Deep Insight:** The postposition ile ("with," often functioning as "and") provides a perfect example of this complexity. It can stand alone as the word ile (invariant). However, it more frequently cliticizes to the preceding noun. When it does, it undergoes:

1. **Vowel Loss:** The initial i drops.
2. **Buffer Insertion:** If the noun ends in a vowel, a buffer y is inserted.
3. **Harmony:** The vowel becomes a or e.

- _Masa_ (Table) \+ _ile_ \-\> _Masa-y-la_ (Back vowel a triggers a).
- _Kedi_ (Cat) \+ _ile_ \-\> _Kedi-y-le_ (Front vowel i triggers e).
- _El_ (Hand) \+ _ile_ \-\> _El-le_ (Consonant ending, no buffer).

A parser looking only for ve or ile will miss _Masayla_ and _Kediyle_, effectively failing to parse the "and" in naturally occurring Turkish text.22

## ---

**3\. Portuguese (Brazilian) Analysis: Romance Standards**

Brazilian Portuguese (pt-BR) requires precise handling of prepositions and capitalization. The "Needs Review" items identify confusion between similar-looking words (às vs as) and English vs. Portuguese capitalization rules.

### **3.1 Date & Time Prepositions**

#### **3.1.1 Time: The Mandatory Crasis (Às)**

**Verdict: Confirmed**

The distinction between as and às is the phenomenon of **Crasis** (_Crase_), the contraction of the preposition a (to/at) with the definite article a/as (the).

- **Grammar:** a (preposition) \+ as (article, plural fem) \= às.
- **Usage:** Specifying clock time always requires the preposition "at." Since "hours" (_horas_) is feminine plural, the contraction às is mandatory.24
  - _Correct:_ _A reunião é **às** 14h._ (The meeting is at 14h).
  - _Incorrect:_ _A reunião é **as** 14h._ (This would mean "The meeting is the 14h," which is ungrammatical).
- **Singular Exception:** For 1:00, the noun "hora" is singular. The contraction is a \+ a \= à.
  - _Example:_ **\*À** uma hora.\*
- **Parsing Logic:** A time parser must treat the grave accent as a required feature. as (no accent) is a standard article and should not trigger the time-parsing logic.

#### **3.1.2 Date: Prepositional Contraction (Em vs No)**

**Verdict: Nuanced**

The usage of "on" for dates involves the preposition em (in/on).

- **Em:** Used with bare months or years. _Em janeiro_ (In January).
- **No (Em \+ o):** Used when the date is specific. In Portuguese, the word for "day" (_dia_) is masculine. Therefore, saying "On the 20th" implies "On the \[day\] 20th." The contraction of em \+ o (the masculine article for _dia_) yields **no**.26
  - _Full Form:_ **\*No** dia 20 de maio.\*
  - _Short Form:_ **\*No** dia 20\.\*
  - _Colloquial:_ Sometimes users drop _dia_ but keep the contraction: _Vou lá **no** 20\._

**Structural Insight:** Unlike English, which uses "of" only occasionally ("4th of July"), Portuguese dates _always_ use the preposition de to link the day, month, and year.

- **Pattern:** d **de** MMMM **de** yyyy.
- _Example:_ _25 de dezembro de 2023\._
- Any parser looking for 25 dezembro (no de) will fail on standard Brazilian text.

### **3.2 Capitalization of Months and Days**

**Verdict: Lowercase (Mandatory)**

**Query:** Confirm CLDR standard for Brazilian Portuguese capitalization.

In a sharp divergence from English orthography, standard Portuguese (both European and Brazilian) treats the names of months and days of the week as **common nouns**. They are **not capitalized** unless they appear at the start of a sentence or in a specific proper noun (like a street name "Rua 13 de Maio").29

- **English:** January, Monday.
- **Portuguese:** _janeiro_, _segunda-feira_.

**CLDR Validation:** The Common Locale Data Repository (CLDR) patterns for pt_BR explicitly use the format d 'de' MMMM, which generates lowercase month names (e.g., _2 de setembro_).32 Java and Python libraries implementing SimpleDateFormat or locale using CLDR data will output lowercase months by default.

**Parsing Implication:** A Named Entity Recognizer (NER) trained on English data often uses Capitalization as a primary feature for detecting temporal entities. This feature will fail for Portuguese. The parser must accept lowercase strings (_janeiro_, _fevereiro_) as valid temporal entities.

## ---

**4\. General Logic: Unified List Strategies**

The request asks for the standard "conjunction logic" for lists of 3+ items (A, B, C) across the three languages. This highlights the "Oxford Comma" debate in a multilingual context.

| Feature          | Arabic       | Turkish             | Portuguese (Brazilian) |
| :--------------- | :----------- | :------------------ | :--------------------- |
| **Structure**    | Polysyndetic | Syndetic (Standard) | Syndetic (Standard)    |
| **Pattern**      | A wa-B wa-C  | A, B ve C           | A, B e C               |
| **Oxford Comma** | **No**       | **No** (Strict TDK) | **No** (Strict ABNT)   |
| **Delimiter**    | wa (prefix)  | , (comma) / ve      | , (comma) / e          |

### **4.1 Comparative Analysis**

1. **Arabic:** As established, the Oxford comma is foreign to the rhetorical structure of Arabic, which prefers explicitly linking every item with wa. A parser enforcing A, B, and C logic on Arabic will likely fail to separate the items correctly because the commas may not be present at all.
2. **Turkish:** The Turkish Language Association (TDK) is prescriptive. It dictates that commas are used to separate similar items, but the conjunction ve (or the suffix \-ip) replaces the comma for the final item. Using a comma _before_ ve (A, B, ve C) is widely considered a punctuation error in standard grammar 34, though it may appear in anglicized translations.
3. **Portuguese:** Similar to Turkish, the standard grammar prohibits a comma before the conjunction e in a simple enumeration of items sharing the same subject. A comma before e is only grammatically valid if the subject changes (e.g., "A did X, and B did Y") or for emphatic repetition (polysyndeton).36 For a simple list of items, A, B e C is the only valid pattern.

## ---

**5\. Conclusion and Recommendations**

The linguistic audit of the NATIVE_REVIEW_NEEDED.md file demonstrates that applying a "one-size-fits-all" regex strategy to Arabic, Turkish, and Brazilian Portuguese will result in significant parsing errors. The following technical adjustments are recommended:

1. **For Arabic:** Abandon whitespace-delimited patterns for the conjunction "and." Implement a pattern that detects wa as a proclitic prefix (\\b\\u0648(?=\\w)). Adopt polysyndetic logic (A wa-B wa-C) as the default list structure.
2. **For Turkish:** Replace static suffix matching with dynamic regexes that account for 2-way and 4-way vowel harmony. Recognize \-ip not just as "and" but as a dependency marker that inherits tense from the subsequent verb. Explicitly handle the ile postposition in both its standalone and cliticized forms (-(y)la/-(y)le).
3. **For Portuguese:** Enforce strict validation of the às contraction for time parsing to avoid confusion with the definite article. Relax capitalization constraints for months and days to align with CLDR and orthographic standards (lowercase). Ensure date parsing logic accounts for the mandatory preposition de between components.

By integrating these nuanced linguistic rules, the parsing logic will transition from a brittle, anglocentric approximation to a robust, native-compliant system capable of handling the messy reality of natural language.

#### **Works cited**

1. Conjunctions in Arabic \- Adros Verse Education, accessed December 15, 2025, [https://www.adrosverse.com/modern-standard-arabic-4-6-conjunctions/](https://www.adrosverse.com/modern-standard-arabic-4-6-conjunctions/)
2. العَطْف (Conjunctions) \- Ultimate Arabic, accessed December 15, 2025, [https://ultimatearabic.com/conjunctions/](https://ultimatearabic.com/conjunctions/)
3. Conjunctions In Arabic Full Guide With Examples And Worksheets \- KALIMAH Center, accessed December 15, 2025, [https://kalimah-center.com/conjunctions-in-arabic/](https://kalimah-center.com/conjunctions-in-arabic/)
4. Arabic tagset \- Lancaster University, accessed December 15, 2025, [https://www.lancaster.ac.uk/staff/hardiea/arabic-annotation-guide.pdf](https://www.lancaster.ac.uk/staff/hardiea/arabic-annotation-guide.pdf)
5. Egyptian Arabic Orthography \- Lingualism.com \-, accessed December 15, 2025, [https://resources.lingualism.com/egyptian-arabic/egyptian-arabic-orthography/](https://resources.lingualism.com/egyptian-arabic/egyptian-arabic-orthography/)
6. TRANSCRIPTION RULES, accessed December 15, 2025, [https://www.su.se/download/18.7b9fb02419936f864888e97/1758027342250/Formalia:%20Att%20transkribera%20arabiska%20texter%20(Eng)3.Att%20transkribera.pdf](<https://www.su.se/download/18.7b9fb02419936f864888e97/1758027342250/Formalia:%20Att%20transkribera%20arabiska%20texter%20(Eng)3.Att%20transkribera.pdf>)
7. Common Arabic Prefixes and Suffixes \- Arabic Blog \- eArabiclearning, accessed December 15, 2025, [https://earabiclearning.com/blog/2024/09/common-arabic-prefixes-and-suffixes/](https://earabiclearning.com/blog/2024/09/common-arabic-prefixes-and-suffixes/)
8. و \- Wiktionary, the free dictionary, accessed December 15, 2025, [https://en.wiktionary.org/wiki/%D9%88](https://en.wiktionary.org/wiki/%D9%88)
9. Chapter 3 Style of the Oration in \- Brill, accessed December 15, 2025, [https://brill.com/view/book/9789004395800/BP000004.xml](https://brill.com/view/book/9789004395800/BP000004.xml)
10. The pervasiveness of coordination in Arabic, with reference to Arabic\>English translation, accessed December 15, 2025, [https://www.researchgate.net/publication/312776414_The_pervasiveness_of_coordination_in_Arabic_with_reference_to_ArabicEnglish_translation](https://www.researchgate.net/publication/312776414_The_pervasiveness_of_coordination_in_Arabic_with_reference_to_ArabicEnglish_translation)
11. «AGON» (ISSN 2384-9045), n. 42, luglio-settembre 2024 5 Marianna Massa THE INFLUENCE OF EUROPEAN PUNCTUATION ON MODERN STANDA, accessed December 15, 2025, [https://portale.unime.it/agon/files/2024/10/4201.pdf](https://portale.unime.it/agon/files/2024/10/4201.pdf)
12. Punctuation \- Wikipedia, accessed December 15, 2025, [https://en.wikipedia.org/wiki/Punctuation](https://en.wikipedia.org/wiki/Punctuation)
13. Arabic | ell432 \- WordPress.com, accessed December 15, 2025, [https://ell432.wordpress.com/2014/02/27/arabic/](https://ell432.wordpress.com/2014/02/27/arabic/)
14. Could somebody please explain why "-meden önce" is used instead of "-mekten önce"? : r/turkishlearning \- Reddit, accessed December 15, 2025, [https://www.reddit.com/r/turkishlearning/comments/ne3rqc/could_somebody_please_explain_why_meden\_%C3%B6nce_is/](https://www.reddit.com/r/turkishlearning/comments/ne3rqc/could_somebody_please_explain_why_meden_%C3%B6nce_is/)
15. Mastering Sequential Actions in Turkish: \-ıp, \-ip, \-up, \-üp \- TurkishFluent | Blog, accessed December 15, 2025, [https://turkishfluent.com/blog/sequential-actions-turkish/](https://turkishfluent.com/blog/sequential-actions-turkish/)
16. Inflectional morphology in {Turkish VP} coordination \- HPSG Proceedings, accessed December 15, 2025, [https://proceedings.hpsg.xyz/article/view/716/916](https://proceedings.hpsg.xyz/article/view/716/916)
17. Help with the exercise : r/turkishlearning \- Reddit, accessed December 15, 2025, [https://www.reddit.com/r/turkishlearning/comments/yhjm7i/help_with_the_exercise/](https://www.reddit.com/r/turkishlearning/comments/yhjm7i/help_with_the_exercise/)
18. Turkish/Converbs \- Wikibooks, open books for an open world, accessed December 15, 2025, [https://en.wikibooks.org/wiki/Turkish/Converbs](https://en.wikibooks.org/wiki/Turkish/Converbs)
19. Nicolas Le Roux \- TurkishFluent, accessed December 15, 2025, [https://turkishfluent.com/blog/author/nicolas-leroux/page/4/](https://turkishfluent.com/blog/author/nicolas-leroux/page/4/)
20. Turkish/Conjunctions \- Wikibooks, open books for an open world, accessed December 15, 2025, [https://en.wikibooks.org/wiki/Turkish/Conjunctions](https://en.wikibooks.org/wiki/Turkish/Conjunctions)
21. How to Use “-ken” in Turkish?-GC2, accessed December 15, 2025, [https://learnturkishfast.com/courses/master-turkish-grammar-learn-turkish-for-free/lessons/how-to-use-ken-in-turkish/](https://learnturkishfast.com/courses/master-turkish-grammar-learn-turkish-for-free/lessons/how-to-use-ken-in-turkish/)
22. A Syntactically Expressive Morphological Analyzer for Turkish \- ResearchGate, accessed December 15, 2025, [https://www.researchgate.net/publication/338060256_A_Syntactically_Expressive_Morphological_Analyzer_for_Turkish](https://www.researchgate.net/publication/338060256_A_Syntactically_Expressive_Morphological_Analyzer_for_Turkish)
23. Turkish Morphology \- Google Docs, accessed December 15, 2025, [https://docs.google.com/document/d/1bUW6i5KrjkeID8GD7rs8tbGWapZooLmt2gmdAUvPHW8/view](https://docs.google.com/document/d/1bUW6i5KrjkeID8GD7rs8tbGWapZooLmt2gmdAUvPHW8/view)
24. How to use prepositions of time in Brazilian Portuguese? \- Mango Languages, accessed December 15, 2025, [https://mangolanguages.com/resources/learn/grammar/brazilian-portuguese/how-to-use-prepositions-of-time-in-brazilian-portuguese](https://mangolanguages.com/resources/learn/grammar/brazilian-portuguese/how-to-use-prepositions-of-time-in-brazilian-portuguese)
25. How to tell the time in Portuguese? \- Speaking Brazilian, accessed December 15, 2025, [https://www.speakingbrazilian.com/how-to-tell-the-time-in-portuguese/](https://www.speakingbrazilian.com/how-to-tell-the-time-in-portuguese/)
26. Dates in Portuguese \- A Dica do Dia, Free Portuguese \- Rio & Learn, accessed December 15, 2025, [https://rioandlearn.com/dates-in-portuguese/](https://rioandlearn.com/dates-in-portuguese/)
27. How to say the date in Brazilian Portuguese? \- Mango Languages, accessed December 15, 2025, [https://mangolanguages.com/resources/learn/grammar/brazilian-portuguese/how-to-say-the-date-in-brazilian-portuguese](https://mangolanguages.com/resources/learn/grammar/brazilian-portuguese/how-to-say-the-date-in-brazilian-portuguese)
28. What is the difference between 'no' and 'em' in Portuguese? \- Quora, accessed December 15, 2025, [https://www.quora.com/What-is-the-difference-between-no-and-em-in-Portuguese](https://www.quora.com/What-is-the-difference-between-no-and-em-in-Portuguese)
29. Say the Months in Portuguese without Toil, accessed December 15, 2025, [https://portuguesewitheli.com/learn-portuguese-vocabulary/say-the-months-in-portuguese-without-toil/](https://portuguesewitheli.com/learn-portuguese-vocabulary/say-the-months-in-portuguese-without-toil/)
30. LDLD: Portuguese. Written Language. Capitalization. \- ELL Assessment for Linguistic Differences vs. Learning Disabilities, accessed December 15, 2025, [https://www.ldldproject.net/languages/portuguese/written/capital.html](https://www.ldldproject.net/languages/portuguese/written/capital.html)
31. Capitalization and Punctuation | C1 Portuguese Grammar \- Lingly, accessed December 15, 2025, [https://www.lingly.ai/portuguese/grammar/c1/capitalization-and-punctuation](https://www.lingly.ai/portuguese/grammar/c1/capitalization-and-punctuation)
32. \[JDK-8017120\] Month name in pt_BR should not be capitalized \- Java Bug System, accessed December 15, 2025, [https://bugs.openjdk.org/browse/JDK-8017120](https://bugs.openjdk.org/browse/JDK-8017120)
33. How do I change the capitalization of month names used by SimpleDateFormat?, accessed December 15, 2025, [https://stackoverflow.com/questions/11254008/how-do-i-change-the-capitalization-of-month-names-used-by-simpledateformat](https://stackoverflow.com/questions/11254008/how-do-i-change-the-capitalization-of-month-names-used-by-simpledateformat)
34. Usage of Commas in Turkish \- Hilal ÇAKIR \- Prezi, accessed December 15, 2025, [https://prezi.com/p/j00t8us5ksze/usage-of-commas-in-turkish/](https://prezi.com/p/j00t8us5ksze/usage-of-commas-in-turkish/)
35. How French (and Not English) Continues Shaping Turkish Writing, accessed December 15, 2025, [https://www.transcendwithwords.com/post/how-french-and-not-english-continues-shaping-turkish-writing](https://www.transcendwithwords.com/post/how-french-and-not-english-continues-shaping-turkish-writing)
36. Placing Commas In Portuguese \- Italki, accessed December 15, 2025, [https://www.italki.com/en/article/417/placing-commas-in-portuguese](https://www.italki.com/en/article/417/placing-commas-in-portuguese)
37. The Oxford Comma – Is it Really Necessary? \- AVRO dx Blog, accessed December 15, 2025, [https://blog.avrodx.com/2022/06/22/the-oxford-comma-is-it-really-necessary/](https://blog.avrodx.com/2022/06/22/the-oxford-comma-is-it-really-necessary/)
38. Morpheme Matching Based Text Tokenization for a Scarce Resourced Language | PLOS One \- Research journals, accessed December 15, 2025, [https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0068178](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0068178)
39. Word Segmentation of Informal Arabic with Domain Adaptation \- Stanford NLP Group, accessed December 15, 2025, [https://nlp.stanford.edu/pubs/monroe-green-manning-acls2014.pdf](https://nlp.stanford.edu/pubs/monroe-green-manning-acls2014.pdf)
