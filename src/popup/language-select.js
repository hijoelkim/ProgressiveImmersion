import {
	DIATHESIS_TARGET,
	LANGUAGES,
	NEVER_UPDATE_FREQUENCY,
	browser
} from '../config';

document.getElementById( 'title' ).innerHTML = ( window.location.hash === '#origin' ) ? 'Source Language' : 'Target Language';

const languageList = document.getElementById( 'languageList' );
const searchInput = document.getElementById( 'languageSearch' );

for ( const isoCode in LANGUAGES ) {
	if ( typeof LANGUAGES[isoCode] === 'function' ) {
		continue;
	}

	if ( window.location.hash === '#target' && isoCode === 'auto' ) {
		continue;
	}

	const listItem = document.createElement( 'li' );
	listItem.classList.add( 'language-item' );

	const button = document.createElement( 'button' );
	button.classList.add( 'w3-button' );
	button.style.textAlign = 'left';

	button.innerHTML = LANGUAGES[isoCode];
	button.isoCode = isoCode;
	button.nativeName = LANGUAGES[isoCode];

	button.addEventListener( 'click', ( e ) => {
		const which = window.location.hash.slice( 1 );
		const updates = {
			[which]: e.target.isoCode,
			[which + 'NativeName']: e.target.nativeName
		};

		if ( which === 'target' && e.target.isoCode === DIATHESIS_TARGET ) {
			updates.updateFrequency = NEVER_UPDATE_FREQUENCY;
			updates.phraseTranslationEnabled = false;
		}

		browser.storage.local.set( updates );
		window.location.href = './index.html';
	});

	listItem.appendChild( button );
	languageList.appendChild( listItem );
}

searchInput.oninput = () => {
	const filter = searchInput.value.toLowerCase();
	const items = document.getElementsByClassName( 'language-item' );

	for ( const item of items ) {
		const button = item.getElementsByTagName( 'button' )[0];
		const textValue = button.textContent;

		if ( textValue.toLowerCase().indexOf( filter ) > -1 ) {
			item.style.display = '';
		} else {
			item.style.display = 'none';
		}
	}
};

searchInput.focus();