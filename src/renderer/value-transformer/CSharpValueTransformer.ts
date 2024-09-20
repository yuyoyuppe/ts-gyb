import {
  BasicTypeValue,
  DictionaryKeyType,
  isArraryType,
  isBasicType,
  isInterfaceType,
  isDictionaryType,
  isEnumType,
  isOptionalType,
  isPredefinedType,
  ValueType,
  Value,
  isUnionType,
} from '../../types';
import { ValueTransformer } from './ValueTransformer';

export class CSharpValueTransformer implements ValueTransformer {
  constructor(private readonly typeNameMap: Record<string, string>) { }

  convertValueType(valueType: ValueType): string {
    if (isBasicType(valueType)) {
      switch (valueType.value) {
        case BasicTypeValue.string:
          return 'string';
        case BasicTypeValue.number:
          return 'double';
        case BasicTypeValue.boolean:
          return 'bool';
        default:
          throw Error('Type not exists');
      }
    }

    if (isInterfaceType(valueType)) {
      return this.convertTypeNameFromCustomMap(valueType.name);
    }

    if (isEnumType(valueType)) {
      return this.convertTypeNameFromCustomMap(valueType.name);
    }

    if (isArraryType(valueType)) {
      return `List<${this.convertValueType(valueType.elementType)}>`;
    }

    if (isDictionaryType(valueType)) {
      let keyType: string;
      switch (valueType.keyType) {
        case DictionaryKeyType.string:
          keyType = 'string';
          break;
        case DictionaryKeyType.number:
          keyType = 'int';
          break;
        default:
          throw Error('Type not exists');
      }

      return `Dictionary<${keyType}, ${this.convertValueType(valueType.valueType)}>`;
    }

    if (isOptionalType(valueType)) {
      return `${this.convertValueType(valueType.wrappedType)}?`;
    }

    if (isPredefinedType(valueType)) {
      return this.typeNameMap[valueType.name] ?? valueType.name;
    }

    if (isUnionType(valueType)) {
      return this.convertTypeNameFromCustomMap(valueType.name);
    }

    throw Error('Type not handled');
  }

  convertNonOptionalValueType(valueType: ValueType): string {
    if (isOptionalType(valueType)) {
      return this.convertValueType(valueType.wrappedType);
    }

    return this.convertValueType(valueType);
  }

  convertValue(value: Value, type: ValueType): string {
    if (isBasicType(type)) {
      switch (type.value) {
        case BasicTypeValue.boolean:
          return (value as boolean) ? 'true' : 'false';
        default:
          return JSON.stringify(value);
      }
    }

    if (isInterfaceType(type)) {
      throw Error('Custom type static value is not supported');
    }

    if (isEnumType(type)) {
      return `${type.name}.${this.convertEnumKey(value as string)}`;
    }

    if (isArraryType(type)) {
      return `new List<${this.convertValueType(type.elementType)}> { ${(value as Value[]).map((element) => this.convertValue(element, type.elementType)).join(', ')} }`;
    }

    if (isDictionaryType(type)) {
      const keyType = type.keyType === DictionaryKeyType.string ? 'string' : 'int';
      return `new Dictionary<${keyType}, ${this.convertValueType(type.valueType)}> { ${Object.entries(value as Record<string, Value>)
        .map(([key, element]) => `{ ${JSON.stringify(key)}, ${this.convertValue(element, type.valueType)} }`)
        .join(', ')} }`;
    }

    if (isOptionalType(type)) {
      if (value === null) {
        return 'null';
      }
      return this.convertValue(value, type.wrappedType);
    }

    if (isPredefinedType(type)) {
      throw Error('Predefined type static value is not supported');
    }

    throw Error('Value not handled');
  }

  convertEnumKey(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  convertTypeNameFromCustomMap(name: string): string {
    return this.typeNameMap[name] ?? name;
  }

  null(): string {
    return 'null';
  }
}