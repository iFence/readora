use std::{
    fs::{self, File},
    io::{Cursor, Read, Write},
    path::Path,
};

use xmltree::{Element, EmitterConfig, XMLNode};
use zip::{
    write::SimpleFileOptions,
    CompressionMethod, ZipArchive, ZipWriter,
};

struct ArchiveEntryData {
    name: String,
    bytes: Vec<u8>,
    compression_method: CompressionMethod,
    unix_permissions: Option<u32>,
    is_dir: bool,
}

pub fn overwrite_epub_metadata(source_path: &Path, title: &str, author: &str) -> Result<(), String> {
    if !source_path.exists() {
        return Err(format!("EPUB file was not found: {}", source_path.display()));
    }

    let file = File::open(source_path)
        .map_err(|error| format!("Failed to open EPUB file: {}", error))?;
    let mut archive = ZipArchive::new(file)
        .map_err(|error| format!("Failed to read EPUB archive: {}", error))?;

    let opf_path = resolve_opf_path(&mut archive)?;
    let opf_bytes = read_archive_entry(&mut archive, &opf_path)?;
    let updated_opf = update_opf_metadata(&opf_bytes, title, author)?;

    let mut entries = Vec::with_capacity(archive.len());
    for index in 0..archive.len() {
        let mut entry = archive
            .by_index(index)
            .map_err(|error| format!("Failed to read EPUB archive entry: {}", error))?;
        let entry_name = entry.name().to_string();
        let is_dir = entry.is_dir();
        let compression_method = entry.compression();
        let unix_permissions = entry.unix_mode();
        let bytes = if is_dir {
            Vec::new()
        } else if entry_name == opf_path {
            updated_opf.clone()
        } else {
            let mut bytes = Vec::new();
            entry.read_to_end(&mut bytes)
                .map_err(|error| format!("Failed to read EPUB entry contents: {}", error))?;
            bytes
        };

        entries.push(ArchiveEntryData {
            name: entry_name,
            bytes,
            compression_method,
            unix_permissions,
            is_dir,
        });
    }

    write_repacked_archive(source_path, entries)
}

fn resolve_opf_path(archive: &mut ZipArchive<File>) -> Result<String, String> {
    let container_bytes = read_archive_entry(archive, "META-INF/container.xml")?;
    let container = Element::parse(Cursor::new(container_bytes))
        .map_err(|error| format!("Failed to parse EPUB container.xml: {}", error))?;
    let rootfile = find_first_descendant(&container, "rootfile")
        .ok_or_else(|| "EPUB container.xml is missing a rootfile entry.".to_string())?;

    rootfile
        .attributes
        .get("full-path")
        .cloned()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "EPUB container.xml rootfile is missing full-path.".to_string())
}

fn read_archive_entry(archive: &mut ZipArchive<File>, path: &str) -> Result<Vec<u8>, String> {
    let mut entry = archive
        .by_name(path)
        .map_err(|error| format!("Failed to open EPUB entry {path}: {error}"))?;
    let mut bytes = Vec::new();
    entry
        .read_to_end(&mut bytes)
        .map_err(|error| format!("Failed to read EPUB entry {path}: {error}"))?;
    Ok(bytes)
}

fn update_opf_metadata(opf_bytes: &[u8], title: &str, author: &str) -> Result<Vec<u8>, String> {
    let mut package = Element::parse(Cursor::new(opf_bytes))
        .map_err(|error| format!("Failed to parse EPUB package document: {}", error))?;
    let metadata = find_first_descendant_mut(&mut package, "metadata")
        .ok_or_else(|| "EPUB package document is missing metadata.".to_string())?;

    let mut next_children = Vec::with_capacity(metadata.children.len() + 2);
    let mut has_title = false;
    let mut has_creator = false;

    for child in metadata.children.drain(..) {
        match child {
            XMLNode::Element(mut element) if is_named(&element, "title") => {
                if !has_title {
                    set_element_text(&mut element, title);
                    has_title = true;
                    next_children.push(XMLNode::Element(element));
                }
            }
            XMLNode::Element(mut element) if is_named(&element, "creator") => {
                if !has_creator {
                    set_element_text(&mut element, author);
                    has_creator = true;
                    next_children.push(XMLNode::Element(element));
                }
            }
            other => next_children.push(other),
        }
    }

    if !has_title {
        next_children.push(XMLNode::Element(new_dc_element("title", title)));
    }
    if !has_creator {
        next_children.push(XMLNode::Element(new_dc_element("creator", author)));
    }

    metadata.children = next_children;

    let mut output = Vec::new();
    package
        .write_with_config(
            &mut output,
            EmitterConfig::new()
                .perform_indent(true)
                .write_document_declaration(true),
        )
        .map_err(|error| format!("Failed to serialize updated EPUB metadata: {}", error))?;

    Ok(output)
}

