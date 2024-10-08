import { ValueTypeSource } from '../../generator/named-types';
import { InterfaceType } from '../../types';
import { getDocumentationLines } from '../utils';
import { ValueTransformer } from '../value-transformer';
import { BaseTypeView } from './BaseTypeView';

export class InterfaceTypeView extends BaseTypeView {
  constructor(
    private readonly interfaceType: InterfaceType,
    source: ValueTypeSource,
    valueTransformer: ValueTransformer
  ) {
    super(source, valueTransformer);
    this.custom = true;
  }

  get typeName(): string {
    return this.valueTransformer.convertValueType(this.interfaceType);
  }

  get members(): { name: string; type: string; documentationLines: string[]; last: boolean, defaultValue?: string }[] {
    const members = this.interfaceType.members.filter((member) => member.staticValue === undefined);

    return members.map((member, index) => ({
      name: member.name,
      type: this.valueTransformer.convertValueType(member.type),
      documentationLines: getDocumentationLines(member.documentation),
      last: index === members.length - 1,
      defaultValue: member.defaultValue,
    }));
  }

  get staticMembers(): { name: string; type: string; value: string; documentationLines: string[] }[] {
    return this.interfaceType.members
      .filter((member) => member.staticValue !== undefined)
      .map((member) => {
        if (member.staticValue === undefined) {
          throw Error('Value is undefined');
        }

        return {
          name: member.name,
          type: this.valueTransformer.convertValueType(member.type),
          value: this.valueTransformer.convertValue(member.staticValue, member.type),
          documentationLines: getDocumentationLines(member.documentation),
        };
      });
  }

  get documentationLines(): string[] {
    return getDocumentationLines(this.interfaceType.documentation);
  }

  get customTags(): Record<string, unknown> {
    return this.interfaceType.customTags;
  }

  get isFromParameter(): boolean {
    return (this.source & ValueTypeSource.Parameter) === ValueTypeSource.Parameter;
  }

  get isFromReturn(): boolean {
    return (this.source & ValueTypeSource.Return) === ValueTypeSource.Return;
  }
}
