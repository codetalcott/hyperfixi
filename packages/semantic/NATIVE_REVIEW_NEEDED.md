# Native Speaker Review Needed

This document tracks native idiom patterns that need validation from native speakers.
Patterns were implemented based on linguistic research but may benefit from real-world usage feedback.

## Status Legend

- ✅ **Verified** - Confirmed by research or native speaker
- ⚠️ **Needs Review** - Implemented but needs native validation
- ❓ **Uncertain** - May not be natural usage

---

## Arabic (ar)

### Verified Patterns ✅

| Pattern | Meaning | Notes | Source |
|---------|---------|-------|--------|
| عندما (indama) | when (temporal) | Formal, widely understood | [HiNative](https://hinative.com/questions/10160110) |
| حين (hina) | at the time of | Classical Arabic (الفصحى) | [Verbling](https://www.verbling.com/discussion/when-in-arabic-or) |
| إذا (idha) | if/when (conditional) | Standard conditional | [ArabicPod101](https://www.arabicpod101.com/blog/2020/01/16/arabic-conjunctions/) |

### Needs Review ⚠️

| Pattern | Meaning | Concern | Source |
|---------|---------|---------|--------|
| لمّا (lamma) | when (past) | **Dialectal/informal** - not appropriate for formal UI | [HiNative](https://hinative.com/questions/10160110) |

**Question for native speakers:**
- Is لمّا appropriate for a programming DSL, or should we recommend عندما instead?
- For dialectal Arabic support (Egyptian, Levantine), what patterns are most natural?

### Missing Patterns to Consider

| Pattern | Meaning | Why Consider |
|---------|---------|--------------|
| كلما (kullama) | whenever | Common repetitive temporal |
| بمجرد (bimujjarrad) | as soon as | Immediate temporal |

---

## Turkish (tr)

### Verified Patterns ✅

| Pattern | Meaning | Notes | Source |
|---------|---------|-------|--------|
| -dığında | when | Temporal converb | [Cambridge](https://www.cambridge.org/core/journals/nordic-journal-of-linguistics/article/converbs-in-heritage-turkish-a-contrastive-approach/B43F943280026F821BF994806DE204F6) |
| -(y)ınca | when/upon | Temporal converb | [FluentInTurkish](https://fluentinturkish.com/grammar/time-clauses-in-turkish) |
| -sa/-se | if | Conditional suffix | [FluentInTurkish](https://fluentinturkish.com/grammar/turkish-conditionals) |

### Patterns to Add

| Pattern | Meaning | Why Add | Status |
|---------|---------|---------|--------|
| -ken | while | Simultaneity - common usage | To implement |
| -DIkçA | whenever | Repetitive temporal | To implement |
| -DIğI zaman | when (explicit time) | Alternative form | Consider |

**Question for native speakers:**
- Which converb forms feel most natural for UI event handlers?
- Are there regional preferences (Istanbul vs other regions)?

---

## Portuguese (pt)

### Verified Patterns ✅

| Pattern | Meaning | Notes | Source |
|---------|---------|-------|--------|
| quando | when | Standard temporal | Used in [Microsoft docs](https://learn.microsoft.com/pt-br/) |
| ao + infinitive | upon/when doing | Native idiom (ao clicar) | Found in [GUJ forum](https://www.guj.com.br/) |
| se | if | Standard conditional | - |

### Needs Review ⚠️

| Pattern | Meaning | Concern | Status |
|---------|---------|---------|--------|
| em clique | on click | May not be natural - "no clique" or "ao clicar" might be preferred | ❓ Uncertain |

**Question for native speakers:**
- Is "em clique alternar .active" natural, or would "ao clicar" always be preferred?
- Any differences between Brazilian Portuguese and European Portuguese for these patterns?

### Notes on Brazilian Portuguese

- Brazilian Portuguese requires 25-30% more space than English
- "clique aqui" (click here) is standard UI terminology
- Consider: Should we support both "clicar" (borrowed) and native alternatives like "pressionar"?

---

## General Questions for All Languages

1. **Event name translations**: Are our event name translations (click, input, change) using the most natural terms developers would expect?

2. **Word order**: Do the patterns feel like natural {language} or translated-from-English?

3. **Formality level**: Is the formality level appropriate for a programming DSL?

---

## How to Contribute

If you're a native speaker of any of these languages, we'd love your feedback:

1. Open an issue with the label `i18n-review`
2. Include:
   - Your native language
   - Which patterns feel natural vs unnatural
   - Alternative phrasings you'd suggest
   - Any missing patterns that are common in your language

---

## Research Sources

### Arabic
- [HiNative - متى vs عندما vs حين vs لما](https://hinative.com/questions/10160110)
- [iTalki - عندما / لما / حين differences](https://www.italki.com/post/question-368442?hl=en)
- [ArabicPod101 - Arabic Conjunctions](https://www.arabicpod101.com/blog/2020/01/16/arabic-conjunctions/)

### Turkish
- [Cambridge - Converbs in heritage Turkish](https://www.cambridge.org/core/journals/nordic-journal-of-linguistics/article/converbs-in-heritage-turkish-a-contrastive-approach/B43F943280026F821BF994806DE204F6)
- [FluentInTurkish - Time Clauses](https://fluentinturkish.com/grammar/time-clauses-in-turkish)
- [FluentInTurkish - Conditionals](https://fluentinturkish.com/grammar/turkish-conditionals)

### Portuguese
- [Localize - Translating for Brazil](https://localizejs.com/articles/localizing-for-brazil)
- [Terra Translations - Brazilian Portuguese Mobile Apps](https://terratranslations.com/2022/12/20/tips-localize-mobile-app-brazilian-portuguese/)

---

*Last updated: December 2024*
*Research conducted using web search verification*
