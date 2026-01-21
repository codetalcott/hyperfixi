# Internationalization

The Intl object is the namespace for the ECMAScript Internationalization API, which provides a wide range of locale- and culture-sensitive data and operations.

Sep 24, 2025

## Source: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Internationalization>

## Note: Code examples from the website may not have copied to this document; please see the original site for complete information

## Overview

The Intl object is very use-case driven. It provides a separate object for each use case that requires locale-specific logic. Currently, it provides the following functionalities:

Getting information about a locale using Intl.Locale.
Formatting data using Intl.DateTimeFormat, Intl.DurationFormat, Intl.ListFormat, Intl.NumberFormat, and Intl.RelativeTimeFormat.
Collation (i.e., comparing strings for sorting or searching) using Intl.Collator.
Selecting plural forms using Intl.PluralRules.
Segmenting text into units such as words, sentences, or graphemes using Intl.Segmenter.
Getting the displayed name for currencies, languages, scripts, regions, and time zones using Intl.DisplayNames.
Most Intl APIs share a similar design (Intl.Locale is the only exception). You start by constructing an instance with the desired locale and options. This defines a set of rules for the desired operation (formatting, collation, segmentation, etc.). Then, when you call the method on the instance, such as format(), compare(), or segment(), the object applies the specified rule to the passed data.

The general signature of the constructor is:

locales Optional
A string with a BCP 47 language tag or an Intl.Locale instance, or an array of such locale identifiers. The runtime's default locale is used when undefined is passed or when none of the specified locale identifiers is supported. For the general form and interpretation of the locales argument, see the parameter description on the Intl main page.

options Optional
An object containing properties that customize specific aspects of the operation, which is key to understanding how to use each Intl object.

## Locale information

Locales underlie all behaviors of Intl. A locale is a set of conventions, represented in the Intl API by the Intl.Locale object. All Intl constructors that accept language tags also accept Intl.Locale objects.

Each locale is primarily defined by four things: a language, a script, a region, and sometimes some variants. When connected together by - in that order, they form a BCP 47 language tag.

The language is the most important part of the locale and is mandatory. When given a single language, like en or fr, there are algorithms to infer the rest of the information (see Intl.Locale.prototype.maximize()).
However, you often want to specify the region as well, because conventions can differ drastically between regions that speak the same language. For example, the date format in the US is MM/DD/YYYY, whereas in the UK it is DD/MM/YYYY, so specifying en-US or en-GB is important.
You can also specify a script. The script is the writing system, or the characters used to transcribe the language. In practice, the script is often unnecessary, because the language used in a certain region is only written in one script. However, there are exceptions such as the Serbian language, which can be written in both the Latin and Cyrillic scripts (sr-Latn and sr-Cyrl), or the Chinese language, which can be written in both the Simplified and Traditional scripts (zh-Hans and zh-Hant).
The variants are rarely used. Usually, they denote different orthographies; for example, German has the 1901 and 1996 orthography variants, which are written as de-1901 and de-1996.
A locale also contains a set of conventions used by that particular culture:

Use case Property Description Extension subtag
Date/time formatting calendar Used to group days into years, months, and weeks, and to assign names to them. For example, the gregory date "2022-01-01" becomes "28 Tevet 5782" in the hebrew calendar. ca
hourCycle Decides if times are displayed in 12-hour or 24-hour format, and whether the smallest hour number is 0 or 1. hc
Number formatting, including dates, times, durations, etc. numberingSystem Transforms numbers into a locale-specific notation. The regular 0123456789 system is called latn (Latin). Often, each script has a numbering system that is just a digit-by-digit translation, but some scripts have more than one numbering system, some may not typically write numbers in that script (for example, Chinese has its own hanidec numbering system, but most texts use the standard latn system), and others may require special conversion algorithms (for example, Roman numerals — roman). nu
Collation collation Defines the generic collation algorithm. For example, if you use the German phonebk collation, then "ä" is treated as "ae", and will be sorted between "ad" and "af". co
caseFirst Decides whether uppercase or lowercase letters should be sorted first, or if casing is ignored. kf
numeric Decides whether numbers are sorted as numbers or as strings. For example, if true, "10" will be sorted after "2". kn
You can explicitly specify these properties when constructing the Intl.Locale or passing language tags to other Intl constructors. There are two ways to do this — append them to the language tag or specify them as options.

