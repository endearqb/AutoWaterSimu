package compute

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"
)

type ArtifactStore interface {
	Write(ctx context.Context, objectKey string, bytes []byte) error
	Read(ctx context.Context, objectKey string) ([]byte, error)
	Delete(ctx context.Context, objectKey string) error
}

type ArtifactArchiveStore interface {
	ArtifactStore
	ArchiveProvider() string
	ArchiveObjectKey(objectKey string) (string, error)
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
	cleanKey, err := cleanObjectKey(objectKey)
	if err != nil {
		return "", err
	}
	path := filepath.Join(store.baseDir, filepath.FromSlash(cleanKey))
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

func (store *LocalArtifactStore) ArchiveProvider() string {
	return "local_fs_archive"
}

func (store *LocalArtifactStore) ArchiveObjectKey(objectKey string) (string, error) {
	return cleanObjectKey(objectKey)
}

type S3ArtifactStoreOptions struct {
	Endpoint        string
	Bucket          string
	Region          string
	AccessKeyID     string
	SecretAccessKey string
	Prefix          string
	HTTPClient      *http.Client
}

type S3ArtifactStore struct {
	endpoint        *url.URL
	bucket          string
	region          string
	accessKeyID     string
	secretAccessKey string
	prefix          string
	httpClient      *http.Client
	now             func() time.Time
}

func NewS3ArtifactStore(options S3ArtifactStoreOptions) (*S3ArtifactStore, error) {
	endpointText := strings.TrimSpace(options.Endpoint)
	if endpointText == "" {
		return nil, ValidationError("s3 archive endpoint is required")
	}
	endpoint, err := url.Parse(endpointText)
	if err != nil {
		return nil, err
	}
	if endpoint.Scheme != "http" && endpoint.Scheme != "https" {
		return nil, ValidationError("s3 archive endpoint must use http or https")
	}
	if endpoint.Host == "" || endpoint.RawQuery != "" || endpoint.Fragment != "" {
		return nil, ValidationError("s3 archive endpoint must include host and no query or fragment")
	}
	bucket := strings.TrimSpace(options.Bucket)
	if bucket == "" {
		return nil, ValidationError("s3 archive bucket is required")
	}
	accessKeyID := strings.TrimSpace(options.AccessKeyID)
	if accessKeyID == "" {
		return nil, ValidationError("s3 archive access key id is required")
	}
	if options.SecretAccessKey == "" {
		return nil, ValidationError("s3 archive secret access key is required")
	}
	region := defaultString(strings.TrimSpace(options.Region), "us-east-1")
	client := options.HTTPClient
	if client == nil {
		client = http.DefaultClient
	}
	prefix, err := cleanOptionalObjectPrefix(options.Prefix)
	if err != nil {
		return nil, err
	}
	return &S3ArtifactStore{
		endpoint:        endpoint,
		bucket:          bucket,
		region:          region,
		accessKeyID:     accessKeyID,
		secretAccessKey: options.SecretAccessKey,
		prefix:          prefix,
		httpClient:      client,
		now:             func() time.Time { return time.Now().UTC() },
	}, nil
}

func (store *S3ArtifactStore) Write(ctx context.Context, objectKey string, bytes []byte) error {
	return store.do(ctx, http.MethodPut, objectKey, bytes, nil)
}

func (store *S3ArtifactStore) Read(ctx context.Context, objectKey string) ([]byte, error) {
	var response []byte
	if err := store.do(ctx, http.MethodGet, objectKey, nil, &response); err != nil {
		return nil, err
	}
	return response, nil
}

func (store *S3ArtifactStore) Delete(ctx context.Context, objectKey string) error {
	err := store.do(ctx, http.MethodDelete, objectKey, nil, nil)
	if err != nil && ToAppError(err).ErrorCode == CodeArtifactNotFound {
		return nil
	}
	return err
}

func (store *S3ArtifactStore) ArchiveProvider() string {
	return "s3_archive"
}

func (store *S3ArtifactStore) ArchiveObjectKey(objectKey string) (string, error) {
	cleanKey, err := cleanObjectKey(objectKey)
	if err != nil {
		return "", err
	}
	if store.prefix == "" {
		return cleanKey, nil
	}
	return store.prefix + "/" + cleanKey, nil
}

func (store *S3ArtifactStore) do(ctx context.Context, method, objectKey string, body []byte, responseBody *[]byte) error {
	cleanKey, err := cleanObjectKey(objectKey)
	if err != nil {
		return err
	}
	requestURL := store.objectURL(cleanKey)
	payloadHash := SHA256Hex(body)
	req, err := http.NewRequestWithContext(ctx, method, requestURL.String(), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("x-amz-content-sha256", payloadHash)
	req.Header.Set("x-amz-date", store.now().UTC().Format("20060102T150405Z"))
	store.sign(req, payloadHash)
	resp, err := store.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	respBytes, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return readErr
	}
	if resp.StatusCode == http.StatusNotFound {
		return NotFound(CodeArtifactNotFound, "archive object not found")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return NewAppError(http.StatusInternalServerError, CodeInternal, fmt.Sprintf("s3 archive request failed with status %d", resp.StatusCode), true, nil)
	}
	if responseBody != nil {
		*responseBody = respBytes
	}
	return nil
}

func (store *S3ArtifactStore) objectURL(objectKey string) url.URL {
	requestURL := *store.endpoint
	basePath := strings.Trim(requestURL.Path, "/")
	segments := []string{}
	if basePath != "" {
		segments = append(segments, basePath)
	}
	segments = append(segments, store.bucket)
	segments = append(segments, strings.Split(objectKey, "/")...)
	requestURL.Path = "/" + strings.Join(segments, "/")
	return requestURL
}

func (store *S3ArtifactStore) sign(req *http.Request, payloadHash string) {
	now := store.now().UTC()
	amzDate := now.Format("20060102T150405Z")
	dateStamp := now.Format("20060102")
	req.Header.Set("x-amz-date", amzDate)
	req.Header.Set("x-amz-content-sha256", payloadHash)
	canonicalURI := s3CanonicalURI(req.URL.Path)
	canonicalHeaders := "host:" + req.URL.Host + "\n" +
		"x-amz-content-sha256:" + payloadHash + "\n" +
		"x-amz-date:" + amzDate + "\n"
	signedHeaders := "host;x-amz-content-sha256;x-amz-date"
	canonicalRequest := strings.Join([]string{
		req.Method,
		canonicalURI,
		req.URL.RawQuery,
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	}, "\n")
	credentialScope := dateStamp + "/" + store.region + "/s3/aws4_request"
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		credentialScope,
		SHA256Hex([]byte(canonicalRequest)),
	}, "\n")
	signature := s3Signature(store.secretAccessKey, dateStamp, store.region, stringToSign)
	req.Header.Set(
		"Authorization",
		"AWS4-HMAC-SHA256 Credential="+store.accessKeyID+"/"+credentialScope+", SignedHeaders="+signedHeaders+", Signature="+signature,
	)
}

