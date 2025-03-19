import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Card, Button, Alert, Table, Badge, Modal, ListGroup } from 'react-bootstrap';
import { requestAPI, orderAPI, attachmentAPI } from '../services/api'
import 'bootstrap-icons/font/bootstrap-icons.css';
import FileViewer from '../components/FileViewer';

const MultiRequestForm = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Sepet (çoklu talep için)
  const [cartItems, setCartItems] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  
  // Dosya yükleme için
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileUploading, setFileUploading] = useState(false);
  
  // Düzenleme ve silme için
  const [editingRequest, setEditingRequest] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  
  // Dosya önizleme için
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  const [refreshFiles, setRefreshFiles] = useState(0);

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

  // Dosya ekle
  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  // Dosyaları temizle
  const handleClearFiles = () => {
    setSelectedFiles([]);
    // Dosya input alanını sıfırla
    const fileInput = document.getElementById('fileUpload');
    if (fileInput) fileInput.value = '';
  };

  // Talebi sepete ekle
  const handleAddToCart = (values, { resetForm }) => {
    // Benzersiz bir geçici ID ekle
    const itemWithId = { 
      ...values, 
      tempId: Date.now(),
      files: selectedFiles.length > 0 ? [...selectedFiles] : []
    };
    
    setCartItems([...cartItems, itemWithId]);
    resetForm();
    setSelectedFiles([]); // Dosya seçimini sıfırla
    
    // Dosya input alanını sıfırla
    const fileInput = document.getElementById('fileUpload');
    if (fileInput) fileInput.value = '';
    
    setSuccess('Talep sepete eklendi!');
    
    setTimeout(() => {
      setSuccess('');
    }, 2000);
  };
  
  // Sepetteki talebi kaldır
  const handleRemoveFromCart = (tempId) => {
    setCartItems(cartItems.filter(item => item.tempId !== tempId));
  };
  
  // Sepeti temizle
  const handleClearCart = () => {
    setCartItems([]);
  };
  
  // Toplu sipariş oluştur
  const handleCreateOrder = async () => {
    if (cartItems.length === 0) {
      setError('Sipariş oluşturmak için en az bir talep ekleyin.');
      return;
    }
    
    try {
      setFileUploading(true);
      
      // OrderDto formatını oluştur
      const orderDto = {
        notes: orderNotes,
        requests: cartItems.map(item => ({
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          urgency: item.urgency
        }))
      };
      
      // Siparişi oluştur ve oluşturulan taleplerin ID'lerini al
      const orderResponse = await orderAPI.createOrder(orderDto);
      const createdRequests = orderResponse.data.requests || [];
      
      // Dosya yüklemesi gerekiyorsa, her talep için dosyaları yükle
      const fileUploadPromises = [];
      
      cartItems.forEach((cartItem, index) => {
        if (cartItem.files && cartItem.files.length > 0 && createdRequests[index]) {
          const requestId = createdRequests[index].id;
          
          const formData = new FormData();
          cartItem.files.forEach(file => {
            formData.append('files', file);
          });
          
          fileUploadPromises.push(attachmentAPI.uploadFiles(requestId, formData));
        }
      });
      
      // Tüm dosya yükleme işlemlerini tamamla
      if (fileUploadPromises.length > 0) {
        await Promise.all(fileUploadPromises);
      }
      
      setSuccess('Sipariş ve dosyaları başarıyla yüklendi!');
      setCartItems([]);
      setOrderNotes('');
      fetchRequests(); // Listeyi güncelle
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Sipariş oluşturulurken bir hata oluştu.');
      console.error(err);
      
      setTimeout(() => {
        setError('');
      }, 3000);
    } finally {
      setFileUploading(false);
    }
  };
  
  // Tek talep oluştur
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      await requestAPI.createRequest(values);
      setSuccess('Talep başarıyla oluşturuldu!');
      resetForm();
      fetchRequests(); // Listeyi güncelle
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Talep oluşturulurken bir hata oluştu.');
      console.error(err);
      
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
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Talep güncellenirken bir hata oluştu.');
      console.error(err);
      
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
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Talep silinirken bir hata oluştu.');
      console.error(err);
      
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };

  // Dosya görüntüleme modalını aç
  const handleShowFilesModal = (requestId) => {
    setSelectedRequestId(requestId);
    setShowFilesModal(true);
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
      case 'SIZE': return 'boy';
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
      <h2 className="mb-4">Talep Oluştur</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <Card className="mb-4 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Yeni Talep</h5>
        </Card.Header>
        <Card.Body>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleAddToCart}
          >
            {({ isSubmitting, values, resetForm, handleSubmit }) => (
              <Form>
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label htmlFor="title" className="form-label">Ürün</label>
                    <Field type="text" name="title" className="form-control" />
                    <ErrorMessage name="title" component="div" className="text-danger" />
                  </div>

                  <div className="col-md-2 mb-3">
                    <label htmlFor="quantity" className="form-label">Miktar</label>
                    <Field type="number" name="quantity" min="1" className="form-control" />
                    <ErrorMessage name="quantity" component="div" className="text-danger" />
                  </div>

                  <div className="col-md-2 mb-3">
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

                  <div className="col-md-3 mb-3">
                    <label htmlFor="urgency" className="form-label">Aciliyet</label>
                    <Field as="select" name="urgency" className="form-select">
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">Yüksek</option>
                      <option value="URGENT">Acil</option>
                    </Field>
                    <ErrorMessage name="urgency" component="div" className="text-danger" />
                  </div>

                  <div className="col-md-1 mb-3 d-flex align-items-end">
                    <Button 
                      type="submit" 
                      variant="outline-success" 
                      disabled={isSubmitting || !values.title}
                      className="btn-sm"
                    >
                      <i className="bi bi-plus-lg fs-5"></i>
                    </Button>
                  </div>
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

                {/* Dosya Yükleme Alanı - YENİ */}
                <div className="mb-3">
                  <label htmlFor="fileUpload" className="form-label">Dosya Ekle</label>
                  <div className="input-group">
                    <input
                      type="file"
                      id="fileUpload"
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
                      <Badge bg="info" className="mb-2">{selectedFiles.length} dosya seçildi</Badge>
                      <div className="border rounded p-2 bg-light">
                        <ul className="list-unstyled mb-0">
                          {selectedFiles.map((file, idx) => (
                            <li key={idx} className="small">
                              <i className="bi bi-paperclip me-1"></i>
                              {file.name} <span className="text-muted">({(file.size / 1024).toFixed(1)} KB)</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </Form>
            )}
          </Formik>
        </Card.Body>
      </Card>

      {/* Sepet Görünümü (Kart içinde) */}
      {cartItems.length > 0 && (
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-light">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Sepet ({cartItems.length} Ürün)</h5>
              <div>
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  className="me-2"
                  onClick={handleClearCart}
                  disabled={fileUploading}
                >
                  <i className="bi bi-trash"></i> Sepeti Temizle
                </Button>
                <Button 
                  variant="success" 
                  size="sm"
                  onClick={handleCreateOrder}
                  disabled={fileUploading}
                >
                  {fileUploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Yükleniyor...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg"></i> Sipariş Oluştur
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="mb-3">
              <label htmlFor="orderNotes" className="form-label">Sipariş Notları</label>
              <textarea
                id="orderNotes"
                className="form-control"
                rows="2"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Siparişle ilgili eklemek istediğiniz notlar"
              />
            </div>
            
            <ListGroup variant="flush">
              {cartItems.map((item, index) => (
                <ListGroup.Item key={item.tempId} className="d-flex justify-content-between align-items-center py-3">
                  <div className="d-flex align-items-center">
                    <Badge bg="secondary" className="me-3">{index + 1}</Badge>
                    <div>
                      <h6 className="mb-0">{item.title}</h6>
                      <p className="mb-0 text-muted small">
                        {item.quantity} {getUnitName(item.unit)} | {getUrgencyBadge(item.urgency)}
                      </p>
                      {item.description && <p className="mb-0 text-muted small">{item.description}</p>}
                      
                      {/* Seçilen Dosyaları Göster - YENİ */}
                      {item.files && item.files.length > 0 && (
                        <div className="mt-1">
                          <small className="text-primary">
                            <i className="bi bi-paperclip me-1"></i>
                            {item.files.length} dosya ekli
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => handleRemoveFromCart(item.tempId)}
                    disabled={fileUploading}
                  >
                    <i className="bi bi-x-lg"></i>
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card.Body>
        </Card>
      )}

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
                    className="me-2 mb-1"
                    onClick={() => handleShowFilesModal(request.id)}
                  >
                    <i className="bi bi-file-earmark"></i> Dosyalar
                  </Button>
                  
                  {request.status === 'PENDING' && (
                    <>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-2 mb-1"
                        onClick={() => handleEditRequest(request)}
                      >
                        Düzenle
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        className="mb-1"
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

      {/* Dosya Görüntüleme Modalı - YENİ */}
      <Modal show={showFilesModal} onHide={() => setShowFilesModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Talep Dosyaları</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequestId && (
            <>
              <div className="mb-4">
                <h6>Dosya Yükle</h6>
                <div className="d-flex">
                  <input
                    type="file"
                    className="form-control me-2"
                    multiple
                    id="requestFileUpload"
                  />
                  <Button 
                    variant="primary"
                    onClick={() => {
                      const files = document.getElementById('requestFileUpload').files;
                      if (files.length > 0) {
                        const formData = new FormData();
                        Array.from(files).forEach(file => {
                          formData.append('files', file);
                        });
                        
                        // Dosya yükleme işlemi
                        attachmentAPI.uploadFiles(selectedRequestId, formData)
                          .then(() => {
                            setSuccess('Dosyalar başarıyla yüklendi!');
                            setRefreshFiles(prev => prev + 1); // Dosya listesini yenilemek için
                            
                            // Input alanını temizle
                            const fileInput = document.getElementById('requestFileUpload');
                            if (fileInput) fileInput.value = '';
                          })
                          .catch(err => {
                            setError('Dosya yüklenirken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
                            console.error('Modal upload error:', err);
                          });
                      } else {
                        setError('Lütfen en az bir dosya seçin.');
                      }
                    }}
                  >
                    Yükle
                  </Button>
                </div>
              </div>
              
              <div>
                <h6>Mevcut Dosyalar</h6>
                <FileViewer 
                  requestId={selectedRequestId}
                  refreshTrigger={refreshFiles}
                />
              </div>
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

export default MultiRequestForm;