import {
  basicTypeOfUnion,
  capitalize,
  membersOfUnion,
  uniquePathWithMember,
  uniquePathWithMethodParameter,
  uniquePathWithMethodReturnType,
} from '../utils';
import {
  isArraryType,
  isInterfaceType,
  isDictionaryType,
  isEnumType,
  isOptionalType,
  Module,
  ValueType,
  InterfaceType,
  EnumType,
  TupleType,
  isTupleType,
  ValueTypeKind,
  isLiteralType,
  EnumSubType,
  LiteralType,
  isUnionType,
  isBasicType,
  isPredefinedType,
  UnionType,
  isVoidType,
  VoidType,
} from '../types';

export const enum ValueTypeSource {
  Field = 1 << 0,
  Parameter = 1 << 1,
  Return = 1 << 2,
}

export type NamedType = InterfaceType | EnumType | UnionType | VoidType;
export interface NamedTypeInfo {
  type: NamedType;
  source: ValueTypeSource;
}

export interface ParsedModule extends Module {
  associatedTypes: NamedTypeInfo[];
}

export interface ParsedTarget {
  modules: ParsedModule[];
  sharedTypes: NamedTypeInfo[];
}

export type NamedTypesResult = { associatedTypes: Record<string, NamedTypeInfo[]>; sharedTypes: NamedTypeInfo[] };

export function dropIPrefixInCustomTypes(modules: Module[]): void {
  modules
    .flatMap((module) => fetchRootTypes(module))
    .forEach(({ valueType, uniquePath }) => {
      recursiveVisitMembersType(
        valueType,
        (namedType) => {
          if (!isInterfaceType(namedType)) {
            return;
          }

          namedType.name = namedType.name?.replace(/^I/, '');
        },
        uniquePath
      );
    });
}

export function parseTarget(modules: Module[]): ParsedTarget {
  const namedTypes = fetchNamedTypes(modules);

  return {
    modules: modules.map((module) => ({
      ...module,
      associatedTypes: namedTypes.associatedTypes[module.name] ?? [],
    })),
    sharedTypes: namedTypes.sharedTypes,
  };
}

export function extractTargetsSharedTypes(targets: ParsedTarget[]): NamedTypeInfo[] {
  const typeTargetsMap: Record<string, [NamedTypeInfo, Set<ParsedTarget>]> = {};

  targets.forEach((target) => {
    target.modules
      .flatMap((module) => module.associatedTypes)
      .concat(target.sharedTypes)
      .forEach((typeInfo) => {
        const existingValue = typeTargetsMap[typeInfo.type.name] ?? [typeInfo, new Set()];
        existingValue[1].add(target);
        typeTargetsMap[typeInfo.type.name] = existingValue;
      });
  });

  const sharedTypes = Object.entries(typeTargetsMap)
    .filter(([, [, targetSet]]) => targetSet.size > 1)
    .map(([, [namedType]]) => namedType);

  const sharedTypeNames = new Set(sharedTypes.map(({ type }) => type.name));

  targets.forEach((target) => {
    target.modules.forEach((module) => {
      module.associatedTypes = module.associatedTypes.filter((typeInfo) => !sharedTypeNames.has(typeInfo.type.name));
    });
    target.sharedTypes = target.sharedTypes.filter((typeInfo) => !sharedTypeNames.has(typeInfo.type.name));
  });

  return sharedTypes;
}