func cleanObjectKey(objectKey string) (string, error) {
	if strings.TrimSpace(objectKey) == "" {
		return "", ValidationError("object_key is required")
	}
	normalized := strings.ReplaceAll(strings.TrimSpace(objectKey), "\\", "/")
	for _, segment := range strings.Split(normalized, "/") {
		if segment == ".." {
			return "", ValidationError("unsafe object_key")
		}
	}
	clean := path.Clean(normalized)
	if clean == "." || strings.HasPrefix(clean, "../") || clean == ".." || path.IsAbs(clean) {
		return "", ValidationError("unsafe object_key")
	}
	return clean, nil
}

func cleanOptionalObjectPrefix(prefix string) (string, error) {
	trimmed := strings.Trim(strings.ReplaceAll(strings.TrimSpace(prefix), "\\", "/"), "/")
	if trimmed == "" {
		return "", nil
	}
	for _, segment := range strings.Split(trimmed, "/") {
		if segment == ".." {
			return "", ValidationError("s3 archive prefix is unsafe")
		}
	}
	clean := path.Clean(trimmed)
	if clean == "." || strings.HasPrefix(clean, "../") || clean == ".." || path.IsAbs(clean) {
		return "", ValidationError("s3 archive prefix is unsafe")
	}
	return clean, nil
}

func s3CanonicalURI(rawPath string) string {
	trimmed := strings.TrimPrefix(rawPath, "/")
	if trimmed == "" {
		return "/"
	}
	parts := strings.Split(trimmed, "/")
	for index, part := range parts {
		parts[index] = url.PathEscape(part)
	}
	return "/" + strings.Join(parts, "/")
}

func s3Signature(secretAccessKey, dateStamp, region, stringToSign string) string {
	dateKey := hmacSHA256([]byte("AWS4"+secretAccessKey), dateStamp)
	dateRegionKey := hmacSHA256(dateKey, region)
	dateRegionServiceKey := hmacSHA256(dateRegionKey, "s3")
	signingKey := hmacSHA256(dateRegionServiceKey, "aws4_request")
	return hex.EncodeToString(hmacSHA256(signingKey, stringToSign))
}

func hmacSHA256(key []byte, value string) []byte {
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write([]byte(value))
	return mac.Sum(nil)
}
