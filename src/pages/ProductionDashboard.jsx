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
  Accordion,
  Spinner,
} from "react-bootstrap";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  salesAPI,
  requestAPI,
  attachmentAPI,
  projectAPI,
} from "../services/api";
import FileViewer from "../components/FileViewer";
import FileUploader from "../components/FileUploader";

const ProductionDashboard = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

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

  // Sepet (talep oluşturma için)
  const [cartItems, setCartItems] = useState([]);
  const [orderNotes, setOrderNotes] = useState("");

  // Proje detay modalı
  const [showProjectDetailModal, setShowProjectDetailModal] = useState(false);
  const [projectRequests, setProjectRequests] = useState([]);
  const [loadingProjectRequests, setLoadingProjectRequests] = useState(false);

  // Talep edilenleri göster/gizle
  const [showRequested, setShowRequested] = useState(true);

  // Satış taleplerinin ilgili diğer taleplerini göstermek için modal
  const [showRelatedRequestsModal, setShowRelatedRequestsModal] =
    useState(false);
  const [relatedRequests, setRelatedRequests] = useState([]);
  const [parentSalesRequest, setParentSalesRequest] = useState(null);

  // İlişkili talepleri gösterme fonksiyonu
  const showRelatedRequests = (requests, salesRequest) => {
    setRelatedRequests(requests);
    setParentSalesRequest(salesRequest);
    setShowRelatedRequestsModal(true);
  };

  useEffect(() => {
    fetchProjects();
  }, [activeTab]);

  // Duruma göre projeleri getir
  const fetchProjects = async () => {
    try {
      setLoading(true);
      let response;

      switch (activeTab) {
        case "pending":
          response = await projectAPI.getProjectsByStatus("PENDING");
          break;
        case "inprogress":
          // Hem IN_PROGRESS hem de ORDERED durumundaki projeleri çek
          const inProgressResponse = await projectAPI.getProjectsByStatus(
            "IN_PROGRESS"
          );
          const orderedResponse = await projectAPI.getProjectsByStatus(
            "ORDERED"
          );

          // İki response'u birleştir
          response = {
            data: [...inProgressResponse.data, ...orderedResponse.data],
          };
          break;
        case "inproduction":
          response = await projectAPI.getProjectsByStatus("IN_PRODUCTION");
          break;
        case "completed":
          response = await projectAPI.getProjectsByStatus("COMPLETED");
          break;
        default:
          response = await projectAPI.getAllProjects();
      }

      setProjects(response.data);
      setError("");
    } catch (err) {
      setError("Projeler yüklenirken bir hata oluştu.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Proje detayları için talepleri getir
  const fetchProjectRequests = async (projectId) => {
    try {
      setLoadingProjectRequests(true);

      // Sales taleplerini getir
      const salesResponse = await salesAPI.getRequestsByProject(projectId);

      setProjectRequests(salesResponse.data);
      setError("");
    } catch (err) {
      setError("Proje talepleri yüklenirken bir hata oluştu.");
      console.error(err);
    } finally {
      setLoadingProjectRequests(false);
    }
  };

  // Proje detaylarını göster
  const handleShowProjectDetail = (project) => {
    setSelectedProject(project);
    setShowProjectDetailModal(true);
    fetchProjectRequests(project.id);
  };

  // Satış talebi detaylarını göster
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
    console.log("İlgili satış talebi:", salesRequest);

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

  // Projeyi üretime gönderme
  const handleSendToProduction = async (projectId) => {
    try {
      setLoading(true);
      await projectAPI.updateProjectStatus(projectId, {
        status: "IN_PRODUCTION",
      });
      setSuccess("Proje üretime verildi.");
      setShowProjectDetailModal(false);
      fetchProjects();

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError("Proje durumu güncellenirken bir hata oluştu.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Projeyi tamamlama
  const handleCompleteProject = async (projectId) => {
    try {
      setLoading(true);
      await projectAPI.updateProjectStatus(projectId, { status: "COMPLETED" });
      setSuccess("Proje tamamlandı.");
      setShowProjectDetailModal(false);
      fetchProjects();

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError("Proje durumu güncellenirken bir hata oluştu.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Tüm sepeti onaylayıp talep oluşturma
  const handleCreateOrder = async () => {
    if (cartItems.length === 0) {
      setError("Sipariş oluşturmak için en az bir ürün ekleyin");
      return;
    }

    try {
      setConversionLoading(true);

      // İlk önce satış talebinin durumunu CONVERTED olarak güncelle
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
          projectId: relatedSalesRequest.projectId || null, // Proje ilişkisini de ekle
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

      // Eğer proje durumu PENDING ise durumunu IN_PROGRESS olarak güncelle
      if (relatedSalesRequest && relatedSalesRequest.projectId) {
        const projectInfo = await projectAPI.getProjectById(
          relatedSalesRequest.projectId
        );
        if (projectInfo.data && projectInfo.data.status === "PENDING") {
          await projectAPI.updateProjectStatus(relatedSalesRequest.projectId, {
            status: "IN_PROGRESS",
          });
        }
      }

      setSuccess(`${cartItems.length} adet ürün için talep oluşturuldu`);
      setCartItems([]);
      setOrderNotes("");
      setShowNewRequestModal(false);

      // Sayfaları yenile
      fetchProjects();
      if (selectedProject) {
        fetchProjectRequests(selectedProject.id);
      }

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
        return <Badge bg="warning">Siparişi Verildi</Badge>;
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
      case "IN_PROGRESS":
        return <Badge bg="primary">Devam Ediyor</Badge>;
      case "IN_PRODUCTION":
        return <Badge bg="info">Üretimde</Badge>;
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

  // Talep edildi mi kontrolü
  const isRequestProcessed = (request) => {
    return request.status === "PROCESSING" || request.status === "CONVERTED";
  };

  // Projeyi filtrele
  const filterProjectRequests = (requests) => {
    if (showRequested) {
      return requests;
    } else {
      return requests.filter((request) => !isRequestProcessed(request));
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
        <Tab eventKey="pending" title="Bekleyen Projeler">
          {renderProjectsContent()}
        </Tab>
        <Tab eventKey="inprogress" title="Devam Eden Projeler">
          {renderProjectsContent()}
        </Tab>
        <Tab eventKey="inproduction" title="Üretime Verilen Projeler">
          {renderProjectsContent()}
        </Tab>
        <Tab eventKey="completed" title="Tamamlanan Projeler">
          {renderProjectsContent()}
        </Tab>
      </Tabs>

      {/* Proje Detay Modalı */}
      <Modal
        show={showProjectDetailModal}
        onHide={() => setShowProjectDetailModal(false)}
        size="lg"
        dialogClassName="modal-90w"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Proje Detayı: {selectedProject ? selectedProject.name : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProject && (
            <>
              <div className="mb-3">
                <Button
                  variant={showRequested ? "outline-primary" : "primary"}
                  size="sm"
                  className="me-2"
                  onClick={() => setShowRequested(!showRequested)}
                >
                  {showRequested
                    ? "Sadece Bekleyenleri Göster"
                    : "Tümünü Göster"}
                </Button>
              </div>

              {loadingProjectRequests ? (
                <div className="text-center my-4">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Proje talepleri yükleniyor...</p>
                </div>
              ) : projectRequests.length === 0 ? (
                <Alert variant="info">
                  Bu projeye ait talep bulunmamaktadır.
                </Alert>
              ) : (
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
                      <th>Teslim Tarihi</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterProjectRequests(projectRequests).map(
                      (request, index) => (
                        <tr key={request.id}>
                          <td>{index + 1}</td>
                          <td>{request.isDomestic ? "Yurtiçi" : "Yurtdışı"}</td>
                          <td>{request.country}</td>
                          <td>{request.power}</td>
                          <td>{request.outputPower}</td>
                          <td>{request.quantity}</td>
                          <td>{getStatusBadge(request.status)}</td>
                          <td>
                            {request.requestedDeliveryDate
                              ? new Date(
                                  request.requestedDeliveryDate
                                ).toLocaleDateString()
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
                              className="me-2 mb-1"
                              onClick={() =>
                                handleShowFilesModal(request.id, true)
                              }
                            >
                              <i className="bi bi-file-earmark"></i> Dosyalar
                            </Button>
                            {request.status === "PENDING" && (
                              <Button
                                variant="primary"
                                size="sm"
                                className="mb-1"
                                onClick={() =>
                                  handleOpenNewRequestModal(request)
                                }
                              >
                                Talep Oluştur
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </Table>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="w-100 d-flex justify-content-between">
            <div>
              {/* Üretime Ver butonu - Projede en az bir sales request varsa ve tüm sales requestlerin altındaki tüm üretim talepleri DELIVERED ise göster */}
              {selectedProject &&
                projectRequests.length > 0 &&
                projectRequests.every((salesRequest) => {
                  // Eğer sales request'in altında hiç üretim talebi yoksa, o sales request henüz işlenmemiş demektir, bu durumda false döndür
                  if (!salesRequest.productionRequests || salesRequest.productionRequests.length === 0) {
                    return false;
                  }
                  
                  // Sales request'in altındaki tüm üretim taleplerinin DELIVERED olup olmadığını kontrol et
                  return salesRequest.productionRequests.every(prodReq => prodReq.status === "DELIVERED");
                }) && (
                  <Button
                    variant="success"
                    onClick={() => handleSendToProduction(selectedProject.id)}
                  >
                    Üretime Ver
                  </Button>
                )}

              {/* Tamamla butonu - Eğer proje IN_PRODUCTION durumunda ise göster */}
              {selectedProject &&
                selectedProject.status === "IN_PRODUCTION" && (
                  <Button
                    variant="info"
                    onClick={() => handleCompleteProject(selectedProject.id)}
                  >
                    Tamamla
                  </Button>
                )}
            </div>

            <Button
              variant="secondary"
              onClick={() => setShowProjectDetailModal(false)}
            >
              Kapat
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

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
                    <td>
                      {selectedRequest.isDomestic ? "Yurtiçi" : "Yurtdışı"}
                    </td>
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
                  {selectedRequest.isDomestic && (
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
                  <tr>
                    <th>Proje</th>
                    <td>{selectedRequest.projectName || "-"}</td>
                  </tr>
                </tbody>
              </table>

              {selectedRequest.productionRequests && selectedRequest.productionRequests.length > 0 ? (
                <div className="mt-4">
                  <h5>İlişkili Üretim Talepleri</h5>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Başlık</th>
                        <th>Miktar</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.productionRequests.map((req, index) => (
                        <tr key={req.id}>
                          <td>{index + 1}</td>
                          <td>{req.title}</td>
                          <td>
                            {req.quantity} {getUnitName(req.unit)}
                          </td>
                          <td>{getStatusBadge(req.status)}</td>
                          <td>
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => {
                                // Talep detaylarını görüntüleme işlemi burada yapılabilir
                                alert(`Üretim Talebi #${req.id} Detayları`);
                              }}
                            >
                              Detay
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
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
                  {relatedSalesRequest.isDomestic ? "Yurtiçi" : "Yurtdışı"} /{" "}
                  {relatedSalesRequest.country} /{relatedSalesRequest.power} /{" "}
                  {relatedSalesRequest.outputPower} /
                  {relatedSalesRequest.quantity} adet
                  {relatedSalesRequest.projectName && (
                    <span>
                      {" "}
                      | <strong>Proje:</strong>{" "}
                      {relatedSalesRequest.projectName}
                    </span>
                  )}
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

                        {/* Dosya Yükleme Alanı */}
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

  // Projeleri gösteren tablo
  function renderProjectsContent() {
    if (loading) {
      return (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Projeler yükleniyor...</p>
        </div>
      );
    }

    if (projects.length === 0) {
      return <Alert variant="info">Bu durumda proje bulunmamaktadır.</Alert>;
    }

    return (
      <Card>
        <Card.Body>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>Proje Adı</th>
                <th>Oluşturan</th>
                <th>Oluşturulma Tarihi</th>
                <th>Durum</th>
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
                    {new Date(project.createdAt).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>{getStatusBadge(project.status)}</td>
                  <td>
                    <Button
                      variant="primary"
                      size="sm"
                      className="me-2"
                      onClick={() => handleShowProjectDetail(project)}
                    >
                      Detay Görüntüle
                    </Button>

                    {project.status === "ORDERED" && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleSendToProduction(project.id)}
                      >
                        Üretime Ver
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    );
  }
};

export default ProductionDashboard;
