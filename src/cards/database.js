
/**
 * Removes undefined object keys.
 */
 export const pruneObjectKeys = object => {
    return Object.entries(object)
        .filter(([, v]) =>
            typeof v == 'object'
                ? (v != null && JSON.stringify(v)!='{}' && JSON.stringify(v)!='[]')
                : v != undefined
        ).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
};