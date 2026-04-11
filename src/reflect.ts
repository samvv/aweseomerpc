import type { Infer, Type, TypeBase } from "reflect-types";
import type { BehaviorSubject, Subject } from "rxjs";

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
    subject: SubjectType;
  }
}

export function subject<T extends Type>(valueType: T): SubjectType<T> {
  return new SubjectType(valueType);
}

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

