import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Alert,
  Badge,
  Tabs,
  Tab,
  Modal,
  ListGroup,
} from "react-bootstrap";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { salesAPI, requestAPI, attachmentAPI } from "../services/api";
import FileViewer from "../components/FileViewer";
import FileUploader from "../components/FileUploader";

const ProductionDashboard = () => {
  const [activeTab, setActiveTab] = useState("all");
  // Bekleyen satış talepleri
  const [pendingSalesRequests, setPendingSalesRequests] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // İşleme alınan satış talepleri
  const [processingSalesRequests, setProcessingSalesRequests] = useState([]);
  const [loadingProcessing, setLoadingProcessing] = useState(true);

  // Üretim talepleri
  const [productionRequests, setProductionRequests] = useState([]);
  const [loadingProduction, setLoadingProduction] = useState(true);

  // Yeni talep yapısı için
  const [cartItems, setCartItems] = useState([]);
  const [orderNotes, setOrderNotes] = useState("");

  // Genel state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Yeni talep modal
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [relatedSalesRequest, setRelatedSalesRequest] = useState(null);

  const [conversionLoading, setConversionLoading] = useState(false);

  // Dosya görüntüleme için state
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedSalesRequestId, setSelectedSalesRequestId] = useState(null);
  const [refreshFiles, setRefreshFiles] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [allSalesRequests, setAllSalesRequests] = useState([]);
  const [loadingAllRequests, setLoadingAllRequests] = useState(true);

  const fetchAllSalesRequests = async () => {
    try {
      setLoadingAllRequests(true);
      const response = await salesAPI.getAllSalesRequests(); // Bu API endpoint'in mevcut olduğunu varsayıyorum
      setAllSalesRequests(response.data);
      setError("");
    } catch (err) {
      setError("Tüm talepler yüklenirken bir hata oluştu.");
      console.error(err);
    } finally {
      setLoadingAllRequests(false);
    }
  };

  useEffect(() => {
    fetchAllSalesRequests();
    fetchPendingSalesRequests();
    fetchProcessingSalesRequests();
    fetchProductionRequests();
  }, []);

  const fetchPendingSalesRequests = async () => {
    try {
      setLoadingPending(true);
      const response = await salesAPI.getPendingSalesRequests();
      setPendingSalesRequests(response.data);
      setError("");
    } catch (err) {
      setError("Bekleyen talepler yüklenirken bir hata oluştu.");
      console.error(err);
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchProcessingSalesRequests = async () => {
    try {
      setLoadingProcessing(true);
      const response = await salesAPI.getProcessingSalesRequests();
      setProcessingSalesRequests(response.data);
      setError("");
    } catch (err) {
      setError("İşlenen talepler yüklenirken bir hata oluştu.");
      console.error(err);
    } finally {
      setLoadingProcessing(false);
    }
  };

  const fetchProductionRequests = async () => {
    try {
      setLoadingProduction(true);
      const response = await requestAPI.getProductionRequests();
      setProductionRequests(response.data);
      setError("");
    } catch (err) {
      setError("Üretim talepleri yüklenirken bir hata oluştu.");
      console.error(err);
    } finally {
      setLoadingProduction(false);
    }
  };

  const handleShowDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  // Dosya görüntüleme modalını açma
  const handleShowFilesModal = (id, isSalesRequest = false) => {
    if (isSalesRequest) {
      setSelectedSalesRequestId(id);
      setSelectedRequestId(null);
    } else {
      setSelectedRequestId(id);
      setSelectedSalesRequestId(null);
    }
    setShowFilesModal(true);
  };

  // Yeni talep oluşturma modalını gösterme
  const handleOpenNewRequestModal = (salesRequest) => {
    // Satış talebini kaydet
    setRelatedSalesRequest(salesRequest);

    // Talep oluşturma modalını aç
    setShowNewRequestModal(true);
  };

  // Dosya seçimi
  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  // Sepete talep ekleme
  const handleAddToCart = (values, { resetForm }) => {
    // Benzersiz ID ekle (sadece sepette kullanılacak)
    const newItem = {
      ...values,
      tempId: Date.now(),
      files: selectedFiles.length > 0 ? [...selectedFiles] : [],
    };

    setCartItems([...cartItems, newItem]);
    setSuccess("Ürün sepete eklendi");
    resetForm();

    // Dosya seçimini sıfırla
    setSelectedFiles([]);
    const fileInput = document.getElementById("productionFileUpload");
    if (fileInput) fileInput.value = "";

    setTimeout(() => {
      setSuccess("");
    }, 2000);
  };

  // Sepetten ürün kaldırma
  const handleRemoveFromCart = (tempId) => {
    setCartItems(cartItems.filter((item) => item.tempId !== tempId));
  };

  // Sepeti temizleme
  const handleClearCart = () => {
    setCartItems([]);
    setOrderNotes("");
  };

  // Tüm sepeti onaylayıp talep oluşturma
  const handleCreateOrder = async () => {
    if (cartItems.length === 0) {
      setError("Sipariş oluşturmak için en az bir ürün ekleyin");
      return;
    }

    try {
      setConversionLoading(true);

      // İlk önce satış talebinin durumunu güncelle
      await salesAPI.convertToProductionRequest(relatedSalesRequest.id);

      // Her bir sepet ürünü için bir talep oluştur
      for (const item of cartItems) {
        // İlişki için bazı ekstra bilgiler ekle
        const requestData = {
          title: item.title,
          description: item.description || "-", // Boş ise varsayılan değer
          quantity: item.quantity,
          unit: item.unit,
          urgency: item.urgency,
          salesRequestId: relatedSalesRequest.id,
          createdByProduction: true,
        };

        console.log("Gönderilen talep verisi:", requestData);

        const response = await requestAPI.createRequest(requestData);
        const newRequestId = response.data.id;

        // Dosya yükleme işlemi
        if (item.files && item.files.length > 0) {
          try {
            const formData = new FormData();
            item.files.forEach((file) => {
              formData.append("files", file);
            });

            await attachmentAPI.uploadFiles(newRequestId, formData);
            console.log(
              `${item.files.length} dosya ${newRequestId} ID'li talebe yüklendi`
            );
          } catch (uploadErr) {
            console.error("Dosya yükleme hatası:", uploadErr);
            setError(
              "Bazı dosyalar yüklenirken hata oluştu, ancak talepler oluşturuldu."
            );
          }
        }
      }

      setSuccess(`${cartItems.length} adet ürün için talep oluşturuldu`);
      setCartItems([]);
      setOrderNotes("");
      setShowNewRequestModal(false);

      // Sayfaları yenile
      fetchPendingSalesRequests();
      fetchProcessingSalesRequests();
      fetchProductionRequests();
      fetchAllSalesRequests();

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError(
        "Talep oluşturulurken bir hata oluştu: " +
          (err.message || "Bilinmeyen hata")
      );
      console.error(err);
    } finally {
      setConversionLoading(false);
    }
  };

  // Validation schema (talep formu için)
  const requestValidationSchema = Yup.object({
    title: Yup.string().required("Ürün adı zorunlu"),
    quantity: Yup.number()
      .required("Miktar zorunlu")
      .positive("Miktar pozitif olmalı")
      .integer("Miktar tam sayı olmalı"),
    unit: Yup.string().required("Birim zorunlu"),
    urgency: Yup.string().required("Aciliyet zorunlu"),
  });

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

  // Birim adını getir
  const getUnitName = (unit) => {
    switch (unit) {
      case "KILOGRAM":
        return "kg";
      case "METER":
        return "metre";
      case "TON":
        return "ton";
      case "PIECE":
        return "adet";
      case "LITER":
        return "litre";
      case "PACKAGE":
        return "paket";
      case "BOX":
        return "kutu";
      case "PALLET":
        return "palet";
      case "SIZE":
        return "boy";
      default:
        return unit;
    }
  };

  // Aciliyet badge rengi
  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case "NORMAL":
        return <Badge bg="success">Normal</Badge>;
      case "HIGH":
        return <Badge bg="warning">Yüksek</Badge>;
      case "URGENT":
        return <Badge bg="danger">Acil</Badge>;
      default:
        return <Badge bg="secondary">{urgency}</Badge>;
    }
  };

  return (
    <div className="container">
      <h2 className="mb-4">Üretim Planlama Paneli</h2>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="all" title="Tüm Satış Talepleri">
          {loadingAllRequests ? (
            <p>Yükleniyor...</p>
          ) : allSalesRequests.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pazar</th>
                  <th>Ülke</th>
                  <th>Güç</th>
                  <th>Gerilim</th>
                  <th>Adet</th>
                  <th>Durum</th>
                  <th>Oluşturma Tarihi</th>
                  <th>Teslim Tarihi</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {allSalesRequests.map((request, index) => (
                  <tr key={request.id}>
                    <td>{index + 1}</td>
                    <td>{request.domestic ? "Yurtiçi" : "Yurtdışı"}</td>
                    <td>{request.country}</td>
                    <td>{request.power}</td>
                    <td>{request.outputPower}</td>
                    <td>{request.quantity}</td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td>
                      {request.createdAt
                        ? new Date(request.createdAt).toLocaleString()
                        : "-"}
                    </td>
                    <td>
                      {request.requestedDeliveryDate
                        ? new Date(
                            request.requestedDeliveryDate
                          ).toLocaleDateString("tr-TR")
                        : "-"}
                    </td>
                    <td>
                      <Button
                        variant="outline-info"
                        size="sm"
                        className="me-2 mb-1"
                        onClick={() => handleShowDetails(request)}
                      >
                        Detay
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="mb-1"
                        onClick={() => handleShowFilesModal(request.id, true)}
                      >
                        <i className="bi bi-file-earmark"></i> Dosyalar
                      </Button>
                      {request.status === "PENDING" && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="ms-2 mb-1"
                          onClick={() => handleOpenNewRequestModal(request)}
                        >
                          Talep Oluştur
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center p-4 border rounded bg-light">
              <p className="mb-0">Satış talebi bulunmamaktadır.</p>
            </div>
          )}
        </Tab>
        <Tab eventKey="pending" title="Bekleyen Satış Talepleri">
          {loadingPending ? (
            <p>Yükleniyor...</p>
          ) : pendingSalesRequests.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pazar</th>
                  <th>Ülke</th>
                  <th>Güç</th>
                  <th>Gerilim</th>
                  <th>Adet</th>
                  <th>Teslim Tarihi</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {pendingSalesRequests.map((request, index) => (
                  <tr key={request.id}>
                    <td>{index + 1}</td>
                    <td>{request.domestic ? "Yurtiçi" : "Yurtdışı"}</td>
                    <td>{request.country}</td>
                    <td>{request.power}</td>
                    <td>{request.outputPower}</td>
                    <td>{request.quantity}</td>
                    <td>
                      {new Date(
                        request.requestedDeliveryDate
                      ).toLocaleDateString()}
                    </td>
                    <td>
                      <Button
                        variant="primary"
                        size="sm"
                        className="me-2 mb-1"
                        onClick={() => handleOpenNewRequestModal(request)}
                      >
                        Talep Oluştur
                      </Button>
                      <Button
                        variant="outline-info"
                        size="sm"
                        className="me-2 mb-1"
                        onClick={() => handleShowDetails(request)}
                      >
                        Detay
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="mb-1"
                        onClick={() => handleShowFilesModal(request.id, true)}
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
              <p className="mb-0">Bekleyen satış talebi bulunmamaktadır.</p>
            </div>
          )}
        </Tab>

        <Tab eventKey="processing" title="İşlenen Satış Talepleri">
          {loadingProcessing ? (
            <p>Yükleniyor...</p>
          ) : processingSalesRequests.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pazar</th>
                  <th>Ülke</th>
                  <th>Güç</th>
                  <th>Gerilim</th>
                  <th>Adet</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {processingSalesRequests.map((request, index) => (
                  <tr key={request.id}>
                    <td>{index + 1}</td>
                    <td>{request.domestic ? "Yurtiçi" : "Yurtdışı"}</td>
                    <td>{request.country}</td>
                    <td>{request.power}</td>
                    <td>{request.outputPower}</td>
                    <td>{request.quantity}</td>
                    <td>
                      <Button
                        variant="info"
                        size="sm"
                        className="me-2 mb-1"
                        onClick={() => handleShowDetails(request)}
                      >
                        Detaylar
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="mb-1"
                        onClick={() => handleShowFilesModal(request.id, true)}
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
              <p className="mb-0">İşlenen satış talebi bulunmamaktadır.</p>
            </div>
          )}
        </Tab>

        <Tab eventKey="production" title="Oluşturulan Üretim Talepleri">
          {loadingProduction ? (
            <p>Yükleniyor...</p>
          ) : productionRequests.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Başlık</th>
                  <th>Açıklama</th>
                  <th>Miktar</th>
                  <th>Durum</th>
                  <th>Oluşturma Tarihi</th>
                  <th>Tahmini Termin Tarihi</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {productionRequests.map((request, index) => (
                  <tr key={request.id}>
                    <td>{index + 1}</td>
                    <td>{request.title}</td>
                    <td>
                      {request.description.length > 50
                        ? request.description.substring(0, 50) + "..."
                        : request.description}
                    </td>
                    <td>{request.quantity}</td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td>{new Date(request.createdAt).toLocaleString()}</td>
                    <td>
                      {request.estimatedDeliveryDate
                        ? new Date(
                            request.estimatedDeliveryDate
                          ).toLocaleDateString("tr-TR")
                        : "-"}
                    </td>
                    <td>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleShowFilesModal(request.id, false)}
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
              <p className="mb-0">
                Oluşturulmuş üretim talebi bulunmamaktadır.
              </p>
            </div>
          )}
        </Tab>
      </Tabs>

      {/* Satış Talebi Detay Modal */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Satış Talebi Detayları</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <div>
              <table className="table table-bordered">
                <tbody>
                  <tr>
                    <th style={{ width: "30%" }}>Talep #</th>
                    <td>{selectedRequest.id}</td>
                  </tr>
                  <tr>
                    <th>Pazar</th>
                    <td>{selectedRequest.domestic ? "Yurtiçi" : "Yurtdışı"}</td>
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
                    <th>Gerilim</th>
                    <td>{selectedRequest.outputPower}</td>
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
                    <th>Oluşturan</th>
                    <td>{selectedRequest.createdByName}</td>
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

              {selectedRequest.productionRequest ? (
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
              ) : (
                selectedRequest.status === "PENDING" && (
                  <div className="mt-4">
                    <div className="alert alert-info">
                      Bu satış talebi henüz işlenmemiş. İşlemek için "Talep
                      Oluştur" butonunu kullanın.
                    </div>
                  </div>
                )
              )}

              {/* Dosya Görüntüleme Butonu */}
              <div className="d-flex justify-content-end mt-3">
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleShowFilesModal(selectedRequest.id, true);
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

          {selectedRequest && selectedRequest.status === "PENDING" && (
            <Button
              variant="primary"
              onClick={() => {
                setShowDetailsModal(false);
                handleOpenNewRequestModal(selectedRequest);
              }}
            >
              Talep Oluştur
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Yeni Talep Oluşturma Modal */}
      <Modal
        show={showNewRequestModal}
        onHide={() => {
          if (cartItems.length > 0) {
            if (
              !window.confirm(
                "Tamamlanmamış siparişiniz var. Çıkmak istediğinize emin misiniz?"
              )
            ) {
              return;
            }
          }
          setShowNewRequestModal(false);
          setCartItems([]);
          setOrderNotes("");
        }}
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Üretim Talebi Oluştur</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {relatedSalesRequest && (
            <>
              <div className="alert alert-info mb-4">
                <p className="mb-0">
                  <strong>İlgili Satış Talebi: </strong> #
                  {relatedSalesRequest.id} -
                  {relatedSalesRequest.domestic ? "Yurtiçi" : "Yurtdışı"} /{" "}
                  {relatedSalesRequest.country} /{relatedSalesRequest.power} /{" "}
                  {relatedSalesRequest.outputPower} /
                  {relatedSalesRequest.quantity} adet
                </p>
              </div>

              {/* Yeni Talep Formu */}
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">Talep Bilgileri</h5>
                </Card.Header>
                <Card.Body>
                  <Formik
                    initialValues={{
                      title: "",
                      description: "",
                      quantity: 1,
                      unit: "PIECE",
                      urgency: "NORMAL",
                    }}
                    validationSchema={requestValidationSchema}
                    onSubmit={handleAddToCart}
                  >
                    {({ isSubmitting, values, resetForm }) => (
                      <Form>
                        <div className="row">
                          <div className="col-md-4 mb-3">
                            <label htmlFor="title" className="form-label">
                              Ürün
                            </label>
                            <Field
                              type="text"
                              name="title"
                              className="form-control"
                            />
                            <ErrorMessage
                              name="title"
                              component="div"
                              className="text-danger"
                            />
                          </div>

                          <div className="col-md-2 mb-3">
                            <label htmlFor="quantity" className="form-label">
                              Miktar
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

                          <div className="col-md-2 mb-3">
                            <label htmlFor="unit" className="form-label">
                              Birim
                            </label>
                            <Field
                              as="select"
                              name="unit"
                              className="form-select"
                            >
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
                            <ErrorMessage
                              name="unit"
                              component="div"
                              className="text-danger"
                            />
                          </div>

                          <div className="col-md-3 mb-3">
                            <label htmlFor="urgency" className="form-label">
                              Aciliyet
                            </label>
                            <Field
                              as="select"
                              name="urgency"
                              className="form-select"
                            >
                              <option value="NORMAL">Normal</option>
                              <option value="HIGH">Yüksek</option>
                              <option value="URGENT">Acil</option>
                            </Field>
                            <ErrorMessage
                              name="urgency"
                              component="div"
                              className="text-danger"
                            />
                          </div>

                          <div className="col-md-1 mb-3 d-flex align-items-end">
                            <Button
                              type="submit"
                              variant="outline-success"
                              disabled={isSubmitting || !values.title}
                              className="btn-sm"
                            >
                              <i className="bi bi-plus-lg"></i>
                            </Button>
                          </div>
                        </div>

                        <div className="mb-3">
                          <label htmlFor="description" className="form-label">
                            Açıklama
                          </label>
                          <Field
                            as="textarea"
                            name="description"
                            className="form-control"
                            rows="3"
                          />
                          <ErrorMessage
                            name="description"
                            component="div"
                            className="text-danger"
                          />
                        </div>

                        {/* Dosya Yükleme Alanı - YENİ */}
                        <div className="mb-3">
                          <label
                            htmlFor="productionFileUpload"
                            className="form-label"
                          >
                            Dosya Ekle
                          </label>
                          <div className="input-group">
                            <input
                              type="file"
                              id="productionFileUpload"
                              className="form-control"
                              multiple
                              onChange={handleFileChange}
                            />
                            {selectedFiles.length > 0 && (
                              <Button
                                variant="outline-secondary"
                                onClick={() => {
                                  setSelectedFiles([]);
                                  const fileInput = document.getElementById(
                                    "productionFileUpload"
                                  );
                                  if (fileInput) fileInput.value = "";
                                }}
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

              {/* Sepet Görünümü */}
              {cartItems.length > 0 && (
                <Card className="mb-4">
                  <Card.Header className="bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Sepet ({cartItems.length} Ürün)</h5>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={handleClearCart}
                      >
                        Sepeti Temizle
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <div className="mb-3">
                      <label htmlFor="orderNotes" className="form-label">
                        Sipariş Notları
                      </label>
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
                        <ListGroup.Item
                          key={item.tempId}
                          className="d-flex justify-content-between align-items-center py-3"
                        >
                          <div className="d-flex align-items-center">
                            <Badge bg="secondary" className="me-3">
                              {index + 1}
                            </Badge>
                            <div>
                              <h6 className="mb-0">{item.title}</h6>
                              <p className="mb-0 text-muted small">
                                {item.quantity} {getUnitName(item.unit)} |{" "}
                                {getUrgencyBadge(item.urgency)}
                              </p>
                              {item.description && (
                                <p className="mb-0 text-muted small">
                                  {item.description}
                                </p>
                              )}

                              {/* Seçilen Dosyaları Göster */}
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
                          >
                            Kaldır
                          </Button>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </Card.Body>
                </Card>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              if (cartItems.length > 0) {
                if (
                  !window.confirm(
                    "Tamamlanmamış siparişiniz var. Çıkmak istediğinize emin misiniz?"
                  )
                ) {
                  return;
                }
              }
              setShowNewRequestModal(false);
              setCartItems([]);
              setOrderNotes("");
            }}
          >
            İptal
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateOrder}
            disabled={cartItems.length === 0 || conversionLoading}
          >
            {conversionLoading ? "İşleniyor..." : "Talepleri Oluştur"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Dosya Görüntüleme Modalı */}
      <Modal
        show={showFilesModal}
        onHide={() => setShowFilesModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedSalesRequestId
              ? "Satış Talebi Dosyaları"
              : "Üretim Talebi Dosyaları"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {(selectedRequestId || selectedSalesRequestId) && (
            <>
              <div>
                {selectedRequestId ? (
                  <FileViewer
                    requestId={selectedRequestId}
                    refreshTrigger={refreshFiles}
                  />
                ) : (
                  <FileViewer
                    salesRequestId={selectedSalesRequestId}
                    refreshTrigger={refreshFiles}
                  />
                )}
              </div>

              <hr />

              <div className="mb-4">
                <h6>Dosya Yükle</h6>
                <FileUploader
                  requestId={selectedRequestId}
                  salesRequestId={selectedSalesRequestId}
                  onUploadSuccess={() => setRefreshFiles((prev) => prev + 1)}
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

export default ProductionDashboard;
