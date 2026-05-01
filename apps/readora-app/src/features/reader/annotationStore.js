import { ref } from 'vue';

function normalizeAnnotation(item) {
  return {
    value: item.value,
    color: item.color || 'yellow',
    style: item.style || 'highlight',
    text: item.text || '',
    note: item.note || '',
  };
}

export function isSyntheticAnnotation(annotation) {
  return String(annotation?.value || '').startsWith('readora-ai-note:');
}

export function createAnnotationStore() {
  const annotations = ref(new Map());
  const annotationsByValue = new Map();

  function clear() {
    annotations.value = new Map();
    annotationsByValue.clear();
  }

  function add(index, annotation) {
    const existing = annotationsByValue.get(annotation.value);
    if (existing) {
      remove(existing);
    }

    if (!annotations.value.has(index)) {
      annotations.value.set(index, []);
    }

    annotations.value.get(index).push(annotation);
    annotationsByValue.set(annotation.value, annotation);
  }

  function remove(annotation) {
    for (const [index, items] of annotations.value.entries()) {
      const targetIndex = items.indexOf(annotation);
      if (targetIndex === -1) {
        continue;
      }

      items.splice(targetIndex, 1);
      if (items.length === 0) {
        annotations.value.delete(index);
      }
      break;
    }

    annotationsByValue.delete(annotation.value);
  }

  function getByValue(value) {
    return annotationsByValue.get(value) || null;
  }

  function getByIndex(index) {
    return annotations.value.get(index) || [];
  }

  function hydrate(items = []) {
    clear();

    for (const item of items) {
      add(item.index, normalizeAnnotation(item));
    }
  }

  function serialize() {
    const serialized = [];

    for (const [index, items] of annotations.value.entries()) {
      for (const annotation of items) {
        serialized.push({
          index,
          value: annotation.value,
          color: annotation.color,
          style: annotation.style,
          text: annotation.text,
          note: annotation.note,
        });
      }
    }

    return serialized;
  }

  return {
    annotations,
    clear,
    add,
    set(index, annotation) {
      add(index, annotation);
    },
    remove,
    getByValue,
    getByIndex,
    hydrate,
    serialize,
  };
}
