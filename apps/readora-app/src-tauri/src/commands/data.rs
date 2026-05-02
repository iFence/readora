use std::sync::Arc;

use tauri::State;

use crate::database::{
    AnnotationRecord, BookRecord, BookmarkRecord, DailyReadingStat, DailyReadingTimeInput,
    Database, ReadingProgress, SyncSnapshot,
};

#[tauri::command]
pub fn get_latest_books(
    database: State<'_, Arc<Database>>,
    limit: Option<usize>,
) -> Result<Vec<BookRecord>, String> {
    database.get_latest_books(limit)
}

#[tauri::command]
pub fn get_book_by_id(
    database: State<'_, Arc<Database>>,
    book_id: String,
) -> Result<Option<BookRecord>, String> {
    database.get_book_by_id(&book_id)
}

#[tauri::command]
pub fn save_book_record(
    database: State<'_, Arc<Database>>,
    book: BookRecord,
) -> Result<BookRecord, String> {
    database.save_book_record(book)
}

#[tauri::command]
pub fn update_book_metadata(
    database: State<'_, Arc<Database>>,
    book_id: String,
    title: String,
    author: String,
) -> Result<BookRecord, String> {
    database.update_book_metadata(&book_id, &title, &author)
}

#[tauri::command]
pub fn save_reading_progress(
    database: State<'_, Arc<Database>>,
    book_id: String,
    progress: ReadingProgress,
) -> Result<(), String> {
    database.save_reading_progress(&book_id, progress)
}

#[tauri::command]
pub fn clear_bookshelf(database: State<'_, Arc<Database>>) -> Result<(), String> {
    database.clear_bookshelf()
}

#[tauri::command]
pub fn record_daily_reading_time(
    database: State<'_, Arc<Database>>,
    entries: Vec<DailyReadingTimeInput>,
) -> Result<(), String> {
    database.record_daily_reading_time(entries)
}

#[tauri::command]
pub fn get_recent_daily_reading_stats(
    database: State<'_, Arc<Database>>,
    limit: Option<usize>,
) -> Result<Vec<DailyReadingStat>, String> {
    database.get_recent_daily_reading_stats(limit)
}

#[tauri::command]
pub fn get_annotations(
    database: State<'_, Arc<Database>>,
    book_id: String,
) -> Result<Vec<AnnotationRecord>, String> {
    database.get_annotations(&book_id)
}

#[tauri::command]
pub fn replace_annotations(
    database: State<'_, Arc<Database>>,
    book_id: String,
    annotations: Vec<AnnotationRecord>,
) -> Result<Vec<AnnotationRecord>, String> {
    database.replace_annotations(&book_id, annotations)
}

#[tauri::command]
pub fn upsert_annotation(
    database: State<'_, Arc<Database>>,
    book_id: String,
    annotation: AnnotationRecord,
) -> Result<AnnotationRecord, String> {
    database.upsert_annotation(&book_id, annotation)
}

#[tauri::command]
pub fn delete_annotation(
    database: State<'_, Arc<Database>>,
    book_id: String,
    annotation_value: String,
) -> Result<(), String> {
    database.delete_annotation(&book_id, &annotation_value)
}

#[tauri::command]
pub fn get_bookmarks(
    database: State<'_, Arc<Database>>,
    book_id: String,
) -> Result<Vec<BookmarkRecord>, String> {
    database.get_bookmarks(&book_id)
}

#[tauri::command]
pub fn upsert_bookmark(
    database: State<'_, Arc<Database>>,
    bookmark: BookmarkRecord,
) -> Result<BookmarkRecord, String> {
    database.upsert_bookmark(bookmark)
}

#[tauri::command]
pub fn delete_bookmark(
    database: State<'_, Arc<Database>>,
    bookmark_id: String,
) -> Result<(), String> {
    database.delete_bookmark(&bookmark_id)
}

#[tauri::command]
pub fn export_sync_snapshot(
    database: State<'_, Arc<Database>>,
    since: Option<i64>,
) -> Result<SyncSnapshot, String> {
    database.export_sync_snapshot(since)
}

#[tauri::command]
pub fn import_sync_snapshot(
    database: State<'_, Arc<Database>>,
    snapshot: SyncSnapshot,
) -> Result<(), String> {
    database.import_sync_snapshot(snapshot)
}

#[tauri::command]
pub fn get_last_sync_at(database: State<'_, Arc<Database>>) -> Result<Option<i64>, String> {
    database.get_last_sync_at()
}

#[tauri::command]
pub fn set_last_sync_at(
    database: State<'_, Arc<Database>>,
    timestamp: i64,
) -> Result<(), String> {
    database.set_last_sync_at(timestamp)
}
