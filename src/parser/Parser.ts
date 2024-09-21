import ts from 'typescript';
import { glob } from 'glob';
import path from 'path';
import { NamedTypeInfo, ValueTypeSource } from '../generator/named-types';
import { EnumSubType, Field, Method, Module, ValueTypeKind, isInterfaceType } from '../types';
import { ValueParser } from './ValueParser';
import { parseTypeJSDocTags } from './utils';
import { ParserLogger } from '../logger/ParserLogger';

export class Parser {
  private program: ts.Program;

  private checker: ts.TypeChecker;

  private valueParser: ValueParser;

  constructor(
    globPatterns: string[],
    predefinedTypes: Set<string>,
    skipInvalidMethods = false,
    private readonly exportedInterfaceBases: Set<string> | undefined,
    tsconfigPath: string | undefined
  ) {
    const filePaths = globPatterns.flatMap((pattern) => glob.sync(pattern));

    if (tsconfigPath !== undefined) {
      const basePath = path.parse(tsconfigPath).dir;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const { config } = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
      const { options, projectReferences, errors } = ts.parseJsonConfigFileContent(config, ts.sys, basePath);
      this.program = ts.createProgram({
        rootNames: filePaths,
        options,
        configFileParsingDiagnostics: errors,
        projectReferences,
      });
    } else {
      this.program = ts.createProgram({
        rootNames: filePaths,
        options: {},
      });
    }

    this.checker = this.program.getTypeChecker();
    this.valueParser = new ValueParser(
      this.checker,
      predefinedTypes,
      new ParserLogger(this.checker),
      skipInvalidMethods
    );
  }

  parse(): Module[] {
    const modules: Module[] = [];

    this.program.getRootFileNames().forEach((fileName) => {
      const sourceFile = this.program.getSourceFile(fileName);
      if (sourceFile === undefined) {
        throw Error('Source file not found');
      }
      this.traverseNode(sourceFile, modules);
    });

    return modules;
  }

  private traverseNode(node: ts.Node, modules: Module[]): void {
    if (ts.isModuleDeclaration(node) && node.name.text === 'global') {
      if (node.body && ts.isModuleBlock(node.body)) {
        node.body.statements.forEach((statement) => this.traverseNode(statement, modules));
      }
    } else if (ts.isInterfaceDeclaration(node)) {
      const module = this.moduleFromNode(node);
      if (module !== null) {
        modules.push(module);
      }
    }

    // Recursively traverse child nodes
    ts.forEachChild(node, (child) => this.traverseNode(child, modules));
  }

  private moduleFromNode(node: ts.InterfaceDeclaration): Module | null {
    const symbol = this.checker.getSymbolAtLocation(node.name);
    if (symbol === undefined) {
      throw Error('Invalid module node');
    }

    const exportedInterfaceBases =
      node.heritageClauses?.flatMap((heritageClause) => heritageClause.types.map((type) => type.getText())) ?? [];

    const jsDocTagsResult = parseTypeJSDocTags(symbol);

    if (this.exportedInterfaceBases !== undefined) {
      if (!exportedInterfaceBases.some((extendedInterface) => this.exportedInterfaceBases?.has(extendedInterface))) {
        return null;
      }
    } else if (node.name.text !== 'HostMethods' && !jsDocTagsResult.shouldExport) {
      return null;
    }

    const result = this.valueParser.parseInterfaceType(node);
    if (result && isInterfaceType(result)) {
      const logLevelEnum = this.createLogLevelEnum();
      const convertedMethods = this.convertHostMethodsToMethods(result.members);
      return {
        name: result.name,
        members: [],
        methods: convertedMethods,
        documentation: result.documentation,
        exportedInterfaceBases,
        customTags: result.customTags,
        associatedTypes: [logLevelEnum],
      };
    }
  
    return null;
  }
  
  private convertHostMethodsToMethods(members: Field[]): Method[] {
    return members.map(member => ({
      name: member.name,
      parameters: [
        {
          name: 'args',
          type: (member.type as any).members.find((m: any) => m.name === 'params').type,
          documentation: '',
        }
      ],
      returnType: (member.type as any).members.find((m: any) => m.name === 'result').type,
      isAsync: false,
      documentation: member.documentation,
    }));
  }

  private createLogLevelEnum(): NamedTypeInfo {
    return {
      type: {
        kind: ValueTypeKind.enumType,
        name: 'LogLevel',
        subType: EnumSubType.string,
        members: [
          { key: 'debug', value: 'debug', documentation: '' },
          { key: 'info', value: 'info', documentation: '' },
          { key: 'warning', value: 'warning', documentation: '' },
          { key: 'error', value: 'error', documentation: '' },
        ],
        documentation: '',
        customTags: {},
      },
      source: ValueTypeSource.Field | ValueTypeSource.Parameter | ValueTypeSource.Return,
    };
  }

  private createVoidType(): NamedTypeInfo {
    return {
      type: {
        kind: ValueTypeKind.voidType,
        name: 'void',
        customTags: {},
        documentation: 'Represents void type',
      },
      source: ValueTypeSource.Return,
    };
  }

}
