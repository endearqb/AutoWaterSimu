use std::path::{Component, Path, PathBuf};

pub fn safe_relative_path(value: &str) -> Result<PathBuf, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(String::from("relative path is required"));
    }

    let path = Path::new(trimmed);
    if path.is_absolute() {
        return Err(String::from("absolute paths are not allowed"));
    }

    let mut output = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(part) => output.push(part),
            Component::CurDir => {}
            Component::ParentDir => return Err(String::from("path traversal is not allowed")),
            Component::RootDir | Component::Prefix(_) => {
                return Err(String::from("drive, root, and UNC paths are not allowed"));
            }
        }
    }

    if output.as_os_str().is_empty() {
        return Err(String::from("relative path is required"));
    }
    Ok(output)
}

pub fn join_under(base: &Path, relative: &str) -> Result<PathBuf, String> {
    Ok(base.join(safe_relative_path(relative)?))
}
