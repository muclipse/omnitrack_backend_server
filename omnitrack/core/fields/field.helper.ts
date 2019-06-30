import PropertyHelper from "../properties/property.helper.base";
import { IFieldDbEntity } from '../db-entity-types';
import { FallbackPolicyResolver, DEFAULT_VALUE_POLICY_NULL, NullValueResolver, DEFAULT_VALUE_POLICY_FILL_WITH_LAST_ITEM, PreviousValueResolver } from "./fallback-policies";
import { EPropertyType } from "../properties/property.types";

export default abstract class FieldHelper {

  constructor(readonly type: number) {

  }

  abstract get typeName(): string

  abstract get typeNameForSerialization(): string

  abstract propertyKeys: Array<string>

  supportedFallbackPolicyKeys = new Map<string, FallbackPolicyResolver>(this.makeSupportedFallbackPolicies())

  abstract getPropertyHelper<T>(propertyKey: string): PropertyHelper<T>
  abstract getPropertyType(propertyKey: string): EPropertyType

  getParsedPropertyValue<T>(field: IFieldDbEntity, propertyKey: string): T {
    const propHelper = this.getPropertyHelper<T>(propertyKey)
    if (propHelper) {
      if(field.properties && field.properties[propertyKey]){
        return propHelper.parsePropertyValue(field.properties[propertyKey])
      }else return this.getPropertyDefaultValue(propertyKey)
    } else {
      throw new Error("Property helper is not implemented for " + this.type)
    }
  }

  getPropertyDefaultValue(propertyKey: string): any {
    return null
  }

  getPropertyConfig(propertyKey: string): any {
    return null
  }

  setPropertyValue<T>(field: IFieldDbEntity, propertyKey: string, value: T) {
    const propHelper = this.getPropertyHelper<T>(propertyKey)
    if (propHelper) {
      const sVal = propHelper.convertPropertyValueToPureJson(value)
      if (field.properties) {
        field.properties[propertyKey] = sVal
      } else {
        field.properties = { propertyKey: sVal }
      }

    } else {
      throw new Error("Property helper is not implemented for " + this.type)
    }
  }

  initialize(field: IFieldDbEntity) {
    this.propertyKeys.forEach(key => {
      this.setPropertyValue(field, key, this.getPropertyDefaultValue(key))
    })
  }

  mergeFieldProperties(source: IFieldDbEntity, dest: IFieldDbEntity, writeTo: IFieldDbEntity = dest) {
    this.propertyKeys.forEach(key => {
      this.setPropertyValue(writeTo, key, this.mergeFieldPropertyValue(source, dest, key, this.getParsedPropertyValue(source, key), this.getParsedPropertyValue(dest, key)))
    })
  }

  mergeFieldPropertyValue(source: IFieldDbEntity, dest: IFieldDbEntity, propertyKey: string, sourceValue: any, destValue: any): any {
    return sourceValue
  }

  abstract getPropertyName(propertyKey: string): string

  abstract getSmallIconType(field: IFieldDbEntity): string

  abstract formatFieldValue(attr: IFieldDbEntity, value: any): string

  makeSupportedFallbackPolicies(): Array<[string, FallbackPolicyResolver]> {
    return [
      [DEFAULT_VALUE_POLICY_NULL, new NullValueResolver()],
      [DEFAULT_VALUE_POLICY_FILL_WITH_LAST_ITEM, new PreviousValueResolver()]
    ]
  }
}