To append them to the language tag, you first append the string -u (meaning "Unicode extension"), then the extension subtag as given above, then the value.
To specify them as options, you just add the property name as given above, together with its value, to the options object.
Using Intl.DateTimeFormat as an example, both of the following lines create a formatter that formats dates in the Hebrew calendar:

Unrecognized properties are ignored, so you can use the same syntax as above with Intl.NumberFormat, but it won't do anything different than just passing en-US, because number formatting doesn't use the calendar property.

It is tricky to get the default values of these locale conventions. new Intl.Locale("en-US").calendar returns undefined, because the Locale object only contains the information you passed to it. The default calendar is theoretically dependent on what API you are using the calendar with, so to get the default calendar of en-US as used by Intl.DateTimeFormat, you can use its resolvedOptions() method. The same goes for other properties.

Intl.Locale objects do two things simultaneously: they represent a parsed BCP 47 language tag (as demonstrated above), and they provide information about that locale. All of its properties, like calendar, are extracted from the input only, without querying any data source about default values. On the other hand, it has a group of methods for querying real-world information about the locale. For example, the getCalendars(), getHourCycles(), getNumberingSystems(), and getCollations() methods complement the calendar, hourCycle, numberingSystem, and collation properties, and each returns an array of preferred values for that property.

Intl.Locale instances also contain other methods that expose useful information, such as getTextInfo(), getTimeZones(), and getWeekInfo().

## Figuring out the locale

A shared concern for internationalization is: how do I know what locale to use?

The most obvious answer is "what the user prefers." Browsers expose the user's language preferences through the navigator.languages property. This is an array of language identifiers that can be directly passed to the formatter constructor—more on this later. The user can configure this list in their browser settings. You can also pass an empty array or undefined, which both cause the browser's default locale to be used.

However, this may not always provide the most desirable result. Strings formatted by Intl formatters represent a tiny fraction of text displayed on your site; most localized content is provided by you, the site developer. For example, suppose your site is only offered in two languages: English and French. If a Japanese user visits your site and expects to use your site in English, they will be baffled when they see the English text interleaved with numbers and dates in Japanese!

Usually, you don't want to use the browser's default language. Rather, you want to use the same language that the rest of your site is offered in. Suppose your site has a language switcher that stores the user's choice somewhere — you could directly use that.

If your site has a backend that dynamically selects the language based on the user's Accept-Language header and sends back different HTML based on that, you could also use the HTML element's HTMLElement.lang property: new Intl.NumberFormat(document.documentElement.lang).

If your site is only offered in one language, you could also hardcode the locale in your code: new Intl.NumberFormat("en-US").

As previously mentioned, you can also pass an array of locales to the constructor, representing a list of fallback choices. The first example using navigator.languages is an example of this: if the first user-configured locale is not supported for the particular operation, the next one is tried, and so on, until we find a requested locale for which the runtime has data. You can do this manually as well. In the example below, we specify a list of locales in decreasing order of specificity which all represent languages likely to be understood by a Hong Kong Chinese speaker, so the formatter picks the most specific one that it supports.

There is no API for listing all supported locales, but there are a few methods for handling the locale list:

Intl.getCanonicalLocales(): This function takes a list of locale identifiers and returns a list of canonicalized locale identifiers. This is useful for understanding the canonicalization process for each Intl constructor.
The supportedLocalesOf() static method on each Intl object (like Intl.DateTimeFormat.supportedLocalesOf()): This method takes the same arguments as the constructor (locales and options) and returns a subset of the given locale tags that match the given data. This is useful for understanding which locales are supported by the runtime for a particular operation, for example, to show a language switcher containing only the supported languages.

## Understanding the return value

