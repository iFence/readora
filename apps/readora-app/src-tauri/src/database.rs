use std::{
    fs,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};

use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct PageProgress {
    pub current: Option<i64>,
    pub total: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct TocItem {
    pub href: Option<String>,
    pub label: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ReadingProgress {
    pub cfi: Option<String>,
    pub fraction: Option<f64>,
    pub page: Option<PageProgress>,
    pub toc_item: Option<TocItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct BookRecord {
    pub identifier: Option<String>,
    pub book_url: Option<String>,
    pub title: Option<String>,
    pub author: Option<String>,
    pub cover: Option<String>,
    pub open_time: Option<i64>,
    pub total_reading_time_ms: Option<i64>,
    pub progress: Option<ReadingProgress>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct AnnotationRecord {
    pub index: i64,
    pub value: String,
    pub color: Option<String>,
    pub style: Option<String>,
    pub text: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct BookmarkRecord {
    pub id: Option<String>,
    pub book_id: Option<String>,
    pub index: Option<i64>,
    pub value: String,
    pub label: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncSnapshot {
    pub version: i64,
    pub exported_at: i64,
    pub books: Vec<SyncBookRecord>,
    pub reading_progress: Vec<SyncReadingProgressRecord>,
    pub annotations: Vec<SyncAnnotationRecord>,
    pub bookmarks: Vec<SyncBookmarkRecord>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncBookRecord {
    pub book_id: String,
    pub identifier: Option<String>,
    pub book_url: Option<String>,
    pub title: Option<String>,
    pub author: Option<String>,
    pub cover: Option<String>,
    pub open_time: i64,
    pub total_reading_time_ms: i64,
    pub is_archived: bool,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncReadingProgressRecord {
    pub book_id: String,
    pub progress: Value,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncAnnotationRecord {
    pub annotation_id: String,
    pub book_id: String,
    pub index: i64,
    pub value: String,
    pub color: Option<String>,
    pub style: Option<String>,
    pub text: Option<String>,
    pub note: Option<String>,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncBookmarkRecord {
    pub bookmark_id: String,
    pub book_id: String,
    pub index: Option<i64>,
    pub value: String,
    pub label: Option<String>,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
}

pub struct Database {
    connection: Mutex<Connection>,
}

impl Database {
    pub fn new(app: &AppHandle) -> Result<Arc<Self>, String> {
        let db_path = resolve_db_path(app)?;
        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Failed to create app data directory: {}", error))?;
        }

        let connection = Connection::open(db_path)
            .map_err(|error| format!("Failed to open database: {}", error))?;
        initialize_schema(&connection)?;

        Ok(Arc::new(Self {
            connection: Mutex::new(connection),
        }))
    }

    pub fn get_latest_books(&self, limit: Option<usize>) -> Result<Vec<BookRecord>, String> {
        let connection = self.connection()?;
        let mut sql = String::from(
            "SELECT
                b.book_id,
                b.identifier,
                b.book_url,
                b.title,
                b.author,
                b.cover,
                b.open_time,
                b.total_reading_time_ms,
                rp.progress_json
            FROM books b
            LEFT JOIN reading_progress rp
                ON rp.book_id = b.book_id
                AND rp.deleted_at IS NULL
            WHERE b.deleted_at IS NULL
                AND b.is_archived = 0
            ORDER BY b.open_time DESC",
        );

        if let Some(limit) = limit {
            sql.push_str(&format!(" LIMIT {}", limit));
        }

        let mut statement = connection
            .prepare(&sql)
            .map_err(|error| format!("Failed to prepare latest books query: {}", error))?;

        let rows = statement
            .query_map([], map_book_record_row)
            .map_err(|error| format!("Failed to read latest books: {}", error))?;

        let mut books = Vec::new();
        for row in rows {
            books.push(row.map_err(|error| format!("Failed to decode latest book row: {}", error))?);
        }

        Ok(books)
    }

    pub fn get_book_by_id(&self, book_id: &str) -> Result<Option<BookRecord>, String> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT
                    b.book_id,
                    b.identifier,
                    b.book_url,
                    b.title,
                    b.author,
                    b.cover,
                    b.open_time,
                    b.total_reading_time_ms,
                    rp.progress_json
                FROM books b
                LEFT JOIN reading_progress rp
                    ON rp.book_id = b.book_id
                    AND rp.deleted_at IS NULL
                WHERE b.deleted_at IS NULL
                    AND b.book_id = ?1",
            )
            .map_err(|error| format!("Failed to prepare book query: {}", error))?;

        statement
            .query_row(params![book_id], map_book_record_row)
            .optional()
            .map_err(|error| format!("Failed to read book by id: {}", error))
    }

    pub fn save_book_record(&self, book: BookRecord) -> Result<BookRecord, String> {
        let book_id = resolve_book_id(&book)?;
        let now = now_ts();
        {
            let mut connection = self.connection()?;
            let tx = connection
                .transaction()
                .map_err(|error| format!("Failed to start save_book_record transaction: {}", error))?;

            tx.execute(
                "INSERT INTO books (
                    book_id, identifier, book_url, title, author, cover,
                    open_time, total_reading_time_ms, is_archived, updated_at, deleted_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9, NULL)
                ON CONFLICT(book_id) DO UPDATE SET
                    identifier = excluded.identifier,
                    book_url = excluded.book_url,
                    title = excluded.title,
                    author = excluded.author,
                    cover = excluded.cover,
                    open_time = excluded.open_time,
                    total_reading_time_ms = excluded.total_reading_time_ms,
                    is_archived = 0,
                    updated_at = excluded.updated_at,
                    deleted_at = NULL",
                params![
                    book_id,
                    book.identifier,
                    book.book_url,
                    book.title,
                    book.author,
                    book.cover,
                    book.open_time.unwrap_or(now),
                    book.total_reading_time_ms.unwrap_or(0),
                    now,
                ],
            )
            .map_err(|error| format!("Failed to save book record: {}", error))?;

            if let Some(progress) = &book.progress {
                upsert_progress_tx(&tx, &book_id, progress, now)?;
            }

            tx.commit()
                .map_err(|error| format!("Failed to commit save_book_record transaction: {}", error))?;
        }

        self.get_book_by_id(&book_id)?
            .ok_or_else(|| "Saved book could not be reloaded.".to_string())
    }

    pub fn save_reading_progress(
        &self,
        book_id: &str,
        progress: ReadingProgress,
    ) -> Result<(), String> {
        let now = now_ts();
        let mut connection = self.connection()?;
        let tx = connection
            .transaction()
            .map_err(|error| format!("Failed to start save_reading_progress transaction: {}", error))?;

        upsert_progress_tx(&tx, book_id, &progress, now)?;
        tx.execute(
            "UPDATE books
            SET open_time = ?2, updated_at = ?2, is_archived = 0
            WHERE book_id = ?1 AND deleted_at IS NULL",
            params![book_id, now],
        )
        .map_err(|error| format!("Failed to update book open time: {}", error))?;

        tx.commit()
            .map_err(|error| format!("Failed to commit save_reading_progress transaction: {}", error))
    }

    pub fn clear_bookshelf(&self) -> Result<(), String> {
        let connection = self.connection()?;
        connection
            .execute(
                "UPDATE books
                SET is_archived = 1, updated_at = ?1
                WHERE deleted_at IS NULL",
                params![now_ts()],
            )
            .map_err(|error| format!("Failed to clear bookshelf: {}", error))?;
        Ok(())
    }

    pub fn get_annotations(&self, book_id: &str) -> Result<Vec<AnnotationRecord>, String> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT chapter_index, value, color, style, selected_text, note
                FROM annotations
                WHERE book_id = ?1 AND deleted_at IS NULL
                ORDER BY chapter_index ASC, updated_at ASC",
            )
            .map_err(|error| format!("Failed to prepare annotations query: {}", error))?;

        let rows = statement
            .query_map(params![book_id], |row| {
                Ok(AnnotationRecord {
                    index: row.get(0)?,
                    value: row.get(1)?,
                    color: row.get(2)?,
                    style: row.get(3)?,
                    text: row.get(4)?,
                    note: row.get(5)?,
                })
            })
            .map_err(|error| format!("Failed to fetch annotations: {}", error))?;

        let mut annotations = Vec::new();
        for row in rows {
            annotations.push(row.map_err(|error| format!("Failed to decode annotation row: {}", error))?);
        }

        Ok(annotations)
    }

    pub fn replace_annotations(
        &self,
        book_id: &str,
        annotations: Vec<AnnotationRecord>,
    ) -> Result<Vec<AnnotationRecord>, String> {
        let now = now_ts();
        {
            let mut connection = self.connection()?;
            let tx = connection
                .transaction()
                .map_err(|error| format!("Failed to start replace_annotations transaction: {}", error))?;

            let existing_ids = collect_active_ids(&tx, "annotations", "annotation_id", book_id)?;
            let mut seen_ids = Vec::with_capacity(annotations.len());

            for annotation in &annotations {
                let annotation_id = build_annotation_id(book_id, &annotation.value);
                seen_ids.push(annotation_id.clone());

                tx.execute(
                    "INSERT INTO annotations (
                        annotation_id, book_id, chapter_index, value, color, style,
                        selected_text, note, updated_at, deleted_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL)
                    ON CONFLICT(annotation_id) DO UPDATE SET
                        book_id = excluded.book_id,
                        chapter_index = excluded.chapter_index,
                        value = excluded.value,
                        color = excluded.color,
                        style = excluded.style,
                        selected_text = excluded.selected_text,
                        note = excluded.note,
                        updated_at = excluded.updated_at,
                        deleted_at = NULL",
                    params![
                        annotation_id,
                        book_id,
                        annotation.index,
                        annotation.value,
                        annotation.color,
                        annotation.style,
                        annotation.text,
                        annotation.note,
                        now,
                    ],
                )
                .map_err(|error| format!("Failed to upsert annotation: {}", error))?;
            }

            soft_delete_missing_ids(&tx, "annotations", "annotation_id", existing_ids, &seen_ids, now)?;
            tx.commit()
                .map_err(|error| format!("Failed to commit replace_annotations transaction: {}", error))?;
        }

        self.get_annotations(book_id)
    }

    pub fn upsert_annotation(
        &self,
        book_id: &str,
        annotation: AnnotationRecord,
    ) -> Result<AnnotationRecord, String> {
        let connection = self.connection()?;
        connection
            .execute(
                "INSERT INTO annotations (
                    annotation_id, book_id, chapter_index, value, color, style,
                    selected_text, note, updated_at, deleted_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL)
                ON CONFLICT(annotation_id) DO UPDATE SET
                    book_id = excluded.book_id,
                    chapter_index = excluded.chapter_index,
                    value = excluded.value,
                    color = excluded.color,
                    style = excluded.style,
                    selected_text = excluded.selected_text,
                    note = excluded.note,
                    updated_at = excluded.updated_at,
                    deleted_at = NULL",
                params![
                    build_annotation_id(book_id, &annotation.value),
                    book_id,
                    annotation.index,
                    annotation.value,
                    annotation.color,
                    annotation.style,
                    annotation.text,
                    annotation.note,
                    now_ts(),
                ],
            )
            .map_err(|error| format!("Failed to upsert annotation: {}", error))?;

        Ok(annotation)
    }

    pub fn delete_annotation(&self, book_id: &str, annotation_value: &str) -> Result<(), String> {
        let connection = self.connection()?;
        connection
            .execute(
                "UPDATE annotations
                SET deleted_at = ?2, updated_at = ?2
                WHERE annotation_id = ?1 AND deleted_at IS NULL",
                params![build_annotation_id(book_id, annotation_value), now_ts()],
            )
            .map_err(|error| format!("Failed to delete annotation: {}", error))?;
        Ok(())
    }

    pub fn get_bookmarks(&self, book_id: &str) -> Result<Vec<BookmarkRecord>, String> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT bookmark_id, book_id, chapter_index, value, label
                FROM bookmarks
                WHERE book_id = ?1 AND deleted_at IS NULL
                ORDER BY chapter_index ASC, updated_at ASC",
            )
            .map_err(|error| format!("Failed to prepare bookmarks query: {}", error))?;

        let rows = statement
            .query_map(params![book_id], |row| {
                Ok(BookmarkRecord {
                    id: row.get(0)?,
                    book_id: row.get(1)?,
                    index: row.get(2)?,
                    value: row.get(3)?,
                    label: row.get(4)?,
                })
            })
            .map_err(|error| format!("Failed to fetch bookmarks: {}", error))?;

        let mut bookmarks = Vec::new();
        for row in rows {
            bookmarks.push(row.map_err(|error| format!("Failed to decode bookmark row: {}", error))?);
        }

        Ok(bookmarks)
    }

    pub fn upsert_bookmark(&self, bookmark: BookmarkRecord) -> Result<BookmarkRecord, String> {
        let book_id = bookmark
            .book_id
            .clone()
            .ok_or_else(|| "Bookmark bookId is required.".to_string())?;
        let bookmark_id = bookmark
            .id
            .clone()
            .unwrap_or_else(|| build_bookmark_id(&book_id, &bookmark.value));
        let now = now_ts();
        let connection = self.connection()?;

        connection
            .execute(
                "INSERT INTO bookmarks (
                    bookmark_id, book_id, chapter_index, value, label, updated_at, deleted_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL)
                ON CONFLICT(bookmark_id) DO UPDATE SET
                    book_id = excluded.book_id,
                    chapter_index = excluded.chapter_index,
                    value = excluded.value,
                    label = excluded.label,
                    updated_at = excluded.updated_at,
                    deleted_at = NULL",
                params![
                    bookmark_id,
                    book_id,
                    bookmark.index,
                    bookmark.value,
                    bookmark.label,
                    now,
                ],
            )
            .map_err(|error| format!("Failed to upsert bookmark: {}", error))?;

        Ok(BookmarkRecord {
            id: Some(bookmark_id),
            book_id: Some(book_id),
            index: bookmark.index,
            value: bookmark.value,
            label: bookmark.label,
        })
    }

    pub fn delete_bookmark(&self, bookmark_id: &str) -> Result<(), String> {
        let connection = self.connection()?;
        connection
            .execute(
                "UPDATE bookmarks
                SET deleted_at = ?2, updated_at = ?2
                WHERE bookmark_id = ?1 AND deleted_at IS NULL",
                params![bookmark_id, now_ts()],
            )
            .map_err(|error| format!("Failed to delete bookmark: {}", error))?;
        Ok(())
    }

    pub fn export_sync_snapshot(&self, since: Option<i64>) -> Result<SyncSnapshot, String> {
        let connection = self.connection()?;
        let since = since.unwrap_or(0);

        let books = {
            let mut statement = connection
                .prepare(
                    "SELECT
                        book_id, identifier, book_url, title, author, cover,
                        open_time, total_reading_time_ms, is_archived, updated_at, deleted_at
                    FROM books
                    WHERE updated_at > ?1",
                )
                .map_err(|error| format!("Failed to prepare books snapshot query: {}", error))?;
            let rows = statement
                .query_map(params![since], |row| {
                    Ok(SyncBookRecord {
                        book_id: row.get(0)?,
                        identifier: row.get(1)?,
                        book_url: row.get(2)?,
                        title: row.get(3)?,
                        author: row.get(4)?,
                        cover: row.get(5)?,
                        open_time: row.get(6)?,
                        total_reading_time_ms: row.get(7)?,
                        is_archived: row.get::<_, i64>(8)? != 0,
                        updated_at: row.get(9)?,
                        deleted_at: row.get(10)?,
                    })
                })
                .map_err(|error| format!("Failed to read books snapshot rows: {}", error))?;
            let mut items = Vec::new();
            for row in rows {
                items.push(row.map_err(|error| format!("Failed to decode book snapshot row: {}", error))?);
            }
            items
        };

        let reading_progress = {
            let mut statement = connection
                .prepare(
                    "SELECT book_id, progress_json, updated_at, deleted_at
                    FROM reading_progress
                    WHERE updated_at > ?1",
                )
                .map_err(|error| format!("Failed to prepare reading progress snapshot query: {}", error))?;
            let rows = statement
                .query_map(params![since], |row| {
                    let progress_json: String = row.get(1)?;
                    Ok(SyncReadingProgressRecord {
                        book_id: row.get(0)?,
                        progress: serde_json::from_str(&progress_json).map_err(|error| {
                            rusqlite::Error::ToSqlConversionFailure(Box::new(error))
                        })?,
                        updated_at: row.get(2)?,
                        deleted_at: row.get(3)?,
                    })
                })
                .map_err(|error| format!("Failed to read reading progress snapshot rows: {}", error))?;
            let mut items = Vec::new();
            for row in rows {
                items.push(row.map_err(|error| format!("Failed to decode reading progress snapshot row: {}", error))?);
            }
            items
        };

        let annotations = {
            let mut statement = connection
                .prepare(
                    "SELECT
                        annotation_id, book_id, chapter_index, value, color,
                        style, selected_text, note, updated_at, deleted_at
                    FROM annotations
                    WHERE updated_at > ?1",
                )
                .map_err(|error| format!("Failed to prepare annotations snapshot query: {}", error))?;
            let rows = statement
                .query_map(params![since], |row| {
                    Ok(SyncAnnotationRecord {
                        annotation_id: row.get(0)?,
                        book_id: row.get(1)?,
                        index: row.get(2)?,
                        value: row.get(3)?,
                        color: row.get(4)?,
                        style: row.get(5)?,
                        text: row.get(6)?,
                        note: row.get(7)?,
                        updated_at: row.get(8)?,
                        deleted_at: row.get(9)?,
                    })
                })
                .map_err(|error| format!("Failed to read annotations snapshot rows: {}", error))?;
            let mut items = Vec::new();
            for row in rows {
                items.push(row.map_err(|error| format!("Failed to decode annotation snapshot row: {}", error))?);
            }
            items
        };

        let bookmarks = {
            let mut statement = connection
                .prepare(
                    "SELECT
                        bookmark_id, book_id, chapter_index, value, label, updated_at, deleted_at
                    FROM bookmarks
                    WHERE updated_at > ?1",
                )
                .map_err(|error| format!("Failed to prepare bookmarks snapshot query: {}", error))?;
            let rows = statement
                .query_map(params![since], |row| {
                    Ok(SyncBookmarkRecord {
                        bookmark_id: row.get(0)?,
                        book_id: row.get(1)?,
                        index: row.get(2)?,
                        value: row.get(3)?,
                        label: row.get(4)?,
                        updated_at: row.get(5)?,
                        deleted_at: row.get(6)?,
                    })
                })
                .map_err(|error| format!("Failed to read bookmarks snapshot rows: {}", error))?;
            let mut items = Vec::new();
            for row in rows {
                items.push(row.map_err(|error| format!("Failed to decode bookmark snapshot row: {}", error))?);
            }
            items
        };

        Ok(SyncSnapshot {
            version: 1,
            exported_at: now_ts(),
            books,
            reading_progress,
            annotations,
            bookmarks,
        })
    }

    pub fn import_sync_snapshot(&self, snapshot: SyncSnapshot) -> Result<(), String> {
        let mut connection = self.connection()?;
        let tx = connection
            .transaction()
            .map_err(|error| format!("Failed to start import_sync_snapshot transaction: {}", error))?;

        for record in snapshot.books {
            if should_replace(&tx, "books", "book_id", &record.book_id, record.updated_at)? {
                tx.execute(
                    "INSERT INTO books (
                        book_id, identifier, book_url, title, author, cover,
                        open_time, total_reading_time_ms, is_archived, updated_at, deleted_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                    ON CONFLICT(book_id) DO UPDATE SET
                        identifier = excluded.identifier,
                        book_url = excluded.book_url,
                        title = excluded.title,
                        author = excluded.author,
                        cover = excluded.cover,
                        open_time = excluded.open_time,
                        total_reading_time_ms = excluded.total_reading_time_ms,
                        is_archived = excluded.is_archived,
                        updated_at = excluded.updated_at,
                        deleted_at = excluded.deleted_at",
                    params![
                        record.book_id,
                        record.identifier,
                        record.book_url,
                        record.title,
                        record.author,
                        record.cover,
                        record.open_time,
                        record.total_reading_time_ms,
                        if record.is_archived { 1 } else { 0 },
                        record.updated_at,
                        record.deleted_at,
                    ],
                )
                .map_err(|error| format!("Failed to import book record: {}", error))?;
            }
        }

        for record in snapshot.reading_progress {
            if should_replace(&tx, "reading_progress", "book_id", &record.book_id, record.updated_at)? {
                tx.execute(
                    "INSERT INTO reading_progress (book_id, progress_json, updated_at, deleted_at)
                    VALUES (?1, ?2, ?3, ?4)
                    ON CONFLICT(book_id) DO UPDATE SET
                        progress_json = excluded.progress_json,
                        updated_at = excluded.updated_at,
                        deleted_at = excluded.deleted_at",
                    params![
                        record.book_id,
                        serde_json::to_string(&record.progress)
                            .map_err(|error| format!("Failed to serialize imported reading progress: {}", error))?,
                        record.updated_at,
                        record.deleted_at,
                    ],
                )
                .map_err(|error| format!("Failed to import reading progress: {}", error))?;
            }
        }

        for record in snapshot.annotations {
            if should_replace(&tx, "annotations", "annotation_id", &record.annotation_id, record.updated_at)? {
                tx.execute(
                    "INSERT INTO annotations (
                        annotation_id, book_id, chapter_index, value, color, style,
                        selected_text, note, updated_at, deleted_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                    ON CONFLICT(annotation_id) DO UPDATE SET
                        book_id = excluded.book_id,
                        chapter_index = excluded.chapter_index,
                        value = excluded.value,
                        color = excluded.color,
                        style = excluded.style,
                        selected_text = excluded.selected_text,
                        note = excluded.note,
                        updated_at = excluded.updated_at,
                        deleted_at = excluded.deleted_at",
                    params![
                        record.annotation_id,
                        record.book_id,
                        record.index,
                        record.value,
                        record.color,
                        record.style,
                        record.text,
                        record.note,
                        record.updated_at,
                        record.deleted_at,
                    ],
                )
                .map_err(|error| format!("Failed to import annotation: {}", error))?;
            }
        }

        for record in snapshot.bookmarks {
            if should_replace(&tx, "bookmarks", "bookmark_id", &record.bookmark_id, record.updated_at)? {
                tx.execute(
                    "INSERT INTO bookmarks (
                        bookmark_id, book_id, chapter_index, value, label, updated_at, deleted_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                    ON CONFLICT(bookmark_id) DO UPDATE SET
                        book_id = excluded.book_id,
                        chapter_index = excluded.chapter_index,
                        value = excluded.value,
                        label = excluded.label,
                        updated_at = excluded.updated_at,
                        deleted_at = excluded.deleted_at",
                    params![
                        record.bookmark_id,
                        record.book_id,
                        record.index,
                        record.value,
                        record.label,
                        record.updated_at,
                        record.deleted_at,
                    ],
                )
                .map_err(|error| format!("Failed to import bookmark: {}", error))?;
            }
        }

        tx.commit()
            .map_err(|error| format!("Failed to commit import_sync_snapshot transaction: {}", error))
    }

    pub fn get_last_sync_at(&self) -> Result<Option<i64>, String> {
        let connection = self.connection()?;
        let raw = connection
            .query_row(
                "SELECT sync_value FROM sync_state WHERE sync_key = 'last_sync_at'",
                [],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|error| format!("Failed to read sync_state: {}", error))?;

        raw.map(|value| {
            value
                .parse::<i64>()
                .map_err(|error| format!("Failed to parse last_sync_at value: {}", error))
        })
        .transpose()
    }

    pub fn set_last_sync_at(&self, timestamp: i64) -> Result<(), String> {
        let connection = self.connection()?;
        connection
            .execute(
                "INSERT INTO sync_state (sync_key, sync_value, updated_at)
                VALUES ('last_sync_at', ?1, ?2)
                ON CONFLICT(sync_key) DO UPDATE SET
                    sync_value = excluded.sync_value,
                    updated_at = excluded.updated_at",
                params![timestamp.to_string(), now_ts()],
            )
            .map_err(|error| format!("Failed to persist last_sync_at: {}", error))?;
        Ok(())
    }

    fn connection(&self) -> Result<std::sync::MutexGuard<'_, Connection>, String> {
        self.connection
            .lock()
            .map_err(|_| "Database connection lock was poisoned.".to_string())
    }
}

