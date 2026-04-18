import { getAnnotationStorageKey, normalizeAnnotationRecord } from '@/entities/models.js';
import {
  deleteAnnotation as deleteAnnotationData,
  getAnnotations as getAnnotationsData,
  replaceAnnotations,
  upsertAnnotation as upsertAnnotationData,
} from '@/platform/tauri/dataBridge.js';
import { getStoreValue, setStoreValue } from '@/services/localStore.js';
import { ensureDataMigrated } from '@/services/dataMigrationService.js';

class ReaderRepository {
  async getAnnotations(bookId) {
    await ensureDataMigrated();
    return getAnnotationsData(bookId);
  }

  async saveAnnotations(bookId, annotations) {
    await ensureDataMigrated();
    const normalizedAnnotations = annotations.map(normalizeAnnotationRecord);
    await setStoreValue(getAnnotationStorageKey(bookId), normalizedAnnotations);
    return replaceAnnotations(bookId, normalizedAnnotations);
  }

  async upsertAnnotation(bookId, annotation) {
    await ensureDataMigrated();
    const normalizedAnnotation = normalizeAnnotationRecord(annotation);
    const legacyAnnotations = await getStoreValue(getAnnotationStorageKey(bookId)) || [];
    const nextLegacyAnnotations = legacyAnnotations.filter(item => item.value !== normalizedAnnotation.value);
    nextLegacyAnnotations.push(normalizedAnnotation);
    await setStoreValue(getAnnotationStorageKey(bookId), nextLegacyAnnotations);
    return upsertAnnotationData(bookId, normalizedAnnotation);
  }

  async deleteAnnotation(bookId, annotationValue) {
    await ensureDataMigrated();
    const legacyAnnotations = await getStoreValue(getAnnotationStorageKey(bookId)) || [];
    const nextLegacyAnnotations = legacyAnnotations.filter(item => item.value !== annotationValue);
    await setStoreValue(getAnnotationStorageKey(bookId), nextLegacyAnnotations);
    return deleteAnnotationData(bookId, annotationValue);
  }
}

export const readerRepository = new ReaderRepository();
