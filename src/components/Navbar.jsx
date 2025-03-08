import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import logo from '../assets/logo.jpg'

const NavbarComponent = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavLinkClass = (path) => {
    return window.location.pathname === path ? "nav-link active" : "nav-link";
  };

  // Turuncu renk stili (text-orange)
  const orangeTextStyle = {
    color: "#FF8C00" // Dark Orange renk kodu
  };

  // Lacivert arka plan stili

  return (
    <Navbar variant="dark" expand="lg" className="mb-4">
      <Container>
      <img src={logo} alt="atslogo" width="200" height="50" />

        <Navbar.Brand style={orangeTextStyle}>Talep Yönetim Sistemi</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {currentUser && currentUser.role === 'ROLE_REQUESTER' && (
              <Nav.Link 
                as={Link} 
                to="/requests" 
                className={getNavLinkClass("/requests")}
                style={orangeTextStyle}
              >
                Talep Oluştur
              </Nav.Link>
            )}
            {currentUser && currentUser.role === 'ROLE_APPROVER' && (
              <Nav.Link 
                as={Link} 
                to="/approvals" 
                className={getNavLinkClass("/approvals")}
                style={orangeTextStyle}
              >
                Talep Değerlendir
              </Nav.Link>
            )}
            {currentUser && currentUser.role === 'ROLE_RECEIVER' && (
              <Nav.Link 
                as={Link} 
                to="/deliveries" 
                className={getNavLinkClass("/deliveries")}
                style={orangeTextStyle}
              >
                Talep Teslim Al
              </Nav.Link>
            )}
          </Nav>
          <Nav>
            {currentUser ? (
              <>
                <Navbar.Text style={orangeTextStyle} className="me-3">
                  Merhaba, <span className="fw-bold">{currentUser.firstName} {currentUser.lastName}</span>
                </Navbar.Text>
                <Button variant="outline-warning" size="sm" onClick={handleLogout}>Çıkış</Button>
              </>
            ) : (
              <Nav.Link as={Link} to="/login" style={orangeTextStyle}>Giriş</Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavbarComponent;