import type { Infer, Type, TypeBase } from "reflect-types";
import type { Subject } from "rxjs";

export class SubjectType<T extends TypeBase = TypeBase> implements TypeBase {

  readonly kind = 'subject';

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

