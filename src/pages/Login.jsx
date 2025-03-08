import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { AuthContext } from '../context/AuthContext';
import { Card, Button, Alert } from 'react-bootstrap';

const Login = () => {
  const [error, setError] = useState('');
  const { currentUser, login, authError } = useContext(AuthContext);
  const navigate = useNavigate();

  // Kullanıcı zaten giriş yapmışsa, rolüne göre yönlendir
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'ROLE_REQUESTER') {
        navigate('/requests');
      } else if (currentUser.role === 'ROLE_APPROVER') {
        navigate('/approvals');
      } else if (currentUser.role === 'ROLE_RECEIVER') {
        navigate('/deliveries');
      }
    }
  }, [currentUser, navigate]);

  // AuthContext'ten gelen hata mesajını kullan
  useEffect(() => {
    if (authError) {
      setError('Kullanıcı adı veya şifre hatalı');
    }
  }, [authError]);

  const initialValues = {
    username: '',
    password: ''
  };

  const validationSchema = Yup.object({
    username: Yup.string().required('Kullanıcı adı gerekli'),
    password: Yup.string().required('Şifre gerekli')
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    setError('');
    try {
      const user = await login(values.username, values.password);
      
      // login başarılı ise kullanıcı rolüne göre yönlendirme
      // useEffect içinde yapılacak
    } catch (err) {
      // Hata mesajı authError üzerinden gelecek
      console.error("Login error", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
      <Card className="p-4 shadow" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-center mb-4">Talep Yönetim Sistemi</h2>
        <p className="text-center mb-4 text-muted">Lütfen giriş yapın</p>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form>
              <div className="mb-3">
                <label htmlFor="username" className="form-label">Kullanıcı Adı</label>
                <Field type="text" name="username" className="form-control" />
                <ErrorMessage name="username" component="div" className="text-danger" />
              </div>

              <div className="mb-3">
                <label htmlFor="password" className="form-label">Şifre</label>
                <Field type="password" name="password" className="form-control" />
                <ErrorMessage name="password" component="div" className="text-danger" />
              </div>

              <Button 
                type="submit" 
                variant="primary" 
                className="w-100 mt-3" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </Button>
            </Form>
          )}
        </Formik>
      </Card>
    </div>
  );
};

export default Login;