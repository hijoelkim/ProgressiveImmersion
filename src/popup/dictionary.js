import {
	DIATHESIS_ORIGIN,
	DIATHESIS_ORIGIN_NAME,
	DIATHESIS_TARGET,
	DIATHESIS_TARGET_NAME,
	MANUAL_ONLY_TARGETS,
	browser
} from '../config';
import { exportToAnki, importFromAnki } from './anki-handler';
import { looksLikeDiathesisEasy, looksLikeStockAnki } from '../diathesis-easy';
import { importDiathesisEasy } from './diathesis-handler';
import translateWord from '../translateWord';

const dictionary = document.getElementById( 'dictionary' );
const [ originIso, targetIso, originName, targetName ] = window.location.hash.slice( 1 ).split( '~' )
	.map( part => {
		try {
			return decodeURIComponent( part );
		} catch ( error ) {
			return part;
		}
	});

const importFileInput = document.getElementById( 'anki-import-file' );

document.getElementById( 'source-title' ).textContent = originName;
document.getElementById( 'target-title' ).textContent = targetName;

const urlParams = new URLSearchParams( window.location.search );
const prefillWord = urlParams.get( 'word' );
const autoTranslate = urlParams.get( 'autoTranslate' ) === 'true';

let isFirefoxPanel = false;
if ( navigator.userAgent.toLowerCase().includes( 'firefox' ) ) {
	browser.tabs.getCurrent().then( tab => {
		if ( !tab ) {
			isFirefoxPanel = true;
		}
	});
}

if ( prefillWord ) {
	document.getElementById( 'source-word' ).value = prefillWord;
	document.getElementById( 'translated-word' ).focus();
}