The second shared concern for all objects is "what does the method return?" This is a hard question to answer beyond the structure or type of the returned value because there's no normative specification saying what exactly should be returned. Most of the time, the result of a method is consistent. However, the output may vary between implementations, even within the same locale — output variations are by design and allowed by the specification. It may also not be what you expect. For example, the string returned by format() may use non-breaking spaces or be surrounded by bidirectional control characters. You should not compare the results of any Intl method to hardcoded constants; they should only be displayed to users.

Of course, this answer seems unsatisfactory, because most developers do wish to control what the output looks like—at least, you don't want your user to be confused by nonsensical output. Here are some guidelines if you do want to conduct testing, whether automated or manual:

Test all locales that your user may use. This is easier if you have a fixed set of supported locales (for example via a language switcher). If you are using whatever the user prefers, you may pick a few common ones for your users, but bear in mind that what the user sees could vary. You can usually mock user preference via the test runner's configuration or mocking the Intl constructors.
Test on multiple JavaScript engines. The Intl API is directly implemented by the JavaScript engine, so for example you should expect Node.js and Chrome (which both use V8) to have the same output, while Firefox (which uses SpiderMonkey) may have a different output. Although all engines likely use the CLDR data, they usually postprocess it in different ways. Some browser build settings (for reducing the install size, for example) may also affect what locales and options are supported.
Don't assume the output. This means you shouldn't write the output by hand, such as expect(result).toBe("foo"). Instead, use snapshot testing or copy the string value from the output of a test run.

## Formatting data

A major use case of Intl is to output locale-specific texts representing structured data. This is similar to translation software, but instead of letting you translate arbitrary text, it takes data such as dates, numbers, and lists, and formats them according to locale-specific rules.

The Intl.DateTimeFormat, Intl.DurationFormat, Intl.ListFormat, Intl.NumberFormat, and Intl.RelativeTimeFormat objects each format one kind of data. Each instance provides two methods:

format(): Takes a piece of data and returns a string using the formatting rule as determined by the locale and options.
formatToParts(): Takes the same data and returns the same string, but broken down into parts, each part being an object with a type and a value. This is useful for more advanced use cases, such as interleaving the formatted text with other texts.
For example, here's a typical use of the Intl.NumberFormat object:

You don't always have to construct a formatter object in order to format strings. For casual use, you can also directly call the toLocaleString() method on the data, passing the locale and options as arguments. The toLocaleString() method is implemented by Temporal.PlainDate.prototype.toLocaleString(), Temporal.Duration.prototype.toLocaleString(), Number.prototype.toLocaleString(), and so on. Read the documentation for the data you are formatting to see if it supports toLocaleString(), and what formatter options it corresponds to.

Note that toLocaleString() is potentially less efficient than using a formatter object, because every time toLocaleString is called, it has to perform a search in a big database of localization strings. When the method is called many times with the same arguments, it is better to create a formatter object and use its format() method, because a formatter object remembers the arguments passed to it and may decide to cache a slice of the database, so future format calls can search for localization strings within a more constrained context.

### Date and time formatting

Intl.DateTimeFormat formats dates and times, as well as ranges of dates and times. The DateTimeFormat object takes date/time inputs in one of the following forms: Date, Temporal.PlainDateTime, Temporal.PlainTime, Temporal.PlainDate, Temporal.PlainYearMonth, or Temporal.PlainMonthDay.

Common use cases of localized date and time formatting are as follows:

Output the same date and time in another calendar system, such as the Islamic, Hebrew, or Chinese calendar.
Output the same real-world time (instant) but in another time zone.
Selectively output certain components of the date and time, such as only the year and month, and the specific representation of them (such as "Thursday" or "Thu").
Output the date according to locale-specific conventions, such as MM/DD/YYYY as in the U.S., DD/MM/YYYY as in the U.K., or YYYY/MM/DD as in Japan.
Output the time according to locale-specific conventions, such as 12-hour or 24-hour clock.
To decide what the formatted string looks like, you first choose the calendar (which affects the year, month, week, and day calculation) and time zone (which affects the exact time as well as possibly the date). This is done using the aforementioned calendar option (or the -ca- extension key in the locale identifier), and the timeZone option.

