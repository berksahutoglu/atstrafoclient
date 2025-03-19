import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Card, Button, Alert, Table, Badge, Modal } from 'react-bootstrap';
import { attachmentAPI, requestAPI } from '../services/api';
import FileUploader from '../components/FileUploader';
import FileViewer from '../components/FileViewer';

const RequestForm = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingRequest, setEditingRequest] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [refreshFiles, setRefreshFiles] = useState(0);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showFilesModal, setShowFilesModal] = useState(false);
  // Yeni: Seçilen dosyaları tutacak state
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    // Kullanıcının daha önce yaptığı talepleri getir
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await requestAPI.getMyRequests();
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
    title: '',
    description: '',
    quantity: 1,
    unit: 'PIECE', // Varsayılan birim: adet
    urgency: 'NORMAL' // NORMAL, HIGH, URGENT
  };

  const validationSchema = Yup.object({
    title: Yup.string().required('Ürün gerekli'),
    quantity: Yup.number()
      .required('Miktar gerekli')
      .positive('Miktar pozitif olmalı')
      .integer('Miktar tam sayı olmalı'),
    unit: Yup.string().required('Birim gerekli'),
    urgency: Yup.string().required('Aciliyet seviyesi gerekli')
  });

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      // Talep oluştur
      const response = await requestAPI.createRequest(values);
      setSuccess('Talep başarıyla oluşturuldu!');
      
      // Yeni talebin ID'sini seçili talep olarak belirle
      const newRequestId = response.data.id;
      setSelectedRequestId(newRequestId);
      
      // Dosyaları yükle
      if (selectedFiles.length > 0) {
        try {
          // FormData oluştur
          const formData = new FormData();
          selectedFiles.forEach(file => {
            formData.append('files', file);
          });
          
          // Dosyaları yükle (attachmentAPI kullanarak)
          await attachmentAPI.uploadFiles(newRequestId, formData);
          setRefreshFiles(prev => prev + 1); // FileViewer'ı yenile
          
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
      
      // Input alanını temizle
      const fileInput = document.getElementById('fileUpload');
      if (fileInput) fileInput.value = '';
      
      fetchRequests(); // Listeyi güncelle
      
      // 3 saniye sonra başarı mesajını kaldır
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Talep oluşturulurken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
      console.error('Create request error:', err);
      
      // 3 saniye sonra hata mesajını kaldır
      setTimeout(() => {
        setError('');
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  // Düzenleme işlemi için modal açma
  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setShowEditModal(true);
  };

  // Düzenleme işlemi onaylama
  const handleUpdateRequest = async (values, { setSubmitting }) => {
    try {
      await requestAPI.updateRequest(editingRequest.id, values);
      setSuccess('Talep başarıyla güncellendi!');
      setShowEditModal(false);
      fetchRequests(); // Listeyi güncelle
      
      // 3 saniye sonra başarı mesajını kaldır
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Talep güncellenirken bir hata oluştu.');
      console.error(err);
      
      // 3 saniye sonra hata mesajını kaldır
      setTimeout(() => {
        setError('');
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  // Silme işlemi için modal açma
  const handleShowDeleteModal = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  // Silme işlemi onaylama
  const handleDeleteRequest = async () => {
    try {
      await requestAPI.deleteRequest(deleteId);
      setSuccess('Talep başarıyla silindi!');
      setShowDeleteModal(false);
      fetchRequests(); // Listeyi güncelle
      
      // 3 saniye sonra başarı mesajını kaldır
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Talep silinirken bir hata oluştu.');
      console.error(err);
      
      // 3 saniye sonra hata mesajını kaldır
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };

  // Birim adını getir
  const getUnitName = (unit) => {
    switch (unit) {
      case 'KILOGRAM': return 'kg';
      case 'METER': return 'metre';
      case 'TON': return 'ton';
      case 'PIECE': return 'adet';
      case 'LITER': return 'litre';
      case 'PACKAGE': return 'paket';
      case 'BOX': return 'kutu';
      case 'PALLET': return 'palet';
      case 'SIZE' : return 'boy';
      default: return unit;
    }
  };

  // Durum badge rengi
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <Badge bg="secondary">Beklemede</Badge>;
      case 'APPROVED':
        return <Badge bg="primary">Onaylandı</Badge>;
      case 'ORDERED':
        return <Badge bg="info">Sipariş Verildi</Badge>;
      case 'DELIVERED':
        return <Badge bg="success">Teslim Edildi</Badge>;
      case 'REJECTED':
        return <Badge bg="danger">Reddedildi</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // Aciliyet badge rengi
  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'NORMAL':
        return <Badge bg="success">Normal</Badge>;
      case 'HIGH':
        return <Badge bg="warning">Yüksek</Badge>;
      case 'URGENT':
        return <Badge bg="danger">Acil</Badge>;
      default:
        return <Badge bg="secondary">{urgency}</Badge>;
    }
  };

  return (
    <div className="container">
      <h2 className="mb-4">Yeni Talep Oluştur</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form>
                <div className="mb-3">
                  <label htmlFor="title" className="form-label">Ürün</label>
                  <Field type="text" name="title" className="form-control" />
                  <ErrorMessage name="title" component="div" className="text-danger" />
                </div>

                <div className="mb-3">
                  <label htmlFor="description" className="form-label">Açıklama</label>
                  <Field
                    as="textarea"
                    name="description"
                    className="form-control"
                    rows="3"
                  />
                  <ErrorMessage name="description" component="div" className="text-danger" />
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="quantity" className="form-label">Miktar</label>
                    <Field type="number" name="quantity" min="1" className="form-control" />
                    <ErrorMessage name="quantity" component="div" className="text-danger" />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="unit" className="form-label">Birim</label>
                    <Field as="select" name="unit" className="form-select">
                      <option value="PIECE">Adet</option>
                      <option value="KILOGRAM">Kilogram (kg)</option>
                      <option value="METER">Metre</option>
                      <option value="TON">Ton</option>
                      <option value="LITER">Litre</option>
                      <option value="PACKAGE">Paket</option>
                      <option value="BOX">Kutu</option>
                      <option value="PALLET">Palet</option>
                      <option value="SIZE">Boy</option>
                    </Field>
                    <ErrorMessage name="unit" component="div" className="text-danger" />
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="urgency" className="form-label">Aciliyet</label>
                  <Field as="select" name="urgency" className="form-select">
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Yüksek</option>
                    <option value="URGENT">Acil</option>
                  </Field>
                  <ErrorMessage name="urgency" component="div" className="text-danger" />
                </div>

                {/* Dosya yükleme alanı - YENİ */}
                <div className="mb-3">
                  <label htmlFor="fileUpload" className="form-label">Dosya Ekle</label>
                  <div className="input-group">
                    <input
                      type="file"
                      id="fileUpload"
                      className="form-control"
                      multiple
                      onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                    />
                    {selectedFiles.length > 0 && (
                      <Button
                        variant="outline-secondary"
                        onClick={() => setSelectedFiles([])}
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
                  {isSubmitting ? 'Gönderiliyor...' : 'Talep Oluştur'}
                </Button>
              </Form>
            )}
          </Formik>
          
          {selectedRequestId && (
            <>
              <hr />
              <FileUploader 
                requestId={selectedRequestId} 
                onUploadSuccess={() => setRefreshFiles(prev => prev + 1)} 
              />
              <FileViewer 
                requestId={selectedRequestId}
                refreshTrigger={refreshFiles}
              />
            </>
          )}
        </Card.Body>
      </Card>

      <h3 className="mt-5 mb-3">Taleplerim</h3>
      {loading ? (
        <p>Yükleniyor...</p>
      ) : requests.length > 0 ? (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Ürün</th>
              <th>Açıklama</th>
              <th>Miktar</th>
              <th>Birim</th>
              <th>Aciliyet</th>
              <th>Durum</th>
              <th>Oluşturma Tarihi</th>
              <th>Onaylayan Yorumu</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request, index) => (
              <tr key={request.id}>
                <td>{index + 1}</td>
                <td>{request.title}</td>
                <td>{request.description}</td>
                <td>{request.quantity}</td>
                <td>{getUnitName(request.unit)}</td>
                <td>{getUrgencyBadge(request.urgency)}</td>
                <td>{getStatusBadge(request.status)}</td>
                <td>{new Date(request.createdAt).toLocaleString()}</td>
                <td>{request.comment}</td>
                <td>
                  <Button 
                    variant="outline-info" 
                    size="sm" 
                    className="me-2"
                    onClick={() => {
                      setSelectedRequestId(request.id);
                      setShowFilesModal(true);
                    }}
                  >
                    <i className="bi bi-file-earmark"></i> Dosyalar
                  </Button>
                  
                  {request.status === 'PENDING' && (
                    <>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-2"
                        onClick={() => handleEditRequest(request)}
                      >
                        Düzenle
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleShowDeleteModal(request.id)}
                      >
                        Sil
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <div className="text-center p-4 border rounded bg-light">
          <p className="mb-0">Henüz hiç talep oluşturmadınız.</p>
        </div>
      )}

      {/* Düzenleme Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Talebi Düzenle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingRequest && (
            <Formik
              initialValues={{
                title: editingRequest.title,
                description: editingRequest.description,
                quantity: editingRequest.quantity,
                unit: editingRequest.unit,
                urgency: editingRequest.urgency
              }}
              validationSchema={validationSchema}
              onSubmit={handleUpdateRequest}
            >
              {({ isSubmitting }) => (
                <Form>
                  <div className="mb-3">
                    <label htmlFor="title" className="form-label">Ürün</label>
                    <Field type="text" name="title" className="form-control" />
                    <ErrorMessage name="title" component="div" className="text-danger" />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">Açıklama</label>
                    <Field
                      as="textarea"
                      name="description"
                      className="form-control"
                      rows="3"
                    />
                    <ErrorMessage name="description" component="div" className="text-danger" />
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="quantity" className="form-label">Miktar</label>
                      <Field type="number" name="quantity" min="1" className="form-control" />
                      <ErrorMessage name="quantity" component="div" className="text-danger" />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="unit" className="form-label">Birim</label>
                      <Field as="select" name="unit" className="form-select">
                        <option value="PIECE">Adet</option>
                        <option value="KILOGRAM">Kilogram (kg)</option>
                        <option value="METER">Metre</option>
                        <option value="TON">Ton</option>
                        <option value="LITER">Litre</option>
                        <option value="PACKAGE">Paket</option>
                        <option value="BOX">Kutu</option>
                        <option value="PALLET">Palet</option>
                        <option value="SIZE">Boy</option>
                      </Field>
                      <ErrorMessage name="unit" component="div" className="text-danger" />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="urgency" className="form-label">Aciliyet</label>
                    <Field as="select" name="urgency" className="form-select">
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">Yüksek</option>
                      <option value="URGENT">Acil</option>
                    </Field>
                    <ErrorMessage name="urgency" component="div" className="text-danger" />
                  </div>

                  <div className="d-flex justify-content-end">
                    <Button 
                      variant="secondary" 
                      className="me-2"
                      onClick={() => setShowEditModal(false)}
                    >
                      İptal
                    </Button>
                    <Button 
                      type="submit" 
                      variant="primary" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Güncelleniyor...' : 'Güncelle'}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          )}
        </Modal.Body>
      </Modal>

      {/* Silme Onay Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Talebi Sil</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Bu talebi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            İptal
          </Button>
          <Button variant="danger" onClick={handleDeleteRequest}>
            Sil
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Dosya Görüntüleme Modalı */}
      <Modal show={showFilesModal} onHide={() => setShowFilesModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Talep Dosyaları</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequestId && (
            <>
              <FileUploader 
                requestId={selectedRequestId} 
                onUploadSuccess={() => setRefreshFiles(prev => prev + 1)} 
              />
              <FileViewer 
                requestId={selectedRequestId}
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

export default RequestForm;