browser.storage.local.get( 'dictionary' ).then( value => {
	if ( value.dictionary === undefined ) {
		value.dictionary = {};
	}

	if ( value.dictionary[originIso] === undefined ) {
		value.dictionary[originIso] = {};
	}

	if ( value.dictionary[originIso][targetIso] === undefined ) {
		value.dictionary[originIso][targetIso] = {};
	}

	for ( const word in value.dictionary[originIso][targetIso] ) {
		drawTranslation( word, value.dictionary[originIso][targetIso][word] );
	}

	const sourceWordInput = document.getElementById( 'source-word' );
	const translatedWordInput = document.getElementById( 'translated-word' );

	if ( prefillWord && autoTranslate && !MANUAL_ONLY_TARGETS.includes( targetIso ) ) {
		translateWord( prefillWord, originIso, targetIso )
			.then( translation => {
				translatedWordInput.value = translation;
				translatedWordInput.focus();
			})
			.catch( () => {
				// If translation fails, just focus so user can type
				translatedWordInput.focus();
			});
	} else if ( prefillWord ) {
		sourceWordInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
		translatedWordInput.focus();
	}

	document.getElementById( 'submit-word' ).addEventListener( 'click', async e => {
		if ( sourceWordInput.value === '' ) {
			return;
		}

		const sourceWord = sourceWordInput.value.toLowerCase();
		if ( translatedWordInput.value === '' ) {
			try {
				translatedWordInput.value = await translateWord( sourceWord, originIso, targetIso );
			} catch ( _ ) {
				return;
			}
		}

		value.dictionary[originIso][targetIso][sourceWord] = translatedWordInput.value.toLowerCase();
		browser.storage.local.set({ dictionary: value.dictionary });
		drawTranslation( sourceWord, translatedWordInput.value.toLowerCase() );
		sourceWordInput.value = '';
		translatedWordInput.value = '';

		if ( prefillWord ) {
			window.close();
		} else {
			sourceWordInput.focus();
		}
	});

	document.addEventListener( 'keypress', ( e ) => {
		if ( e.key === 'Enter' ) {
			e.preventDefault();
			document.getElementById( 'submit-word' ).click();
		}
	});

	function firefoxFilePickerFix ( e ) {
		if ( !isFirefoxPanel ) {
			return false;
		}

		e.preventDefault();
		alert( 'Firefox closes the extension when using the file picker, so a new tab must be created.' );
		browser.tabs.create({ url: window.location.href });
		window.close();

		return true;
	}

	document.getElementById( 'exportAnkiButton' )?.addEventListener( 'click', ( e ) => {
		if ( firefoxFilePickerFix( e ) ) {
			return;
		}

		exportToAnki( originIso, targetIso, originName, targetName );
	});

	let importMode = 'anki';

	document.getElementById( 'importAnkiButton' )?.addEventListener( 'click', ( e ) => {
		if ( firefoxFilePickerFix( e ) ) {
			return;
		}

		importMode = 'anki';
		importFileInput.click();
	});

	document.getElementById( 'importDiathesisButton' )?.addEventListener( 'click', ( e ) => {
		if ( firefoxFilePickerFix( e ) ) {
			return;
		}

		importMode = 'diathesis';
		importFileInput.click();
	});

	const deleteButton = document.getElementById( 'deleteAllButton' );
	deleteButton.addEventListener( 'click', () => {
		const currentDict = value.dictionary[originIso][targetIso];

		if ( Object.keys( currentDict ).length === 0 ) {
			alert( 'Dictionary is already empty.' );
			return;
		}

		if ( deleteButton.dataset.confirming === 'true' ) {
			value.dictionary[originIso][targetIso] = {};

			browser.storage.local.set({ dictionary: value.dictionary }).then( () => {
				window.location.reload();
			});
		} else {
			deleteButton.dataset.confirming = 'true';
			deleteButton.textContent = 'Confirm?';

			setTimeout( () => {
				deleteButton.dataset.confirming = 'false';
				deleteButton.textContent = 'Delete All';
			}, 3000 );
		}
	});


	importFileInput.addEventListener( 'change', ( e ) => {
		const file = e.target.files[0];
		if ( !file ) { return; }

		const reader = new FileReader();
		reader.onload = async ( event ) => {
			const text = event.target.result;
			let count = 0;
			let importedDiathesis = false;

			try {
				if ( importMode === 'diathesis' ) {
					if ( looksLikeStockAnki( text ) ) {
						alert( 'This looks like a stock Anki file (foreign word first). Use Import from Anki, or add a #columns:en;grc header for Diathesis Easy.' );
						return;
					}

					count = await importDiathesisEasy( text );
					importedDiathesis = true;
				} else if ( looksLikeDiathesisEasy( text ) ) {
					count = await importDiathesisEasy( text );
					importedDiathesis = true;
				} else {
					count = await importFromAnki( text, originIso, targetIso );
				}
			} catch ( error ) {
				alert( error instanceof Error ? error.message : 'Import failed.' );
				return;
			}

			if ( count > 0 && importedDiathesis ) {
				alert( `Imported ${count} Diathesis Easy words into English → Ancient Greek. Automatic new words are off.` );
				window.location.hash = `${DIATHESIS_ORIGIN}~${DIATHESIS_TARGET}~${DIATHESIS_ORIGIN_NAME}~${DIATHESIS_TARGET_NAME}`;
				window.location.reload();
			} else if ( count > 0 ) {
				alert( `Imported ${count} words.` );
				window.location.reload();
			} else {
				alert( 'No valid words found to import.' );
			}
		};

		reader.readAsText( file );
		e.target.value = '';
	});

	function drawTranslation ( original, translated ) {
		const row = dictionary.insertRow( dictionary.rows.length - 1 );

		const [ originalElem, targetElem ] = [ document.createElement( 'td' ), document.createElement( 'td' ) ];
		[ originalElem.textContent, targetElem.textContent ] = [ original, translated ];
		row.appendChild( originalElem );
		row.appendChild( targetElem );

		const deleteButtonHeader = document.createElement( 'th' );
		const deleteButton = document.createElement( 'button' );
		deleteButton.textContent = 'Delete';
		deleteButton.classList.add( 'w3-button', 'w3-red' );
		deleteButton.addEventListener( 'click', e => {
			delete value.dictionary[originIso][targetIso][original];
			browser.storage.local.set({ dictionary: value.dictionary });
			row.remove();
		});
		deleteButtonHeader.appendChild( deleteButton );
		row.appendChild( deleteButtonHeader );
	}

	if ( Object.keys( value.dictionary[originIso][targetIso] ).length === 0 ) {
		const caption = dictionary.createCaption();
		caption.classList.add( 'w3-blue', 'w3-card' );
		caption.textContent = originIso === DIATHESIS_ORIGIN && targetIso === DIATHESIS_TARGET ?
			'No Ancient Greek words yet. Import a Diathesis Easy list (English gloss; Greek form), or add pairs below.' :
			'Your dictionary is currently empty, try using the extension more.  Or, you can add words manually below.';
	}

/* TODO
	document.getElementById( 'export-button' ).addEventListener( 'click', e => {
		if ( Object.keys( value.dictionary[originIso][targetIso] ).length === 0 ) {
			return;
		}

		const downloadData = {};
		downloadData[originIso] = {};
		downloadData[originIso][targetIso] = value.dictionary[originIso][targetIso];
		const blob = new Blob( [ JSON.stringify( downloadData ) ], { type: 'application/json' });
		browser.downloads.download({
			filename: originIso + '-to-' + targetIso + '.json',
			saveAs: true,
			url: URL.createObjectURL( blob, { oneTimeOnly: true })
		});
	});
*/
});