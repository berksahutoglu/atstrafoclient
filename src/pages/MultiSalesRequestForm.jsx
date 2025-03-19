import React, { useState, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  Card,
  Button,
  Alert,
  Table,
  Badge,
  Modal,
  ListGroup,
} from "react-bootstrap";
import { salesAPI } from "../services/api";
import "bootstrap-icons/font/bootstrap-icons.css";
import FileViewer from "../components/FileViewer";
import FileUploader from "../components/FileUploader";

const MultiSalesRequestForm = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Sepet (çoklu talep için)
  const [cartItems, setCartItems] = useState([]);
  const [orderNotes, setOrderNotes] = useState("");

  // Düzenleme için yeni state'ler ve fonksiyonlar
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormValues, setEditFormValues] = useState(null);

  // Detay Modalı
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  // Dosya İşlemleri İçin Eklenen State'ler
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [refreshFiles, setRefreshFiles] = useState(0);
  const [selectedSalesRequestId, setSelectedSalesRequestId] = useState(null);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [cartItemFiles, setCartItemFiles] = useState({});

  useEffect(() => {
    fetchSalesRequests();
  }, []);

  const fetchSalesRequests = async () => {
    try {
      setLoading(true);
      const response = await salesAPI.getMySalesRequests();
      setRequests(response.data);
      setError("");
    } catch (err) {
      setError("Talepler yüklenirken bir hata oluştu.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const initialValues = {
    isDomestic: true,
    marketType: "DOMESTIC", // Yeni eklenen alan
    country: "Türkiye",
    customerName: "", // Müşteri ismi eklendi
    power: "",
    quantity: 1,
    outputPower: "",
    boilerType: "", // Kazan tipi eklendi
    windingType: "", // Sargı tipi eklendi
    isAPlus: false,
    requestedDeliveryDate: new Date().toISOString().split("T")[0],
    notes: "",
  };

  const validationSchema = Yup.object({
    marketType: Yup.string().required("Yurtiçi/Yurtdışı seçimi gerekli"),
    isDomestic: Yup.boolean().required("Yurtiçi/Yurtdışı seçimi gerekli"),
    country: Yup.string().required("Ülke gerekli"),
    customerName: Yup.string().required("Müşteri ismi gerekli"),
    power: Yup.string().required("Güç bilgisi gerekli"),
    quantity: Yup.number()
      .required("Adet gerekli")
      .positive("Adet pozitif olmalı")
      .integer("Adet tam sayı olmalı"),
    outputPower: Yup.string().required("Gerilim gerekli"),
    boilerType: Yup.string().required("Kazan tipi gerekli"),
    windingType: Yup.string().required("Sargı tipi gerekli"),
    requestedDeliveryDate: Yup.date().required("Teslim tarihi gerekli"),
  });

  // Dosya seçme işlemi
  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  // Dosyaları temizleme işlemi
  const handleClearFiles = () => {
    setSelectedFiles([]);
    const fileInput = document.getElementById("salesRequestFileUpload");
    if (fileInput) fileInput.value = "";
  };

  // Talebi sepete ekle
  const handleAddToCart = (values, { resetForm }) => {
    // Benzersiz bir geçici ID ekle
    const tempId = Date.now();
    const itemWithId = { ...values, tempId };
    setCartItems([...cartItems, itemWithId]);

    // Seçili dosyaları ilgili sepet öğesine ekle
    if (selectedFiles.length > 0) {
      setCartItemFiles((prev) => ({
        ...prev,
        [tempId]: [...selectedFiles],
      }));
      handleClearFiles(); // Dosya seçimini temizle
    }

    resetForm();
    setSuccess("Talep sepete eklendi!");

    setTimeout(() => {
      setSuccess("");
    }, 2000);
  };

  // Sepetteki talebi kaldır
  const handleRemoveFromCart = (tempId) => {
    setCartItems(cartItems.filter((item) => item.tempId !== tempId));

    // Bu öğeye ait dosyaları da kaldır
    if (cartItemFiles[tempId]) {
      const updatedCartFiles = { ...cartItemFiles };
      delete updatedCartFiles[tempId];
      setCartItemFiles(updatedCartFiles);
    }
  };

  // Sepeti temizle
  const handleClearCart = () => {
    setCartItems([]);
    setCartItemFiles({});
  };

  // Toplu sipariş oluştur
  const handleCreateBatchOrder = async () => {
    if (cartItems.length === 0) {
      setError("Sipariş oluşturmak için en az bir talep ekleyin.");
      return;
    }

    try {
      // Her bir talep için arka arkaya istek yap
      for (const item of cartItems) {
        const requestData = {
          isDomestic: item.isDomestic,
          marketType: item.isDomestic ? "DOMESTIC" : "INTERNATIONAL",
          country: item.country,
          customerName: item.customerName,
          power: item.power,
          quantity: item.quantity,
          outputPower: item.outputPower,
          boilerType: item.boilerType,
          windingType: item.windingType,
          isAPlus: item.isDomestic && item.isAPlus,
          requestedDeliveryDate: item.requestedDeliveryDate,
          notes: item.notes || orderNotes,
        };

        // Talebi oluştur
        const response = await salesAPI.createSalesRequest(requestData);
        const newSalesRequestId = response.data.id;

        // Bu öğeye ait dosyalar varsa yükle
        if (
          cartItemFiles[item.tempId] &&
          cartItemFiles[item.tempId].length > 0
        ) {
          const formData = new FormData();
          cartItemFiles[item.tempId].forEach((file) => {
            formData.append("files", file);
          });

          await salesAPI.uploadFiles(newSalesRequestId, formData);
        }
      }

      setSuccess("Tüm talepler başarıyla oluşturuldu!");
      setCartItems([]);
      setCartItemFiles({});
      setOrderNotes("");
      fetchSalesRequests(); // Listeyi güncelle

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError("Siparişler oluşturulurken bir hata oluştu.");
      console.error(err);

      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };

  // Tek talep oluştur
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const response = await salesAPI.createSalesRequest(values);
      const newSalesRequestId = response.data.id;

      // Dosya yükleme işlemi
      if (selectedFiles.length > 0) {
        try {
          const formData = new FormData();
          selectedFiles.forEach((file) => {
            formData.append("files", file);
          });

          await salesAPI.uploadFiles(newSalesRequestId, formData);
          setRefreshFiles((prev) => prev + 1);
        } catch (uploadErr) {
          console.error("Dosya yükleme hatası:", uploadErr);
          setError(
            "Dosyalar yüklenirken bir hata oluştu, ancak talep oluşturuldu."
          );

          setTimeout(() => {
            setError("");
          }, 3000);
        }
      }

      setSuccess("Talep başarıyla oluşturuldu!");
      resetForm();
      handleClearFiles();
      fetchSalesRequests();

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError("Talep oluşturulurken bir hata oluştu.");
      console.error(err);

      setTimeout(() => {
        setError("");
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShowDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };
  
  const handleShowEdit = (request) => {
    // PENDING durumunda değilse düzenlenemez
    if (request.status !== "PENDING") {
      setError("Sadece 'Beklemede' durumundaki talepler düzenlenebilir.");
      setTimeout(() => {
        setError("");
      }, 3000);
      return;
    }
    
    setSelectedRequest(request);
    
    // Form değerlerini hazırla
    const formValues = {
      id: request.id,
      isDomestic: request.domestic,
      marketType: request.domestic ? "DOMESTIC" : "INTERNATIONAL",
      country: request.country,
      customerName: request.customerName,
      power: request.power,
      quantity: request.quantity,
      outputPower: request.outputPower,
      boilerType: request.boilerType,
      windingType: request.windingType,
      isAPlus: request.aPlus,
      requestedDeliveryDate: new Date(request.requestedDeliveryDate).toISOString().split("T")[0],
      notes: request.notes || "",
    };
    
    setEditFormValues(formValues);
    setShowEditModal(true);
  };
  
  const handleEditSubmit = async (values, { setSubmitting }) => {
    try {
      await salesAPI.updateSalesRequest(values.id, values);
      setSuccess("Talep başarıyla güncellendi!");
      setShowEditModal(false);
      fetchSalesRequests(); // Tabloyu güncelle
      
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError(
        "Talep güncellenirken bir hata oluştu: " +
          (err.message || "Bilinmeyen hata")
      );
      console.error("Update sales request error:", err);

      setTimeout(() => {
        setError("");
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  };

  // Dosya görüntüleme modalını açma
  const handleShowFilesModal = (salesRequestId) => {
    setSelectedSalesRequestId(salesRequestId);
    setShowFilesModal(true);
  };

  // Durum badge rengi
  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return <Badge bg="secondary">Beklemede</Badge>;
      case "PROCESSING":
        return <Badge bg="primary">İşleniyor</Badge>;
      case "CONVERTED":
        return <Badge bg="info">Talebe Dönüştürüldü</Badge>;
      case "APPROVED":
        return <Badge bg="success">Onaylandı</Badge>;
      case "ORDERED":
        return <Badge bg="warning">Sipariş Verildi</Badge>;
      case "DELIVERED":
        return (
          <Badge bg="light" text="dark">
            Teslim Edildi
          </Badge>
        );
      case "COMPLETED":
        return <Badge bg="success">Tamamlandı</Badge>;
      case "CANCELLED":
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
                            setFieldValue("isDomestic", true);
                            setFieldValue("marketType", "DOMESTIC");
                            setFieldValue("country", "Türkiye");
                          }}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="isDomesticTrue"
                        >
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
                            setFieldValue("isDomestic", false);
                            setFieldValue("marketType", "INTERNATIONAL");
                            setFieldValue("country", "");
                            setFieldValue("isAPlus", false);
                          }}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="isDomesticFalse"
                        >
                          Yurtdışı
                        </label>
                      </div>
                    </div>
                    <ErrorMessage
                      name="isDomestic"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="col-md-2 mb-3">
                    <label htmlFor="country" className="form-label">
                      Ülke
                    </label>
                    <Field
                      type="text"
                      name="country"
                      className="form-control"
                      disabled={values.isDomestic}
                    />
                    <ErrorMessage
                      name="country"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="col-md-2 mb-3">
                    <label htmlFor="customerName" className="form-label">
                      Müşteri
                    </label>
                    <Field
                      type="text"
                      name="customerName"
                      className="form-control"
                    />
                    <ErrorMessage
                      name="customerName"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="col-md-2 mb-3">
                    <label htmlFor="power" className="form-label">
                      Güç
                    </label>
                    <Field type="text" name="power" className="form-control" />
                    <ErrorMessage
                      name="power"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="col-md-2 mb-3">
                    <label htmlFor="boilerType" className="form-label">
                      Kazan Tipi
                    </label>
                    <Field
                      type="text"
                      name="boilerType"
                      className="form-control"
                    />
                    <ErrorMessage
                      name="boilerType"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="col-md-2 mb-3">
                    <label htmlFor="windingType" className="form-label">
                      Sargı Tipi
                    </label>
                    <Field
                      type="text"
                      name="windingType"
                      className="form-control"
                    />
                    <ErrorMessage
                      name="windingType"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="col-md-2 mb-3">
                    <label htmlFor="outputPower" className="form-label">
                      Gerilim
                    </label>
                    <Field
                      type="text"
                      name="outputPower"
                      className="form-control"
                    />
                    <ErrorMessage
                      name="outputPower"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="col-md-2 mb-3">
                    <label htmlFor="quantity" className="form-label">
                      Adet
                    </label>
                    <Field
                      type="number"
                      name="quantity"
                      min="1"
                      className="form-control"
                    />
                    <ErrorMessage
                      name="quantity"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="col-md-1 mb-3 d-flex align-items-end">
                    <Button
                      type="submit"
                      variant="outline-success"
                      disabled={
                        isSubmitting || !values.power || !values.outputPower
                      }
                      className="btn-sm"
                    >
                      <i className="bi bi-plus-lg fs-5"></i>
                    </Button>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-3">
                    <label
                      htmlFor="requestedDeliveryDate"
                      className="form-label"
                    >
                      Talep Edilen Teslim Tarihi
                    </label>
                    <Field
                      type="date"
                      name="requestedDeliveryDate"
                      className="form-control"
                    />
                    <ErrorMessage
                      name="requestedDeliveryDate"
                      component="div"
                      className="text-danger"
                    />
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
                    <label htmlFor="notes" className="form-label">
                      Notlar
                    </label>
                    <Field
                      as="textarea"
                      name="notes"
                      className="form-control"
                      rows="1"
                    />
                  </div>
                </div>

                {/* Dosya Yükleme Alanı */}
                <div className="mb-3">
                  <label
                    htmlFor="salesRequestFileUpload"
                    className="form-label"
                  >
                    Dosya Ekle
                  </label>
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
                      <Badge bg="info">
                        {selectedFiles.length} dosya seçildi
                      </Badge>
                      <ul className="list-group mt-2">
                        {selectedFiles.map((file, index) => (
                          <li
                            key={index}
                            className="list-group-item d-flex justify-content-between align-items-center py-2"
                          >
                            <small>{file.name}</small>
                            <Badge bg="secondary" pill>
                              {(file.size / 1024).toFixed(1)} KB
                            </Badge>
                          </li>
                        ))}
                      </ul>
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
              <label htmlFor="orderNotes" className="form-label">
                Genel Notlar
              </label>
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
                <ListGroup.Item
                  key={item.tempId}
                  className="d-flex justify-content-between align-items-center py-3"
                >
                  <div className="d-flex align-items-center">
                    <Badge bg="secondary" className="me-3">
                      {index + 1}
                    </Badge>
                    <div>
                      <h6 className="mb-0">
                        {item.isDomestic ? "Yurtiçi" : "Yurtdışı"} -{" "}
                        {item.country} - {item.customerName} - {item.power}
                      </h6>
                      <p className="mb-0 text-muted small">
                        Kazan: {item.boilerType} | Sargı: {item.windingType} | Gerilim: {item.outputPower} | {item.quantity} adet |
                        {item.isDomestic &&
                          ` ${item.isAPlus ? "A+" : "Normal"} |`}
                        Teslim:{" "}
                        {new Date(
                          item.requestedDeliveryDate
                        ).toLocaleDateString()}
                      </p>
                      {item.notes && (
                        <p className="mb-0 text-muted small">
                          Not: {item.notes}
                        </p>
                      )}
                      {cartItemFiles[item.tempId] &&
                        cartItemFiles[item.tempId].length > 0 && (
                          <div className="mt-1">
                            <small className="text-primary">
                              <i className="bi bi-paperclip"></i>{" "}
                              {cartItemFiles[item.tempId].length} dosya ekli
                            </small>
                          </div>
                        )}
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
              <th>Müşteri</th>
              <th>Güç</th>
              <th>Gerilim</th>
              <th>Kazan Tipi</th>
              <th>Sargı Tipi</th>
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
                <td>{request.domestic ? "Yurtiçi" : "Yurtdışı"}</td>
                <td>{request.country}</td>
                <td>{request.customerName}</td>
                <td>{request.power}</td>
                <td>{request.outputPower}</td>
                <td>{request.boilerType}</td>
                <td>{request.windingType}</td>
                <td>{request.quantity}</td>
                <td>
                  {new Date(request.requestedDeliveryDate).toLocaleDateString()}
                </td>
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
                    variant="outline-warning"
                    size="sm"
                    className="me-2 mb-1"
                    onClick={() => handleShowEdit(request)}
                    disabled={request.status !== "PENDING"}
                  >
                    Düzenle
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
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Sipariş Detayları</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <div>
              <table className="table table-bordered">
                <tbody>
                  <tr>
                    <th style={{ width: "30%" }}>Pazar</th>
                    <td>{selectedRequest.domestic ? "Yurtiçi" : "Yurtdışı"}</td>
                  </tr>
                  <tr>
                    <th>Ülke</th>
                    <td>{selectedRequest.country}</td>
                  </tr>
                  <tr>
                    <th>Müşteri</th>
                    <td>{selectedRequest.customerName}</td>
                  </tr>
                  <tr>
                    <th>Güç</th>
                    <td>{selectedRequest.power}</td>
                  </tr>
                  <tr>
                    <th>Gerilim</th>
                    <td>{selectedRequest.outputPower}</td>
                  </tr>
                  <tr>
                    <th>Kazan Tipi</th>
                    <td>{selectedRequest.boilerType}</td>
                  </tr>
                  <tr>
                    <th>Sargı Tipi</th>
                    <td>{selectedRequest.windingType}</td>
                  </tr>
                  <tr>
                    <th>Adet</th>
                    <td>{selectedRequest.quantity}</td>
                  </tr>
                  {selectedRequest.domestic && (
                    <tr>
                      <th>Sınıf</th>
                      <td>{selectedRequest.aPlus ? "A+" : "Normal"}</td>
                    </tr>
                  )}
                  <tr>
                    <th>Talep Edilen Teslim Tarihi</th>
                    <td>
                      {new Date(
                        selectedRequest.requestedDeliveryDate
                      ).toLocaleDateString()}
                    </td>
                  </tr>
                  <tr>
                    <th>Oluşturma Tarihi</th>
                    <td>
                      {new Date(selectedRequest.createdAt).toLocaleString()}
                    </td>
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
                        <th style={{ width: "30%" }}>Talep #</th>
                        <td>{selectedRequest.productionRequest.id}</td>
                      </tr>
                      <tr>
                        <th>Başlık</th>
                        <td>{selectedRequest.productionRequest.title}</td>
                      </tr>
                      <tr>
                        <th>Durum</th>
                        <td>
                          {getStatusBadge(
                            selectedRequest.productionRequest.status
                          )}
                        </td>
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
          <Button
            variant="secondary"
            onClick={() => setShowDetailsModal(false)}
          >
            Kapat
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Düzenle Modali */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Sipariş Düzenle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editFormValues && (
            <Formik
              initialValues={editFormValues}
              validationSchema={validationSchema}
              onSubmit={handleEditSubmit}
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
                          id="editIsDomesticTrue"
                          checked={values.isDomestic === true}
                          onChange={() => {
                            setFieldValue("isDomestic", true);
                            setFieldValue("marketType", "DOMESTIC");
                            setFieldValue("country", "Türkiye");
                          }}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="editIsDomesticTrue"
                        >
                          Yurtiçi
                        </label>
                      </div>
                      <div className="form-check form-check-inline">
                        <Field
                          className="form-check-input"
                          type="radio"
                          name="isDomestic"
                          id="editIsDomesticFalse"
                          checked={values.isDomestic === false}
                          onChange={() => {
                            setFieldValue("isDomestic", false);
                            setFieldValue("marketType", "INTERNATIONAL");
                            setFieldValue("country", "");
                            setFieldValue("isAPlus", false);
                          }}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="editIsDomesticFalse"
                        >
                          Yurtdışı
                        </label>
                      </div>
                    </div>
                    <ErrorMessage
                      name="isDomestic"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="country" className="form-label">
                      Ülke
                    </label>
                    <Field
                      type="text"
                      name="country"
                      className="form-control"
                      disabled={values.isDomestic}
                    />
                    <ErrorMessage
                      name="country"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="customerName" className="form-label">
                      Müşteri Adı
                    </label>
                    <Field
                      type="text"
                      name="customerName"
                      className="form-control"
                    />
                    <ErrorMessage
                      name="customerName"
                      component="div"
                      className="text-danger"
                    />
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="boilerType" className="form-label">
                        Kazan Tipi
                      </label>
                      <Field type="text" name="boilerType" className="form-control" />
                      <ErrorMessage
                        name="boilerType"
                        component="div"
                        className="text-danger"
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="windingType" className="form-label">
                        Sargı Tipi
                      </label>
                      <Field
                        type="text"
                        name="windingType"
                        className="form-control"
                      />
                      <ErrorMessage
                        name="windingType"
                        component="div"
                        className="text-danger"
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="quantity" className="form-label">
                        Adet
                      </label>
                      <Field
                        type="number"
                        name="quantity"
                        min="1"
                        className="form-control"
                      />
                      <ErrorMessage
                        name="quantity"
                        component="div"
                        className="text-danger"
                      />
                    </div>
                    <div className="col-md-6">
                      <label
                        htmlFor="requestedDeliveryDate"
                        className="form-label"
                      >
                        Talep Edilen Teslim Tarihi
                      </label>
                      <Field
                        type="date"
                        name="requestedDeliveryDate"
                        className="form-control"
                      />
                      <ErrorMessage
                        name="requestedDeliveryDate"
                        component="div"
                        className="text-danger"
                      />
                    </div>
                  </div>

                  {values.isDomestic && (
                    <div className="mb-3">
                      <div className="form-check">
                        <Field
                          className="form-check-input"
                          type="checkbox"
                          name="isAPlus"
                          id="editIsAPlus"
                        />
                        <label className="form-check-label" htmlFor="editIsAPlus">
                          A+ Sınıfı
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="notes" className="form-label">
                      Notlar
                    </label>
                    <Field
                      as="textarea"
                      name="notes"
                      className="form-control"
                      rows="3"
                    />
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
                      {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          )}
        </Modal.Body>
      </Modal>

      {/* Dosya Görüntüleme Modalı */}
      <Modal
        show={showFilesModal}
        onHide={() => setShowFilesModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Sipariş Dosyaları</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSalesRequestId && (
            <>
              <FileUploader
                salesRequestId={selectedSalesRequestId}
                onUploadSuccess={() => setRefreshFiles((prev) => prev + 1)}
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

export default MultiSalesRequestForm;
