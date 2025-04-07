import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Form, Modal, Alert } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { projectAPI } from '../services/api';

// Proje validasyon şeması
const projectSchema = Yup.object({
  name: Yup.string().required('Proje adı gereklidir').min(3, 'Proje adı en az 3 karakter olmalıdır')
});

const ProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Projeleri yükle
  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAllProjects();
      setProjects(response.data);
    } catch (err) {
      console.error('Projeler yüklenirken hata:', err);
      setError('Projeler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Modal'ı aç/kapat
  const handleOpenModal = (project = null) => {
    setEditingProject(project);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProject(null);
  };

  // Proje oluştur veya güncelle
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      if (editingProject) {
        // Güncelleme işlemi
        await projectAPI.updateProject(editingProject.id, values);
        setSuccess('Proje başarıyla güncellendi.');
      } else {
        // Yeni proje oluşturma
        await projectAPI.createProject(values);
        setSuccess('Yeni proje başarıyla oluşturuldu.');
      }
      handleCloseModal();
      resetForm();
      fetchProjects();
    } catch (err) {
      console.error('Proje kaydedilirken hata:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Proje kaydedilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Proje silme
  const handleDelete = async (id) => {
    if (window.confirm('Bu projeyi silmek istediğinizden emin misiniz?')) {
      try {
        await projectAPI.deleteProject(id);
        setSuccess('Proje başarıyla silindi.');
        fetchProjects();
      } catch (err) {
        console.error('Proje silinirken hata:', err);
        setError('Proje silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      }
    }
  };

  // Başarı veya hata mesajını gösterme ve otomatik kapatma
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  return (
    <div className="container mt-4">
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h4>Proje Yönetimi</h4>
          <Button variant="primary" onClick={() => handleOpenModal(null)}>
            Yeni Proje Ekle
          </Button>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          {projects.length === 0 ? (
            <Alert variant="info">Henüz tanımlanmış proje bulunmamaktadır.</Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Proje Adı</th>
                  <th>Oluşturan</th>
                  <th>Oluşturulma Tarihi</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project, index) => (
                  <tr key={project.id}>
                    <td>{index + 1}</td>
                    <td>{project.name}</td>
                    <td>{project.creatorName}</td>
                    <td>
                      {new Date(project.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleOpenModal(project)}
                      >
                        Düzenle
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(project.id)}
                      >
                        Sil
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Proje Ekleme/Düzenleme Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{editingProject ? 'Proje Düzenle' : 'Yeni Proje Ekle'}</Modal.Title>
        </Modal.Header>
        <Formik
          initialValues={{
            name: editingProject ? editingProject.name : '',
          }}
          validationSchema={projectSchema}
          onSubmit={handleSubmit}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            isSubmitting,
          }) => (
            <Form onSubmit={handleSubmit}>
              <Modal.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Proje Adı *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    isInvalid={touched.name && errors.name}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.name}
                  </Form.Control.Feedback>
                </Form.Group>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={handleCloseModal}>
                  İptal
                </Button>
                <Button variant="primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </Modal.Footer>
            </Form>
          )}
        </Formik>
      </Modal>
    </div>
  );
};

export default ProjectManagement;
