import React, { useState, useEffect } from 'react';
import './farmerProfile.css';
import Sidebar from '../components/Sidebar.jsx';
import TranslatedText from '../components/TranslatedText';
import { apiFetch } from '../utils/api';

export default function FarmerProfile() {
  const [farmers, setFarmers] = useState([]);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    district: 'Ernakulam',
    state: 'Kerala',
    preferred_language: 'English',
    experience_years: ''
  });

  const KERALA_DISTRICTS = [
    'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
    'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad',
    'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
  ];

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/farmers/');
      const data = await response.json();
      setFarmers(data);
    } catch (error) {
      console.error('Error fetching farmers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmerDetails = async (farmerId) => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/farmers/${farmerId}/dashboard/`);
      const data = await response.json();
      setSelectedFarmer(data);
    } catch (error) {
      console.error('Error fetching farmer details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const method = editingFarmer ? 'PUT' : 'POST';
      const url = editingFarmer ? `/api/farmers/${editingFarmer.id}/` : '/api/farmers/';
      
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchFarmers();
        resetForm();
        setShowAddForm(false);
        setEditingFarmer(null);
      }
    } catch (error) {
      console.error('Error saving farmer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (farmer) => {
    setFormData({
      name: farmer.name,
      phone: farmer.phone,
      email: farmer.email || '',
      district: farmer.district,
      state: farmer.state,
      preferred_language: farmer.preferred_language,
      experience_years: farmer.experience_years
    });
    setEditingFarmer(farmer);
    setShowAddForm(true);
  };

  const handleDelete = async (farmerId) => {
    if (window.confirm('Are you sure you want to delete this farmer? This will also delete all associated farms and activities.')) {
      try {
        await apiFetch(`/api/farmers/${farmerId}/`, { method: 'DELETE' });
        fetchFarmers();
        if (selectedFarmer && selectedFarmer.farmer.id === farmerId) {
          setSelectedFarmer(null);
        }
      } catch (error) {
        console.error('Error deleting farmer:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      district: 'Ernakulam',
      state: 'Kerala',
      preferred_language: 'English',
      experience_years: ''
    });
  };

  return (
    <div className="dash-layout">
      <Sidebar />
      <main className="dashboard-main page-scroll dash-container">
        <div className="dashboard-content-wrapper">
        <div className="dash-card">
          <header className="farmer-profile-header">
            <h1 className="farmer-profile-title">Farmer Profiles</h1>
            <p className="farmer-profile-subtitle">Manage farmer information and view their dashboard</p>
            <button 
              className="btn-add-farmer"
              onClick={() => {
                resetForm();
                setEditingFarmer(null);
                setShowAddForm(true);
              }}
            >
              + Add New Farmer
            </button>
          </header>

          <div className="farmer-profile-content">
            {/* Farmers List */}
            <div className="farmers-sidebar">
              <h3>Farmers ({farmers.length})</h3>
              <div className="farmers-list">
                {loading && farmers.length === 0 ? (
                  <div className="loading-small">Loading...</div>
                ) : farmers.length === 0 ? (
                  <div className="no-farmers-small">
                    <p>No farmers registered yet.</p>
                  </div>
                ) : (
                  farmers.map(farmer => (
                    <div 
                      key={farmer.id} 
                      className={`farmer-item ${selectedFarmer?.farmer.id === farmer.id ? 'active' : ''}`}
                      onClick={() => fetchFarmerDetails(farmer.id)}
                    >
                      <div className="farmer-item-info">
                        <h4>{farmer.name}</h4>
                        <p>{farmer.district}</p>
                        <span className="farms-count">{farmer.farms_count} farms</span>
                      </div>
                      <div className="farmer-item-actions">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(farmer); }}>
                          ✏️
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(farmer.id); }}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Farmer Details */}
            <div className="farmer-details">
              {selectedFarmer ? (
                <FarmerDashboard farmer={selectedFarmer} />
              ) : (
                <div className="no-selection">
                  <h3>Select a farmer to view their profile</h3>
                  <p>Click on a farmer from the list to see their detailed information, farms, activities, and reminders.</p>
                </div>
              )}
            </div>
          </div>

          {/* Add/Edit Farmer Form */}
          {showAddForm && (
            <div className="farmer-form-overlay">
              <div className="farmer-form-modal">
                <h3>{editingFarmer ? 'Edit Farmer' : 'Add New Farmer'}</h3>
                <form onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Email (Optional)</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>

                    <div className="form-group">
                      <label>District</label>
                      <select
                        value={formData.district}
                        onChange={(e) => setFormData({...formData, district: e.target.value})}
                      >
                        {KERALA_DISTRICTS.map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Preferred Language</label>
                      <select
                        value={formData.preferred_language}
                        onChange={(e) => setFormData({...formData, preferred_language: e.target.value})}
                      >
                        <option value="English">English</option>
                        <option value="Malayalam">Malayalam</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Experience (Years)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.experience_years}
                        onChange={(e) => setFormData({...formData, experience_years: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : (editingFarmer ? 'Update Farmer' : 'Add Farmer')}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingFarmer(null);
                        resetForm();
                      }}
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

function FarmerDashboard({ farmer }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="farmer-dashboard">
      <div className="farmer-info-card">
        <h2>{farmer.farmer.name}</h2>
        <div className="farmer-basic-info">
          <p><strong>Phone:</strong> {farmer.farmer.phone}</p>
          <p><strong>District:</strong> {farmer.farmer.district}</p>
          <p><strong>Language:</strong> {farmer.farmer.preferred_language}</p>
          <p><strong>Experience:</strong> {farmer.farmer.experience_years} years</p>
          <p><strong>Joined:</strong> {formatDate(farmer.farmer.created_at)}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{farmer.stats.total_farms}</h3>
          <p>Total Farms</p>
        </div>
        <div className="stat-card">
          <h3>{farmer.stats.total_acres}</h3>
          <p>Total Acres</p>
        </div>
        <div className="stat-card">
          <h3>{farmer.stats.activities_this_month}</h3>
          <p>Activities This Month</p>
        </div>
      </div>

      <div className="dashboard-sections">
        <section className="farms-section">
          <h3>Farms ({farmer.farms.length})</h3>
          <div className="farms-grid">
            {farmer.farms.map(farm => (
              <div key={farm.id} className="farm-summary-card">
                <h4>{farm.name}</h4>
                <p><strong>Size:</strong> {farm.land_size_acres} acres</p>
                <p><strong>Crops:</strong> {farm.primary_crops}</p>
                <p><strong>Soil:</strong> {farm.soil_type}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="activities-section">
          <h3>Recent Activities ({farmer.recent_activities.length})</h3>
          <div className="activities-list">
            {farmer.recent_activities.slice(0, 5).map(activity => (
              <div key={activity.id} className="activity-summary">
                <div className="activity-type">{activity.activity_type}</div>
                <div className="activity-note">{activity.text_note}</div>
                <div className="activity-date">{formatDate(activity.date)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="reminders-section">
          <h3>Upcoming Reminders ({farmer.upcoming_reminders.length})</h3>
          <div className="reminders-list">
            {farmer.upcoming_reminders.map(reminder => (
              <div key={reminder.id} className="reminder-summary">
                <div className="reminder-title">{reminder.title}</div>
                <div className="reminder-due">{formatDate(reminder.due_date)}</div>
                <div className="reminder-category">{reminder.category}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
