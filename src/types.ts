import { NamedTypeInfo } from "./generator/named-types";

export interface Module {
  name: string;
  members: Field[];
  methods: Method[];
  documentation: string;
  exportedInterfaceBases: string[];
  customTags: Record<string, unknown>;
  associatedTypes: NamedTypeInfo[];
}

export interface Method {
  name: string;
  parameters: Field[];
  returnType: ValueType | null;
  isAsync: boolean;
  documentation: string;
}

export interface Field {
  name: string;
  type: ValueType;
  staticValue?: Value;
  documentation: string;
  defaultValue?: string;
}

export type ValueType = NonEmptyType | OptionalType;
export type NonEmptyType =
  | BasicType
  | InterfaceType
  | TupleType
  | EnumType
  | ArrayType
  | DictionaryType
  | PredefinedType
  | LiteralType
  | UnionType
  | VoidType;

export enum ValueTypeKind {
  basicType = 'basicType',
  interfaceType = 'interfaceType',
  tupleType = 'tupleType',
  enumType = 'enumType',
  arrayType = 'arrayType',
  dictionaryType = 'dictionaryType',
  optionalType = 'optionalType',
  predefinedType = 'predefinedType',
  literalType = 'literalType',
  unionType = 'unionType',
  voidType = 'voidType',
}

interface BaseValueType {
  kind: ValueTypeKind;
}

export enum BasicTypeValue {
  string = 'string',
  number = 'number',
  boolean = 'boolean',
}

export interface BasicType extends BaseValueType {
  kind: ValueTypeKind.basicType;
  value: BasicTypeValue;
}
export interface InterfaceType extends BaseValueType, Omit<Module, 'exportedInterfaceBases'> {
  kind: ValueTypeKind.interfaceType;
}

export interface TupleType extends BaseValueType {
  kind: ValueTypeKind.tupleType;
  members: Field[];
}

export enum EnumSubType {
  string = 'string',
  number = 'number',
}

export interface EnumField {
  key: string;
  value: string | number;
  documentation: string;
}

export interface EnumType extends BaseValueType {
  kind: ValueTypeKind.enumType;
  name: string;
  subType: EnumSubType;
  members: EnumField[];
  documentation: string;
  customTags: Record<string, unknown>;
}

export interface ArrayType extends BaseValueType {
  kind: ValueTypeKind.arrayType;
  elementType: ValueType;
}

export enum DictionaryKeyType {
  string = 'string',
  number = 'number',
}

export interface DictionaryType extends BaseValueType {
  kind: ValueTypeKind.dictionaryType;
  keyType: DictionaryKeyType;
  valueType: ValueType;
}

export interface OptionalType extends BaseValueType {
  kind: ValueTypeKind.optionalType;
  wrappedType: NonEmptyType;
}

export interface PredefinedType extends BaseValueType {
  kind: ValueTypeKind.predefinedType;
  name: string;
}

export type UnionLiteralType = string | number;

export interface LiteralType extends BaseValueType {
  kind: ValueTypeKind.literalType;
  memberType: BasicTypeValue.string | BasicTypeValue.number;
  members: UnionLiteralType[];
}

export interface UnionType extends BaseValueType {
  name: string;
  kind: ValueTypeKind.unionType;
  members: ValueType[];
  customTags: Record<string, unknown>;
}

export interface VoidType extends BaseValueType {
  kind: ValueTypeKind.voidType;
  name: string;
  customTags: Record<string, unknown>;
  documentation: string;
}

export type NamedType = InterfaceType | EnumType | UnionType | VoidType;

export function isBasicType(valueType: ValueType): valueType is BasicType {
  return valueType.kind === ValueTypeKind.basicType;
}

export function isInterfaceType(valueType: ValueType): valueType is InterfaceType {
  return valueType.kind === ValueTypeKind.interfaceType;
}

export function isTupleType(valueType: ValueType): valueType is TupleType {
  return valueType.kind === ValueTypeKind.tupleType;
}

export function isEnumType(valueType: ValueType): valueType is EnumType {
  return valueType.kind === ValueTypeKind.enumType;
}

export function isArraryType(valueType: ValueType): valueType is ArrayType {
  return valueType.kind === ValueTypeKind.arrayType;
}

export function isDictionaryType(valueType: ValueType): valueType is DictionaryType {
  return valueType.kind === ValueTypeKind.dictionaryType;
}

export function isOptionalType(valueType: ValueType): valueType is OptionalType {
  return valueType.kind === ValueTypeKind.optionalType;
}

export function isPredefinedType(valueType: ValueType): valueType is PredefinedType {
  return valueType.kind === ValueTypeKind.predefinedType;
}

export function isLiteralType(valueType: ValueType): valueType is LiteralType {
  return valueType.kind === ValueTypeKind.literalType;
}

export function isUnionType(valueType: ValueType): valueType is UnionType {
  return valueType.kind === ValueTypeKind.unionType;
}

export function isVoidType(valueType: ValueType): valueType is VoidType {
  return valueType.kind === ValueTypeKind.voidType;
}

// TODO: Define these types to support recursive definition
type BaseValue = string | number | boolean | Record<string, unknown> | null;
export type Value = BaseValue | BaseValue[] | Record<string | number, BaseValue>;
