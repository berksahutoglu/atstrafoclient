import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Card, Button, Alert, Table, Badge } from 'react-bootstrap';
import { requestAPI } from '../services/api';

const RequestForm = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    description: Yup.string().required('Açıklama gerekli'),
    quantity: Yup.number()
      .required('Miktar gerekli')
      .positive('Miktar pozitif olmalı')
      .integer('Miktar tam sayı olmalı'),
    unit: Yup.string().required('Birim gerekli'),
    urgency: Yup.string().required('Aciliyet seviyesi gerekli')
  });

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      await requestAPI.createRequest(values);
      setSuccess('Talep başarıyla oluşturuldu!');
      resetForm();
      fetchRequests(); // Listeyi güncelle
      
      // 3 saniye sonra başarı mesajını kaldır
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Talep oluşturulurken bir hata oluştu.');
      console.error(err);
      
      // 3 saniye sonra hata mesajını kaldır
      setTimeout(() => {
        setError('');
      }, 3000);
    } finally {
      setSubmitting(false);
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
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <div className="text-center p-4 border rounded bg-light">
          <p className="mb-0">Henüz hiç talep oluşturmadınız.</p>
        </div>
      )}
    </div>
  );
};

export default RequestForm;