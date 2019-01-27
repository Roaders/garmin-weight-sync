
export function isInterface<T>(sample: T, test: any): test is T{

    const keyValues = Object.keys(sample)
        .map(key => ({key, value: test[key]}));

    const missingKeys = keyValues.filter(keyValue => keyValue.value == null)
        .map(keyValue => keyValue.key)
        .join(", ");

    return keyValues
        .every(keyValue => keyValue.value != null);
}

export function mapToSample<T>(sample: T, source: T): T{
    const result: T = {} as any;

    for(let propertyName in sample){
        if(source[propertyName] == null){
            break;
        }

        result[propertyName] = source[propertyName];
    }

    return result;
}