fn write_repacked_archive(source_path: &Path, entries: Vec<ArchiveEntryData>) -> Result<(), String> {
    let file_name = source_path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "EPUB source path is missing a file name.".to_string())?;
    let temp_path = source_path.with_file_name(format!("{file_name}.tmp"));
    let backup_path = source_path.with_file_name(format!("{file_name}.backup"));

    let temp_file = File::create(&temp_path)
        .map_err(|error| format!("Failed to create temporary EPUB file: {}", error))?;
    let mut writer = ZipWriter::new(temp_file);

    for entry in entries {
        let mut options = SimpleFileOptions::default()
            .compression_method(entry.compression_method);
        if let Some(mode) = entry.unix_permissions {
            options = options.unix_permissions(mode);
        }

        if entry.is_dir {
            writer
                .add_directory(entry.name, options)
                .map_err(|error| format!("Failed to write EPUB directory entry: {}", error))?;
            continue;
        }

        writer
            .start_file(entry.name, options)
            .map_err(|error| format!("Failed to write EPUB file entry: {}", error))?;
        writer
            .write_all(&entry.bytes)
            .map_err(|error| format!("Failed to write EPUB file contents: {}", error))?;
    }

    writer
        .finish()
        .map_err(|error| format!("Failed to finish EPUB archive rewrite: {}", error))?;

    if backup_path.exists() {
        fs::remove_file(&backup_path)
            .map_err(|error| format!("Failed to remove stale EPUB backup: {}", error))?;
    }

    fs::rename(source_path, &backup_path)
        .map_err(|error| format!("Failed to move original EPUB aside before overwrite: {}", error))?;

    if let Err(error) = fs::rename(&temp_path, source_path) {
        let _ = fs::rename(&backup_path, source_path);
        let _ = fs::remove_file(&temp_path);
        return Err(format!("Failed to replace original EPUB file: {}", error));
    }

    fs::remove_file(&backup_path)
        .map_err(|error| format!("Failed to remove temporary EPUB backup: {}", error))?;

    Ok(())
}

fn find_first_descendant<'a>(element: &'a Element, expected_name: &str) -> Option<&'a Element> {
    if is_named(element, expected_name) {
        return Some(element);
    }

    for child in &element.children {
        if let XMLNode::Element(child_element) = child {
            if let Some(found) = find_first_descendant(child_element, expected_name) {
                return Some(found);
            }
        }
    }

    None
}

fn find_first_descendant_mut<'a>(
    element: &'a mut Element,
    expected_name: &str,
) -> Option<&'a mut Element> {
    if is_named(element, expected_name) {
        return Some(element);
    }

    for child in &mut element.children {
        if let XMLNode::Element(child_element) = child {
            if let Some(found) = find_first_descendant_mut(child_element, expected_name) {
                return Some(found);
            }
        }
    }

    None
}

fn is_named(element: &Element, expected_name: &str) -> bool {
    element
        .name
        .rsplit(':')
        .next()
        .map(|name| name == expected_name)
        .unwrap_or(false)
}

fn set_element_text(element: &mut Element, value: &str) {
    element.children.retain(|child| !matches!(child, XMLNode::Text(_)));
    element.children.insert(0, XMLNode::Text(value.to_string()));
}

fn new_dc_element(name: &str, value: &str) -> Element {
    let mut element = Element::new(name);
    element.prefix = Some("dc".to_string());
    element.children.push(XMLNode::Text(value.to_string()));
    element
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn updates_title_and_creator_in_package_document() {
        let opf = br#"<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <metadata>
    <dc:title>Old Title</dc:title>
    <dc:creator>Old Author</dc:creator>
    <dc:creator>Second Author</dc:creator>
  </metadata>
</package>"#;

        let updated = update_opf_metadata(opf, "New Title", "New Author").expect("update metadata");
        let package = Element::parse(Cursor::new(updated)).expect("parse updated package");
        let metadata = find_first_descendant(&package, "metadata").expect("metadata");

        let values = metadata
            .children
            .iter()
            .filter_map(|child| match child {
                XMLNode::Element(element) if is_named(element, "title") || is_named(element, "creator") => {
                    Some((element.name.clone(), element.get_text().map(|text| text.to_string()).unwrap_or_default()))
                }
                _ => None,
            })
            .collect::<Vec<_>>();

        assert_eq!(
            values,
            vec![
                ("title".to_string(), "New Title".to_string()),
                ("creator".to_string(), "New Author".to_string()),
            ]
        );
    }

    #[test]
    fn reads_rootfile_path_from_container_document() {
        let container = br#"<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>"#;

        let document = Element::parse(Cursor::new(container)).expect("parse container");
        let rootfile = find_first_descendant(&document, "rootfile").expect("rootfile");

        assert_eq!(
            rootfile.attributes.get("full-path").map(String::as_str),
            Some("OPS/content.opf")
        );
    }
}
