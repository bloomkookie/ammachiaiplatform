import React, { useState, useEffect } from 'react';
import './activities.css';
import Sidebar from '../components/Sidebar.jsx';
import TranslatedText from '../components/TranslatedText';
import { apiFetch } from '../utils/api';

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState('');
  const [formData, setFormData] = useState({
    farmer: '',
    farm: '',
    text_note: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    farmer_id: '',
    farm_id: '',
    type: '',
    date_from: '',
    date_to: ''
  });

  const ACTIVITY_TYPES = [
    { value: 'sowing', label: 'Sowing', icon: '🌱' },
    { value: 'irrigation', label: 'Irrigation', icon: '💧' },
    { value: 'fertilizer', label: 'Fertilizer Application', icon: '🌿' },
    { value: 'pesticide', label: 'Pesticide Application', icon: '🚿' },
    { value: 'weeding', label: 'Weeding', icon: '🌾' },
    { value: 'harvesting', label: 'Harvesting', icon: '🌾' },
    { value: 'pest_issue', label: 'Pest Issue', icon: '🐛' },
    { value: 'disease_issue', label: 'Disease Issue', icon: '🦠' },
    { value: 'other', label: 'Other', icon: '📝' }
  ];

  useEffect(() => {
    fetchActivities();
    fetchFarmers();
  }, [filters]);

  useEffect(() => {
    if (selectedFarmer) {
      fetchFarmsForFarmer(selectedFarmer);
    }
  }, [selectedFarmer]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await apiFetch(`/api/activities/?${params}`);
      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
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

  const fetchFarmsForFarmer = async (farmerId) => {
    try {
      const response = await apiFetch(`/api/farms/?farmer_id=${farmerId}`);
      const data = await response.json();
      setFarms(data);
    } catch (error) {
      console.error('Error fetching farms:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // First, add the activity
      const response = await apiFetch('/api/activities/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          farmer: session.userId
        })
      });

      if (response.ok) {
        setSuccess('Activity added successfully!');
        
        // Get AI suggestions for this activity using Gemini
        try {
          const suggestionPrompt = `A farmer in Kerala just recorded: "${formData.activity_type}" - "${formData.description}". Provide 2-3 brief follow-up suggestions or tips related to this activity. Keep it under 100 words and practical.`;
          
          const aiResponse = await apiFetch('/api/chatbot/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: suggestionPrompt,
              language: 'english',
              farmer_id: session.userId
            })
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            setSuccess(`Activity added! 💡 AI Tip: ${aiData.reply}`);
          }
        } catch (aiError) {
          console.log('AI suggestions not available');
        }

        setFormData({
          activity_type: 'irrigation',
          description: '',
          date: new Date().toISOString().split('T')[0],
          farm: '',
          text_note: ''
        });
        fetchActivities(); // Refresh the list
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add activity');
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      setError('Failed to add activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch('/api/activities/quick_add/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchActivities();
        setFormData({
          farmer: '',
          farm: '',
          text_note: '',
          date: new Date().toISOString().split('T')[0]
        });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    const activity = ACTIVITY_TYPES.find(a => a.value === type);
    return activity ? activity.icon : '📝';
  };

  const getActivityLabel = (type) => {
    const activity = ACTIVITY_TYPES.find(a => a.value === type);
    return activity ? activity.label : type;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="dash-layout">
      <Sidebar />
      <main className="dashboard-main page-scroll dash-container">
        <div className="dashboard-content-wrapper">
        <div className="dash-card">
          <header className="activities-header">
            <div>
              <h1 className="activities-title">Activity Tracking</h1>
              <p className="activities-subtitle">Log and track your farming activities</p>
            </div>
            <button 
              className="btn-add-activity"
              onClick={() => setShowAddForm(true)}
            >
              + Log Activity
            </button>
          </header>

          {/* Filters */}
          <div className="filters-section">
            <div className="filters-grid">
              <select
                value={filters.farmer_id}
                onChange={(e) => setFilters({...filters, farmer_id: e.target.value})}
              >
                <option value="">All Farmers</option>
                {farmers.map(farmer => (
                  <option key={farmer.id} value={farmer.id}>
                    {farmer.name}
                  </option>
                ))}
              </select>

              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
              >
                <option value="">All Activities</option>
                {ACTIVITY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({...filters, date_from: e.target.value})}
                placeholder="From Date"
              />

              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({...filters, date_to: e.target.value})}
                placeholder="To Date"
              />
            </div>
          </div>

          {/* Quick Add Form */}
          {showAddForm && (
            <div className="activity-form-overlay">
              <div className="activity-form-modal">
                <h3>Log New Activity</h3>
                <form onSubmit={handleQuickAdd}>
                  <div className="form-group">
                    <label>Farmer</label>
                    <select
                      value={formData.farmer}
                      onChange={(e) => {
                        setFormData({...formData, farmer: e.target.value, farm: ''});
                        setSelectedFarmer(e.target.value);
                      }}
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
                    <label>Farm (Optional)</label>
                    <select
                      value={formData.farm}
                      onChange={(e) => setFormData({...formData, farm: e.target.value})}
                    >
                      <option value="">Select Farm</option>
                      {farms.map(farm => (
                        <option key={farm.id} value={farm.id}>
                          {farm.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Activity Description</label>
                    <textarea
                      value={formData.text_note}
                      onChange={(e) => setFormData({...formData, text_note: e.target.value})}
                      placeholder="Describe what you did... e.g., 'Irrigated 2 acres of rice field' or 'Applied fertilizer to coconut trees'"
                      rows={4}
                      required
                    />
                    <small className="help-text">
                      💡 Tip: Use natural language! The system will automatically categorize your activity.
                    </small>
                  </div>

                  <div className="form-actions">
                    <button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : 'Log Activity'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Activities Timeline */}
          <div className="activities-timeline">
            {loading && activities.length === 0 ? (
              <div className="loading">Loading activities...</div>
            ) : activities.length === 0 ? (
              <div className="no-activities">
                <p>No activities logged yet. Start by clicking "Log Activity" above.</p>
              </div>
            ) : (
              activities.map(activity => (
                <div key={activity.id} className="activity-card">
                  <div className="activity-icon">
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  
                  <div className="activity-content">
                    <div className="activity-header">
                      <h4>{getActivityLabel(activity.activity_type)}</h4>
                      <span className="activity-date">{formatDate(activity.date)}</span>
                    </div>
                    
                    <p className="activity-description">{activity.text_note}</p>
                    
                    <div className="activity-meta">
                      <span className="farmer-name">👨‍🌾 {activity.farmer_name}</span>
                      {activity.farm_name && (
                        <span className="farm-name">🏡 {activity.farm_name}</span>
                      )}
                      {activity.amount && (
                        <span className="activity-amount">📏 {activity.amount} units</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Activity Summary */}
          <div className="activity-summary">
            <h3>Activity Summary</h3>
            <div className="summary-grid">
              {ACTIVITY_TYPES.map(type => {
                const count = activities.filter(a => a.activity_type === type.value).length;
                return count > 0 ? (
                  <div key={type.value} className="summary-item">
                    <span className="summary-icon">{type.icon}</span>
                    <span className="summary-label">{type.label}</span>
                    <span className="summary-count">{count}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
