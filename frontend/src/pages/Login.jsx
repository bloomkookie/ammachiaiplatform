import React, { useState } from 'react';
import './authModern.css';
import { apiFetch } from '../utils/api';

const logoUrl = 'https://cdn.builder.io/api/v1/image/assets%2Fc21b63e7074b4525a6e3164505c4a230%2Fac56160c2de4493283652bdd34caa4b0?format=webp&width=300';

export default function Login() {
  const [formData, setFormData] = useState({
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting login with phone:', formData.phone);
      
      // Simple authentication - find farmer by phone
      const response = await apiFetch('/api/farmers/');
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const farmers = await response.json();
      console.log('Farmers received:', farmers.length);
      
      const farmer = farmers.find(f => f.phone === formData.phone);
      console.log('Farmer found:', farmer ? 'Yes' : 'No');
      
      if (farmer) {
        // Store session
        const sessionData = {
          userId: farmer.id,
          name: farmer.name,
          phone: farmer.phone,
          district: farmer.district
        };
        
        localStorage.setItem('ammachi_session', JSON.stringify(sessionData));
        localStorage.setItem('ammachi_profile', JSON.stringify(farmer));
        
        console.log('Session stored, redirecting to dashboard');
        
        // Show success message briefly before redirect
        setError('');
        alert(`Welcome back, ${farmer.name}! Redirecting to dashboard...`);
        
        // Redirect to dashboard
        window.location.hash = '#/dashboard';
      } else {
        setError(`Farmer not found with phone ${formData.phone}. Please check your phone number or sign up first.`);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Side - Branding */}
      <div className="auth-branding">
        <div className="auth-logo">🌾</div>
        <h1 className="auth-brand-title">Krishi Sakhi</h1>
        <p className="auth-brand-subtitle">Your Intelligent Farming Companion</p>
        
        <div className="auth-features">
          <div className="auth-feature">
            <div className="auth-feature-icon">🔬</div>
            <div className="auth-feature-text">AI Disease Detection</div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">🌦️</div>
            <div className="auth-feature-text">Smart Weather Alerts</div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">📈</div>
            <div className="auth-feature-text">Live Market Prices</div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">🗣️</div>
            <div className="auth-feature-text">Malayalam Voice Chat</div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="auth-form-section">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Welcome Back</h1>
            <p>Sign in to continue your farming journey</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="Enter your registered phone number"
                required
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="auth-button">
              {loading && <span className="loading-spinner"></span>}
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            <p>New to Ammachi AI? <a href="#/signup">Create your account</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
