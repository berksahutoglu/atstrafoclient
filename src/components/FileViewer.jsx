import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  ListGroup,
  Button,
  Alert,
  Spinner,
  Modal,
} from "react-bootstrap";
import { attachmentAPI } from "../services/api";
import { API_URL } from "../services/api";

const FileViewer = ({ requestId, salesRequestId, refreshTrigger }) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const fetchAttachments = useCallback(async () => {
    try {
      setLoading(true);

      let response;
      if (requestId) {
        response = await attachmentAPI.getAttachmentsByRequestId(requestId);
      } else if (salesRequestId) {
        response = await attachmentAPI.getAttachmentsBySalesRequestId(
          salesRequestId
        );
      }

      setAttachments(response?.data || []);
      setError("");
    } catch (err) {
      setError(
        "Dosyalar yüklenirken bir hata oluştu: " +
          (err.message || "Bilinmeyen hata")
      );
      console.error("Error fetching attachments:", err);
    } finally {
      setLoading(false);
    }
  }, [requestId, salesRequestId]);

  useEffect(() => {
    if (requestId || salesRequestId) {
      fetchAttachments();
    }
  }, [requestId, salesRequestId, refreshTrigger, fetchAttachments]);

  const handleDownload = async (attachmentId, fileName) => {
    try {
      // JWT token'ı localStorage'dan al
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın."
        );
      }

      // Fetch API ile dosyayı indir (token ile birlikte)
      const response = await fetch(
        `${API_URL}/attachments/${attachmentId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Dosya indirme hatası: ${response.status} ${response.statusText}`
        );
      }

      // Blob olarak dosyayı al
      const blob = await response.blob();

      // Dosyayı indir
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "downloaded-file";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      setError(
        "Dosya indirilirken bir hata oluştu: " +
          (error.message || "Bilinmeyen hata")
      );
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!window.confirm("Bu dosyayı silmek istediğinizden emin misiniz?")) {
      return;
    }

    try {
      await attachmentAPI.deleteAttachment(attachmentId);
      fetchAttachments(); // Listeyi güncelle
    } catch (err) {
      setError(
        "Dosya silinirken bir hata oluştu: " +
          (err.message || "Bilinmeyen hata")
      );
      console.error("Error deleting attachment:", err);
    }
  };

  // Dosya türüne göre simge belirleme
  const getFileIcon = (fileType) => {
    if (fileType.startsWith("image/")) {
      return "bi-file-image";
    } else if (fileType.includes("pdf")) {
      return "bi-file-pdf";
    } else if (fileType.includes("excel") || fileType.includes("spreadsheet")) {
      return "bi-file-excel";
    } else if (fileType.includes("word") || fileType.includes("document")) {
      return "bi-file-word";
    } else {
      return "bi-file-earmark";
    }
  };

  // Dosya önizlenebilir mi?
  const isPreviewable = (fileType) => {
    return fileType.startsWith("image/") || fileType.includes("pdf");
  };

  // Önizleme işlemi
  const handlePreview = async (attachmentId, fileName, fileType) => {
    try {
      setPreviewLoading(true);
      setPreviewError("");

      // JWT token'ı localStorage'dan al
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın."
        );
      }

      // Dosya bilgileri ayarla
      setPreviewFile({
        name: fileName,
        type: fileType,
        id: attachmentId,
      });

      // Yetkilendirme ile dosyayı indir
      const response = await fetch(
        `${API_URL}/attachments/${attachmentId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Dosya yükleme hatası: ${response.status} ${response.statusText}`
        );
      }

      // Önce dosyanın gereksiz header bilgileri olup olmadığını kontrol edelim
      const contentType = response.headers.get("Content-Type");

      let blob;
      // PDF için content type'i zorla
      if (fileType.includes("pdf")) {
        // PDF dosyasıysa, yeni bir Blob oluştur ve PDF tipini zorla
        blob = await response.blob();
        blob = new Blob([blob], { type: "application/pdf" });
      } else {
        // Diğer dosya türleri için normal blob'u kullan
        blob = await response.blob();
      }

      // Blob URL oluştur
      const blobUrl = window.URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);

      setShowPreview(true);
    } catch (error) {
      console.error("Preview error:", error);
      setPreviewError(
        "Dosya önizleme hatası: " + (error.message || "Bilinmeyen hata")
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  // Modal kapatma
  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewFile(null);
    // Blob URL'i temizle
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    setPreviewError("");
  };

  // PDF önizleme seçenekleri oluştur
  const createPdfPreviewOptions = () => {
    // Şu anda desteklenen tarayıcıları kontrol et
    const isChrome = navigator.userAgent.indexOf("Chrome") !== -1;
    const isFirefox = navigator.userAgent.indexOf("Firefox") !== -1;
    const isSafari =
      navigator.userAgent.indexOf("Safari") !== -1 &&
      navigator.userAgent.indexOf("Chrome") === -1;

    if (isChrome || isFirefox) {
      return { useIframe: true }; // Chrome ve Firefox iframe'de PDF gösterebilir
    } else if (isSafari) {
      return { useObject: true }; // Safari object tag'i kullanabilir
    } else {
      return { useEmbed: true }; // Diğer tarayıcılar için embed tag'i deneyelim
    }
  };

  // Auth header'ı oluştur
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Dosya boyutunu insanların anlayabileceği formata dönüştürme
  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "N/A";
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
    else return (bytes / 1048576).toFixed(2) + " MB";
  };

  return (
    <Card className="mb-3">
      <Card.Body>
        <Card.Title>Eklenen Dosyalar</Card.Title>

        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="text-center p-4">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Yükleniyor...</span>
            </Spinner>
            <p className="mt-2">Dosyalar yükleniyor...</p>
          </div>
        ) : attachments.length > 0 ? (
          <ListGroup>
            {attachments.map((attachment) => (
              <ListGroup.Item
                key={attachment.id}
                className="d-flex justify-content-between align-items-start"
              >
                <div className="ms-2 me-auto">
                  <div className="d-flex align-items-center">
                    <i
                      className={`bi ${getFileIcon(
                        attachment.fileType
                      )} me-2 fs-5`}
                    ></i>
                    <div>
                      <div className="fw-bold">{attachment.fileName}</div>
                      <small className="text-muted">
                        {formatFileSize(attachment.fileSize)} •{" "}
                        {attachment.uploadedAt} • {attachment.uploadedBy}
                      </small>
                    </div>
                  </div>
                </div>
                <div>
                  <Button
                    variant="outline-info"
                    size="sm"
                    className="me-2"
                    onClick={() =>
                      handlePreview(
                        attachment.id,
                        attachment.fileName,
                        attachment.fileType
                      )
                    }
                    disabled={!isPreviewable(attachment.fileType)}
                    title={
                      isPreviewable(attachment.fileType)
                        ? "Önizle"
                        : "Bu dosya türü önizlenemez"
                    }
                  >
                    <i className="bi bi-eye"></i>
                  </Button>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="me-2"
                    onClick={() =>
                      handleDownload(attachment.id, attachment.fileName)
                    }
                  >
                    <i className="bi bi-download"></i>
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(attachment.id)}
                  >
                    <i className="bi bi-trash"></i>
                  </Button>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <div className="text-center p-3 bg-light rounded">
            <i className="bi bi-file-earmark-x fs-4 mb-2 d-block"></i>
            <p className="mb-0">Henüz hiç dosya yüklenmemiş.</p>
          </div>
        )}
      </Card.Body>

      {/* Önizleme Modal */}
      <Modal show={showPreview} onHide={handleClosePreview} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{previewFile?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {previewFile && (
            <div className="file-preview-container">
              {previewFile.type.startsWith("image/") ? (
                <div className="text-center">
                  {previewLoading ? (
                    <div className="p-5">
                      <Spinner
                        animation="border"
                        role="status"
                        variant="primary"
                      >
                        <span className="visually-hidden">Yükleniyor...</span>
                      </Spinner>
                      <p className="mt-3">Dosya yükleniyor...</p>
                    </div>
                  ) : previewError ? (
                    <div className="p-5">
                      <i className="bi bi-exclamation-triangle fs-1 text-warning"></i>
                      <p className="mt-3 text-danger">{previewError}</p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          handleDownload(previewFile.id, previewFile.name)
                        }
                      >
                        <i className="bi bi-download me-1"></i> Dosyayı İndir
                      </Button>
                    </div>
                  ) : (
                    <img
                      src={previewUrl}
                      alt={previewFile.name}
                      className="img-fluid shadow"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "70vh",
                        objectFit: "contain",
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "";
                        setPreviewError("Görüntü yüklenemedi.");
                      }}
                    />
                  )}
                </div>
              ) : previewFile.type.includes("pdf") ? (
                <div
                  className="ratio"
                  style={{ height: "70vh", backgroundColor: "#f5f5f5" }}
                >
                  {previewLoading ? (
                    <div className="d-flex align-items-center justify-content-center">
                      <div className="text-center">
                        <Spinner
                          animation="border"
                          role="status"
                          variant="primary"
                        >
                          <span className="visually-hidden">Yükleniyor...</span>
                        </Spinner>
                        <p className="mt-3">PDF yükleniyor...</p>
                      </div>
                    </div>
                  ) : previewError ? (
                    <div className="d-flex align-items-center justify-content-center">
                      <div className="text-center">
                        <i className="bi bi-exclamation-triangle fs-1 text-warning"></i>
                        <p className="mt-3 text-danger">{previewError}</p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            handleDownload(previewFile.id, previewFile.name)
                          }
                        >
                          <i className="bi bi-download me-1"></i> PDF'i İndir
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: "100%", height: "100%" }}>
                      {/* PDF önizleme için farklı tarayıcı desteği */}
                      <iframe
                        src={previewUrl}
                        width="100%"
                        height="100%"
                        style={{ border: "none", backgroundColor: "#f5f5f5" }}
                        title={previewFile.name}
                        loading="lazy"
                        allow="fullscreen"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-5">
                  <i className="bi bi-exclamation-triangle fs-1 text-warning"></i>
                  <p className="mt-3">Bu dosya türü önizlenemiyor.</p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClosePreview}>
            Kapat
          </Button>
          {previewFile && (
            <Button
              variant="primary"
              onClick={() => handleDownload(previewFile.id, previewFile.name)}
            >
              <i className="bi bi-download me-1"></i> İndir
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default FileViewer;
