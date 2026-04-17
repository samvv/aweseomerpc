import { registerValidator, ValidationError, type Infer, type PropertyPath, type RecurseFn, type Type, type TypeBase } from "reflect-types";
import { BehaviorSubject, Subject } from "rxjs";

export class SubjectType<T extends TypeBase = TypeBase> implements TypeBase {

  readonly kind = 'rxjs.subject';

  __type!: Subject<Infer<T>>;

  constructor(
    public valueType: T,
  ) {

  }

}

declare module "reflect-types" {
  interface Types {
    'rxjs.subject': SubjectType;
  }
}

export function subject<T extends Type>(valueType: T): SubjectType<T> {
  return new SubjectType(valueType);
}

export function* validateSubject(value: any, path: PropertyPath) {
  if (!(value instanceof Subject)) {
    yield new ValidationError(path, `value must be a Subject`);
    return;
  }
  // Events are not validated
  return value;
}

registerValidator("rxjs.subject", validateSubject);

export class BehaviorSubjectType<T extends TypeBase = TypeBase> implements TypeBase {

  readonly kind = 'rxjs.behavior-subject';

  __type!: BehaviorSubject<Infer<T>>;

  constructor(
    public valueType: T,
  ) {

  }

}

declare module "reflect-types" {
  interface Types {
    'rxjs.behavior-subject': BehaviorSubjectType;
  }
}

export function behaviorSubject<T extends Type>(valueType: T): BehaviorSubjectType<T> {
  return new BehaviorSubjectType(valueType);
}

export function* validateBehaviorSubject(value: any, path: PropertyPath, type: BehaviorSubjectType, recurse: RecurseFn) {
  if (!(value instanceof BehaviorSubject)) {
    yield new ValidationError(path, `value must be a BehaviorSubject`);
    return;
  }
  // Validate the current value
  yield* recurse(value.value, path, type.valueType as Type);
  // Events are not validated
  return value;
}

registerValidator("rxjs.behavior-subject", validateBehaviorSubject);

