import React, { useState, useEffect } from 'react';
import './reminders.css';
import Sidebar from '../components/Sidebar.jsx';
import TranslatedText from '../components/TranslatedText';
import { apiFetch } from '../utils/api';

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    farmer: '',
    title: '',
    description: '',
    due_date: '',
    category: 'operation'
  });
  const [filter, setFilter] = useState({
    farmer_id: '',
    category: '',
    is_completed: ''
  });

  const REMINDER_CATEGORIES = [
    { value: 'operation', label: 'Farm Operation', icon: '🚜', color: '#059669' },
    { value: 'scheme', label: 'Government Scheme', icon: '🏛️', color: '#3b82f6' },
    { value: 'price', label: 'Price Alert', icon: '💰', color: '#f59e0b' },
    { value: 'weather', label: 'Weather Alert', icon: '🌦️', color: '#06b6d4' },
    { value: 'pest', label: 'Pest/Disease Alert', icon: '🐛', color: '#ef4444' },
    { value: 'general', label: 'General', icon: '📝', color: '#6b7280' }
  ];

  useEffect(() => {
    fetchReminders();
    fetchFarmers();
  }, [filter]);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filter).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await apiFetch(`/api/reminders/?${params}`);
      const data = await response.json();
      setReminders(data);
    } catch (error) {
      console.error('Error fetching reminders:', error);
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
      const response = await apiFetch('/api/reminders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          due_date: new Date(formData.due_date).toISOString()
        })
      });

      if (response.ok) {
        // Get AI suggestions for optimal timing using Gemini
        try {
          const suggestionPrompt = `A farmer in Kerala wants to set a reminder for "${formData.title}" (${formData.category}) on ${formData.due_date}. Provide a brief tip about optimal timing or related activities for this task. Keep it under 80 words.`;
          
          const aiResponse = await apiFetch('/api/chatbot/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: suggestionPrompt,
              language: 'english'
            })
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            alert(`Reminder set! 🤖 AI Tip: ${aiData.reply}`);
          } else {
            alert('Reminder set successfully! ✅');
          }
        } catch (aiError) {
          alert('Reminder set successfully! ✅');
        }

        fetchReminders();
        setFormData({
          farmer: '',
          title: '',
          description: '',
          due_date: '',
          category: 'operation'
        });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding reminder:', error);
    } finally {
      setLoading(false);
    }
  };

  const markCompleted = async (reminderId) => {
    try {
      await apiFetch(`/api/reminders/${reminderId}/mark_completed/`, {
        method: 'POST'
      });
      fetchReminders();
    } catch (error) {
      console.error('Error marking reminder as completed:', error);
    }
  };

  const deleteReminder = async (reminderId) => {
    if (window.confirm('Are you sure you want to delete this reminder?')) {
      try {
        await apiFetch(`/api/reminders/${reminderId}/`, {
          method: 'DELETE'
        });
        fetchReminders();
      } catch (error) {
        console.error('Error deleting reminder:', error);
      }
    }
  };

  const getCategoryInfo = (category) => {
    return REMINDER_CATEGORIES.find(c => c.value === category) || REMINDER_CATEGORIES[5];
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const upcomingReminders = reminders.filter(r => !r.is_completed && !isOverdue(r.due_date));
  const overdueReminders = reminders.filter(r => !r.is_completed && isOverdue(r.due_date));
  const completedReminders = reminders.filter(r => r.is_completed);

  return (
    <div className="dash-layout">
      <Sidebar />
      <main className="dashboard-main page-scroll dash-container">
        <div className="dashboard-content-wrapper">
        <div className="dash-card">
          <header className="reminders-header">
            <div>
              <h1 className="reminders-title">Reminders & Alerts</h1>
              <p className="reminders-subtitle">Stay on top of your farming schedule</p>
            </div>
            <button 
              className="btn-add-reminder"
              onClick={() => setShowAddForm(true)}
            >
              + Add Reminder
            </button>
          </header>

          {/* Filters */}
          <div className="filters-section">
            <div className="filters-grid">
              <select
                value={filter.farmer_id}
                onChange={(e) => setFilter({...filter, farmer_id: e.target.value})}
              >
                <option value="">All Farmers</option>
                {farmers.map(farmer => (
                  <option key={farmer.id} value={farmer.id}>
                    {farmer.name}
                  </option>
                ))}
              </select>

              <select
                value={filter.category}
                onChange={(e) => setFilter({...filter, category: e.target.value})}
              >
                <option value="">All Categories</option>
                {REMINDER_CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.icon} {category.label}
                  </option>
                ))}
              </select>

              <select
                value={filter.is_completed}
                onChange={(e) => setFilter({...filter, is_completed: e.target.value})}
              >
                <option value="">All Status</option>
                <option value="false">Pending</option>
                <option value="true">Completed</option>
              </select>
            </div>
          </div>

          {/* Add Reminder Form */}
          {showAddForm && (
            <div className="reminder-form-overlay">
              <div className="reminder-form-modal">
                <h3>Add New Reminder</h3>
                <form onSubmit={handleSubmit}>
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
                    <label>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      {REMINDER_CATEGORIES.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.icon} {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g., Apply fertilizer to rice field"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Due Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Description (Optional)</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Additional details about this reminder..."
                      rows={3}
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" disabled={loading}>
                      {loading ? 'Adding...' : 'Add Reminder'}
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

          {/* Reminders Sections */}
          {loading && reminders.length === 0 ? (
            <div className="loading">Loading reminders...</div>
          ) : (
            <>
              {/* Overdue Reminders */}
              {overdueReminders.length > 0 && (
                <section className="reminders-section overdue">
                  <h2>⚠️ Overdue ({overdueReminders.length})</h2>
                  <div className="reminders-list">
                    {overdueReminders.map(reminder => (
                      <ReminderCard 
                        key={reminder.id} 
                        reminder={reminder} 
                        onMarkCompleted={markCompleted}
                        onDelete={deleteReminder}
                        getCategoryInfo={getCategoryInfo}
                        formatDateTime={formatDateTime}
                        getDaysUntilDue={getDaysUntilDue}
                        isOverdue={true}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Upcoming Reminders */}
              {upcomingReminders.length > 0 && (
                <section className="reminders-section upcoming">
                  <h2>📅 Upcoming ({upcomingReminders.length})</h2>
                  <div className="reminders-list">
                    {upcomingReminders.map(reminder => (
                      <ReminderCard 
                        key={reminder.id} 
                        reminder={reminder} 
                        onMarkCompleted={markCompleted}
                        onDelete={deleteReminder}
                        getCategoryInfo={getCategoryInfo}
                        formatDateTime={formatDateTime}
                        getDaysUntilDue={getDaysUntilDue}
                        isOverdue={false}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Completed Reminders */}
              {completedReminders.length > 0 && (
                <section className="reminders-section completed">
                  <h2>✅ Completed ({completedReminders.length})</h2>
                  <div className="reminders-list">
                    {completedReminders.map(reminder => (
                      <ReminderCard 
                        key={reminder.id} 
                        reminder={reminder} 
                        onMarkCompleted={markCompleted}
                        onDelete={deleteReminder}
                        getCategoryInfo={getCategoryInfo}
                        formatDateTime={formatDateTime}
                        getDaysUntilDue={getDaysUntilDue}
                        isCompleted={true}
                      />
                    ))}
                  </div>
                </section>
              )}

              {reminders.length === 0 && (
                <div className="no-reminders">
                  <p>No reminders yet. Click "Add Reminder" to get started.</p>
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}

function ReminderCard({ 
  reminder, 
  onMarkCompleted, 
  onDelete, 
  getCategoryInfo, 
  formatDateTime, 
  getDaysUntilDue,
  isOverdue = false,
  isCompleted = false
}) {
  const categoryInfo = getCategoryInfo(reminder.category);
  const dateTime = formatDateTime(reminder.due_date);
  const daysUntil = getDaysUntilDue(reminder.due_date);

  return (
    <div className={`reminder-card ${isOverdue ? 'overdue' : ''} ${isCompleted ? 'completed' : ''}`}>
      <div className="reminder-icon" style={{ color: categoryInfo.color }}>
        {categoryInfo.icon}
      </div>
      
      <div className="reminder-content">
        <div className="reminder-header">
          <h4>{reminder.title}</h4>
          <div className="reminder-timing">
            <span className="reminder-date">{dateTime.date}</span>
            <span className="reminder-time">{dateTime.time}</span>
            {!isCompleted && (
              <span className={`days-until ${isOverdue ? 'overdue' : ''}`}>
                {isOverdue ? `${Math.abs(daysUntil)} days overdue` : 
                 daysUntil === 0 ? 'Today' :
                 daysUntil === 1 ? 'Tomorrow' :
                 `${daysUntil} days`}
              </span>
            )}
          </div>
        </div>
        
        <div className="reminder-category" style={{ color: categoryInfo.color }}>
          {categoryInfo.label}
        </div>
        
        {reminder.description && (
          <p className="reminder-description">{reminder.description}</p>
        )}
        
        <div className="reminder-meta">
          <span className="farmer-name">👨‍🌾 {reminder.farmer_name}</span>
        </div>
      </div>
      
      <div className="reminder-actions">
        {!isCompleted && (
          <button 
            className="btn-complete"
            onClick={() => onMarkCompleted(reminder.id)}
            title="Mark as completed"
          >
            ✓
          </button>
        )}
        <button 
          className="btn-delete"
          onClick={() => onDelete(reminder.id)}
          title="Delete reminder"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
