import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { requestAPI } from '../services/api';

const RequestDelivery = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  
  useEffect(() => {
    fetchOrderedRequests();
  }, []);
  
  const fetchOrderedRequests = async () => {
    try {
      setLoading(true);
      const response = await requestAPI.getOrderedRequests();
      setRequests(response.data);
      console.log(response.data);
      setError('');
    } catch (err) {
      setError('Siparişler yüklenirken bir hata oluştu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenModal = (request) => {
    setSelectedRequest(request);
    setDeliveryNotes('');
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
  };
  
  const handleDeliveryConfirm = async (e) => {
    e.preventDefault();
    
    try {
      await requestAPI.deliverRequest(selectedRequest.id, {
        deliveryNotes
      });
      
      setSuccess('Teslimat başarıyla onaylandı!');
      handleCloseModal();
      fetchOrderedRequests(); // Listeyi güncelle
      
      // 3 saniye sonra başarı mesajını kaldır
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Teslimat onaylanırken bir hata oluştu.');
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
  
  return (
    <div className="container">
      <h2 className="mb-4">Teslimat Onaylama</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      {loading ? (
        <p>Yükleniyor...</p>
      ) : requests.length > 0 ? (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Talep Eden</th>
              <th>Başlık</th>
              <th>Miktar</th>
              <th>Birim</th>
              <th>Tedarikçi İsmi</th>
              <th>Sipariş Tarihi</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request, index) => (
              <tr key={request.id}>
                <td>{index + 1}</td>
                <td>{request.requesterName}</td>
                <td>{request.title}</td>
                <td>{request.quantity}</td>
                <td>{getUnitName(request.unit)}</td>
                <td>
                  <Badge bg="info">{request.orderNumber}</Badge>
                </td>
                <td>{new Date(request.orderDate).toLocaleString()}</td>
                <td>
                  <Button 
                    variant="success" 
                    size="sm" 
                    onClick={() => handleOpenModal(request)}
                  >
                    Teslim Et
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <div className="text-center p-4 border rounded bg-light">
          <p className="mb-0">Bekleyen teslimat bulunmamaktadır.</p>
        </div>
      )}
      
      {/* Teslimat Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Teslimat Onaylama</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <>
              <p><strong>Talep Eden:</strong> {selectedRequest.requesterName}</p>
              <p><strong>Başlık:</strong> {selectedRequest.title}</p>
              <p><strong>Miktar:</strong> {selectedRequest.quantity} {getUnitName(selectedRequest.unit)}</p>
              <p><strong>Tedarikçi İsmi:</strong> {selectedRequest.orderNumber}</p>
              
              <Form onSubmit={handleDeliveryConfirm}>
                <Form.Group className="mb-3">
                  <Form.Label>Teslimat Notları</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3}
                    value={deliveryNotes} 
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Teslimat ile ilgili not ekleyebilirsiniz (opsiyonel)"
                  />
                </Form.Group>
                
                <div className="d-flex justify-content-end">
                  <Button variant="secondary" className="me-2" onClick={handleCloseModal}>
                    İptal
                  </Button>
                  <Button variant="success" type="submit">
                    Teslim Edildi Olarak İşaretle
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

export default RequestDelivery;