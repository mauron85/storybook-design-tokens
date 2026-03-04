export class SerializableMap<K, V> extends Map<K, V> {
  toJSON() {
    return Object.fromEntries(this);
  }
}

export class SerializableSet<V> extends Set<V> {
  toJSON() {
    return Array.from(this);
  }
}
