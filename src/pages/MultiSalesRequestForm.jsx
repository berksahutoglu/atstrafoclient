import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Card, Button, Alert, Table, Badge, Modal, ListGroup } from 'react-bootstrap';
import { salesAPI } from '../services/api';
import 'bootstrap-icons/font/bootstrap-icons.css';

const MultiSalesRequestForm = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Sepet (çoklu talep için)
  const [cartItems, setCartItems] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  
  // Detay Modalı
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

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
    marketType: 'DOMESTIC', // Yeni eklenen alan
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
  const handleCreateBatchOrder = async () => {
    if (cartItems.length === 0) {
      setError('Sipariş oluşturmak için en az bir talep ekleyin.');
      return;
    }
    
    try {
      // Her bir talep için arka arkaya istek yap
      const promises = cartItems.map(item => {
        const requestData = {
          isDomestic: item.isDomestic,
          marketType: item.isDomestic ? 'DOMESTIC' : 'INTERNATIONAL',
          country: item.country,
          power: item.power,
          quantity: item.quantity,
          outputPower: item.outputPower,
          isAPlus: item.isDomestic && item.isAPlus,
          requestedDeliveryDate: item.requestedDeliveryDate,
          notes: item.notes || orderNotes
        };
        return salesAPI.createSalesRequest(requestData);
      });
      
      await Promise.all(promises);
      
      setSuccess('Tüm talepler başarıyla oluşturuldu!');
      setCartItems([]);
      setOrderNotes('');
      fetchSalesRequests(); // Listeyi güncelle
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Siparişler oluşturulurken bir hata oluştu.');
      console.error(err);
      
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  
  // Tek talep oluştur
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      await salesAPI.createSalesRequest(values);
      setSuccess('Talep başarıyla oluşturuldu!');
      resetForm();
      fetchSalesRequests();
      
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

  const handleShowDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
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
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Yeni Satış Talebi</h5>
        </Card.Header>
        <Card.Body>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleAddToCart}
          >
            {({ isSubmitting, values, setFieldValue, resetForm }) => (
              <Form>
                <div className="row">
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Pazar</label>
                    <div className="d-flex">
                      <div className="form-check form-check-inline mb-0">
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
                      <div className="form-check form-check-inline mb-0">
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

                  <div className="col-md-2 mb-3">
                    <label htmlFor="country" className="form-label">Ülke</label>
                    <Field 
                      type="text" 
                      name="country" 
                      className="form-control"
                      disabled={values.isDomestic} 
                    />
                    <ErrorMessage name="country" component="div" className="text-danger" />
                  </div>

                  <div className="col-md-2 mb-3">
                    <label htmlFor="power" className="form-label">Güç</label>
                    <Field type="text" name="power" className="form-control" />
                    <ErrorMessage name="power" component="div" className="text-danger" />
                  </div>

                  <div className="col-md-2 mb-3">
                    <label htmlFor="outputPower" className="form-label">Çıkış Gücü</label>
                    <Field type="text" name="outputPower" className="form-control" />
                    <ErrorMessage name="outputPower" component="div" className="text-danger" />
                  </div>

                  <div className="col-md-2 mb-3">
                    <label htmlFor="quantity" className="form-label">Adet</label>
                    <Field type="number" name="quantity" min="1" className="form-control" />
                    <ErrorMessage name="quantity" component="div" className="text-danger" />
                  </div>

                  <div className="col-md-1 mb-3 d-flex align-items-end">
                    <Button 
                      type="submit" 
                      variant="outline-success" 
                      disabled={isSubmitting || !values.power || !values.outputPower}
                      className="btn-sm"
                    >
                      <i className="bi bi-plus-lg fs-5"></i>
                    </Button>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-3">
                    <label htmlFor="requestedDeliveryDate" className="form-label">Talep Edilen Teslim Tarihi</label>
                    <Field type="date" name="requestedDeliveryDate" className="form-control" />
                    <ErrorMessage name="requestedDeliveryDate" component="div" className="text-danger" />
                  </div>

                  {values.isDomestic && (
                    <div className="col-md-2 d-flex align-items-end">
                      <div className="form-check mb-3">
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

                  <div className="col">
                    <label htmlFor="notes" className="form-label">Notlar</label>
                    <Field
                      as="textarea"
                      name="notes"
                      className="form-control"
                      rows="1"
                    />
                  </div>
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
                  onClick={handleCreateBatchOrder}
                >
                  <i className="bi bi-check-lg"></i> Sipariş Oluştur
                </Button>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="mb-3">
              <label htmlFor="orderNotes" className="form-label">Genel Notlar</label>
              <textarea
                id="orderNotes"
                className="form-control"
                rows="2"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Tüm siparişlerle ilgili eklemek istediğiniz notlar"
              />
            </div>
            
            <ListGroup variant="flush">
              {cartItems.map((item, index) => (
                <ListGroup.Item key={item.tempId} className="d-flex justify-content-between align-items-center py-3">
                  <div className="d-flex align-items-center">
                    <Badge bg="secondary" className="me-3">{index + 1}</Badge>
                    <div>
                      <h6 className="mb-0">
                        {item.isDomestic ? 'Yurtiçi' : 'Yurtdışı'} - {item.country} - {item.power}
                      </h6>
                      <p className="mb-0 text-muted small">
                        Çıkış Gücü: {item.outputPower} | {item.quantity} adet | 
                        {item.isDomestic && ` ${item.isAPlus ? 'A+' : 'Normal'} |`} 
                        Teslim: {new Date(item.requestedDeliveryDate).toLocaleDateString()}
                      </p>
                      {item.notes && <p className="mb-0 text-muted small">Not: {item.notes}</p>}
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
                    onClick={() => handleShowDetails(request)}
                  >
                    Detaylar
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
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Kapat
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MultiSalesRequestForm;