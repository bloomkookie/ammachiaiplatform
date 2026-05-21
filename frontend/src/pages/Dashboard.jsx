import React, { useEffect, useRef, useState } from 'react';
import './dashboard.css';
import Sidebar from '../components/Sidebar.jsx';
import { FaCheckCircle, FaExclamationTriangle, FaLeaf, FaCloud, FaTint, FaWind, FaLightbulb, FaSync } from 'react-icons/fa';
import TranslatedText from '../components/TranslatedText';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';

export default function Dashboard() {
  const { language } = useLanguage();
  const profile = (() => {
    try { return JSON.parse(localStorage.getItem('ammachi_profile') || '{}'); } catch { return {}; }
  })();
  const session = (() => {
    try { return JSON.parse(localStorage.getItem('ammachi_session') || '{}'); } catch { return {}; }
  })();

  // Get user ID from session or profile
  const userId = session.userId || profile._id || profile.id;

  // State for dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [marketData, setMarketData] = useState([]);
  const [cropHealthData, setCropHealthData] = useState([]);

  function signOut() {
    localStorage.removeItem('ammachi_session');
    window.location.hash = '#/login';
  }

  const chartRef = useRef(null);

  // Fetch real dashboard data from backend
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      if (userId) {
        // Fetch real farmer data
        const [farmerRes, farmsRes, activitiesRes, remindersRes] = await Promise.all([
          apiFetch(`/api/farmers/${userId}/`),
          apiFetch(`/api/farms/?farmer=${userId}`),
          apiFetch(`/api/activities/?farmer=${userId}&limit=5`),
          apiFetch(`/api/reminders/?farmer=${userId}&limit=3`)
        ]);

        const farmer = await farmerRes.json();
        const farms = await farmsRes.json();
        const activities = await activitiesRes.json();
        const reminders = await remindersRes.json();

        setDashboardData({
          farmer: {
            name: farmer.name || session.name || 'Farmer',
            crops: farms.results?.map(f => f.primary_crops).join(', ') || 'Rice, Coconut',
            district: farmer.district || 'Ernakulam',
            experience_years: farmer.experience_years || 5
          },
          farms: {
            totalFarms: farms.count || 0,
            totalAcres: farms.results?.reduce((sum, f) => sum + parseFloat(f.land_size_acres || 0), 0) || 0,
            activeFarms: farms.results?.filter(f => f.is_active).length || 0
          },
          activities: {
            thisMonth: activities.count || 0,
            recent: activities.results || []
          },
          reminders: {
            upcoming: reminders.results || [],
            count: reminders.count || 0
          }
        });
      } else {
        // Fallback for non-logged users
        setDashboardData(getFallbackDashboardData());
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(getFallbackDashboardData());
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback data for when API fails
  const getFallbackDashboardData = () => {
    return {
      farmer: {
        name: profile.name || session.name || 'Farmer',
        crops: profile.crops || ['Rice', 'Coconut', 'Pepper'],
        district: profile.district || 'Ernakulam'
      },
      cropHealth: [
        { crop: 'Rice', status: 'Leaf Blast', severity: 'moderate', date: new Date().toISOString() },
        { crop: 'Coconut', status: 'Healthy', severity: 'none', date: new Date().toISOString() }
      ],
      marketPrices: [
        { crop: 'Rice', price: 2850, change: { percentage: 5.2, direction: 'up' }, market: 'Ernakulam' },
        { crop: 'Coconut', price: 12, change: { percentage: -2.1, direction: 'down' }, market: 'Ernakulam' },
        { crop: 'Pepper', price: 58000, change: { percentage: 8.7, direction: 'up' }, market: 'Ernakulam' }
      ],
      weather: {
        temp: 28,
        desc: 'Partly Cloudy',
        humidity: 75,
        wind: 12
      }
    };
  };

  // Auto-refresh dashboard data every 5 minutes
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [userId]);

  // Manual refresh function
  const handleRefresh = () => {
    fetchDashboardData();
  };

  useEffect(() => {
    let chart;
    async function initChart() {
      try {
        let echarts;
        try {
          echarts = await new Function('return import("echarts")')();
        } catch (err) {
          if (!window.echarts) {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = 'https://cdn.jsdelivr.net/npm/echarts/dist/echarts.min.js';
              s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
            }).catch(() => {});
          }
          echarts = window.echarts;
        }
        if (!chartRef.current || !echarts) return;
        chart = (echarts.init ? echarts.init(chartRef.current) : window.echarts.init(chartRef.current));
        
        // Use real market data if available
        const chartData = marketData.length > 0 ? generateChartData(marketData) : getDefaultChartData();
        
        const option = {
          color: ['#1ea055', '#89d7a0', '#66c184'],
          tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,36,22,0.95)', textStyle: { color: '#fff' } },
          legend: { show: true, data: chartData.legend, top: 8, left: 'center', itemGap: 24, textStyle: { color: '#066241' } },
          grid: { left: 40, right: 20, bottom: 30, top: 70 },
          xAxis: { type: 'category', data: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], boundaryGap: false, axisLine: { lineStyle: { color: '#cfeee0' } }, axisLabel: { color: '#2b6b4a' } },
          yAxis: { type: 'value', axisLine: { lineStyle: { color: '#cfeee0' } }, axisLabel: { color: '#2b6b4a' }, splitLine: { lineStyle: { color: 'rgba(47,180,106,0.06)' } } },
          toolbox: { feature: { saveAsImage: {} } },
          series: chartData.series
        };
        chart.setOption(option);
      } catch (e) {}
    }
    initChart();
    const handleResize = () => { if (chart) chart.resize(); }
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); if (chart) chart.dispose && chart.dispose(); };
  }, [marketData]);

  // Generate chart data from real market prices
  const generateChartData = (marketPrices) => {
    const legend = marketPrices.map(item => item.crop);
    const series = marketPrices.map((item, index) => {
      // Generate trend data based on current price
      const basePrice = item.price;
      const trendData = Array.from({ length: 7 }, (_, i) => {
        const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
        return Math.round(basePrice * (1 + variation));
      });
      
      const colors = ['#1ea055', '#89d7a0', '#66c184', '#2fb46a', '#4ade80'];
      
      return {
        name: item.crop,
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: trendData,
        areaStyle: { color: `rgba(47,180,106,${0.14 - index * 0.02})` },
        lineStyle: { color: colors[index] || '#1ea055', width: 3 - index * 0.5 }
      };
    });
    
    return { legend, series };
  };

  // Default chart data for fallback
  const getDefaultChartData = () => {
    return {
      legend: ['Rice', 'Coconut', 'Pepper'],
      series: [
        { name: 'Rice', type: 'line', smooth: true, showSymbol: false, data: [2850,2860,2840,2850,2870,2880,2890], areaStyle: { color: 'rgba(47,180,106,0.14)' }, lineStyle: { color: '#1ea055', width: 3 } },
        { name: 'Coconut', type: 'line', smooth: true, showSymbol: false, data: [11,11.5,11.8,12,11.9,12.1,12], areaStyle: { color: 'rgba(137,215,160,0.12)' }, lineStyle: { color: '#89d7a0', width: 2 } },
        { name: 'Pepper', type: 'line', smooth: true, showSymbol: false, data: [56000,56500,56300,57000,57200,58000,57800], areaStyle: { color: 'rgba(102,193,132,0.10)' }, lineStyle: { color: '#66c184', width: 2 } }
      ]
    };
  };

  // Weather state with API integration
  const [weather, setWeather] = useState({
    temp: 28,
    desc: 'Partly Cloudy',
    humidity: 75,
    wind: 12,
    icon: <FaCloud style={{fontSize: 32, color: "#3b7c5a"}} />
  });
  
  // Update weather from dashboard data
  useEffect(() => {
    if (dashboardData?.weather) {
      setWeather({
        temp: dashboardData.weather.temp,
        desc: dashboardData.weather.desc,
        humidity: dashboardData.weather.humidity,
        wind: dashboardData.weather.wind,
        icon: getWeatherIcon(dashboardData.weather.desc)
      });
    }
  }, [dashboardData]);
  
  // Fetch weather data from API (kept as fallback if dashboard doesn't provide weather)
  useEffect(() => {
    if (!dashboardData?.weather) {
      const fetchWeatherData = async () => {
        try {
          // Using Thiruvananthapuram as default location
          const { lat, lon } = { lat: 8.5241, lon: 76.9366 };
          
          // Fetch current weather data
          const response = await apiFetch(`/api/weather/current?lat=${lat}&lon=${lon}`);
          
          if (!response.ok) {
            throw new Error(`Weather API returned status: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Update weather state with real data
          setWeather({
            temp: Math.round(data.main?.temp || 28),
            desc: data.weather?.[0]?.description || 'Partly Cloudy',
            humidity: data.main?.humidity || 75,
            wind: Math.round(data.wind?.speed || 12),
            icon: getWeatherIcon(data.weather?.[0]?.main)
          });
        } catch (error) {
          console.error('Failed to fetch weather data:', error);
          // Keep the default weather data on error
        }
      };
      
      fetchWeatherData();
    }
  }, [dashboardData]);

  // Generate AI content when dashboard data and weather are loaded
  useEffect(() => {
    if (dashboardData && weather.temp && !isLoading) {
      generateAIDashboardContent();
    }
  }, [dashboardData, weather.temp, isLoading]);
  
  // Helper function to get weather icon based on condition
  const getWeatherIcon = (weatherCode) => {
    if (!weatherCode) return <FaCloud style={{fontSize: 32, color: "#3b7c5a"}} />;
    const code = weatherCode.toLowerCase();
    if (code.includes('clear')) return <FaCloud style={{fontSize: 32, color: "#f59e0b"}} />;
    if (code.includes('cloud')) return <FaCloud style={{fontSize: 32, color: "#3b7c5a"}} />;
    if (code.includes('rain')) return <FaTint style={{fontSize: 32, color: "#3b82f6"}} />;
    if (code.includes('snow')) return <FaCloud style={{fontSize: 32, color: "#e5e7eb"}} />;
    if (code.includes('thunder')) return <FaExclamationTriangle style={{fontSize: 32, color: "#f59e0b"}} />;
    if (code.includes('mist') || code.includes('fog')) return <FaCloud style={{fontSize: 32, color: "#9ca3af"}} />;
    return <FaCloud style={{fontSize: 32, color: "#3b7c5a"}} />;
  };

  // AI-generated crop health insights
  const [recentScans, setRecentScans] = useState([
    {
      crop: 'Loading...',
      status: 'Analyzing crop health...',
      statusType: 'loading',
      date: new Date().toLocaleDateString(),
      icon: <FaSync className="fa-spin" style={{color: '#6b7280', marginRight: 4}} />
    }
  ]);

  // AI-generated farming tips
  const [tips, setTips] = useState([
    {
      title: 'Loading...',
      desc: 'Getting personalized farming tips...',
      color: '#f3f4f6',
      border: '#d1d5db'
    }
  ]);

  // Generate AI-powered dashboard content
  const generateAIDashboardContent = async () => {
    if (!session.userId) return;

    try {
      // Generate personalized farming tips based on current conditions
      const tipsPrompt = `Generate exactly 2 practical farming tips for a Kerala farmer in ${dashboardData?.farmer?.district || 'Ernakulam'} district. Current weather: ${weather.desc}, humidity: ${weather.humidity}%, temperature: ${weather.temp}°C. Farmer grows: ${dashboardData?.farmer?.crops || 'rice, coconut'}. Keep each tip under 60 words with a catchy title. 

IMPORTANT: Respond ONLY with valid JSON array format:
[{"title": "Short Catchy Title", "desc": "Practical farming advice under 60 words"}]

No markdown, no explanations, just the JSON array.`;

      const tipsResponse = await apiFetch('/api/chatbot/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: tipsPrompt,
          language: 'english',
          farmer_id: session.userId
        })
      });

      if (tipsResponse.ok) {
        const tipsData = await tipsResponse.json();
        try {
          let jsonText = tipsData.reply;
          
          // Extract JSON from markdown code blocks if present
          const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1];
          }
          
          // Try to parse the extracted JSON
          const parsedTips = JSON.parse(jsonText);
          if (Array.isArray(parsedTips) && parsedTips.length > 0) {
            setTips(parsedTips.map((tip, index) => ({
              ...tip,
              color: index % 2 === 0 ? '#fef9c3' : '#e0edff',
              border: index % 2 === 0 ? '#fde68a' : '#a5b4fc'
            })));
          } else {
            // If not an array, create fallback tips
            throw new Error('Invalid JSON structure');
          }
        } catch (parseError) {
          console.log('JSON parsing failed, creating fallback tips:', parseError);
          
          // Extract meaningful content from the response
          const tipText = tipsData.reply;
          
          // Try to extract individual tips from the text
          const lines = tipText.split('\n').filter(line => line.trim().length > 0);
          const extractedTips = [];
          
          let currentTitle = '';
          let currentDesc = '';
          
          for (const line of lines) {
            if (line.includes('title') || line.includes('Title')) {
              if (currentTitle && currentDesc) {
                extractedTips.push({
                  title: currentTitle,
                  desc: currentDesc,
                  color: extractedTips.length % 2 === 0 ? '#fef9c3' : '#e0edff',
                  border: extractedTips.length % 2 === 0 ? '#fde68a' : '#a5b4fc'
                });
              }
              currentTitle = line.replace(/["{},]/g, '').replace(/title\s*:\s*/i, '').trim();
              currentDesc = '';
            } else if (line.includes('desc') || line.includes('description')) {
              currentDesc = line.replace(/["{},]/g, '').replace(/desc\s*:\s*/i, '').replace(/description\s*:\s*/i, '').trim();
            }
          }
          
          // Add the last tip if exists
          if (currentTitle && currentDesc) {
            extractedTips.push({
              title: currentTitle,
              desc: currentDesc,
              color: extractedTips.length % 2 === 0 ? '#fef9c3' : '#e0edff',
              border: extractedTips.length % 2 === 0 ? '#fde68a' : '#a5b4fc'
            });
          }
          
          // If we extracted tips, use them; otherwise create a single fallback tip
          if (extractedTips.length > 0) {
            setTips(extractedTips);
          } else {
            setTips([
              {
                title: 'AI Farming Advice',
                desc: tipText.substring(0, 150).replace(/[{}"\[\]]/g, '') + '...',
                color: '#fef9c3',
                border: '#fde68a'
              }
            ]);
          }
        }
      }

      // Generate crop health insights
      const healthPrompt = `Analyze crop health for a Kerala farmer growing ${dashboardData?.farmer?.crops || 'rice, coconut'} in current post-monsoon season. Weather: ${weather.desc}, humidity: ${weather.humidity}%. Provide exactly 2 crop health insights with status.

IMPORTANT: Respond ONLY with valid JSON array format:
[{"crop": "CropName", "status": "Brief health status description", "statusType": "ok"}]

Use statusType: "ok" for healthy, "warn" for caution, "alert" for urgent. No markdown, just JSON array.`;

      const healthResponse = await apiFetch('/api/chatbot/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: healthPrompt,
          language: 'english',
          farmer_id: session.userId
        })
      });

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        try {
          let jsonText = healthData.reply;
          
          // Extract JSON from markdown code blocks if present
          const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1];
          }
          
          const parsedHealth = JSON.parse(jsonText);
          if (Array.isArray(parsedHealth) && parsedHealth.length > 0) {
            setRecentScans(parsedHealth.map(scan => ({
              ...scan,
              date: new Date().toLocaleDateString(),
              icon: scan.statusType === 'ok' ? 
                <FaCheckCircle style={{color: '#1ea055', marginRight: 4}} /> :
                scan.statusType === 'warn' ?
                <FaExclamationTriangle style={{color: '#f59e0b', marginRight: 4}} /> :
                <FaExclamationTriangle style={{color: '#ef4444', marginRight: 4}} />
            })));
          } else {
            throw new Error('Invalid health JSON structure');
          }
        } catch (parseError) {
          console.log('Health JSON parsing failed, using fallback:', parseError);
          // Fallback health data
          setRecentScans([
            {
              crop: 'Rice',
              status: 'Monitor for post-monsoon diseases',
              statusType: 'warn',
              date: new Date().toLocaleDateString(),
              icon: <FaExclamationTriangle style={{color: '#f59e0b', marginRight: 4}} />
            },
            {
              crop: 'Coconut',
              status: 'Good growing conditions',
              statusType: 'ok',
              date: new Date().toLocaleDateString(),
              icon: <FaCheckCircle style={{color: '#1ea055', marginRight: 4}} />
            }
          ]);
        }
      }

    } catch (error) {
      console.error('Error generating AI dashboard content:', error);
      // Set fallback content
      setTips([
        {
          title: 'Post-Monsoon Care',
          desc: 'Monitor crops for fungal diseases. Ensure proper drainage in fields.',
          color: '#fef9c3',
          border: '#fde68a'
        },
        {
          title: 'Weather Alert',
          desc: `Current humidity: ${weather.humidity}%. Adjust watering accordingly.`,
          color: '#e0edff',
          border: '#a5b4fc'
        }
      ]);
    }
  };
  
  // Update tips based on weather data
  useEffect(() => {
    const updatedTips = [...tips];
    
    // Update watering tip based on humidity
    if (weather.humidity > 70) {
      updatedTips[1] = {
        ...updatedTips[1],
        desc: `High humidity (${weather.humidity}%) - reduce watering to prevent fungal growth.`,
        color: '#e0edff',
        border: '#a5b4fc'
      };
    } else if (weather.humidity < 40) {
      updatedTips[1] = {
        ...updatedTips[1],
        desc: `Low humidity (${weather.humidity}%) - consider increasing watering frequency.`,
        color: '#fee2e2',
        border: '#fca5a5'
      };
    } else {
      updatedTips[1] = {
        ...updatedTips[1],
        desc: `Moderate humidity (${weather.humidity}%) - maintain regular watering schedule.`,
        color: '#e0edff',
        border: '#a5b4fc'
      };
    }
    
    // Add weather-specific tip based on conditions
    if (weather.desc.toLowerCase().includes('rain')) {
      updatedTips.push({
        title: 'Rain Alert',
        desc: 'Rainy conditions detected. Consider postponing outdoor activities like spraying or harvesting.',
        color: '#dbeafe',
        border: '#93c5fd'
      });
    } else if (weather.desc.toLowerCase().includes('clear') || weather.desc.toLowerCase().includes('sun')) {
      updatedTips.push({
        title: 'Sunny Day',
        desc: 'Good conditions for harvesting and drying crops. Ensure adequate irrigation.',
        color: '#fef3c7',
        border: '#fcd34d'
      });
    }
    
    setTips(updatedTips);
  }, [weather]);

  return (
    <div className="dash-layout">
      <Sidebar />
      <main className="dashboard-main page-scroll dash-container">
        <div className="dashboard-content-wrapper">
        <div className="dash-card">
          <div className="dash-hero large-hero">
            <div className="hero-content-left">
              <h2 className="dash-welcome">
                Welcome {dashboardData?.farmer?.name || profile.name || session.name || 'Yashasvi'}!
                <span style={{
                  marginLeft: 8,
                  color: "#166534", // changed to a darker green
                  verticalAlign: "middle"
                }}>
                  <FaLeaf />
                </span>
                {isLoading && (
                  <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#666' }}>
                    <FaSync className="fa-spin" /> Loading...
                  </span>
                )}
              </h2>
              <p className="dash-text">
                {cropHealthData.length > 0 ? 
                  <>
                    {cropHealthData.filter(scan => scan.status === 'Healthy' || !scan.status).length} <TranslatedText text="of" /> {cropHealthData.length} <TranslatedText text="recent scans show healthy crops" />
                  </> :
                  <TranslatedText text="Your crops are looking healthy today" />
                }
              </p>
              {lastUpdated && (
                <p style={{ fontSize: '0.9rem', color: '#666', margin: '8px 0' }}>
                  <TranslatedText text="Last updated" />: {lastUpdated.toLocaleTimeString()}
                  <button 
                    onClick={handleRefresh}
                    style={{
                      marginLeft: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#059669',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                    disabled={isLoading}
                  >
                    <FaSync className={isLoading ? 'fa-spin' : ''} /> <TranslatedText text="Refresh" />
                  </button>
                </p>
              )}
              <div className="hero-actions">
                <button className="btn-cta" onClick={() => window.location.hash = '#/detect'}>
                  <FaLeaf style={{marginRight: 6}} /> <TranslatedText text="Scan Leaf" />
                </button>
                <button className="btn-cta outline" onClick={() => window.location.hash = '#/chat'}>
                  💬 <TranslatedText text="Ask AI" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Three Main Blocks */}
        <div className="dash-grid three-cols" style={{display: 'flex', gap: 24, marginTop: 24}}>
          {/* Block 1: Crop Health */}
          <div className="card crop-health" style={{flex: 1, minWidth: 0}}>
            <div style={{display: 'flex', alignItems: 'center', marginBottom: 10}}>
              <FaLeaf style={{marginRight: 8, color: '#059669'}} />
              <strong style={{fontSize: '1.15rem'}}><TranslatedText text="Crop Health" /></strong>
            </div>
            {recentScans.map((scan, idx) => (
              <div key={idx} style={{display: 'flex', alignItems: 'center', marginBottom: 12}}>
                <span style={{fontWeight: 700, marginRight: 8}}>{scan.crop}</span>
                <span className={scan.statusType} style={{display: 'flex', alignItems: 'center', fontWeight: 700, color: scan.statusType === 'warn' ? '#c44' : '#1ea055', marginRight: 8}}>
                  {scan.icon} {scan.status}
                </span>
                <span style={{color: '#64748b', fontSize: 14}}>{scan.date}</span>
              </div>
            ))}
          </div>

          {/* Block 2: Today's Tips */}
          <div className="card todays-tips" style={{flex: 1, minWidth: 0}}>
            <div style={{display: 'flex', alignItems: 'center', marginBottom: 10}}>
              <FaLightbulb style={{marginRight: 8, color: '#fbbf24'}} />
              <strong style={{fontSize: '1.15rem'}}><TranslatedText text="Today's Tips" /></strong>
            </div>
            {tips.map((tip, idx) => (
              <div key={idx} style={{
                background: tip.color,
                border: `1.5px solid ${tip.border}`,
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 10
              }}>
                <div style={{fontWeight: 700, marginBottom: 2}}>{tip.title}</div>
                <div style={{fontSize: 15, color: '#334155'}}>{tip.desc}</div>
              </div>
            ))}
          </div>

          {/* Block 3: Weather */}
          <div className="card todays-weather" style={{flex: 1, minWidth: 0}}>
            <div style={{display: 'flex', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between'}}>
              <div style={{display: 'flex', alignItems: 'center'}}>
                <FaCloud style={{marginRight: 8, color: '#3b7c5a'}} />
                <strong style={{fontSize: '1.15rem'}}><TranslatedText text="Today's Weather" /></strong>
              </div>
              <button 
                onClick={() => window.location.hash = '#/weather'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#059669',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <TranslatedText text="View Details" />
              </button>
            </div>
            <div style={{display: 'flex', alignItems: 'center', marginBottom: 4}}>
              <span style={{fontSize: 28, fontWeight: 800, marginRight: 10}}>{weather.temp}°C</span>
              <span style={{fontSize: 16, color: '#64748b'}}>{weather.desc}</span>
              <span style={{marginLeft: 'auto'}}>{weather.icon}</span>
            </div>
            <hr style={{border: 'none', borderTop: '1px solid #e5e7eb', margin: '10px 0'}} />
            <div style={{display: 'flex', gap: 18}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                <FaTint style={{color: '#3b82f6'}} />
                <span style={{fontSize: 14, color: '#64748b'}}><TranslatedText text="Humidity" /></span>
                <span style={{fontWeight: 700, marginLeft: 4}}>{weather.humidity}%</span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                <FaWind style={{color: '#64748b'}} />
                <span style={{fontSize: 14, color: '#64748b'}}><TranslatedText text="Wind" /></span>
                <span style={{fontWeight: 700, marginLeft: 4}}>{weather.wind} km/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Market Prices Section */}
        <div className="market-prices card" style={{marginTop: 24}}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3><TranslatedText text="Market Prices" /></h3>
            <button 
              onClick={() => window.location.hash = '#/market'}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#059669',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              View All Markets
            </button>
          </div>
          <div className="market-row">
            {marketData.length > 0 ? marketData.map((item, index) => (
              <div key={index} className="price-summary">
                <div className="p-name">{item.crop}</div>
                <div className="p-value">₹{item.price}</div>
                <div className={`p-change ${item.change?.direction === 'up' ? 'pos' : 'neg'}`}>
                  {item.change?.direction === 'up' ? '+' : ''}{item.change?.percentage}%
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                  {item.market}
                </div>
              </div>
            )) : (
              // Fallback data
              <>
                <div className="price-summary">
                  <div className="p-name">Rice</div>
                  <div className="p-value">₹2850</div>
                  <div className="p-change pos">+5.2%</div>
                </div>
                <div className="price-summary">
                  <div className="p-name">Coconut</div>
                  <div className="p-value">₹12</div>
                  <div className="p-change neg">-2.1%</div>
                </div>
                <div className="price-summary">
                  <div className="p-name">Pepper</div>
                  <div className="p-value">₹58000</div>
                  <div className="p-change pos">+8.7%</div>
                </div>
              </>
            )}
          </div>
          <div className="market-chart card-chart" ref={chartRef} />
        </div>
        </div>
      </main>
    </div>
    
  );
}
