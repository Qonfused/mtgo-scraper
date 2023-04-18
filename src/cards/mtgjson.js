import fetch from 'node-fetch';

const API_PATH = 'https://mtgjson.com/api/v5/'

/**
 * Get MTGJSON 'atomic' data
 */
export const getAtomicData = async (type) => {
    const data = await fetch(`${API_PATH}Atomic${type}.json`)
        .then(res => res.json());
    return data.data;
};

/**
 * Get MTGJSON set data
 */
export const getSetCatalog = async (catalog) => {
    if (!catalog) catalog = await fetch(`${API_PATH}SetList.json`)
        .then(res => res.json());
    return [...new Set(catalog.data)]
        .map(obj => ({
            object: 'set',
            id: obj.code,
            name: obj.name,
            date: obj.releaseDate,
            type: obj.type,
            size: obj?.baseSetSize || obj?.totalSetSize
        }));
}