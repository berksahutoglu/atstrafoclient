import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Card, Button, Alert, Table, Badge, Modal, ListGroup } from 'react-bootstrap';
import { requestAPI, orderAPI } from '../services/api';
import 'bootstrap-icons/font/bootstrap-icons.css';

const MultiRequestForm = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Sepet (çoklu talep için)
  const [cartItems, setCartItems] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  
  // Düzenleme ve silme için
  const [editingRequest, setEditingRequest] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

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

  // Talebi sepete ekle
  const handleAddToCart = (values, { resetForm }) => {
    // Benzersiz bir geçici ID ekle
    const itemWithId = { ...values, tempId: Date.now() };
    setCartItems([...cartItems, itemWithId]);
    resetForm();
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
      
      await orderAPI.createOrder(orderDto);
      setSuccess('Sipariş başarıyla oluşturuldu!');
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
                >
                  <i className="bi bi-trash"></i> Sepeti Temizle
                </Button>
                <Button 
                  variant="success" 
                  size="sm"
                  onClick={handleCreateOrder}
                >
                  <i className="bi bi-check-lg"></i> Sipariş Oluştur
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
                    </div>
                  </div>
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => handleRemoveFromCart(item.tempId)}
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
    </div>
  );
};

export default MultiRequestForm;