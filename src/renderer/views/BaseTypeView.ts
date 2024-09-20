import { ValueTypeSource } from '../../generator/named-types';
import { ValueTransformer } from '../value-transformer';

export abstract class BaseTypeView {
    public custom: boolean = false;
    public enum: boolean = false;
    public unionType: boolean = false;
    public voidType: boolean = false;
  
    constructor(
        protected readonly source: ValueTypeSource,
        protected readonly valueTransformer: ValueTransformer
    ) { }

    abstract get typeName(): string;
    abstract get documentationLines(): string[];
    abstract get customTags(): Record<string, unknown>;

    get isFromParameter(): boolean {
        return (this.source & ValueTypeSource.Parameter) === ValueTypeSource.Parameter;
    }

    get isFromReturn(): boolean {
        return (this.source & ValueTypeSource.Return) === ValueTypeSource.Return;
    }
}