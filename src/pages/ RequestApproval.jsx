import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Alert,
  Badge,
  Tabs,
  Tab,
  ListGroup,
  Card,
} from "react-bootstrap";
import {
  requestAPI,
  attachmentAPI,
  projectAPI,
  salesAPI,
} from "../services/api";
import FileViewer from "../components/FileViewer";

const RequestApproval = () => {
  // Ana sekmeler ve alt sekmeler için state
  const [mainTab, setMainTab] = useState("requests");
  const [requestsTab, setRequestsTab] = useState("pending");
  const [projectsTab, setProjectsTab] = useState("pending");

  // Talep listeleri
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [orderedRequests, setOrderedRequests] = useState([]);
  const [deliveredRequests, setDeliveredRequests] = useState([]);

  // Proje listeleri
  const [pendingProjects, setPendingProjects] = useState([]);
  const [orderedProjects, setOrderedProjects] = useState([]);
  const [inProductionProjects, setInProductionProjects] = useState([]);
  const [completedProjects, setCompletedProjects] = useState([]);

  // Proje detayları
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectRequests, setProjectRequests] = useState([]);

  // Yükleme durumları
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingApproved, setLoadingApproved] = useState(true);
  const [loadingOrdered, setLoadingOrdered] = useState(true);
  const [loadingDelivered, setLoadingDelivered] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingProjectRequests, setLoadingProjectRequests] = useState(false);

  // Genel state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [status, setStatus] = useState("");
  const [comment, setComment] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");

  // Dosya görüntüleme için state
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [refreshFiles, setRefreshFiles] = useState(0);

  useEffect(() => {
    fetchPendingRequests();
    fetchApprovedRequests();
    fetchOrderedRequests();
    fetchDeliveredRequests();
    fetchProjects();
  }, []);

  // Talep listeleri için veri çekme fonksiyonları
  const fetchPendingRequests = async () => {
    try {
      setLoadingPending(true);
      const response = await requestAPI.getPendingRequests();
      setPendingRequests(response.data);
      setError("");
    } catch (err) {
      setError("Bekleyen talepler yüklenirken bir hata oluştu.");
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
      setError("");
    } catch (err) {
      setError("Onaylanan talepler yüklenirken bir hata oluştu.");
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
      setError("");
    } catch (err) {
      setError("Sipariş edilen talepler yüklenirken bir hata oluştu.");
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
      setError("");
    } catch (err) {
      setError("Teslim alınan talepler yüklenirken bir hata oluştu.");
      console.error(err);
    } finally {
      setLoadingDelivered(false);
    }
  };

  // Proje listelerini çekme fonksiyonu
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      // Tüm proje durumları için ayrı ayrı istek yap
      const pendingRes = await projectAPI.getProjectsByStatus("IN_PROGRESS");
      const orderedRes = await projectAPI.getProjectsByStatus("ORDERED");
      const inProductionRes = await projectAPI.getProjectsByStatus(
        "IN_PRODUCTION"
      );
      const completedRes = await projectAPI.getProjectsByStatus("COMPLETED");

      setPendingProjects(pendingRes.data);
      setOrderedProjects(orderedRes.data);
      setInProductionProjects(inProductionRes.data);
      setCompletedProjects(completedRes.data);

      setError("");

      // İlk projenin detaylarını otomatik olarak yükle
      if (pendingRes.data.length > 0) {
        fetchProjectRequests(pendingRes.data[0].id);
      }
    } catch (err) {
      setError("Projeler yüklenirken bir hata oluştu.");
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Bir projeye ait talepleri çekme
  const fetchProjectRequests = async (projectId) => {
    try {
      setLoadingProjectRequests(true);
      const response = await requestAPI.getRequestsByProject(projectId);
      setProjectRequests(response.data);

      // Eğer proje detayları açık değilse ve bu proje henüz seçilmemişse, projeyi seç
      if (!selectedProject || selectedProject.id !== projectId) {
        const project = [
          ...pendingProjects,
          ...orderedProjects,
          ...inProductionProjects,
          ...completedProjects,
        ].find((p) => p.id === projectId);

        if (project) {
          setSelectedProject(project);
        }
      }

      setError("");
    } catch (err) {
      setError("Proje talepleri yüklenirken bir hata oluştu.");
      console.error(err);
    } finally {
      setLoadingProjectRequests(false);
    }
  };

  // Proje durumunu güncelleme
  const updateProjectStatus = async (projectId, newStatus) => {
    try {
      await projectAPI.updateProjectStatus(projectId, { status: newStatus });
      setSuccess("Proje durumu başarıyla güncellendi!");
      fetchProjects(); // Proje listelerini yenile

      // Proje detayları açıksa seçili projeyi de güncelle
      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject({ ...selectedProject, status: newStatus });

        // Projeye ait talepleri de tekrar yükle
        fetchProjectRequests(projectId);
      }

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError("Proje durumu güncellenirken bir hata oluştu: " + err.message);
      console.error("updateProjectStatus Error:", err);
      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };

  const handleOpenModal = (request, initialStatus = "") => {
    setSelectedRequest(request);
    setStatus(initialStatus); // İlk durumu ayarla
    setComment("");
    setOrderNumber("");
    setEstimatedDeliveryDate(""); // Tahmini termin tarihini sıfırla
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleOpenProjectModal = (project) => {
    setSelectedProject(project);
    fetchProjectRequests(project.id);
    setShowProjectModal(true);
  };

  const handleCloseProjectModal = () => {
    setShowProjectModal(false);
    setSelectedProject(null);
    setProjectRequests([]);
  };

  // Dosya görüntüleme modalını açma
  const handleShowFilesModal = (requestId) => {
    setSelectedRequestId(requestId);
    setShowFilesModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!status) {
      setError("Lütfen bir işlem seçin.");
      return;
    }

    // Sipariş verildi ise sipariş numarası gerekli
    if (status === "ORDERED" && !orderNumber) {
      setError("Tedarikçi ismi gerekli.");
      return;
    }

    // Sipariş verildi ise tahmini termin tarihi gerekli
    if (status === "ORDERED" && !estimatedDeliveryDate) {
      setError("Tahmini termin tarihi gerekli.");
      return;
    }

    try {
      await requestAPI.updateStatus(selectedRequest.id, {
        status,
        comment,
        orderNumber: status === "ORDERED" ? orderNumber : null,
        estimatedDeliveryDate:
          status === "ORDERED" ? estimatedDeliveryDate : null,
      });

      // Talep ordered olduğunda, ilgili sales request'i de ordered olarak işaretle
      if (status === "ORDERED" && selectedRequest.salesRequestId) {
        try {
          await salesAPI.updateSalesRequestStatus(
            selectedRequest.salesRequestId,
            { status: "ORDERED" }
          );
          console.log(
            `SalesRequest #${selectedRequest.salesRequestId} ORDERED olarak güncellendi`
          );
        } catch (err) {
          console.error("SalesRequest durumu güncellenirken hata:", err);
        }
      }

      setSuccess("Talep başarıyla güncellendi!");
      handleCloseModal();

      // Tüm listeleri yeniden yükle
      fetchPendingRequests();
      fetchApprovedRequests();
      fetchOrderedRequests();
      fetchDeliveredRequests();

      // Proje talepleri açıksa, onları da yenile
      if (selectedProject) {
        fetchProjectRequests(selectedProject.id);
      }

      // Eğer talebin bir projesi varsa
      if (selectedRequest.projectId || selectedRequest.projectName) {
        // 1 saniye bekleyip projeye ait tüm talepleri yükle ve durumu kontrol et
        setTimeout(async () => {
          try {
            const projectId = selectedRequest.projectId;
            const response = await requestAPI.getRequestsByProject(projectId);
            const projectRequests = response.data;

            // Projeye ait tüm talepler sipariş verildi durumunda mı kontrol et
            const allOrdered = projectRequests.every(
              (req) => req.status === "ORDERED" || req.status === "DELIVERED"
            );

            // Eğer tüm taleplere sipariş verilmişse ve proje henüz IN_PROGRESS durumundaysa
            if (allOrdered) {
              // Önce projenin güncel durumunu kontrol et
              const projectResponse = await projectAPI.getProjectById(
                projectId
              );
              if (projectResponse.data.status === "IN_PROGRESS") {
                // Projenin durumunu güncelle
                await projectAPI.updateProjectStatus(projectId, {
                  status: "ORDERED",
                });

                // Projeye ait tüm sales request'leri ORDERED olarak güncelle
                try {
                  const salesResponse = await salesAPI.getRequestsByProject(
                    projectId
                  );
                  const salesRequests = salesResponse.data;

                  // Durumu CONVERTED olan tüm sales request'leri ORDERED yap
                  for (const salesRequest of salesRequests) {
                    if (
                      salesRequest.status === "CONVERTED" ||
                      salesRequest.status === "PROCESSING"
                    ) {
                      await salesAPI.updateSalesRequestStatus(salesRequest.id, {
                        status: "ORDERED",
                      });
                      console.log(
                        `SalesRequest #${salesRequest.id} ORDERED olarak güncellendi`
                      );
                    }
                  }
                } catch (salesErr) {
                  console.error(
                    "SalesRequest durumları güncellenirken hata:",
                    salesErr
                  );
                }

                setSuccess(
                  'Tüm talepler sipariş edildiği için proje "Siparişi Verilen" olarak güncellendi!'
                );
                fetchProjects(); // Proje listelerini yenile
              }
            }
          } catch (error) {
            console.error("Proje durumu kontrol edilirken hata:", error);
          }
        }, 1000);
      }

      // 3 saniye sonra başarı mesajını kaldır
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError("Talep güncellenirken bir hata oluştu.");
      console.error(err);

      // 3 saniye sonra hata mesajını kaldır
      setTimeout(() => {
        setError("");
      }, 3000);
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

  // Durum badge rengi
  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return <Badge bg="secondary">Beklemede</Badge>;
      case "APPROVED":
        return <Badge bg="primary">Onaylandı</Badge>;
      case "ORDERED":
        return <Badge bg="info">Sipariş Verildi</Badge>;
      case "DELIVERED":
        return <Badge bg="success">Teslim Edildi</Badge>;
      case "REJECTED":
        return <Badge bg="danger">Reddedildi</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // Proje durumu badge rengi
  const getProjectStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return <Badge bg="secondary">Beklemede</Badge>;
      case "IN_PROGRESS":
        return <Badge bg="warning">Süreçte</Badge>;
      case "ORDERED":
        return <Badge bg="primary">Siparişi Verilen</Badge>;
      case "IN_PRODUCTION":
        return <Badge bg="info">Üretime Verilen</Badge>;
      case "COMPLETED":
        return <Badge bg="success">Tamamlanan</Badge>;
      case "CANCELLED":
        return <Badge bg="danger">Iptal Edilen</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // Projelerin durumlarını kontrol eden ve güncelleyen yardımcı fonksiyon
  const checkAndUpdateProjectStatus = (projectId) => {
    if (!selectedProject || selectedProject.id !== projectId) return;

    // Projeye ait tüm talepler sipariş verildi durumunda mı kontrol et
    const allOrdered = projectRequests.every(
      (req) => req.status === "ORDERED" || req.status === "DELIVERED"
    );

    if (allOrdered && selectedProject.status === "IN_PROGRESS") {
      // Hepsine sipariş verildiyse, projenin durumunu güncelle
      updateProjectStatus(projectId, "ORDERED");
    }
  };

  return (
    <div className="container">
      <h2 className="mb-4">Talep Değerlendirme</h2>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Ana Sekmeler */}
      <Tabs
        activeKey={mainTab}
        onSelect={(k) => setMainTab(k)}
        className="mb-4"
      >
        {/* TALEPLER SEKMESİ */}
        <Tab eventKey="requests" title="Talepler">
          {/* Talep Alt Sekmeleri */}
          <Tabs
            activeKey={requestsTab}
            onSelect={(k) => setRequestsTab(k)}
            className="mb-4"
          >
            {/* Bekleyen Talepler Alt Sekmesi */}
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
                      <th>Proje</th>
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
                        <td>{request.projectName || "-"}</td>
                        <td>{new Date(request.createdAt).toLocaleString()}</td>
                        <td>
                          <Button
                            variant="primary"
                            size="sm"
                            className="me-2 mb-1"
                            onClick={() => handleOpenModal(request)}
                          >
                            Değerlendir
                          </Button>
                          <Button
                            variant="outline-info"
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
                  <p className="mb-0">Bekleyen talep bulunmamaktadır.</p>
                </div>
              )}
            </Tab>

            {/* Onaylanan Talepler Alt Sekmesi */}
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
                      <th>Proje</th>
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
                        <td>{request.projectName || "-"}</td>
                        <td>{new Date(request.updatedAt).toLocaleString()}</td>
                        <td>
                          <Button
                            variant="success"
                            size="sm"
                            className="me-2 mb-1"
                            onClick={() => handleOpenModal(request, "ORDERED")}
                          >
                            Sipariş Ver
                          </Button>
                          <Button
                            variant="outline-info"
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
                  <p className="mb-0">Onaylanan talep bulunmamaktadır.</p>
                </div>
              )}
            </Tab>

            {/* Sipariş Edilenler Alt Sekmesi */}
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
                      <th>Proje</th>
                      <th>Sipariş Tarihi</th>
                      <th>Tahmini Termin</th>
                      <th>Durum</th>
                      <th>İşlemler</th>
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
                        <td>{request.projectName || "-"}</td>
                        <td>
                          {request.orderDate
                            ? new Date(request.orderDate).toLocaleString()
                            : "-"}
                        </td>
                        <td>
                          {request.estimatedDeliveryDate
                            ? new Date(
                                request.estimatedDeliveryDate
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                        <td>{getStatusBadge(request.status)}</td>
                        <td>
                          <Button
                            variant="outline-info"
                            size="sm"
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
                  <p className="mb-0">Sipariş edilen talep bulunmamaktadır.</p>
                </div>
              )}
            </Tab>

            {/* Teslim Alınanlar Alt Sekmesi */}
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
                      <th>Proje</th>
                      <th>Teslim Alan</th>
                      <th>Teslim Tarihi</th>
                      <th>Teslimat Notu</th>
                      <th>İşlemler</th>
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
                        <td>{request.projectName || "-"}</td>
                        <td>{request.receiverName}</td>
                        <td>
                          {new Date(request.deliveryDate).toLocaleString()}
                        </td>
                        <td>{request.deliveryNotes || "-"}</td>
                        <td>
                          <Button
                            variant="outline-info"
                            size="sm"
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
                  <p className="mb-0">Teslim alınan talep bulunmamaktadır.</p>
                </div>
              )}
            </Tab>
          </Tabs>
        </Tab>

        {/* PROJELER SEKMESİ */}
        <Tab eventKey="projects" title="Projeler">
          <Tabs
            activeKey={projectsTab}
            onSelect={(k) => setProjectsTab(k)}
            className="mb-4"
          >
            {/* Bekleyen Projeler Alt Sekmesi */}
            <Tab eventKey="pending" title="Bekleyen Projeler">
              {loadingProjects ? (
                <p>Yükleniyor...</p>
              ) : pendingProjects.length > 0 ? (
                <div className="row">
                  <div className="col-md-4 mb-4">
                    <div className="list-group">
                      {pendingProjects.map((project) => (
                        <button
                          key={project.id}
                          className={`list-group-item list-group-item-action ${
                            selectedProject && selectedProject.id === project.id
                              ? "active"
                              : ""
                          }`}
                          onClick={() => fetchProjectRequests(project.id)}
                        >
                          <div className="d-flex w-100 justify-content-between">
                            <h5 className="mb-1">{project.name}</h5>
                            <small>
                              {new Date(project.createdAt).toLocaleDateString()}
                            </small>
                          </div>
                          <p className="mb-1">
                            <small>
                              Oluşturan: {project.creatorName || "-"}
                            </small>
                          </p>
                          <div className="d-flex justify-content-between align-items-center">
                            {getProjectStatusBadge(project.status)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-md-8">
                    <Card>
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">
                          {selectedProject
                            ? selectedProject.name
                            : "Proje Detayı"}
                        </h5>
                        {selectedProject &&
                          getProjectStatusBadge(selectedProject.status)}
                      </Card.Header>
                      <Card.Body>
                        {loadingProjectRequests ? (
                          <p>Talepler yükleniyor...</p>
                        ) : projectRequests.length > 0 ? (
                          <div>
                            <p>
                              <strong>Proje:</strong> {selectedProject?.name}
                            </p>
                            <p>
                              <strong>Oluşturan:</strong>{" "}
                              {selectedProject?.creatorName || "-"}
                            </p>
                            <p>
                              <strong>Oluşturma Tarihi:</strong>{" "}
                              {selectedProject
                                ? new Date(
                                    selectedProject.createdAt
                                  ).toLocaleString()
                                : "-"}
                            </p>

                            <h6 className="mt-4 mb-3">Proje Talepleri</h6>
                            <Table striped bordered hover>
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Başlık</th>
                                  <th>Miktar</th>
                                  <th>Aciliyet</th>
                                  <th>Durum</th>
                                  <th>İşlemler</th>
                                </tr>
                              </thead>
                              <tbody>
                                {projectRequests.map((request, index) => (
                                  <tr key={request.id}>
                                    <td>{index + 1}</td>
                                    <td>{request.title}</td>
                                    <td>
                                      {request.quantity}{" "}
                                      {getUnitName(request.unit)}
                                    </td>
                                    <td>{getUrgencyBadge(request.urgency)}</td>
                                    <td>{getStatusBadge(request.status)}</td>
                                    <td>
                                      {request.status === "PENDING" && (
                                        <Button
                                          variant="primary"
                                          size="sm"
                                          className="me-2"
                                          onClick={() =>
                                            handleOpenModal(request)
                                          }
                                        >
                                          Değerlendir
                                        </Button>
                                      )}

                                      {request.status === "APPROVED" && (
                                        <Button
                                          variant="success"
                                          size="sm"
                                          className="me-2"
                                          onClick={() =>
                                            handleOpenModal(request, "ORDERED")
                                          }
                                        >
                                          Sipariş Ver
                                        </Button>
                                      )}

                                      <Button
                                        variant="outline-info"
                                        size="sm"
                                        onClick={() =>
                                          handleShowFilesModal(request.id)
                                        }
                                      >
                                        <i className="bi bi-file-earmark"></i>{" "}
                                        Dosyalar
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>

                            {selectedProject &&
                              selectedProject.status === "IN_PROGRESS" && (
                                <div className="d-flex justify-content-end mt-3">
                                  <Button
                                    variant="success"
                                    onClick={() =>
                                      updateProjectStatus(
                                        selectedProject.id,
                                        "ORDERED"
                                      )
                                    }
                                  >
                                    Siparişi Verilen Olarak İşaretle
                                  </Button>
                                </div>
                              )}
                          </div>
                        ) : (
                          <div className="text-center p-4 border rounded bg-light">
                            <p className="mb-0">
                              Bu projeye ait talep bulunmamaktadır.
                            </p>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 border rounded bg-light">
                  <p className="mb-0">Bekleyen proje bulunmamaktadır.</p>
                </div>
              )}
            </Tab>

            {/* Siparişi Verilen Projeler Alt Sekmesi */}
            <Tab eventKey="ordered" title="Siparişi Verilen Projeler">
              {loadingProjects ? (
                <p>Yükleniyor...</p>
              ) : orderedProjects.length > 0 ? (
                <div className="row">
                  {orderedProjects.map((project) => (
                    <div key={project.id} className="col-md-4 mb-4">
                      <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                          <h5 className="mb-0">{project.name}</h5>
                          {getProjectStatusBadge(project.status)}
                        </Card.Header>
                        <Card.Body>
                          <p>
                            <strong>Oluşturan:</strong>{" "}
                            {project.creatorName || "-"}
                          </p>
                          <p>
                            <strong>Son Güncelleme:</strong>{" "}
                            {project.updatedAt
                              ? new Date(project.updatedAt).toLocaleString()
                              : "-"}
                          </p>

                          <div className="d-flex justify-content-between">
                            <Button
                              variant="primary"
                              onClick={() => handleOpenProjectModal(project)}
                            >
                              Proje Detayı
                            </Button>
                            <Button
                              variant="success"
                              onClick={() =>
                                updateProjectStatus(project.id, "IN_PRODUCTION")
                              }
                            >
                              Üretime Ver
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 border rounded bg-light">
                  <p className="mb-0">
                    Siparişi verilen proje bulunmamaktadır.
                  </p>
                </div>
              )}
            </Tab>

            {/* Üretime Verilen Projeler Alt Sekmesi */}
            <Tab eventKey="inProduction" title="Üretime Verilen Projeler">
              {loadingProjects ? (
                <p>Yükleniyor...</p>
              ) : inProductionProjects.length > 0 ? (
                <div className="row">
                  {inProductionProjects.map((project) => (
                    <div key={project.id} className="col-md-4 mb-4">
                      <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                          <h5 className="mb-0">{project.name}</h5>
                          {getProjectStatusBadge(project.status)}
                        </Card.Header>
                        <Card.Body>
                          <p>
                            <strong>Oluşturan:</strong>{" "}
                            {project.creatorName || "-"}
                          </p>
                          <p>
                            <strong>Son Güncelleme:</strong>{" "}
                            {project.updatedAt
                              ? new Date(project.updatedAt).toLocaleString()
                              : "-"}
                          </p>

                          <div className="d-flex justify-content-between">
                            <Button
                              variant="primary"
                              onClick={() => handleOpenProjectModal(project)}
                            >
                              Proje Detayı
                            </Button>
                            <Button
                              variant="success"
                              onClick={() =>
                                updateProjectStatus(project.id, "COMPLETED")
                              }
                            >
                              Tamamlandı
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 border rounded bg-light">
                  <p className="mb-0">Üretime verilen proje bulunmamaktadır.</p>
                </div>
              )}
            </Tab>

            {/* Tamamlanan Projeler Alt Sekmesi */}
            <Tab eventKey="completed" title="Tamamlanan Projeler">
              {loadingProjects ? (
                <p>Yükleniyor...</p>
              ) : completedProjects.length > 0 ? (
                <div className="row">
                  {completedProjects.map((project) => (
                    <div key={project.id} className="col-md-4 mb-4">
                      <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                          <h5 className="mb-0">{project.name}</h5>
                          {getProjectStatusBadge(project.status)}
                        </Card.Header>
                        <Card.Body>
                          <p>
                            <strong>Oluşturan:</strong>{" "}
                            {project.creatorName || "-"}
                          </p>
                          <p>
                            <strong>Tamamlanma Tarihi:</strong>{" "}
                            {project.updatedAt
                              ? new Date(project.updatedAt).toLocaleString()
                              : "-"}
                          </p>

                          <div className="d-flex justify-content-end">
                            <Button
                              variant="primary"
                              onClick={() => handleOpenProjectModal(project)}
                            >
                              Proje Detayı
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 border rounded bg-light">
                  <p className="mb-0">Tamamlanan proje bulunmamaktadır.</p>
                </div>
              )}
            </Tab>
          </Tabs>
        </Tab>
      </Tabs>

      {/* Talep Değerlendirme Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedRequest && selectedRequest.status === "APPROVED"
              ? "Sipariş Ver"
              : "Talep Değerlendirme"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <>
              <p>
                <strong>Talep Eden:</strong> {selectedRequest.requesterName}
              </p>
              <p>
                <strong>Başlık:</strong> {selectedRequest.title}
              </p>
              <p>
                <strong>Açıklama:</strong> {selectedRequest.description}
              </p>
              <p>
                <strong>Miktar:</strong> {selectedRequest.quantity}{" "}
                {getUnitName(selectedRequest.unit)}
              </p>
              <p>
                <strong>Aciliyet:</strong>{" "}
                {getUrgencyBadge(selectedRequest.urgency)}
              </p>
              {selectedRequest.projectName && (
                <p>
                  <strong>Proje:</strong> {selectedRequest.projectName}
                </p>
              )}

              <Form onSubmit={handleSubmit}>
                {selectedRequest.status !== "APPROVED" && (
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

                {(status === "ORDERED" ||
                  selectedRequest.status === "APPROVED") && (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>Tedarikçi İsmi</Form.Label>
                      <Form.Control
                        type="text"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Tahmini Termin Tarihi</Form.Label>
                      <Form.Control
                        type="date"
                        value={estimatedDeliveryDate}
                        onChange={(e) =>
                          setEstimatedDeliveryDate(e.target.value)
                        }
                        required
                        min={new Date().toISOString().split("T")[0]} // Bugünden sonraki tarihleri seç
                      />
                    </Form.Group>
                  </>
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
                  <Button
                    variant="secondary"
                    className="me-2"
                    onClick={handleCloseModal}
                  >
                    İptal
                  </Button>
                  <Button
                    variant={
                      selectedRequest.status === "APPROVED"
                        ? "success"
                        : "primary"
                    }
                    type="submit"
                  >
                    {selectedRequest.status === "APPROVED"
                      ? "Sipariş Ver"
                      : "Kaydet"}
                  </Button>
                </div>
              </Form>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Proje Detay Modal */}
      <Modal show={showProjectModal} onHide={handleCloseProjectModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedProject
              ? `Proje: ${selectedProject.name}`
              : "Proje Detayı"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProject && (
            <>
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5>Proje Bilgileri</h5>
                  {getProjectStatusBadge(selectedProject.status)}
                </div>

                <Table bordered>
                  <tbody>
                    <tr>
                      <th style={{ width: "200px" }}>Proje Adı</th>
                      <td>{selectedProject.name}</td>
                    </tr>
                    <tr>
                      <th>Oluşturan</th>
                      <td>{selectedProject.creatorName || "-"}</td>
                    </tr>
                    <tr>
                      <th>Oluşturma Tarihi</th>
                      <td>
                        {new Date(selectedProject.createdAt).toLocaleString()}
                      </td>
                    </tr>
                    {selectedProject.updatedAt && (
                      <tr>
                        <th>Son Güncelleme</th>
                        <td>
                          {new Date(selectedProject.updatedAt).toLocaleString()}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <th>Durum</th>
                      <td>{getProjectStatusBadge(selectedProject.status)}</td>
                    </tr>
                  </tbody>
                </Table>

                {/* Durum değiştirme butonları */}
                {selectedProject.status === "IN_PROGRESS" && (
                  <div className="d-flex justify-content-end">
                    <Button
                      variant="success"
                      onClick={() =>
                        updateProjectStatus(selectedProject.id, "ORDERED")
                      }
                      className="ms-2"
                    >
                      Siparişi Verilen Olarak İşaretle
                    </Button>
                  </div>
                )}

                {selectedProject.status === "ORDERED" && (
                  <div className="d-flex justify-content-end">
                    <Button
                      variant="success"
                      onClick={() =>
                        updateProjectStatus(selectedProject.id, "IN_PRODUCTION")
                      }
                      className="ms-2"
                    >
                      Üretime Ver
                    </Button>
                  </div>
                )}

                {selectedProject.status === "IN_PRODUCTION" && (
                  <div className="d-flex justify-content-end">
                    <Button
                      variant="success"
                      onClick={() =>
                        updateProjectStatus(selectedProject.id, "COMPLETED")
                      }
                      className="ms-2"
                    >
                      Tamamlandı Olarak İşaretle
                    </Button>
                  </div>
                )}
              </div>

              <h5 className="mt-4 mb-3">Proje Talepleri</h5>

              {loadingProjectRequests ? (
                <p>Talepler yükleniyor...</p>
              ) : projectRequests.length > 0 ? (
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Başlık</th>
                      <th>Miktar</th>
                      <th>Aciliyet</th>
                      <th>Durum</th>
                      <th>Oluşturma Tarihi</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectRequests.map((request, index) => (
                      <tr key={request.id}>
                        <td>{index + 1}</td>
                        <td>{request.title}</td>
                        <td>
                          {request.quantity} {getUnitName(request.unit)}
                        </td>
                        <td>{getUrgencyBadge(request.urgency)}</td>
                        <td>{getStatusBadge(request.status)}</td>
                        <td>{new Date(request.createdAt).toLocaleString()}</td>
                        <td>
                          {request.status === "PENDING" && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="me-2"
                              onClick={() => {
                                handleCloseProjectModal();
                                handleOpenModal(request);
                              }}
                            >
                              Değerlendir
                            </Button>
                          )}

                          {request.status === "APPROVED" && (
                            <Button
                              variant="success"
                              size="sm"
                              className="me-2"
                              onClick={() => {
                                handleCloseProjectModal();
                                handleOpenModal(request, "ORDERED");
                              }}
                            >
                              Sipariş Ver
                            </Button>
                          )}

                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => {
                              handleCloseProjectModal();
                              handleShowFilesModal(request.id);
                            }}
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
                  <p className="mb-0">Bu projeye ait talep bulunmamaktadır.</p>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseProjectModal}>
            Kapat
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
          <Modal.Title>Talep Dosyaları</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequestId && (
            <>
              <div>
                <FileViewer
                  requestId={selectedRequestId}
                  refreshTrigger={refreshFiles}
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

export default RequestApproval;
