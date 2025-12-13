export type CaslConditionValue =
  | string
  | number
  | boolean
  | null
  | CaslConditionValue[]
  | { [key: string]: CaslConditionValue };

export type CaslConditions = Record<string, CaslConditionValue> | null;
