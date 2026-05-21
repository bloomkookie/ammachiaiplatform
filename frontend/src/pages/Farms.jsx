import React, { useState, useEffect } from 'react';
import './farms.css';
import Sidebar from '../components/Sidebar.jsx';
import TranslatedText from '../components/TranslatedText';
import { apiFetch } from '../utils/api';

export default function Farms() {
  const [farms, setFarms] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFarm, setEditingFarm] = useState(null);
  const [formData, setFormData] = useState({
    farmer: '',
    name: '',
    latitude: '',
    longitude: '',
    district: 'Ernakulam',
    land_size_acres: '',
    soil_type: 'loamy',
    irrigation_type: 'rain_fed',
    primary_crops: ''
  });

  const KERALA_DISTRICTS = [
    'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
    'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad',
    'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
  ];

  const SOIL_TYPES = [
    { value: 'clay', label: 'Clay' },
    { value: 'sandy', label: 'Sandy' },
    { value: 'loamy', label: 'Loamy' },
    { value: 'black', label: 'Black Soil' },
    { value: 'red', label: 'Red Soil' },
    { value: 'alluvial', label: 'Alluvial' },
    { value: 'laterite', label: 'Laterite' }
  ];

  const IRRIGATION_TYPES = [
    { value: 'rain_fed', label: 'Rain Fed' },
    { value: 'drip', label: 'Drip Irrigation' },
    { value: 'sprinkler', label: 'Sprinkler' },
    { value: 'flood', label: 'Flood Irrigation' },
    { value: 'canal', label: 'Canal' },
    { value: 'bore_well', label: 'Bore Well' },
    { value: 'open_well', label: 'Open Well' }
  ];

  useEffect(() => {
    fetchFarms();
    fetchFarmers();
  }, []);

  const fetchFarms = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/farms/');
      const data = await response.json();
      setFarms(data);
    } catch (error) {
      console.error('Error fetching farms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmers = async () => {
    try {
      const response = await apiFetch('/api/farmers/summary/');
      const data = await response.json();
      setFarmers(data);
    } catch (error) {
      console.error('Error fetching farmers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const method = editingFarm ? 'PUT' : 'POST';
      const url = editingFarm ? `/api/farms/${editingFarm.id}/` : '/api/farms/';
      
      console.log('Submitting farm data:', formData);
      console.log('URL:', url, 'Method:', method);
      
      // Prepare form data with proper data types
      const formDataToSend = {
        ...formData,
        farmer: parseInt(formData.farmer), // Convert to integer
        land_size_acres: parseFloat(formData.land_size_acres), // Convert to float
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null
      };

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formDataToSend)
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Farm saved successfully:', result);
        alert('Farm added successfully!');
        fetchFarms();
        resetForm();
        setShowAddForm(false);
        setEditingFarm(null);
      } else {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        alert(`Error: ${errorData.message || 'Failed to save farm'}`);
      }
    } catch (error) {
      console.error('Error saving farm:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (farm) => {
    setFormData({
      farmer: farm.farmer,
      name: farm.name,
      latitude: farm.latitude || '',
      longitude: farm.longitude || '',
      district: farm.district,
      land_size_acres: farm.land_size_acres,
      soil_type: farm.soil_type,
      irrigation_type: farm.irrigation_type,
      primary_crops: farm.primary_crops
    });
    setEditingFarm(farm);
    setShowAddForm(true);
  };

  const handleDelete = async (farmId) => {
    if (window.confirm('Are you sure you want to delete this farm?')) {
      try {
        await apiFetch(`/api/farms/${farmId}/`, { method: 'DELETE' });
        fetchFarms();
      } catch (error) {
        console.error('Error deleting farm:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      farmer: '',
      name: '',
      latitude: '',
      longitude: '',
      district: 'Ernakulam',
      land_size_acres: '',
      soil_type: 'loamy',
      irrigation_type: 'rain_fed',
      primary_crops: ''
    });
  };

  return (
    <div className="dash-layout">
      <Sidebar />
      <main className="dashboard-main page-scroll dash-container">
        <div className="dashboard-content-wrapper">
        <div className="dash-card">
          <header className="farms-header">
            <h1 className="farms-title">Farm Management</h1>
            <p className="farms-subtitle">Manage your farms and their details</p>
            <button 
              className="btn-add-farm"
              onClick={() => {
                resetForm();
                setEditingFarm(null);
                setShowAddForm(true);
              }}
            >
              + Add New Farm
            </button>
          </header>

          {showAddForm && (
            <div className="farm-form-overlay">
              <div className="farm-form-modal">
                <h3>{editingFarm ? 'Edit Farm' : 'Add New Farm'}</h3>
                <form onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Farmer</label>
                      <select
                        value={formData.farmer}
                        onChange={(e) => setFormData({...formData, farmer: e.target.value})}
                        required
                      >
                        <option value="">Select Farmer</option>
                        {farmers.map(farmer => (
                          <option key={farmer.id} value={farmer.id}>
                            {farmer.name} ({farmer.district})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Farm Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
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
                      <label>Land Size (Acres)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.land_size_acres}
                        onChange={(e) => setFormData({...formData, land_size_acres: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Soil Type</label>
                      <select
                        value={formData.soil_type}
                        onChange={(e) => setFormData({...formData, soil_type: e.target.value})}
                      >
                        {SOIL_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Irrigation Type</label>
                      <select
                        value={formData.irrigation_type}
                        onChange={(e) => setFormData({...formData, irrigation_type: e.target.value})}
                      >
                        {IRRIGATION_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group full-width">
                      <label>Primary Crops (comma-separated)</label>
                      <input
                        type="text"
                        value={formData.primary_crops}
                        onChange={(e) => setFormData({...formData, primary_crops: e.target.value})}
                        placeholder="e.g., Rice, Coconut, Pepper"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Latitude (optional)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.latitude}
                        onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                      />
                    </div>

                    <div className="form-group">
                      <label>Longitude (optional)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.longitude}
                        onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : (editingFarm ? 'Update Farm' : 'Add Farm')}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingFarm(null);
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

          <div className="farms-grid">
            {loading && farms.length === 0 ? (
              <div className="loading">Loading farms...</div>
            ) : farms.length === 0 ? (
              <div className="no-farms">
                <p>No farms added yet. Click "Add New Farm" to get started.</p>
              </div>
            ) : (
              farms.map(farm => (
                <div key={farm.id} className="farm-card">
                  <div className="farm-header">
                    <h3>{farm.name}</h3>
                    <div className="farm-actions">
                      <button onClick={() => handleEdit(farm)}>Edit</button>
                      <button onClick={() => handleDelete(farm.id)} className="delete">Delete</button>
                    </div>
                  </div>
                  
                  <div className="farm-details">
                    <p><strong>Farmer:</strong> {farm.farmer_name}</p>
                    <p><strong>District:</strong> {farm.district}</p>
                    <p><strong>Size:</strong> {farm.land_size_acres} acres</p>
                    <p><strong>Soil:</strong> {SOIL_TYPES.find(s => s.value === farm.soil_type)?.label}</p>
                    <p><strong>Irrigation:</strong> {IRRIGATION_TYPES.find(i => i.value === farm.irrigation_type)?.label}</p>
                    <p><strong>Crops:</strong> {farm.primary_crops}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