Date objects represent a unique instant in the user's time zone and in the ISO 8601 calendar (as reported by methods like Date.prototype.getHours() and Date.prototype.getMonth()). They are converted to the given calendar and timeZone by preserving the instant, so the date and time components may change.
The various Temporal objects already have a calendar built-in, so the calendar option must be consistent with the calendar of the object—unless the date's calendar is "iso8601", in which case it is converted to the requested calendar. These objects don't have a time zone, so they are directly displayed in the given timeZone without conversion.
Here we demonstrate how the combination of calendar and timeZone configurations result in different representations of the same instant.

The output looks like this:

calendar timeZone output
'gregory' 'America/New_York' 'Friday, December 31, 2021 at 7:00:00 PM Eastern Standard Time'
'gregory' 'Asia/Tokyo' 'Saturday, January 1, 2022 at 9:00:00 AM Japan Standard Time'
'hebrew' 'America/New_York' 'Friday, 27 Tevet 5782 at 7:00:00 PM Eastern Standard Time'
'hebrew' 'Asia/Tokyo' 'Saturday, 28 Tevet 5782 at 9:00:00 AM Japan Standard Time'
A date/time is comprised of the following components: weekday, era, year, month, day, dayPeriod, hour, minute, second, fractionalSecondDigits, and timeZoneName. Your next decision is what components to include in the output, and what forms they should take. You have two choices:

You can manually configure each component, using options with the same name as the component. Only the components you specify will be included in the output, with the specified form.
You can use the shortcuts dateStyle and timeStyle, which are predefined sets of components. They expand to a set of component options depending on the locale.
You should pick one of these two methods, because they are mutually exclusive. Using both methods simultaneously will result in an error.

Underlyingly, after requesting a combination of components, the DateTimeFormat object looks for a "template" that matches the requested components, so it only needs to fill in the values one by one. Not every combination of components has a predefined template. DateTimeFormat has a formatMatcher option that decides how to negotiate, by making components longer or shorter than requested, or by omitting or adding components. It gets quite technical, so you should read the Intl.DateTimeFormat() reference to better understand how it handles this.

Here, we demonstrate a few common ways to format the components:

There are other customization options. For example, you can use the hourCycle option to display the time in 12-hour or 24-hour and show midnight/noon as 12:00 or 0:00. You can also use the numberingSystem option to display any numbers in another numbering system.

Apart from format(), there's a second important method, formatRange(), which formats a range of dates or times. It takes two date-times of the same type, formats each one, joins them with a range separator (like the en-dash), and deduplicates the common parts.

### Number formatting

Number formatting is done with the Intl.NumberFormat object. The NumberFormat object accepts inputs in the form of numbers, strings, or BigInt values. Passing a string or BigInt instead of a number allows you to format numbers that are too large or too small to be represented precisely as a JavaScript number.

Common use cases of localized number formatting are as follows:

Output the number in another numbering system (script), such as Chinese, Arabic, or Roman.
Output the number with locale-specific conventions, such as the decimal symbol ("." in English, but "," in many European cultures), or digit grouping (3 digits in English, but may be 4 or 2 in other cultures, and may use ",", " ", or ".").
Output the number with exponential notation such as "3.7 million" or "2 thousand".
Output the number as a currency, applying specific currency symbols and rounding rules. For example, monetary values less than one cent in the U.S. or less than one yen in Japan may not be meaningful to display.
Output the number as a percentage, applying locale-specific conversion and formatting rules.
Output the number with units, such as "meters" or "liters", with translated unit names.
To decide what the formatted string looks like, you first choose the numbering system (which affects the characters used for the digits). The purpose of a numbering system is already discussed in locale information. Another option you need to decide is the style, which sets the context for what the number represents, and potentially affects other options' default values. It is one of "decimal", "percent", "currency", or "unit". If you want to format currencies, then you also need to provide the currency option. If you want to format units, then you also need to provide the unit option.

The output looks like:

