# Diathesis Easy words in ProgressiveImmersion

This fork swaps English page text to Ancient Greek only for lemmas you already marked Easy in [Diathesis](https://github.com/hijoelkim/diathesis). Google Translate is not used for that pair. Ancient Greek is not a Google Translate language, and Modern Greek (`el`) is a different language.

## Language pair

| Role | Code | Label |
|------|------|--------|
| Origin (the page) | `en` | English |
| Target (the replacement) | `grc` | Ancient Greek |

`grc` is ISO 639-3. It is added in this fork because ProgressiveImmersion's built-in list comes from Google Translate, which has no Ancient Greek.

The content script replaces a word only when it is a key in `dictionary[origin][target]`. For this path that is `dictionary.en.grc[english gloss] = greek form`. An English page containing "word" shows λόγος when that pair is stored. Words that are not in the dictionary stay English.

## Easy-only mode

Choosing **Ancient Greek** as the target, or importing a Diathesis Easy file, does all of the following:

- Sets update frequency to never (`96.5`, the popup slider's maximum, `NEVER_UPDATE_FREQUENCY`). The background alarm does not pop `wordQueue`.
- Turns off phrase translation, so consecutive known words are not sent to Google Translate. That checkbox stays off until you turn it back on in Settings.
- Leaves `grc` as a manual-only target. Even if the frequency slider is moved, the dictionary updater does not call Google Translate for Ancient Greek.

The popup shows "New words: Never" and a short note while the target is Ancient Greek. Leave the slider on Never for this path. Move it only when you want automatic adds for some other target language.

## Export Easy words from Diathesis

Diathesis does not yet download a browser word list. Progress JSON is enough to *decide* which cards are Easy. You still join those cards to the English gloss and the Greek citation yourself.

Progress lives in one of these places:

- Guest browser storage: `localStorage["diathesis-fc-guest"]`
- A progress file from `serializeProgress` (`kind: "diathesis-flashcard-progress"`)
- The signed-in `flashcard_progress` payload

Keep a card when either of these is true:

- `lastRating === "easy"` and the easy-hold has not decayed (`!isEasyDecayed`)
- `easyStreak >= 7` (permanent Easy; the blue streak)

Roll up by lemma. One English gloss should become one Greek citation form, not every voice × person × direction card.

Write one of the two formats below. `cardId`, `sourceId`, `sourceKind`, `easyStreak`, and `easyUntil` may be present. This extension ignores them and only stores the gloss and the Greek form.

### Anki-style text

Lines are **English gloss, then Greek form** (`en;grc`). That is the opposite of this extension's stock Anki import, which expects `foreign;native` (Greek, then English) and stores `dictionary[native] = foreign`.

```
#diathesis:easy
#separator:;
#columns:en;grc
word;λόγος
love;ἀγάπη
```

`#columns:grc;en` is accepted and reads Greek first. A tab separator works with `#separator:tab`. Extra columns after the Greek form are ignored. The same gloss later in the file overwrites the earlier form.

### JSON

An array of `{ "en", "grc" }`, or an object with a `words`, `pairs`, `lemmas`, `items`, `entries`, `cards`, or `lexicon` array. A flat map `{ "word": "λόγος" }` is also accepted.

```json
{
  "app": "diathesis",
  "kind": "diathesis-easy-lexicon",
  "version": 1,
  "words": [
    { "cardId": "sample-logos", "sourceId": "lemma:logos", "en": "word", "grc": "λόγος", "easyStreak": 7 }
  ]
}
```

Raw progress JSON, with ratings but no glosses, imports nothing. Convert it first.

Samples: [examples/diathesis-easy-en-grc.txt](examples/diathesis-easy-en-grc.txt) and [examples/diathesis-easy-en-grc.json](examples/diathesis-easy-en-grc.json).

## Import

1. Build and load the extension (`npm install` then `npm run build-v3` for Chrome).
2. Set **Translate from** to English and **Translate to** to Ancient Greek.
3. Open **Dictionaries**, then **English -> Ancient Greek**.
4. Choose **Import Diathesis Easy** and pick the `.txt` or `.json` file.
5. Turn the extension **On**.

**Import from Anki** still merges `foreign;native` into whichever dictionary is open. If that file contains `#diathesis` or `#columns:en;grc` / `#columns:grc;en`, it is treated as a Diathesis Easy list instead: English → Ancient Greek, frequency never.

Re-import when new cards become Easy. Existing glosses are overwritten by the new file; other glosses already in `dictionary.en.grc` are kept.

## Verify

1. The popup says **New words: Never**.
2. The English → Ancient Greek table lists `word` → `λόγος` (Greek spelling and accents unchanged).
3. Open an English `http` or `https` page that contains the sentence `In the beginning was the word.` The gloss `word` renders as λόγος. Hover shows the English gloss. `beginning` renders as ἀρχή. A word that is not in the file, such as `sentence`, stays English. `file://` pages are skipped unless the browser is allowed to run the extension on local files.
4. Confirm no new rows appear in the dictionary after browsing. Nothing is being queued through Google Translate.
