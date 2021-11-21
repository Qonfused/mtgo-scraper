import { pruneObjectKeys } from './database.js';

import { getAtomicData, getSetCatalog } from './mtgjson.js';
import { fetchBulkData, filterCatalog, getTagsCatalog } from './scryfall.js';

// magic.js constants
const FORMATS = ['standard', 'pioneer', 'historic', 'modern', 'legacy', 'vintage', 'pauper'];

const formatSetObjects = (set_catalog, card_catalog) => {
    return set_catalog
        .filter(obj =>
            [...new Set(
                card_catalog
                    .map(obj => obj.printings)
                    .flat(1)
            )].includes(obj.id)
        );
}

export const formatCardObjects = (card_catalog, setData) => {
    return card_catalog
        .map(card => pruneObjectKeys({
            // Evergreen Properties
            object: 'card',
            uid: card.oracle_id,
            name: card.name,
            colors: card?.colors
                // Assign cards like lands proper colorless ('C') color.
                ? (!card.colors.length ? [ 'C' ] : card.colors)
                : card.card_faces
                    .map(face => face.colors.length ? [ 'C' ] : face.colors)
                    .flat(1)
                    // Remove duplicate colors (e.g. ['R','G','R']).
                    .filter((item, pos, self) => self.indexOf(item) == pos),
            color_identity: (!card.color_identity.length)
                ? [ 'C' ]
                : card.color_identity,
            produced_mana: card?.produced_mana,
            cmc: card?.cmc,
            mana_cost: card?.mana_cost,
            power: card?.power
                ? card.power
                : (card?.card_faces ? card.card_faces.map(face => face.power) : null),
            toughness: card?.toughness
                ? card.toughness
                : (card?.card_faces ? card.card_faces.map(face => face.loyalty) : null),
            loyalty: card?.loyalty
                ? card.loyalty
                : (card?.card_faces ? card.card_faces.map(face => face.loyalty) : null),
            // May change per errata/oracle updates
            typeline: card?.type_line,
            supertypes: card?.supertypes,
            types: card?.types,
            subtypes: card?.subtypes,
            oracle_text: card?.oracle_text
                || (card.card_faces ? card.card_faces.map(face => face.oracle_text) : null),
            layout: card.layout,
            keywords: card?.keywords,
            // May update per new set release
            image: {
                printing: (card?.set || 'N/A').toUpperCase(),
                url: card?.image_uris?.png
                || card.card_faces
                    .map(face => face.image_uris.png)
                    .filter((item, pos, self) => self.indexOf(item) == pos),
                language: (card?.lang || 'N/A').toUpperCase(),
                high_res: card?.highres_image || false
            },
            printings: Object.fromEntries(
                [...new Set(
                    [...new Set(card?.printings)]
                        .map(_id =>
                            setData
                                .filter(obj => obj.id == _id)
                                ?.[0]?.type
                        ).sort()
                )].map(type => [type,
                    [...new Set(card?.printings)]
                        .map(_id =>
                            setData
                                .filter(obj => obj.id == _id && obj.type == type)
                                .sort((a, b) => (new Date(a.date) < new Date(b.date) ? 1 : -1))
                                ?.[0]?.id
                        ).filter(Boolean)
                ])
            ),
            // May update per B&R announcement (~16:00 UTC)
            legalities: Object.fromEntries(
                FORMATS.map(format => [format, card.legalities[format] || 'not_legal'])
            ),
            // May update daily (~03:30 UTC)
            tagger: card?.tags
                ? card.tags
                    .sort((a, b) => (a.count < b.count ? 1 : -1))
                    .map(obj => obj.name)
                : [],
        }));
}

/**
 * Formats an array of Scryfall card objects or Scryfall collection object into pruned collection object.
 */
export const formatCardsCollection = async (data) => {
    // Get Scryfall oracle-cards data
    if (!data) data = await fetchBulkData('oracle-cards');

    // Get Scryfall tags data.
    const tagData = await getTagsCatalog();

    // Get MTGJSON 'atomic' card data.
    const atomic_json = await getAtomicData('Cards');

    // Parse aggregate card and set catalogs
    const set_catalog = await getSetCatalog();
    const card_catalog = filterCatalog(data)
        .map(obj => ({
            ...obj,
            // Inject MTGJSON card props.
            types: [...new Set([
                ...(atomic_json?.[obj.name]?.[0]?.types || []),
                ...(atomic_json?.[obj.name]?.[1]?.types || [])
            ])],
            supertypes: [...new Set([
                ...(atomic_json?.[obj.name]?.[0]?.supertypes || []),
                ...(atomic_json?.[obj.name]?.[1]?.supertypes || [])
            ])],
            subtypes: [...new Set([
                ...(atomic_json?.[obj.name]?.[0]?.subtypes || []),
                ...(atomic_json?.[obj.name]?.[1]?.subtypes || [])
            ])],
            printings: atomic_json?.[obj.name]?.[0]?.printings,
            // Inject Tagger data.
            tags: tagData.filter(_obj => _obj.oracle_id == obj.oracle_id)?.[0]?.tags,
        }));

    // Filter and format cards/sets data
    const setData = formatSetObjects(set_catalog, card_catalog);
    const cardData = formatCardObjects(card_catalog, setData);
    
    return { sets: setData, cards: cardData, tags: tagData };
}