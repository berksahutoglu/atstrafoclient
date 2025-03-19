import React, { useState, useEffect, useCallback } from 'react';
import { Card, ListGroup, Button, Alert, Spinner } from 'react-bootstrap';
import { attachmentAPI } from '../services/api';
import { API_URL } from '../services/api';

const FileViewer = ({ requestId, salesRequestId, refreshTrigger }) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAttachments = useCallback(async () => {
    try {
      setLoading(true);
      
      let response;
      if (requestId) {
        response = await attachmentAPI.getAttachmentsByRequestId(requestId);
      } else if (salesRequestId) {
        response = await attachmentAPI.getAttachmentsBySalesRequestId(salesRequestId);
      }
      
      setAttachments(response?.data || []);
      setError('');
    } catch (err) {
      setError('Dosyalar yüklenirken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
      console.error('Error fetching attachments:', err);
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
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      }
      
      // Fetch API ile dosyayı indir (token ile birlikte)
      const response = await fetch(`${API_URL}/attachments/${attachmentId}/download`, {

        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Dosya indirme hatası: ${response.status} ${response.statusText}`);
      }
      
      // Blob olarak dosyayı al
      const blob = await response.blob();
      
      // Dosyayı indir
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'downloaded-file';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      setError('Dosya indirilirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!window.confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      await attachmentAPI.deleteAttachment(attachmentId);
      fetchAttachments(); // Listeyi güncelle
    } catch (err) {
      setError('Dosya silinirken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
      console.error('Error deleting attachment:', err);
    }
  };

  // Dosya türüne göre simge belirleme
  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return 'bi-file-image';
    } else if (fileType.includes('pdf')) {
      return 'bi-file-pdf';
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return 'bi-file-excel';
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return 'bi-file-word';
    } else {
      return 'bi-file-earmark';
    }
  };

  // Dosya boyutunu insanların anlayabileceği formata dönüştürme
  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
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
            {attachments.map(attachment => (
              <ListGroup.Item key={attachment.id} className="d-flex justify-content-between align-items-start">
                <div className="ms-2 me-auto">
                  <div className="d-flex align-items-center">
                    <i className={`bi ${getFileIcon(attachment.fileType)} me-2 fs-5`}></i>
                    <div>
                      <div className="fw-bold">{attachment.fileName}</div>
                      <small className="text-muted">
                        {formatFileSize(attachment.fileSize)} • {attachment.uploadedAt} • {attachment.uploadedBy}
                      </small>
                    </div>
                  </div>
                </div>
                <div>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="me-2"
                    onClick={() => handleDownload(attachment.id, attachment.fileName)}
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
    </Card>
  );
};

export default FileViewer;