import chalk from 'chalk';
import { NamedType } from './generator/named-types';
import {
  Field,
  isArraryType,
  isBasicType,
  isInterfaceType,
  isDictionaryType,
  isEnumType,
  isOptionalType,
  isPredefinedType,
  Method,
  Module,
  ValueType,
  Value,
  isUnionType,
  isVoidType
} from './types';

const keywordColor = chalk.green;
const identifierColor = chalk.blue;
const typeColor = chalk.yellow;
const valueColor = chalk.cyan;
const documentationColor = chalk.gray;

export function serializeModule(module: Module, associatedTypes: NamedType[]): string {
  const serializedAssociatedTypes = associatedTypes.map((associatedType) => serializeNamedType(associatedType));
  const customTags =
    Object.keys(module.customTags).length > 0 ? `Custom tags: ${JSON.stringify(module.customTags)}\n` : '';

  return `${serializeDocumentation(module.documentation)}${documentationColor(customTags)}${keywordColor('Module')} ${module.name
    } {
${module.members
      .map((member) => `${serializeDocumentation(member.documentation)}${keywordColor('var')} ${serializeField(member)}`)
      .join('\n')
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n')}

${module.methods
      .map((method) =>
        serializeMethod(method)
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n')
      )
      .join('\n')}${serializedAssociatedTypes.length > 0
        ? `\n\n${serializedAssociatedTypes
          .join('\n')
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n')}`
        : ''
    }
}`;
}

export function serializeNamedType(namedType: NamedType): string {
  const customTags =
    Object.keys(namedType.customTags).length > 0 ? `Custom tags: ${JSON.stringify(namedType.customTags)}\n` : '';

  if (isInterfaceType(namedType)) {
    return `${serializeDocumentation(namedType.documentation)}${documentationColor(customTags)}${keywordColor(
      'Type'
    )} ${namedType.name} {
${namedType.members
        .map((member) => `${serializeDocumentation(member.documentation)}${keywordColor('var')} ${serializeField(member)}`)
        .join('\n')
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n')}
}`;
  }
  if (isEnumType(namedType)) {
    return `${serializeDocumentation(namedType.documentation)}${documentationColor(customTags)}${keywordColor('Enum')} ${namedType.name
      } {
  ${namedType.members
        .map(
          (member) =>
            `${serializeDocumentation(member.documentation)}${identifierColor(member.key)} = ${valueColor(member.value)}`
        )
        .join('\n')
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n')}
  }`;
  }
  if (isUnionType(namedType)) {
    return `${documentationColor(customTags)}
  ${namedType.members
        .map(
          (member) =>
            serializeValueType(member)
        )
        .join(' | ')}`;
  }
  if (isVoidType(namedType)) {
    return `${serializeDocumentation(namedType.documentation)}${documentationColor(customTags)}${keywordColor('Type')} ${namedType.name} {
  ${typeColor('void')}
}`;
  }

  throw Error(`Unhandled value type ${JSON.stringify(namedType)}`);
}

function serializeMethod(method: Method): string {
  const serializedReturnType =
    method.returnType !== null ? `: ${typeColor(serializeValueType(method.returnType))}` : '';
  return `${serializeDocumentation(method.documentation)}${keywordColor('func')} ${identifierColor(
    method.name
  )}(${method.parameters
    .map((parameter) => `${parameter.name}: ${typeColor(serializeValueType(parameter.type))}`)
    .join(', ')})${serializedReturnType}`;
}

function serializeField(field: Field): string {
  const staticValue =
    field.staticValue !== undefined ? ` = ${serializeStaticValue(field.staticValue, field.type)}` : '';
  return `${identifierColor(field.name)}: ${typeColor(serializeValueType(field.type))}${staticValue}`;
}

function serializeValueType(valueType: ValueType): string {
  if (isBasicType(valueType)) {
    return valueType.value;
  }
  if (isInterfaceType(valueType)) {
    return valueType.name;
  }
  if (isEnumType(valueType)) {
    return valueType.name;
  }
  if (isArraryType(valueType)) {
    return `[${serializeValueType(valueType.elementType)}]`;
  }
  if (isDictionaryType(valueType)) {
    return `[${valueType.keyType}: ${serializeValueType(valueType.valueType)}]`;
  }
  if (isOptionalType(valueType)) {
    return `${serializeValueType(valueType.wrappedType)}?`;
  }
  if (isPredefinedType(valueType)) {
    return valueType.name;
  }
  if (isUnionType(valueType)) {
    return valueType.name;
  }
  if (isVoidType(valueType)) {
    return 'void';
  }

  throw Error(`Unhandled value type ${JSON.stringify(valueType)}`);
}

function serializeStaticValue(value: Value, type: ValueType): string {
  if (isEnumType(type)) {
    return `${type.name}.${value as string}`;
  }

  return JSON.stringify(value);
}

function serializeDocumentation(documentation: string): string {
  if (documentation.length === 0) {
    return '';
  }

  return documentationColor(`/**
${documentation
      .split('\n')
      .map((line) => ` * ${line}`)
      .join('\n')}
 */
`);
}
