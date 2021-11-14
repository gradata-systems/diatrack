/**
 * Performs a recursive, deep merge of two objects. Does not modify the target object.
 */
export function mergeDeep(target: Record<string, any>, source: Record<string, any>, overwriteUndefined: boolean = false, overwriteNull: boolean = false): Record<string, any>
{
    const output = {...target};
    if (isObject(target) && isObject(source))
    {
        Object.keys(source).forEach(key => {
            if (isObject(source[key]))
            {
                if (!(key in target) || (overwriteUndefined && target[key] === undefined) || (overwriteNull && target[key] === null))
                    Object.assign(output, {[key]: source[key]});
                else
                    output[key] = mergeDeep(target[key], source[key], overwriteUndefined, overwriteNull);
            }
            else if (!(key in target) || (overwriteUndefined && source[key] !== undefined) && (overwriteNull && source[key] !== null))
            {
                Object.assign(output, {[key]: source[key]});
            }
        });
    }

    return output;
}

function isObject(item: Record<string, any>)
{
    return (item && typeof item === 'object' && !Array.isArray(item));
}
