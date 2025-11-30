interface Array<T> {
  contains(element: T): boolean;
}

interface Map<K, V>{
  some(predicate : (value?: V) => boolean): boolean;
  find(predicate : (value?: V) => boolean) : V | undefined;
}