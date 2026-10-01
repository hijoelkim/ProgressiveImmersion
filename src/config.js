import browser from 'webextension-polyfill';

if ( !browser.action ) {
	browser.action = browser.browserAction;
}

const { languages: gtLanguages } = require( 'google-translate-api-x' );

// Google Translate has no Ancient Greek. grc is the ISO 639-3 code used as a manual dictionary target.
const LANGUAGES = {
	...gtLanguages,
	grc: 'Ancient Greek'
};

const DEFAULT_UPDATE_FREQUENCY = 12;
const NEVER_UPDATE_FREQUENCY = 96.5;
const DEFAULT_MIN_WORD_LENGTH = 4;
const DEFAULT_WORDS_TO_SAVE = 5;
const DEFAULT_FILTER_MAX_SHARE_OF_WORDS = 0.0075;
const DEFAULT_FILTER_MIN_SHARE_OF_WORDS = 0.001;
const DEFAULT_PHRASE_TRANSLATION_ENABLED = false;
const DIATHESIS_ORIGIN = 'en';
const DIATHESIS_ORIGIN_NAME = 'English';
const DIATHESIS_TARGET = 'grc';
const DIATHESIS_TARGET_NAME = 'Ancient Greek';
const MANUAL_ONLY_TARGETS = [ DIATHESIS_TARGET ];

export {
	browser,
	LANGUAGES,
	DEFAULT_UPDATE_FREQUENCY,
	NEVER_UPDATE_FREQUENCY,
	DEFAULT_MIN_WORD_LENGTH,
	DEFAULT_WORDS_TO_SAVE,
	DEFAULT_FILTER_MAX_SHARE_OF_WORDS,
	DEFAULT_FILTER_MIN_SHARE_OF_WORDS,
	DEFAULT_PHRASE_TRANSLATION_ENABLED,
	DIATHESIS_ORIGIN,
	DIATHESIS_ORIGIN_NAME,
	DIATHESIS_TARGET,
	DIATHESIS_TARGET_NAME,
	MANUAL_ONLY_TARGETS
};