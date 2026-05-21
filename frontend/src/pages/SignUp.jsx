import React, { useState } from 'react';
import './authModern.css';
import { apiFetch } from '../utils/api';

const logoUrl = 'https://cdn.builder.io/api/v1/image/assets%2Fc21b63e7074b4525a6e3164505c4a230%2Fac56160c2de4493283652bdd34caa4b0?format=webp&width=300';

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    district: 'Ernakulam',
    experience_years: 0,
    preferred_language: 'English'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const KERALA_DISTRICTS = [
    'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
    'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad',
    'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if farmer already exists
      const checkResponse = await apiFetch('/api/farmers/');
      const existingFarmers = await checkResponse.json();
      
      const existingFarmer = existingFarmers.find(f => f.phone === formData.phone);
      if (existingFarmer) {
        setError('A farmer with this phone number already exists. Please use the login page.');
        setLoading(false);
        return;
      }

      console.log('Creating farmer with data:', formData);
      
      // Create new farmer
      const response = await apiFetch('/api/farmers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      console.log('Signup response status:', response.status);

      if (response.ok) {
        const farmer = await response.json();
        console.log('Farmer created:', farmer);
        
        setSuccess('Account created successfully! Redirecting to dashboard...');
        
        // Store session
        const sessionData = {
          userId: farmer.id,
          name: farmer.name,
          phone: farmer.phone,
          district: farmer.district
        };
        
        localStorage.setItem('ammachi_session', JSON.stringify(sessionData));
        localStorage.setItem('ammachi_profile', JSON.stringify(farmer));
        
        console.log('Session stored for new farmer');
        
        // Show success alert
        alert(`Welcome to Krishi Sakhi, ${farmer.name}! Your account has been created successfully.`);
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.hash = '#/dashboard';
        }, 1000);
      } else {
        const errorData = await response.json();
        console.error('Signup error response:', errorData);
        setError(errorData.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Side - Branding */}
      <div className="auth-branding">
        <div className="auth-logo">🌾</div>
        <h1 className="auth-brand-title">Join Krishi Sakhi</h1>
        <p className="auth-brand-subtitle">Empowering Kerala Farmers with AI Technology</p>
        
        <div className="auth-features">
          <div className="auth-feature">
            <div className="auth-feature-icon">🚜</div>
            <div className="auth-feature-text">Smart Farm Management</div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">📱</div>
            <div className="auth-feature-text">Activity Tracking</div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">⚡</div>
            <div className="auth-feature-text">Instant Alerts</div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">🎯</div>
            <div className="auth-feature-text">Personalized Advice</div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="auth-form-section">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Create Account</h1>
            <p>Start your smart farming journey today</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Email (Optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Enter your email address"
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
                <label>Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({...formData, experience_years: parseInt(e.target.value) || 0})}
                  placeholder="Years of farming experience"
                />
              </div>

              <div className="form-group full-width">
                <label>Preferred Language</label>
                <select
                  value={formData.preferred_language}
                  onChange={(e) => setFormData({...formData, preferred_language: e.target.value})}
                >
                  <option value="English">English</option>
                  <option value="Malayalam">Malayalam</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                {success}
              </div>
            )}

            <button type="submit" disabled={loading} className="auth-button">
              {loading && <span className="loading-spinner"></span>}
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <a href="#/login">Sign in here</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
