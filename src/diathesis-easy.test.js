import { dirname, join } from 'node:path';
import {
	looksLikeDiathesisEasy,
	looksLikeStockAnki,
	parseDiathesisEasy
} from './diathesis-easy.js';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = join( dirname( fileURLToPath( import.meta.url ) ), '..' );

const expected = [
	{ en: 'word', grc: 'λόγος' },
	{ en: 'love', grc: 'ἀγάπη' },
	{ en: 'human', grc: 'ἄνθρωπος' },
	{ en: 'god', grc: 'θεός' },
	{ en: 'life', grc: 'ζωή' },
	{ en: 'beginning', grc: 'ἀρχή' },
	{ en: 'wisdom', grc: 'σοφία' },
	{ en: 'good news', grc: 'εὐαγγέλιον' }
];

test( 'sample glosses match the page dictionary pattern', () => {
	const glosses = expected.map( pair => pair.en )
		.sort( ( a, b ) => b.length - a.length );
	const matchWords = new RegExp(
		'(?<=^|[\\P{L}])(?<![0-9])(' +
			'(?<dictionaryWord>' + glosses.map( gloss => gloss.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) ).join( '|' ) + ')|' +
			'(?:\\p{L}+(?:[\'’]\\p{L}+)*)' +
		')(?![0-9])(?=$|\\P{L})',
		'gui'
	);
	const sentence = 'In the beginning was the word, and the good news.';
	const hits = [];
	let matched;
	while ( ( matched = matchWords.exec( sentence ) ) !== null ) {
		if ( matched.groups?.dictionaryWord !== undefined ) {
			hits.push( matched[0].toLowerCase() );
		}
	}

	assert.deepEqual( hits, [ 'beginning', 'word', 'good news' ] );
});

test( 'sample text and JSON are the same en→grc list', () => {
	const text = readFileSync( join( root, 'examples', 'diathesis-easy-en-grc.txt' ), 'utf8' );
	const json = readFileSync( join( root, 'examples', 'diathesis-easy-en-grc.json' ), 'utf8' );

	assert.deepEqual( parseDiathesisEasy( text ), expected );
	assert.deepEqual( parseDiathesisEasy( json ), expected );
	assert.equal( looksLikeDiathesisEasy( text ), true );
	assert.equal( looksLikeDiathesisEasy( json ), true );
	assert.equal( looksLikeStockAnki( text ), false );
});

test( 'metadata fields are not dictionary keys', () => {
	const pairs = parseDiathesisEasy( JSON.stringify({
		app: 'diathesis',
		kind: 'diathesis-easy-lexicon',
		words: [ {
			cardId: 'sample-logos',
			sourceId: 'lemma:logos',
			easyStreak: 7,
			en: 'Word',
			grc: 'Λόγος'
		} ]
	}) );

	assert.deepEqual( pairs, [ { en: 'word', grc: 'Λόγος' } ] );
});

test( '#columns:grc;en reads Greek first and a later gloss wins', () => {
	const text = [
		'#columns:grc;en',
		'λόγος;Word',
		'ἀγάπη;LOVE',
		'ῥῆμα;word'
	].join( '\n' );

	assert.deepEqual( parseDiathesisEasy( text ), [
		{ en: 'word', grc: 'ῥῆμα' },
		{ en: 'love', grc: 'ἀγάπη' }
	] );
});

test( 'tab rows and extra columns are accepted', () => {
	const text = [
		'#diathesis:easy',
		'#separator:tab',
		'god\tθεός\tcard-1\t7'
	].join( '\n' );

	assert.deepEqual( parseDiathesisEasy( text ), [ { en: 'god', grc: 'θεός' } ] );
});

test( 'a gloss map is en→grc, including a gloss named kind', () => {
	assert.deepEqual( parseDiathesisEasy( '{"human":"ἄνθρωπος","kind":"γένος"}' ), [
		{ en: 'human', grc: 'ἄνθρωπος' },
		{ en: 'kind', grc: 'γένος' }
	] );
});

test( 'stock Anki text is not a Diathesis file', () => {
	const text = '#notetype:Basic (and reversed card)\n#separator:;\n#columns:Front;Back\nλόγος;word\n';
	assert.equal( looksLikeStockAnki( text ), true );
	assert.equal( looksLikeDiathesisEasy( text ), false );
});

test( 'a Diathesis header wins over a stock Anki header', () => {
	const text = '#diathesis:easy\n#notetype:Basic\nword;λόγος\n';
	assert.equal( looksLikeDiathesisEasy( text ), true );
	assert.equal( looksLikeStockAnki( text ), false );
});

test( 'invalid JSON throws and empty input imports nothing', () => {
	assert.deepEqual( parseDiathesisEasy( '   ' ), [] );
	assert.equal( looksLikeDiathesisEasy( '{' ), false );
	assert.throws( () => parseDiathesisEasy( '{' ), /could not be parsed/ );
});