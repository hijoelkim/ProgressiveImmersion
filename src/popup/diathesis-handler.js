import {
	DIATHESIS_ORIGIN,
	DIATHESIS_ORIGIN_NAME,
	DIATHESIS_TARGET,
	DIATHESIS_TARGET_NAME,
	NEVER_UPDATE_FREQUENCY,
	browser
} from '../config';
import { parseDiathesisEasy } from '../diathesis-easy';

export async function importDiathesisEasy ( text ) {
	const pairs = parseDiathesisEasy( text );
	if ( pairs.length === 0 ) {
		return 0;
	}

	const stored = await browser.storage.local.get( 'dictionary' );
	const dictionary = stored.dictionary ?? {};
	dictionary[DIATHESIS_ORIGIN] ??= {};
	dictionary[DIATHESIS_ORIGIN][DIATHESIS_TARGET] ??= {};
	const page = dictionary[DIATHESIS_ORIGIN][DIATHESIS_TARGET];

	for ( const pair of pairs ) {
		page[pair.en] = pair.grc;
	}

	await browser.storage.local.set({
		dictionary,
		origin: DIATHESIS_ORIGIN,
		originNativeName: DIATHESIS_ORIGIN_NAME,
		phraseTranslationEnabled: false,
		target: DIATHESIS_TARGET,
		targetNativeName: DIATHESIS_TARGET_NAME,
		updateFrequency: NEVER_UPDATE_FREQUENCY
	});

	return pairs.length;
}