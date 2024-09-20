import { VoidType } from '../../types';
import { ValueTransformer } from '../value-transformer';
import { ValueTypeSource } from '../../generator/named-types';
import { BaseTypeView } from './BaseTypeView';

export class VoidTypeView extends BaseTypeView {
  public voidType = true;

  constructor(
    private readonly voidTypeValue: VoidType,
    source: ValueTypeSource,
    valueTransformer: ValueTransformer
  ) {
    super(source, valueTransformer);
  }

  get typeName(): string {
    return this.voidTypeValue.name;
  }

  get documentationLines(): string[] {
    return [this.voidTypeValue.documentation];
  }

  get customTags(): Record<string, unknown> {
    return this.voidTypeValue.customTags;
  }
}