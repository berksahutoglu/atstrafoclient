import React, { useState, useEffect } from 'react';
import { Alert, Button, ProgressBar, Card, ListGroup } from 'react-bootstrap';
import { attachmentAPI, salesAPI } from '../services/api';

const FileUploader = ({ requestId, salesRequestId, onUploadSuccess, initialFiles = [] }) => {
  const [selectedFiles, setSelectedFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Bu useEffect talep ID'si geçerli olduğunda bileşeni başlatır
    if (requestId || salesRequestId) {
      setIsInitialized(true);
    }
  }, [requestId, salesRequestId]);
  
  // İlk yüklemede initialFiles varsa onları yükle
  useEffect(() => {
    if (initialFiles.length > 0) {
      setSelectedFiles(initialFiles);
    }
  }, [initialFiles]);
  
  const handleFileSelect = (event) => {
    setSelectedFiles(Array.from(event.target.files));
  };
  
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Lütfen bir dosya seçin.');
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');
    
    try {
      // Çoklu dosya yükleme işlemi
      const formData = new FormData();
      
      // Dosya kontrolleri ve formData'ya ekleme
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Dosya boyutu kontrolü (10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name} dosyası çok büyük. Maksimum 10MB olmalıdır.`);
          continue;
        }
        
        formData.append('files', file);
      }
      
      console.log('Uploading files to:', requestId ? 'request' : 'sales request', requestId || salesRequestId);
      
      // Dosyaları yükle
      if (requestId) {
        await attachmentAPI.uploadFiles(requestId, formData);
      } else if (salesRequestId) {
        await salesAPI.uploadFiles(salesRequestId, formData);
      }
      
      setSuccess('Dosyalar başarıyla yüklendi.');
      setSelectedFiles([]);
      
      // Input alanını sıfırla
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
      // Callback'i çağır
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      setError('Dosya yüklenirken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      setUploadProgress(100); // Tamamlandı
    }
  };
  
  if (!isInitialized && !requestId && !salesRequestId) {
    return null; // ID yoksa bileşeni render etme
  }
  
  return (
    <Card className="mb-3">
      <Card.Body>
        <Card.Title>Dosya Yükleme</Card.Title>
        
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        <div className="mb-3">
          <input
            type="file"
            className="form-control"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            id={requestId ? `file-uploader-${requestId}` : `file-uploader-sales-${salesRequestId}`}
          />
          <div className="form-text">
            Seçilen dosyalar: {selectedFiles.length}
          </div>
        </div>
        
        {selectedFiles.length > 0 && (
          <ListGroup className="mb-3">
            {selectedFiles.map((file, index) => (
              <ListGroup.Item key={index}>
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
        
        {uploading && (
          <ProgressBar now={uploadProgress} label={`${uploadProgress}%`} className="mb-3" />
        )}
        
        <Button 
          variant="primary" 
          onClick={handleUpload} 
          disabled={selectedFiles.length === 0 || uploading}
        >
          {uploading ? 'Yükleniyor...' : 'Dosyaları Yükle'}
        </Button>
      </Card.Body>
    </Card>
  );
};

export default FileUploader;