fn resolve_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data directory: {}", error))?
        .join("readora.sqlite3"))
}

fn initialize_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS books (
                book_id TEXT PRIMARY KEY,
                identifier TEXT,
                book_url TEXT,
                title TEXT,
                author TEXT,
                cover TEXT,
                open_time INTEGER NOT NULL DEFAULT 0,
                total_reading_time_ms INTEGER NOT NULL DEFAULT 0,
                is_archived INTEGER NOT NULL DEFAULT 0,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS reading_progress (
                book_id TEXT PRIMARY KEY,
                progress_json TEXT NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS annotations (
                annotation_id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                chapter_index INTEGER NOT NULL,
                value TEXT NOT NULL,
                color TEXT,
                style TEXT,
                selected_text TEXT,
                note TEXT,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS bookmarks (
                bookmark_id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                chapter_index INTEGER,
                value TEXT NOT NULL,
                label TEXT,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS sync_state (
                sync_key TEXT PRIMARY KEY,
                sync_value TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_books_active_open_time
                ON books (is_archived, deleted_at, open_time DESC);
            CREATE INDEX IF NOT EXISTS idx_annotations_book_id
                ON annotations (book_id, deleted_at, chapter_index);
            CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id
                ON bookmarks (book_id, deleted_at, chapter_index);
            ",
        )
        .map_err(|error| format!("Failed to initialize database schema: {}", error))?;

    match connection.execute(
        "ALTER TABLE books ADD COLUMN total_reading_time_ms INTEGER NOT NULL DEFAULT 0",
        [],
    ) {
        Ok(_) => {}
        Err(rusqlite::Error::SqliteFailure(error, _))
            if error.extended_code == rusqlite::ffi::SQLITE_ERROR => {}
        Err(error) => {
            return Err(format!(
                "Failed to ensure total_reading_time_ms column exists: {}",
                error
            ))
        }
    }

    Ok(())
}

fn resolve_book_id(book: &BookRecord) -> Result<String, String> {
    book.identifier
        .clone()
        .or_else(|| book.book_url.clone())
        .or_else(|| book.title.clone())
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Book record is missing identifier, bookUrl, and title.".to_string())
}

fn now_ts() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

fn map_book_record_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<BookRecord> {
    let progress_json: Option<String> = row.get(8)?;
    let progress = progress_json
        .as_deref()
        .and_then(|value| serde_json::from_str::<ReadingProgress>(value).ok());

    Ok(BookRecord {
        identifier: row.get(1)?,
        book_url: row.get(2)?,
        title: row.get(3)?,
        author: row.get(4)?,
        cover: row.get(5)?,
        open_time: row.get(6)?,
        total_reading_time_ms: row.get(7)?,
        progress,
    })
}

fn upsert_progress_tx(
    tx: &Transaction<'_>,
    book_id: &str,
    progress: &ReadingProgress,
    updated_at: i64,
) -> Result<(), String> {
    let progress_json = serde_json::to_string(progress)
        .map_err(|error| format!("Failed to serialize reading progress: {}", error))?;

    tx.execute(
        "INSERT INTO reading_progress (book_id, progress_json, updated_at, deleted_at)
        VALUES (?1, ?2, ?3, NULL)
        ON CONFLICT(book_id) DO UPDATE SET
            progress_json = excluded.progress_json,
            updated_at = excluded.updated_at,
            deleted_at = NULL",
        params![book_id, progress_json, updated_at],
    )
    .map_err(|error| format!("Failed to save reading progress: {}", error))?;

    Ok(())
}

fn collect_active_ids(
    tx: &Transaction<'_>,
    table: &str,
    id_column: &str,
    book_id: &str,
) -> Result<Vec<String>, String> {
    let sql = format!(
        "SELECT {id_column} FROM {table} WHERE book_id = ?1 AND deleted_at IS NULL"
    );
    let mut statement = tx
        .prepare(&sql)
        .map_err(|error| format!("Failed to prepare active id query for {table}: {}", error))?;
    let rows = statement
        .query_map(params![book_id], |row| row.get::<_, String>(0))
        .map_err(|error| format!("Failed to query active ids for {table}: {}", error))?;

    let mut ids = Vec::new();
    for row in rows {
        ids.push(row.map_err(|error| format!("Failed to decode active id for {table}: {}", error))?);
    }
    Ok(ids)
}

fn soft_delete_missing_ids(
    tx: &Transaction<'_>,
    table: &str,
    id_column: &str,
    existing_ids: Vec<String>,
    seen_ids: &[String],
    now: i64,
) -> Result<(), String> {
    let sql = format!(
        "UPDATE {table} SET deleted_at = ?2, updated_at = ?2 WHERE {id_column} = ?1"
    );

    for existing_id in existing_ids {
        if seen_ids.iter().any(|seen_id| seen_id == &existing_id) {
            continue;
        }

        tx.execute(&sql, params![existing_id, now])
            .map_err(|error| format!("Failed to soft delete missing id in {table}: {}", error))?;
    }

    Ok(())
}

fn should_replace(
    tx: &Transaction<'_>,
    table: &str,
    id_column: &str,
    id: &str,
    updated_at: i64,
) -> Result<bool, String> {
    let sql = format!("SELECT updated_at FROM {table} WHERE {id_column} = ?1");
    let current_updated_at = tx
        .query_row(&sql, params![id], |row| row.get::<_, i64>(0))
        .optional()
        .map_err(|error| format!("Failed to query existing update time in {table}: {}", error))?;

    Ok(current_updated_at.map(|current| updated_at >= current).unwrap_or(true))
}

fn build_annotation_id(book_id: &str, value: &str) -> String {
    format!("annotation::{book_id}::{value}")
}

fn build_bookmark_id(book_id: &str, value: &str) -> String {
    format!("bookmark::{book_id}::{value}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{thread, time::Duration};

    fn create_test_database() -> Database {
        let connection = Connection::open_in_memory().expect("in-memory db");
        initialize_schema(&connection).expect("schema");
        Database {
            connection: Mutex::new(connection),
        }
    }

    #[test]
    fn stores_last_sync_timestamp() {
        let database = create_test_database();

        database.set_last_sync_at(123_456).expect("set last sync");

        assert_eq!(database.get_last_sync_at().expect("get last sync"), Some(123_456));
    }

    #[test]
    fn exports_only_records_newer_than_since() {
        let database = create_test_database();
        let book_id = "book-1".to_string();

        database
            .save_book_record(BookRecord {
                identifier: Some(book_id.clone()),
                book_url: Some("file:///book.epub".to_string()),
                title: Some("Book".to_string()),
                author: Some("Author".to_string()),
                cover: None,
                open_time: Some(now_ts()),
                total_reading_time_ms: Some(0),
                progress: None,
            })
            .expect("save book");

        let checkpoint = now_ts();
        thread::sleep(Duration::from_millis(5));

        database
            .upsert_bookmark(
                BookmarkRecord {
                    id: None,
                    book_id: Some(book_id.clone()),
                    index: Some(1),
                    value: "epubcfi(/6/2[chap01]!/4/2/8)".to_string(),
                    label: Some("Chapter 1".to_string()),
                },
            )
            .expect("upsert bookmark");

        let snapshot = database
            .export_sync_snapshot(Some(checkpoint))
            .expect("export snapshot");

        assert!(snapshot.books.is_empty());
        assert!(snapshot.reading_progress.is_empty());
        assert!(snapshot.annotations.is_empty());
        assert_eq!(snapshot.bookmarks.len(), 1);
        assert_eq!(snapshot.bookmarks[0].book_id, book_id);
    }

    #[test]
    fn deleted_annotations_export_as_tombstones() {
        let database = create_test_database();
        let book_id = "book-2";
        let annotation_value = "epubcfi(/6/2[chap02]!/4/2/6)";

        database
            .upsert_annotation(
                book_id,
                AnnotationRecord {
                    index: 2,
                    value: annotation_value.to_string(),
                    color: Some("yellow".to_string()),
                    style: Some("highlight".to_string()),
                    text: Some("excerpt".to_string()),
                    note: Some("note".to_string()),
                },
            )
            .expect("upsert annotation");

        let checkpoint = now_ts();
        thread::sleep(Duration::from_millis(5));
        database
            .delete_annotation(book_id, annotation_value)
            .expect("delete annotation");

        let snapshot = database
            .export_sync_snapshot(Some(checkpoint))
            .expect("export snapshot");

        assert_eq!(snapshot.annotations.len(), 1);
        assert_eq!(snapshot.annotations[0].value, annotation_value);
        assert!(snapshot.annotations[0].deleted_at.is_some());
    }

    #[test]
    fn older_import_does_not_override_newer_local_record() {
        let database = create_test_database();
        let book_id = "book-3".to_string();

        database
            .save_book_record(BookRecord {
                identifier: Some(book_id.clone()),
                book_url: Some("file:///book3.epub".to_string()),
                title: Some("Newest Title".to_string()),
                author: Some("Author".to_string()),
                cover: None,
                open_time: Some(now_ts()),
                total_reading_time_ms: Some(0),
                progress: None,
            })
            .expect("save local book");

        let current_snapshot = database.export_sync_snapshot(None).expect("export all");
        let current_updated_at = current_snapshot.books[0].updated_at;

        database
            .import_sync_snapshot(SyncSnapshot {
                version: 1,
                exported_at: now_ts(),
                books: vec![SyncBookRecord {
                    book_id: book_id.clone(),
                    identifier: Some(book_id.clone()),
                    book_url: Some("file:///book3.epub".to_string()),
                    title: Some("Older Title".to_string()),
                    author: Some("Author".to_string()),
                    cover: None,
                    open_time: current_snapshot.books[0].open_time,
                    total_reading_time_ms: current_snapshot.books[0].total_reading_time_ms,
                    is_archived: false,
                    updated_at: current_updated_at - 1,
                    deleted_at: None,
                }],
                reading_progress: vec![],
                annotations: vec![],
                bookmarks: vec![],
            })
            .expect("import older snapshot");

        let reloaded = database
            .get_book_by_id(&book_id)
            .expect("load book")
            .expect("book exists");

        assert_eq!(reloaded.title.as_deref(), Some("Newest Title"));
    }
}
