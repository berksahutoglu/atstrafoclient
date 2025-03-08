import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, Tabs, Tab } from 'react-bootstrap';
import { requestAPI } from '../services/api';

const RequestApproval = () => {
  const [activeTab, setActiveTab] = useState('pending');
  
  // Bekleyen taleplere ait state
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  
  // Onaylanan taleplere ait state
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [loadingApproved, setLoadingApproved] = useState(true);
  
  // Sipariş edilen taleplere ait state
  const [orderedRequests, setOrderedRequests] = useState([]);
  const [loadingOrdered, setLoadingOrdered] = useState(true);
  
  // Teslim alınan taleplere ait state
  const [deliveredRequests, setDeliveredRequests] = useState([]);
  const [loadingDelivered, setLoadingDelivered] = useState(true);
  
  // Genel state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [status, setStatus] = useState('');
  const [comment, setComment] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  
  useEffect(() => {
    fetchPendingRequests();
    fetchApprovedRequests();
    fetchOrderedRequests();
    fetchDeliveredRequests();
  }, []);
  
  const fetchPendingRequests = async () => {
    try {
      setLoadingPending(true);
      const response = await requestAPI.getPendingRequests();
      setPendingRequests(response.data);
      console.log(response.data);
      setError('');
    } catch (err) {
      setError('Bekleyen talepler yüklenirken bir hata oluştu.');
      console.error(err);
    } finally {
      setLoadingPending(false);
    }
  };
  
  const fetchApprovedRequests = async () => {
    try {
      setLoadingApproved(true);
      const response = await requestAPI.getApprovedRequests();
      setApprovedRequests(response.data);
      setError('');
    } catch (err) {
      setError('Onaylanan talepler yüklenirken bir hata oluştu.');
      console.error(err);
    } finally {
      setLoadingApproved(false);
    }
  };
  
  const fetchOrderedRequests = async () => {
    try {
      setLoadingOrdered(true);
      const response = await requestAPI.getOrderedRequests();
      setOrderedRequests(response.data);
      setError('');
    } catch (err) {
      setError('Sipariş edilen talepler yüklenirken bir hata oluştu.');
      console.error(err);
    } finally {
      setLoadingOrdered(false);
    }
  };
  
  const fetchDeliveredRequests = async () => {
    try {
      setLoadingDelivered(true);
      const response = await requestAPI.getDeliveredRequests();
      setDeliveredRequests(response.data);
      setError('');
    } catch (err) {
      setError('Teslim alınan talepler yüklenirken bir hata oluştu.');
      console.error(err);
    } finally {
      setLoadingDelivered(false);
    }
  };
  
  const handleOpenModal = (request, initialStatus = '') => {
    setSelectedRequest(request);
    setStatus(initialStatus); // İlk durumu ayarla
    setComment('');
    setOrderNumber('');
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!status) {
      setError('Lütfen bir işlem seçin.');
      return;
    }
    
    // Sipariş verildi ise sipariş numarası gerekli
    if (status === 'ORDERED' && !orderNumber) {
      setError('Tedarikçi ismi gerekli.');
      return;
    }
    
    try {
      await requestAPI.updateStatus(selectedRequest.id, {
        status,
        comment,
        orderNumber: status === 'ORDERED' ? orderNumber : null
      });
      
      setSuccess('Talep başarıyla güncellendi!');
      handleCloseModal();
      
      // Tüm listeleri yeniden yükle
      fetchPendingRequests();
      fetchApprovedRequests();
      fetchOrderedRequests();
      fetchDeliveredRequests();
      
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
      default: return unit;
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
  
  return (
    <div className="container">
      <h2 className="mb-4">Talep Değerlendirme</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="pending" title="Bekleyen Talepler">
          {loadingPending ? (
            <p>Yükleniyor...</p>
          ) : pendingRequests.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Talep Eden</th>
                  <th>Başlık</th>
                  <th>Açıklama</th>
                  <th>Miktar</th>
                  <th>Birim</th>
                  <th>Aciliyet</th>
                  <th>Oluşturma Tarihi</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((request, index) => (
                  <tr key={request.id}>
                    <td>{index + 1}</td>
                    <td>{request.requesterName}</td>
                    <td>{request.title}</td>
                    <td>{request.description}</td>
                    <td>{request.quantity}</td>
                    <td>{getUnitName(request.unit)}</td>
                    <td>{getUrgencyBadge(request.urgency)}</td>
                    <td>{new Date(request.createdAt).toLocaleString()}</td>
                    <td>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleOpenModal(request)}
                      >
                        Değerlendir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center p-4 border rounded bg-light">
              <p className="mb-0">Bekleyen talep bulunmamaktadır.</p>
            </div>
          )}
        </Tab>
        
        <Tab eventKey="approved" title="Onaylanan Talepler">
          {loadingApproved ? (
            <p>Yükleniyor...</p>
          ) : approvedRequests.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Talep Eden</th>
                  <th>Başlık</th>
                  <th>Açıklama</th>
                  <th>Miktar</th>
                  <th>Birim</th>
                  <th>Aciliyet</th>
                  <th>Onaylanma Tarihi</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {approvedRequests.map((request, index) => (
                  <tr key={request.id}>
                    <td>{index + 1}</td>
                    <td>{request.requesterName}</td>
                    <td>{request.title}</td>
                    <td>{request.description}</td>
                    <td>{request.quantity}</td>
                    <td>{getUnitName(request.unit)}</td>
                    <td>{getUrgencyBadge(request.urgency)}</td>
                    <td>{new Date(request.updatedAt).toLocaleString()}</td>
                    <td>
                      <Button 
                        variant="success" 
                        size="sm" 
                        onClick={() => handleOpenModal(request, 'ORDERED')}
                      >
                        Sipariş Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center p-4 border rounded bg-light">
              <p className="mb-0">Onaylanan talep bulunmamaktadır.</p>
            </div>
          )}
        </Tab>
        
        <Tab eventKey="ordered" title="Sipariş Edilenler">
          {loadingOrdered ? (
            <p>Yükleniyor...</p>
          ) : orderedRequests.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Talep Eden</th>
                  <th>Başlık</th>
                  <th>Miktar</th>
                  <th>Birim</th>
                  <th>Aciliyet</th>
                  <th>Tedarikçi İsmi</th>
                  <th>Sipariş Tarihi</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {orderedRequests.map((request, index) => (
                  <tr key={request.id}>
                    <td>{index + 1}</td>
                    <td>{request.requesterName}</td>
                    <td>{request.title}</td>
                    <td>{request.quantity}</td>
                    <td>{getUnitName(request.unit)}</td>
                    <td>{getUrgencyBadge(request.urgency)}</td>
                    <td>
                      <span className="fw-bold">{request.orderNumber}</span>
                    </td>
                    <td>{new Date(request.orderDate).toLocaleString()}</td>
                    <td>{getStatusBadge(request.status)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center p-4 border rounded bg-light">
              <p className="mb-0">Sipariş edilen talep bulunmamaktadır.</p>
            </div>
          )}
        </Tab>
        
        {/* Teslim Alınanlar Sekmesi */}
        <Tab eventKey="delivered" title="Teslim Alınanlar">
          {loadingDelivered ? (
            <p>Yükleniyor...</p>
          ) : deliveredRequests.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Talep Eden</th>
                  <th>Başlık</th>
                  <th>Miktar</th>
                  <th>Birim</th>
                  <th>Tedarikçi İsmi</th>
                  <th>Teslim Alan</th>
                  <th>Teslim Tarihi</th>
                  <th>Teslimat Notu</th>
                </tr>
              </thead>
              <tbody>
                {deliveredRequests.map((request, index) => (
                  <tr key={request.id}>
                    <td>{index + 1}</td>
                    <td>{request.requesterName}</td>
                    <td>{request.title}</td>
                    <td>{request.quantity}</td>
                    <td>{getUnitName(request.unit)}</td>
                    <td>
                      <span className="fw-bold">{request.orderNumber}</span>
                    </td>
                    <td>{request.receiverName}</td>
                    <td>{new Date(request.deliveryDate).toLocaleString()}</td>
                    <td>{request.deliveryNotes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center p-4 border rounded bg-light">
              <p className="mb-0">Teslim alınan talep bulunmamaktadır.</p>
            </div>
          )}
        </Tab>
      </Tabs>
      
      {/* Değerlendirme Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedRequest && selectedRequest.status === 'APPROVED' 
              ? 'Sipariş Ver' 
              : 'Talep Değerlendirme'
            }
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <>
              <p><strong>Talep Eden:</strong> {selectedRequest.requesterName}</p>
              <p><strong>Başlık:</strong> {selectedRequest.title}</p>
              <p><strong>Açıklama:</strong> {selectedRequest.description}</p>
              <p><strong>Miktar:</strong> {selectedRequest.quantity} {getUnitName(selectedRequest.unit)}</p>
              <p><strong>Aciliyet:</strong> {getUrgencyBadge(selectedRequest.urgency)}</p>
              
              <Form onSubmit={handleSubmit}>
                {selectedRequest.status !== 'APPROVED' && (
                  <Form.Group className="mb-3">
                    <Form.Label>İşlem</Form.Label>
                    <Form.Select 
                      value={status} 
                      onChange={(e) => setStatus(e.target.value)}
                      required
                    >
                      <option value="">Seçiniz</option>
                      <option value="APPROVED">Onayla</option>
                      <option value="ORDERED">Sipariş Ver</option>
                      <option value="REJECTED">Reddet</option>
                    </Form.Select>
                  </Form.Group>
                )}
                
                {(status === 'ORDERED' || selectedRequest.status === 'APPROVED') && (
                  <Form.Group className="mb-3">
                    <Form.Label>Tedarikçi İsmi</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={orderNumber} 
                      onChange={(e) => setOrderNumber(e.target.value)} 
                      required
                    />
                  </Form.Group>
                )}
                
                <Form.Group className="mb-3">
                  <Form.Label>Açıklama</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3}
                    value={comment} 
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Opsiyonel açıklama ekleyebilirsiniz"
                  />
                </Form.Group>
                
                <div className="d-flex justify-content-end">
                  <Button variant="secondary" className="me-2" onClick={handleCloseModal}>
                    İptal
                  </Button>
                  <Button 
                    variant={selectedRequest.status === 'APPROVED' ? "success" : "primary"} 
                    type="submit"
                  >
                    {selectedRequest.status === 'APPROVED' ? 'Sipariş Ver' : 'Kaydet'}
                  </Button>
                </div>
              </Form>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default RequestApproval;