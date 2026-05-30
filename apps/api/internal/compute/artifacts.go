package compute

import (
	"context"
	"os"
	"path/filepath"
	"strings"
)

type ArtifactStore interface {
	Write(ctx context.Context, objectKey string, bytes []byte) error
	Read(ctx context.Context, objectKey string) ([]byte, error)
	Delete(ctx context.Context, objectKey string) error
}

type LocalArtifactStore struct {
	baseDir string
}

func NewLocalArtifactStore(baseDir string) (*LocalArtifactStore, error) {
	if strings.TrimSpace(baseDir) == "" {
		return nil, ValidationError("artifact dir is required")
	}
	if err := os.MkdirAll(baseDir, 0o755); err != nil {
		return nil, err
	}
	return &LocalArtifactStore{baseDir: baseDir}, nil
}

func (store *LocalArtifactStore) Write(_ context.Context, objectKey string, bytes []byte) error {
	path, err := store.safePath(objectKey)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, bytes, 0o644)
}

func (store *LocalArtifactStore) Read(_ context.Context, objectKey string) ([]byte, error) {
	path, err := store.safePath(objectKey)
	if err != nil {
		return nil, err
	}
	bytes, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return nil, NotFound(CodeArtifactNotFound, "artifact file not found")
	}
	return bytes, err
}

func (store *LocalArtifactStore) Delete(_ context.Context, objectKey string) error {
	path, err := store.safePath(objectKey)
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (store *LocalArtifactStore) safePath(objectKey string) (string, error) {
	if strings.TrimSpace(objectKey) == "" {
		return "", ValidationError("object_key is required")
	}
	clean := filepath.Clean(filepath.FromSlash(objectKey))
	if filepath.IsAbs(clean) || strings.HasPrefix(clean, "..") || strings.Contains(clean, string(filepath.Separator)+".."+string(filepath.Separator)) {
		return "", ValidationError("unsafe object_key")
	}
	path := filepath.Join(store.baseDir, clean)
	base, err := filepath.Abs(store.baseDir)
	if err != nil {
		return "", err
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	if !strings.HasPrefix(abs, base) {
		return "", ValidationError("object_key escapes artifact dir")
	}
	return abs, nil
}