function fetchNamedTypes(modules: Module[]): NamedTypesResult {
  const typeMap: Record<string, { namedType: NamedType; source: ValueTypeSource; associatedModules: Set<string> }> = {};

  modules.forEach((module) => {
    fetchRootTypes(module).forEach(({ valueType, source, uniquePath }) => {
      recursiveVisitMembersType(
        valueType,
        (membersType, path) => {
          let namedType = membersType;
          if (isTupleType(namedType)) {
            namedType = membersType as unknown as InterfaceType;
            namedType.kind = ValueTypeKind.interfaceType;
            namedType.name = path;
            namedType.documentation = '';
            namedType.customTags = {};
          } else if (isLiteralType(namedType)) {
            const subType = basicTypeOfUnion(namedType);
            const members = membersOfUnion(namedType);

            namedType = membersType as unknown as EnumType;
            namedType.kind = ValueTypeKind.enumType;
            namedType.name = path;
            namedType.subType = subType === 'number' ? EnumSubType.number : EnumSubType.string;
            namedType.members = members;
            namedType.documentation = '';
            namedType.customTags = {};
          } else if (isUnionType(namedType)) {
            namedType.name = path;
          } else if (isVoidType(namedType)) {
            (namedType as VoidType & { name: string }).name = 'void';
          }

          if ('name' in namedType && typeMap[namedType.name] === undefined) {
            typeMap[namedType.name] = { namedType, source, associatedModules: new Set() };
          }

          if ('name' in namedType) {
            const existingResult = typeMap[namedType.name];
            existingResult.associatedModules.add(module.name);
            existingResult.source |= source;
          }
        },
        uniquePath
      );
    });
  });

  const sharedTypes: NamedTypeInfo[] = [];

  Object.values(typeMap).forEach(({ namedType, source }) => {
    sharedTypes.push({ type: namedType, source });
  });

  return { associatedTypes: {}, sharedTypes };
}

function fetchRootTypes(module: Module): { valueType: ValueType; source: ValueTypeSource; uniquePath: string }[] {
  const typesInMembers: ReturnType<typeof fetchRootTypes> = module.members.map((field) => ({
    valueType: field.type,
    source: ValueTypeSource.Field,
    uniquePath: uniquePathWithMember(module.name, field.name),
  }));
  const typesInMethods: ReturnType<typeof fetchRootTypes> = module.methods.flatMap((method) =>
    method.parameters
      .map((parameter) => ({
        valueType: parameter.type,
        source: ValueTypeSource.Parameter,
        uniquePath: uniquePathWithMethodParameter(module.name, method.name, parameter.name),
      }))
      .concat(
        method.returnType
          ? [
            {
              valueType: method.returnType,
              source: ValueTypeSource.Return,
              uniquePath: uniquePathWithMethodReturnType(module.name, method.name),
            },
          ]
          : []
      )
  );

  return typesInMembers.concat(typesInMethods);
}

function recursiveVisitMembersType(
  valueType: ValueType,
  visit: (membersType: NamedType | TupleType | LiteralType | UnionType | VoidType, path: string) => void,
  path: string
): void {
  if (isInterfaceType(valueType)) {
    visit(valueType, path);

    valueType.members.forEach((member) => {
      recursiveVisitMembersType(member.type, visit, uniquePathWithMember(valueType.name, member.name));
    });

    return;
  }

  if (isTupleType(valueType)) {
    visit(valueType, path);

    valueType.members.forEach((member) => {
      recursiveVisitMembersType(member.type, visit, uniquePathWithMember(path, member.name));
    });

    return;
  }

  if (isEnumType(valueType)) {
    visit(valueType, path);
    return;
  }

  if (isArraryType(valueType)) {
    recursiveVisitMembersType(valueType.elementType, visit, `${path}Element`);
    return;
  }

  if (isDictionaryType(valueType)) {
    recursiveVisitMembersType(valueType.valueType, visit, `${path}Value`);
    return;
  }

  if (isOptionalType(valueType)) {
    recursiveVisitMembersType(valueType.wrappedType, visit, `${path}`);
    return;
  }

  if (isLiteralType(valueType)) {
    visit(valueType, path);
    return;
  }

  if (isUnionType(valueType)) {
    visit(valueType, path);
    valueType.members.forEach((member) => {
      let subType: string;
      if (isBasicType(member)) {
        subType = member.value;
      } else if ((member as NamedType).name !== undefined) {
        subType = (member as NamedType).name;
      } else {
        subType = member.kind;
      }
      recursiveVisitMembersType(member, visit, `${path}${capitalize(subType)}`);
    });
    return;
  }

  if (isBasicType(valueType)) {
    // string, boolean, etc.
    return;
  }

  if (isPredefinedType(valueType)) {
    // CodeGen_Int, etc.
    return;
  }

  if (isVoidType(valueType)) {
    visit(valueType, path);
    return;
  }


  throw Error(`Unhandled value type ${JSON.stringify(valueType)}`);
}
