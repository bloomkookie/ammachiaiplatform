import React, { useState, useEffect } from 'react';
import './officers.css';
import Sidebar from '../components/Sidebar.jsx';
import TranslatedText from '../components/TranslatedText';
import { apiFetch } from '../utils/api';

export default function Officers() {
  const [officers, setOfficers] = useState([]);
  const [filteredOfficers, setFilteredOfficers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [filters, setFilters] = useState({
    district: '',
    specialization: ''
  });
  const [consultationData, setConsultationData] = useState({
    subject: '',
    description: '',
    preferred_date: '',
    consultation_type: 'phone',
    farmer_phone: '',
    farmer_location: ''
  });

  const session = (() => {
    try { return JSON.parse(localStorage.getItem('ammachi_session') || '{}'); } catch { return {}; }
  })();

  const KERALA_DISTRICTS = [
    'All Districts', 'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
    'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad',
    'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
  ];

  const SPECIALIZATIONS = [
    'All Specializations', 'Coconut Cultivation', 'Organic Farming', 'Spice Cultivation',
    'Disease Management', 'Rice Cultivation', 'Fruit Cultivation', 'Pest Management',
    'Soil Health Management', 'Water Management', 'Post-Harvest Technology'
  ];

  useEffect(() => {
    fetchOfficers();
  }, []);

  useEffect(() => {
    filterOfficers();
  }, [officers, filters]);

  const fetchOfficers = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/officers/');
      const data = await response.json();
      setOfficers(data);
    } catch (error) {
      console.error('Error fetching officers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOfficers = () => {
    let filtered = officers;

    if (filters.district && filters.district !== 'All Districts') {
      filtered = filtered.filter(officer => 
        officer.district.toLowerCase().includes(filters.district.toLowerCase())
      );
    }

    if (filters.specialization && filters.specialization !== 'All Specializations') {
      filtered = filtered.filter(officer => 
        officer.specialization.toLowerCase().includes(filters.specialization.toLowerCase())
      );
    }

    setFilteredOfficers(filtered);
  };

  const handleConsultationRequest = (officer) => {
    setSelectedOfficer(officer);
    setConsultationData({
      ...consultationData,
      farmer_phone: session.phone || '',
      farmer_location: session.district || ''
    });
    setShowConsultationForm(true);
  };

  const submitConsultation = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch('/api/consultations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer: session.userId,
          officer: selectedOfficer.id,
          ...consultationData,
          preferred_date: new Date(consultationData.preferred_date).toISOString()
        })
      });

      if (response.ok) {
        // Show detailed success alert with booking information
        const bookingDate = new Date(consultationData.preferred_date).toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        alert(`🎉 Consultation Booked Successfully!

📅 Date: ${bookingDate}
👨‍🌾 Officer: ${selectedOfficer.name}
📞 Type: ${consultationData.consultation_type.charAt(0).toUpperCase() + consultationData.consultation_type.slice(1)} Call
📋 Subject: ${consultationData.subject}

The agricultural officer will contact you at ${consultationData.farmer_phone} before the scheduled time. You will also receive a reminder 1 hour before the consultation.

Thank you for using Krishi Sakhi! 🌾`);
        
        setShowConsultationForm(false);
        setConsultationData({
          subject: '',
          description: '',
          preferred_date: '',
          consultation_type: 'phone',
          farmer_phone: session.phone || '',
          farmer_location: session.district || ''
        });
      } else {
        alert('❌ Failed to send consultation request. Please check your internet connection and try again.');
      }
    } catch (error) {
      console.error('Error submitting consultation:', error);
      alert('Failed to send consultation request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="star full">⭐</span>);
    }
    if (hasHalfStar) {
      stars.push(<span key="half" className="star half">⭐</span>);
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push(<span key={i} className="star empty">☆</span>);
    }
    return stars;
  };

  const getSpecializationIcon = (specialization) => {
    if (specialization.includes('Coconut')) return '🥥';
    if (specialization.includes('Rice')) return '🌾';
    if (specialization.includes('Spice') || specialization.includes('Pepper')) return '🌶️';
    if (specialization.includes('Disease') || specialization.includes('Pest')) return '🔬';
    if (specialization.includes('Organic')) return '🌱';
    if (specialization.includes('Fruit')) return '🍎';
    if (specialization.includes('Soil')) return '🌍';
    if (specialization.includes('Water')) return '💧';
    return '👨‍🌾';
  };

  return (
    <div className="dash-layout">
      <Sidebar />
      <main className="dashboard-main page-scroll dash-container">
        <div className="dashboard-content-wrapper">
        <div className="dash-card">
          <header className="officers-header">
            <div>
              <h1 className="officers-title">Agricultural Officers</h1>
              <p className="officers-subtitle">Connect with expert agricultural officers in your area</p>
            </div>
            <div className="officers-stats">
              <div className="stat-item">
                <span className="stat-number">{officers.length}</span>
                <span className="stat-label">Available Officers</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">Free</span>
                <span className="stat-label">Consultation</span>
              </div>
            </div>
          </header>

          {/* Filters */}
          <div className="filters-section">
            <div className="filters-grid">
              <div className="filter-group">
                <label>District</label>
                <select
                  value={filters.district}
                  onChange={(e) => setFilters({...filters, district: e.target.value})}
                >
                  {KERALA_DISTRICTS.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Specialization</label>
                <select
                  value={filters.specialization}
                  onChange={(e) => setFilters({...filters, specialization: e.target.value})}
                >
                  {SPECIALIZATIONS.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              <div className="filter-actions">
                <button 
                  className="btn-clear-filters"
                  onClick={() => setFilters({ district: '', specialization: '' })}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Officers Grid */}
          <div className="officers-grid">
            {loading && officers.length === 0 ? (
              <div className="loading">Loading officers...</div>
            ) : filteredOfficers.length === 0 ? (
              <div className="no-officers">
                <h3>No officers found</h3>
                <p>Try adjusting your filters or check back later.</p>
              </div>
            ) : (
              filteredOfficers.map(officer => (
                <div key={officer.id} className="officer-card">
                  <div className="officer-header">
                    <div className="officer-avatar">
                      {getSpecializationIcon(officer.specialization)}
                    </div>
                    <div className="officer-info">
                      <h3>{officer.name}</h3>
                      <p className="designation">{officer.designation}</p>
                      <div className="rating">
                        {getRatingStars(officer.rating)}
                        <span className="rating-text">({officer.rating})</span>
                      </div>
                    </div>
                    <div className="officer-status">
                      <span className={`status-badge ${officer.is_available ? 'available' : 'busy'}`}>
                        {officer.is_available ? 'Available' : 'Busy'}
                      </span>
                    </div>
                  </div>

                  <div className="officer-details">
                    <div className="detail-item">
                      <span className="detail-icon">📍</span>
                      <span>{officer.district}, {officer.state}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon">🎓</span>
                      <span>{officer.specialization}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon">⏰</span>
                      <span>{officer.available_hours}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon">💼</span>
                      <span>{officer.experience_years} years experience</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon">🗣️</span>
                      <span>{officer.languages}</span>
                    </div>
                  </div>

                  <div className="officer-contact">
                    <div className="contact-info">
                      <p><strong>Office:</strong> {officer.office_address}</p>
                      <p><strong>Phone:</strong> {officer.phone}</p>
                      <p><strong>Email:</strong> {officer.email}</p>
                    </div>
                    
                    <div className="officer-actions">
                      <button 
                        className="btn-consult"
                        onClick={() => handleConsultationRequest(officer)}
                        disabled={!officer.is_available}
                      >
                        📞 Request Consultation
                      </button>
                      <a 
                        href={`tel:${officer.phone}`}
                        className="btn-call"
                      >
                        📱 Call Now
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Consultation Form Modal */}
          {showConsultationForm && (
            <div className="consultation-modal-overlay">
              <div className="consultation-modal">
                <div className="modal-header">
                  <h3>Request Consultation</h3>
                  <button 
                    className="modal-close"
                    onClick={() => setShowConsultationForm(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="officer-summary">
                  <div className="officer-avatar-small">
                    {getSpecializationIcon(selectedOfficer?.specialization)}
                  </div>
                  <div>
                    <h4>{selectedOfficer?.name}</h4>
                    <p>{selectedOfficer?.designation}</p>
                    <p>{selectedOfficer?.district}</p>
                  </div>
                </div>

                <form onSubmit={submitConsultation} className="consultation-form">
                  <div className="form-group">
                    <label>Subject</label>
                    <input
                      type="text"
                      value={consultationData.subject}
                      onChange={(e) => setConsultationData({...consultationData, subject: e.target.value})}
                      placeholder="e.g., Coconut tree disease, Pest control advice"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={consultationData.description}
                      onChange={(e) => setConsultationData({...consultationData, description: e.target.value})}
                      placeholder="Describe your farming issue or question in detail..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Preferred Date & Time</label>
                      <input
                        type="datetime-local"
                        value={consultationData.preferred_date}
                        onChange={(e) => setConsultationData({...consultationData, preferred_date: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Consultation Type</label>
                      <select
                        value={consultationData.consultation_type}
                        onChange={(e) => setConsultationData({...consultationData, consultation_type: e.target.value})}
                      >
                        <option value="phone">📞 Phone Call</option>
                        <option value="video">📹 Video Call</option>
                        <option value="visit">🚜 Farm Visit</option>
                        <option value="office">🏢 Office Visit</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Your Phone</label>
                      <input
                        type="tel"
                        value={consultationData.farmer_phone}
                        onChange={(e) => setConsultationData({...consultationData, farmer_phone: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Your Location</label>
                      <input
                        type="text"
                        value={consultationData.farmer_location}
                        onChange={(e) => setConsultationData({...consultationData, farmer_location: e.target.value})}
                        placeholder="Village, District"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" disabled={loading} className="btn-submit">
                      {loading ? 'Sending...' : 'Send Request'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowConsultationForm(false)}
                      className="btn-cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