style output
'decimal' '1,234,567.89'
'percent' '123,456,789%'
'currency' '$1,234,567.89'
'unit' '1,234,567.89 m'
The next group of options all specify what the numeric part should look like. First, you may want to represent extremely large values in a more readable way. You can set the notation option to "scientific" or "engineering", which both use the 1.23e+6 notation. The difference is that the latter uses multiples of 3 for the exponent, keeping the mantissa (the part before the e symbol) between 1 and 1000, while the former can use any integer for the exponent, keeping the mantissa between 1 and 10. You can also set notation to "compact" to use a more human-readable notation.

The output looks like:

notation output
'scientific' '1.2E4'
'engineering' '12E3'
'compact-short' '12K'
'compact-long' '12 thousand'
Then, you may want to round the number (if you specified notation, then just the mantissa part), so you don't display a number that's too long. These are the digit options, which include:

minimumIntegerDigits
minimumFractionDigits
maximumFractionDigits
minimumSignificantDigits
maximumSignificantDigits
roundingPriority
roundingIncrement
roundingMode
The exact interaction of these options is quite complex and not worth covering here. You should read the digit options reference for more detail. Nevertheless, the general idea is straightforward: we first find the number of decimal places we want to keep, then we round excess decimal places off, either rounding down or up, depending on the value of the last digit.

The output looks like this:

options output
{ minimumFractionDigits: 4, maximumFractionDigits: 4 } '1,234.5679'
{ minimumSignificantDigits: 4, maximumSignificantDigits: 4 } '1,235'
{ minimumFractionDigits: 0, maximumFractionDigits: 0, roundingMode: "floor" } '1,234'
{ minimumFractionDigits: 0, maximumFractionDigits: 0, roundingMode: "floor", roundingIncrement: 10 } '1,230'
There are other customization options. For example, you can use the useGrouping and signDisplay options to customize whether and how to show the group separators (like "," in "1,234,567.89") and the sign. However, note that the characters used for the group separator, decimal point, and sign are locale-specific, so you can't customize them directly.

Apart from format(), there's a second important method, formatRange(), which formats a range of numbers. It takes two number representations, formats each one, joins them with a range separator (like the en-dash), and potentially deduplicates the common parts.

### List formatting

You may already have written code that does this:

This code is not internationalized. In some languages, the list separator is not a comma. In most languages (including English), you need a conjunction before the last item. But even just adding an "and" manually doesn't make it correct among all English speakers, because there's the debate of Oxford commas in English: "apple, banana, and cherry" vs. "apple, banana and cherry".

The Intl.ListFormat object solves this problem. It takes an array of strings and joins them in a locale-specific way such that the result represents a conjunction (and), disjunction (or), or a list of units.

Check Intl.ListFormat() for more examples and options.

### Relative time formatting

Intl.RelativeTimeFormat formats a time difference. The RelativeTimeFormat object takes relative times in the form of two arguments: a number (with any sign) and a time unit, such as "day", "hour", or "minute".

It does several things at once:

It localizes and pluralizes the time unit, such as "1 day" vs. "2 days", like in number formatting.
It chooses the appropriate phrase for past and future times, such as "in 1 day" vs. "1 day ago".
It may select a special phrase for some time units, such as "1 day ago" vs. "yesterday".
Check Intl.RelativeTimeFormat() for more examples and options.

### Duration formatting

Intl.DurationFormat provides duration formatting, such as "3 hours, 4 minutes, 5 seconds". It is not a primitive operation with its own formatter: it uses Intl.NumberFormat and Intl.ListFormat internally to format each duration component, then joins them with a list separator. The DurationFormat object takes durations in the form of a Temporal.Duration object, or a plain object with the same properties.

Apart from customizing the numbering system, the duration formatting options decides whether or not to show each component, and how long they should be.

Check Intl.DurationFormat() for more examples and options.

## Collation

The Intl.Collator object is useful for comparing and sorting strings. It takes two strings and returns a number indicating their relative order, in the same way as the compareFn argument of the Array.prototype.sort method.

There are many reasons why you should not use JavaScript operators like === or > to compare user-facing strings:

Irrelevant orthographic variants: For example, in English, "naïve" and "naive" are just alternative spellings of the same word and should be treated as equal.
Ignoring case: Often, you want to ignore case when comparing strings. For example, "apple" and "Apple" should be treated as equal.
Unicode code point order doesn't make sense: Comparison operators like > compare by Unicode code point order, which is not the same as the order of characters in a dictionary. For example, "ï" comes after "z" in code point order, but you would want it to be ordered next to "i" in a dictionary.
Unicode normalization: The same character may have multiple representations in Unicode. For example, "ñ" can be represented as a single character or as "n" followed by a combining tilde. (See String.prototype.normalize().) These should be treated as equal.
Number comparison: Numbers in strings should be compared as numbers, not as strings. For example, you would want "test-10" to come after "test-2".
There are two distinct use cases for collation: sorting and searching. Sorting is when you have a list of strings and you want to order them according to some rule. Searching is when you have a list of strings and you want to find a string that matches a query. When searching, you should only pay attention to whether the comparison result is zero (equal) or not, not the sign of the result.

There are many different ways to sort, even within the same locale. For example, there are two different sort orders in German, phonebook and dictionary. Phonebook sort emphasizes sound — as if "ä", "ö", and so on were expanded to "ae", "oe", and so on before sorting.

Some German words conjugate with extra umlauts, so in dictionaries it's sensible to order ignoring umlauts (except when ordering words differing only by umlauts: schon before schön).

## Plural rules

The Intl.PluralRules object is useful for selecting the correct plural form of a word. It doesn't automatically pluralize words for you (for example, you can't pass it "apple" and expect "apples" back), but it tells you which plural form to use based on a number. You may already be doing this:

But this is hard to generalize across languages, especially those with many plural forms. You can see Intl.PluralRules for a general introduction to plural rules. Here, we just demonstrate a few common use cases.

## Segmentation

The Intl.Segmenter object is useful for breaking a string into segments. Without Intl, you are already able to split a string by UTF-16 code units and Unicode code points:

But as you can see, Unicode code points are not the same as what human users perceive as discrete characters. This often happens with emojis, where a single emoji can be represented by multiple code points. When the user interacts with text, a grapheme is the smallest unit of text they can manipulate, such as delete or select. The Segmenter object enables grapheme-level segmentation, which is useful for counting characters, measuring text width, and so on. It takes a string and returns an iterable segments object, each element of which has a segment property representing the text of the segment.

The segmenter can also do higher-level segmentation, including word-level and sentence-level splitting. These use cases are necessarily language-specific. For example, the following is a very poor implementation of word-counting:

There are several problems with this: not all languages use spaces to separate words, not all spaces are word-separating, and not all words are separated by spaces. To solve this, use Segmenter with granularity: "word". The result is the input string, split into segments of words and non-words. If you are counting words, you should filter out the non-words by checking each segment's isWordLike property.

Word segmentation works for character-based languages too. For example, in Chinese, several characters can represent a single word, but there's no space between them. The segmenter implements the same behavior as the browser's built-in word segmentation, triggered by double-clicking a word.

Sentence segmentation is similarly complex. For example, in English, there are many punctuation marks that could mark the end of a sentence (".", "!", "?", and so on).

Note that the segmenter doesn't remove any characters. It just splits the string into segments, each of which is a sentence. You can then remove the punctuation marks if you want. Also, the current implementation of the segmenter doesn't support sentence segmentation suppressions (preventing sentence breaks after periods like "Mr." or "Approx."), but there's ongoing work to support this.

## Display names

After introducing so many options and behaviors, you may wonder how to present them to the user. Intl comes with two useful APIs for building user interfaces: Intl.supportedValuesOf() and Intl.DisplayNames.

The Intl.supportedValuesOf() function returns an array of supported values for a given option. For example, you can use it to populate a dropdown list of supported calendars, from which users can select to display dates.

But often, these identifiers are not user-friendly. For example, you may want to show the calendars in the user's language, or unabbreviate them. The Intl.DisplayNames object is useful for this. It's like a formatter, but it's not template-based. Instead, it is a direct mapping from language-agnostic identifiers to localized names. It supports formatting languages, regions, scripts (the three subfields of a BCP 47 language tag), currency, calendar, and date-time fields.
