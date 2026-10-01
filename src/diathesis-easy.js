const TEXT_COLUMN_HEADER = '#columns:';
const TEXT_SEPARATOR_HEADER = '#separator:';
const DIATHESIS_MARKERS = [ '#diathesis', '#columns:en;grc', '#columns:grc;en' ];
const PAIR_EN_KEYS = [ 'en', 'english', 'gloss' ];
const PAIR_GRC_KEYS = [ 'grc', 'greek', 'ancientGreek' ];
const WRAPPER_KEYS = [ 'words', 'pairs', 'lemmas', 'items', 'entries', 'cards', 'lexicon' ];

function parseDiathesisEasy ( text ) {
	const source = normalizeSource( text );
	if ( source === '' ) {
		return [];
	}

	if ( source.startsWith( '{' ) || source.startsWith( '[' ) ) {
		let value;
		try {
			value = JSON.parse( source );
		} catch ( error ) {
			throw new Error( 'Diathesis Easy JSON could not be parsed' );
		}

		return uniquePairs( collectPairs( value ) );
	}

	return uniquePairs( parseText( source ) );
}

function looksLikeDiathesisEasy ( text ) {
	if ( typeof text !== 'string' ) {
		return false;
	}

	const source = text.replace( /^\uFEFF/, '' ).trim();
	if ( source === '' ) {
		return false;
	}

	if ( source.startsWith( '{' ) || source.startsWith( '[' ) ) {
		try {
			return hasExplicitEasyShape( JSON.parse( source ) );
		} catch ( error ) {
			return false;
		}
	}

	const lower = source.toLowerCase();
	return DIATHESIS_MARKERS.some( marker => lower.includes( marker ) );
}

function looksLikeStockAnki ( text ) {
	if ( typeof text !== 'string' || looksLikeDiathesisEasy( text ) ) {
		return false;
	}

	const lower = text.toLowerCase();
	return lower.includes( '#notetype:' ) || lower.includes( '#columns:front' );
}

function normalizeSource ( text ) {
	if ( typeof text !== 'string' ) {
		throw new TypeError( 'Diathesis Easy import must be text' );
	}

	return text.replace( /^\uFEFF/, '' ).trim();
}

function parseText ( source ) {
	// Default order is English gloss, then Greek form. #columns:grc;en flips that.
	let enFirst = true;
	let separator = null;
	const pairs = [];

	for ( const rawLine of source.split( /[\r\n]+/ ) ) {
		const line = rawLine.trim();
		if ( line === '' ) {
			continue;
		}

		if ( line.startsWith( '#' ) ) {
			const header = applyHeader( line, enFirst, separator );
			enFirst = header.enFirst;
			separator = header.separator;
			continue;
		}

		const sep = separator ?? ( line.includes( ';' ) ? ';' : '\t' );
		const parts = line.split( sep );
		if ( parts.length < 2 ) {
			continue;
		}

		const left = parts[0].trim();
		const right = parts[1].trim();
		if ( left === '' || right === '' ) {
			continue;
		}

		pairs.push( enFirst ? { en: left, grc: right } : { en: right, grc: left });
	}

	return pairs;
}

function applyHeader ( line, enFirst, separator ) {
	const lower = line.toLowerCase();
	if ( lower.startsWith( TEXT_SEPARATOR_HEADER ) ) {
		separator = readSeparator( line );
	}

	if ( lower.startsWith( TEXT_COLUMN_HEADER ) ) {
		const columns = line.slice( TEXT_COLUMN_HEADER.length )
			.toLowerCase()
			.split( /[;\t]/ )
			.map( column => column.trim() );
		if ( columns[0] === 'grc' || columns[0] === 'greek' ) {
			enFirst = false;
		} else if ( columns[0] === 'en' || columns[0] === 'english' || columns[0] === 'gloss' ) {
			enFirst = true;
		}
	}

	return { enFirst, separator };
}

function readSeparator ( line ) {
	const value = line.slice( TEXT_SEPARATOR_HEADER.length ).trim();
	if ( value === '' ) {
		return null;
	}

	if ( value.toLowerCase() === 'tab' || value === '\\t' ) {
		return '\t';
	}

	return value.slice( 0, 1 );
}

function collectPairs ( value ) {
	const pairs = [];
	walk( value, pairs );
	return pairs;
}

function walk ( value, pairs ) {
	if ( Array.isArray( value ) ) {
		for ( const item of value ) {
			walk( item, pairs );
		}

		return;
	}

	if ( value === null || typeof value !== 'object' ) {
		return;
	}

	const pair = pairFromObject( value );
	if ( pair ) {
		pairs.push( pair );
		return;
	}

	if ( isStringMap( value ) ) {
		for ( const [ en, grc ] of Object.entries( value ) ) {
			pairs.push({ en, grc });
		}

		return;
	}

	for ( const key of WRAPPER_KEYS ) {
		if ( Object.prototype.hasOwnProperty.call( value, key ) ) {
			walk( value[key], pairs );
		}
	}
}

function hasExplicitEasyShape ( value ) {
	if ( Array.isArray( value ) ) {
		return value.some( item => pairFromObject( item ) !== null );
	}

	if ( value === null || typeof value !== 'object' ) {
		return false;
	}

	if ( pairFromObject( value ) ) {
		return true;
	}

	if ( isStringMap( value ) ) {
		return true;
	}

	return WRAPPER_KEYS.some( key => (
		Object.prototype.hasOwnProperty.call( value, key ) &&
		hasExplicitEasyShape( value[key] )
	) );
}

function pairFromObject ( value ) {
	if ( value === null || typeof value !== 'object' || Array.isArray( value ) ) {
		return null;
	}

	const en = firstString( value, PAIR_EN_KEYS );
	const grc = firstString( value, PAIR_GRC_KEYS );
	if ( en === null || grc === null ) {
		return null;
	}

	return { en, grc };
}

function firstString ( value, keys ) {
	for ( const key of keys ) {
		if ( typeof value[key] === 'string' && value[key].trim() !== '' ) {
			return value[key];
		}
	}

	return null;
}

function isStringMap ( value ) {
	const entries = Object.values( value );
	return entries.length > 0 && entries.every( entry => typeof entry === 'string' );
}

function uniquePairs ( pairs ) {
	const byGloss = new Map();
	for ( const pair of pairs ) {
		const en = pair.en.trim().toLowerCase()
			.replace( /\s+/gu, ' ' );
		const grc = pair.grc.trim();
		if ( en === '' || grc === '' ) {
			continue;
		}

		byGloss.set( en, grc );
	}

	return [ ...byGloss ].map( ( [ en, grc ] ) => ({ en, grc }) );
}

export {
	looksLikeDiathesisEasy,
	looksLikeStockAnki,
	parseDiathesisEasy
};