import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Card, Button, Alert, Table, Badge, Modal } from 'react-bootstrap';
import { salesAPI } from '../services/api';
import { convertToMarketType } from '../utils/marketTypeHelper';
import FileViewer from '../components/FileViewer';
import FileUploader from '../components/FileUploader';

const SalesRequestForm = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [refreshFiles, setRefreshFiles] = useState(0);
  const [selectedSalesRequestId, setSelectedSalesRequestId] = useState(null);
  const [showFilesModal, setShowFilesModal] = useState(false);

  useEffect(() => {
    fetchSalesRequests();
  }, []);

  const fetchSalesRequests = async () => {
    try {
      setLoading(true);
      const response = await salesAPI.getMySalesRequests();
      setRequests(response.data);
      setError('');
    } catch (err) {
      setError('Talepler yüklenirken bir hata oluştu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const initialValues = {
    isDomestic: true,
    marketType: 'DOMESTIC', // Yeni eklendi
    country: 'Türkiye',
    power: '',
    quantity: 1,
    outputPower: '',
    isAPlus: false,
    requestedDeliveryDate: new Date().toISOString().split('T')[0],
    notes: ''
  };

  const validationSchema = Yup.object({
    marketType: Yup.string().required('Yurtiçi/Yurtdışı seçimi gerekli'),
    isDomestic: Yup.boolean().required('Yurtiçi/Yurtdışı seçimi gerekli'),
    country: Yup.string().required('Ülke gerekli'),
    power: Yup.string().required('Güç bilgisi gerekli'),
    quantity: Yup.number()
      .required('Adet gerekli')
      .positive('Adet pozitif olmalı')
      .integer('Adet tam sayı olmalı'),
    outputPower: Yup.string().required('Çıkış gücü gerekli'),
    requestedDeliveryDate: Yup.date().required('Teslim tarihi gerekli')
  });

  // Dosya seçme işlemi
  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  // Dosyaları temizleme işlemi
  const handleClearFiles = () => {
    setSelectedFiles([]);
    const fileInput = document.getElementById('salesRequestFileUpload');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const response = await salesAPI.createSalesRequest(values);
      setSuccess('Talep başarıyla oluşturuldu!');
      
      // Yeni talebin ID'sini seçili talep olarak belirle
      const newSalesRequestId = response.data.id;
      setSelectedSalesRequestId(newSalesRequestId);
      
      // Dosya yükleme işlemi
      if (selectedFiles.length > 0) {
        try {
          const formData = new FormData();
          selectedFiles.forEach(file => {
            formData.append('files', file);
          });
          
          // salesAPI kullanarak dosyaları yükle
          await salesAPI.uploadFiles(newSalesRequestId, formData);
          setRefreshFiles(prev => prev + 1);
          console.log("Dosyalar başarıyla yüklendi");
        } catch (uploadErr) {
          console.error('Dosya yükleme hatası:', uploadErr);
          setError('Dosyalar yüklenirken bir hata oluştu, ancak talep oluşturuldu.');
          
          setTimeout(() => {
            setError('');
          }, 3000);
        }
      }
      
      resetForm();
      setSelectedFiles([]); // Dosya seçimini sıfırla
      
      // Input alanını sıfırla
      const fileInput = document.getElementById('salesRequestFileUpload');
      if (fileInput) fileInput.value = '';
      
      fetchSalesRequests();
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Talep oluşturulurken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
      console.error('Create sales request error:', err);
      
      setTimeout(() => {
        setError('');
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShowDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  // Dosya görüntüleme modalını açma
  const handleShowFilesModal = (salesRequestId) => {
    setSelectedSalesRequestId(salesRequestId);
    setShowFilesModal(true);
  };

  // Durum badge rengi
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <Badge bg="secondary">Beklemede</Badge>;
      case 'PROCESSING':
        return <Badge bg="primary">İşleniyor</Badge>;
      case 'CONVERTED':
        return <Badge bg="info">Talebe Dönüştürüldü</Badge>;
      case 'APPROVED':
        return <Badge bg="success">Onaylandı</Badge>;
      case 'ORDERED':
        return <Badge bg="warning">Sipariş Verildi</Badge>;
      case 'DELIVERED':
        return <Badge bg="light" text="dark">Teslim Edildi</Badge>;
      case 'COMPLETED':
        return <Badge bg="success">Tamamlandı</Badge>;
      case 'CANCELLED':
        return <Badge bg="danger">İptal Edildi</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container">
      <h2 className="mb-4">Yeni Satış Siparişi Oluştur</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, values, setFieldValue }) => (
              <Form>
                <div className="mb-3">
                  <label className="form-label">Pazar</label>
                  <div>
                    <div className="form-check form-check-inline">
                      <Field 
                        className="form-check-input" 
                        type="radio" 
                        name="isDomestic" 
                        id="isDomesticTrue" 
                        checked={values.isDomestic === true}
                        onChange={() => {
                          setFieldValue('isDomestic', true);
                          setFieldValue('marketType', 'DOMESTIC');
                          setFieldValue('country', 'Türkiye');
                        }}
                      />
                      <label className="form-check-label" htmlFor="isDomesticTrue">
                        Yurtiçi
                      </label>
                    </div>
                    <div className="form-check form-check-inline">
                      <Field 
                        className="form-check-input" 
                        type="radio" 
                        name="isDomestic" 
                        id="isDomesticFalse" 
                        checked={values.isDomestic === false}
                        onChange={() => {
                          setFieldValue('isDomestic', false);
                          setFieldValue('marketType', 'INTERNATIONAL');
                          setFieldValue('country', '');
                          setFieldValue('isAPlus', false);
                        }}
                      />
                      <label className="form-check-label" htmlFor="isDomesticFalse">
                        Yurtdışı
                      </label>
                    </div>
                  </div>
                  <ErrorMessage name="isDomestic" component="div" className="text-danger" />
                </div>

                <div className="mb-3">
                  <label htmlFor="country" className="form-label">Ülke</label>
                  <Field 
                    type="text" 
                    name="country" 
                    className="form-control"
                    disabled={values.isDomestic} 
                  />
                  <ErrorMessage name="country" component="div" className="text-danger" />
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="power" className="form-label">Güç</label>
                    <Field type="text" name="power" className="form-control" />
                    <ErrorMessage name="power" component="div" className="text-danger" />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="outputPower" className="form-label">Çıkış Gücü</label>
                    <Field type="text" name="outputPower" className="form-control" />
                    <ErrorMessage name="outputPower" component="div" className="text-danger" />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="quantity" className="form-label">Adet</label>
                    <Field type="number" name="quantity" min="1" className="form-control" />
                    <ErrorMessage name="quantity" component="div" className="text-danger" />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="requestedDeliveryDate" className="form-label">Talep Edilen Teslim Tarihi</label>
                    <Field type="date" name="requestedDeliveryDate" className="form-control" />
                    <ErrorMessage name="requestedDeliveryDate" component="div" className="text-danger" />
                  </div>
                </div>

                {values.isDomestic && (
                  <div className="mb-3">
                    <div className="form-check">
                      <Field 
                        className="form-check-input" 
                        type="checkbox" 
                        name="isAPlus" 
                        id="isAPlus" 
                      />
                      <label className="form-check-label" htmlFor="isAPlus">
                        A+ Sınıfı
                      </label>
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="notes" className="form-label">Notlar</label>
                  <Field
                    as="textarea"
                    name="notes"
                    className="form-control"
                    rows="3"
                  />
                </div>

                {/* Dosya Yükleme Alanı - YENİ */}
                <div className="mb-3">
                  <label htmlFor="salesRequestFileUpload" className="form-label">Dosya Ekle</label>
                  <div className="input-group">
                    <input
                      type="file"
                      id="salesRequestFileUpload"
                      className="form-control"
                      multiple
                      onChange={handleFileChange}
                    />
                    {selectedFiles.length > 0 && (
                      <Button
                        variant="outline-secondary"
                        onClick={handleClearFiles}
                      >
                        Temizle
                      </Button>
                    )}
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="mt-2">
                      <Badge bg="info">{selectedFiles.length} dosya seçildi</Badge>
                      <ul className="list-group mt-2">
                        {selectedFiles.map((file, index) => (
                          <li key={index} className="list-group-item d-flex justify-content-between align-items-center py-2">
                            <small>{file.name}</small>
                            <Badge bg="secondary" pill>{(file.size / 1024).toFixed(1)} KB</Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  variant="primary" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Gönderiliyor...' : 'Sipariş Oluştur'}
                </Button>
              </Form>
            )}
          </Formik>
          
          {selectedSalesRequestId && (
            <>
              <hr />
              <FileUploader 
                salesRequestId={selectedSalesRequestId} 
                onUploadSuccess={() => setRefreshFiles(prev => prev + 1)} 
              />
              <FileViewer 
                salesRequestId={selectedSalesRequestId}
                refreshTrigger={refreshFiles}
              />
            </>
          )}
        </Card.Body>
      </Card>

      <h3 className="mt-5 mb-3">Oluşturduğum Siparişler</h3>
      {loading ? (
        <p>Yükleniyor...</p>
      ) : requests.length > 0 ? (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Pazar</th>
              <th>Ülke</th>
              <th>Güç</th>
              <th>Çıkış Gücü</th>
              <th>Adet</th>
              <th>Teslim Tarihi</th>
              <th>Durum</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request, index) => (
              <tr key={request.id}>
                <td>{index + 1}</td>
                <td>{request.domestic ? 'Yurtiçi' : 'Yurtdışı'}</td>
                <td>{request.country}</td>
                <td>{request.power}</td>
                <td>{request.outputPower}</td>
                <td>{request.quantity}</td>
                <td>{new Date(request.requestedDeliveryDate).toLocaleDateString()}</td>
                <td>{getStatusBadge(request.status)}</td>
                <td>
                  <Button 
                    variant="outline-info" 
                    size="sm"
                    className="me-2 mb-1"
                    onClick={() => handleShowDetails(request)}
                  >
                    Detaylar
                  </Button>
                  
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    className="mb-1"
                    onClick={() => handleShowFilesModal(request.id)}
                  >
                    <i className="bi bi-file-earmark"></i> Dosyalar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <div className="text-center p-4 border rounded bg-light">
          <p className="mb-0">Henüz hiç sipariş oluşturmadınız.</p>
        </div>
      )}

      {/* Detay Modali */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Sipariş Detayları</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <div>
              <table className="table table-bordered">
                <tbody>
                  <tr>
                    <th style={{width: "30%"}}>Pazar</th>
                    <td>{selectedRequest.domestic ? 'Yurtiçi' : 'Yurtdışı'}</td>
                  </tr>
                  <tr>
                    <th>Ülke</th>
                    <td>{selectedRequest.country}</td>
                  </tr>
                  <tr>
                    <th>Güç</th>
                    <td>{selectedRequest.power}</td>
                  </tr>
                  <tr>
                    <th>Çıkış Gücü</th>
                    <td>{selectedRequest.outputPower}</td>
                  </tr>
                  <tr>
                    <th>Adet</th>
                    <td>{selectedRequest.quantity}</td>
                  </tr>
                  {selectedRequest.domestic && (
                    <tr>
                      <th>Sınıf</th>
                      <td>{selectedRequest.aPlus ? 'A+' : 'Normal'}</td>
                    </tr>
                  )}
                  <tr>
                    <th>Talep Edilen Teslim Tarihi</th>
                    <td>{new Date(selectedRequest.requestedDeliveryDate).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <th>Oluşturma Tarihi</th>
                    <td>{new Date(selectedRequest.createdAt).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <th>Durum</th>
                    <td>{getStatusBadge(selectedRequest.status)}</td>
                  </tr>
                  {selectedRequest.notes && (
                    <tr>
                      <th>Notlar</th>
                      <td>{selectedRequest.notes}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {selectedRequest.productionRequest && (
                <div className="mt-4">
                  <h5>İlişkili Üretim Talebi</h5>
                  <table className="table table-bordered">
                    <tbody>
                      <tr>
                        <th style={{width: "30%"}}>Talep #</th>
                        <td>{selectedRequest.productionRequest.id}</td>
                      </tr>
                      <tr>
                        <th>Başlık</th>
                        <td>{selectedRequest.productionRequest.title}</td>
                      </tr>
                      <tr>
                        <th>Durum</th>
                        <td>{getStatusBadge(selectedRequest.productionRequest.status)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Dosya görüntüleme butonu */}
              <div className="d-flex justify-content-end mt-3">
                <Button 
                  variant="outline-secondary"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleShowFilesModal(selectedRequest.id);
                  }}
                >
                  <i className="bi bi-file-earmark"></i> Dosyaları Görüntüle
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Kapat
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Dosya Görüntüleme Modalı */}
      <Modal show={showFilesModal} onHide={() => setShowFilesModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Sipariş Dosyaları</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSalesRequestId && (
            <>
              <FileUploader 
                salesRequestId={selectedSalesRequestId} 
                onUploadSuccess={() => setRefreshFiles(prev => prev + 1)} 
              />
              <FileViewer 
                salesRequestId={selectedSalesRequestId}
                refreshTrigger={refreshFiles}
              />
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFilesModal(false)}>
            Kapat
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SalesRequestForm;