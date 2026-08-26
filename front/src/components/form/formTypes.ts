export type FormInputType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "number"
  | "file"
  | "availability"
  | "password"
  | "email"
  | "hidden"
  | "checkbox"
  | "radio"
  | string;

export type ValidationTrigger = "blur" | "change" | "both";

export interface OptionObject {
  value: string;
  label: string;
}

export type SelectOption = string | OptionObject;

export interface AvailabilityDayConfig {
  enabled?: boolean;
  from?: string;
  to?: string;
}

export type AvailabilityValue = Record<string, AvailabilityDayConfig>;

export type ValidatorFn = (
  value: string | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
) => string | null | false | void;

export type OnValidationChangeFn = (isValid: boolean) => void;

export interface ValidatableElement {
  validate: () => boolean;
  isValid: () => boolean;
  getError: () => string | null;
}

export type CustomInputElement = (
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement
) &
  ValidatableElement;

export interface FormGroupConfig {
  type?: FormInputType;
  id?: string;
  name?: string;
  label?: string;
  value?: unknown;
  placeholder?: string;
  required?: boolean;
  accept?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: SelectOption[];
  multiple?: boolean;
  validator?: ValidatorFn | null;
  validationTrigger?: ValidationTrigger;
  additionalProps?: Record<string, unknown>;
  additionalNodes?: Node[];
  onValidationChange?: OnValidationChangeFn | null;
}

export interface DayState {
  enabled: boolean;
  from: string;
  to: string;
}