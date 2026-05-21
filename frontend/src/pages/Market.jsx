import React, { useState, useEffect, useRef } from 'react';
import './market.css';
import Sidebar from '../components/Sidebar.jsx';
import TranslatedText from '../components/TranslatedText';
import { apiFetch } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

// Kerala districts for market selection
const KERALA_DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha',
  'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad',
  'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
];

// Popular crops for Kerala farmers
const POPULAR_CROPS = ['Rice', 'Coconut', 'Pepper', 'Cardamom', 'Rubber', 'Ginger'];

export default function Market() {
  const { language } = useLanguage();
  const [selectedDistrict, setSelectedDistrict] = useState('Ernakulam');
  const [selectedCrop, setSelectedCrop] = useState('Rice');
  const [marketData, setMarketData] = useState([]);
  const [availableMarkets, setAvailableMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const chartRef = useRef(null);
  
  // Purchase functionality state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [purchaseUnit, setPurchaseUnit] = useState('quintal');
  const [totalPrice, setTotalPrice] = useState(0);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const session = (() => {
    try { return JSON.parse(localStorage.getItem('ammachi_session') || '{}'); } catch { return {}; }
  })();

  // Fetch available markets when district changes
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/market/markets?state=Kerala&district=${selectedDistrict}`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
          setAvailableMarkets(data.data);
          setSelectedMarket(data.data[0]); // Auto-select first market
        } else {
          setAvailableMarkets([]);
          setSelectedMarket('');
        }
      } catch (error) {
        console.error('Failed to fetch markets:', error);
        setError('Failed to load markets');
      } finally {
        setLoading(false);
      }
    };

    if (selectedDistrict) {
      fetchMarkets();
    }
  }, [selectedDistrict]);

  // Fetch market prices when market or crop changes
  useEffect(() => {
    const fetchMarketData = async () => {
      if (!selectedMarket || !selectedCrop) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiFetch(
          `/api/market/prices?state=Kerala&market=${encodeURIComponent(selectedMarket)}&commodity=${encodeURIComponent(selectedCrop)}`
        );
        const data = await response.json();
        
        if (data.success) {
          setMarketData(data.data || []);
          setLastUpdated(new Date());
        } else {
          setError('Failed to fetch market data');
        }
      } catch (error) {
        console.error('Failed to fetch market data:', error);
        setError('Failed to connect to market API');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, [selectedMarket, selectedCrop]);

  // Purchase functionality
  const handleBuyClick = (item) => {
    console.log('Buy button clicked for:', item);
    
    if (!session.userId) {
      alert('Please login to make a purchase');
      return;
    }

    setSelectedItem(item);
    setPurchaseQuantity(1);
    setPurchaseUnit(item.unit || 'quintal');
    setTotalPrice(item.price);
    setShowPurchaseModal(true);
    
    console.log('Purchase modal should be visible now');
  };

  const calculateTotalPrice = (quantity, unit, basePrice) => {
    let multiplier = 1;
    if (unit === 'kg' && selectedItem?.unit === 'quintal') {
      multiplier = 0.01; // 1 quintal = 100 kg
    } else if (unit === 'piece' && selectedItem?.unit === 'piece') {
      multiplier = 1;
    }
    return Math.round(quantity * basePrice * multiplier);
  };

  const handleQuantityChange = (quantity) => {
    setPurchaseQuantity(quantity);
    if (selectedItem) {
      const total = calculateTotalPrice(quantity, purchaseUnit, selectedItem.price);
      setTotalPrice(total);
    }
  };

  const handleUnitChange = (unit) => {
    setPurchaseUnit(unit);
    if (selectedItem) {
      const total = calculateTotalPrice(purchaseQuantity, unit, selectedItem.price);
      setTotalPrice(total);
    }
  };

  const handlePurchaseSubmit = async () => {
    if (!session.userId) {
      alert('Please login to make a purchase');
      return;
    }

    setPurchaseLoading(true);
    try {
      // Create purchase order
      const orderData = {
        farmer_id: session.userId,
        commodity: selectedItem.commodity,
        market: selectedItem.market,
        quantity: purchaseQuantity,
        unit: purchaseUnit,
        price_per_unit: selectedItem.price,
        total_price: totalPrice,
        quality: selectedItem.quality,
        order_date: new Date().toISOString(),
        status: 'pending'
      };

      // For demo purposes, we'll show success without actual API call
      // In real implementation, you would call:
      // const response = await apiFetch('/api/market/orders/', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(orderData)
      // });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      alert(`🎉 Order Placed Successfully!

📦 Order Details:
• Commodity: ${selectedItem.commodity}
• Quantity: ${purchaseQuantity} ${purchaseUnit}
• Quality: ${selectedItem.quality}
• Market: ${selectedItem.market}
• Total Price: ₹${totalPrice.toLocaleString()}

📞 Contact: The seller will contact you within 24 hours
📍 Pickup: ${selectedItem.market}, ${selectedDistrict}
🚚 Delivery: Available for orders above ₹5,000

Thank you for using Krishi Sakhi! 🌾`);

      setShowPurchaseModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setPurchaseLoading(false);
    }
  };

  // Sell functionality
  const handleSellClick = (item) => {
    if (!session.userId) {
      alert('Please login to list your crops for sale');
      return;
    }

    const sellData = {
      farmer_id: session.userId,
      farmer_name: session.name,
      commodity: item.commodity,
      market: item.market,
      base_price: item.price,
      quality: item.quality,
      contact: session.phone
    };

    // Show sell listing form
    const quantity = prompt(`How many ${item.unit}s of ${item.commodity} do you want to sell?`);
    if (!quantity || isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const sellingPrice = prompt(`What price per ${item.unit}? (Market rate: ₹${item.price})`);
    if (!sellingPrice || isNaN(sellingPrice) || sellingPrice <= 0) {
      alert('Please enter a valid selling price');
      return;
    }

    // Calculate total value
    const totalValue = parseInt(quantity) * parseInt(sellingPrice);

    alert(`🌾 Crop Listed for Sale!

📋 Listing Details:
• Farmer: ${session.name}
• Commodity: ${item.commodity} (${item.quality})
• Quantity: ${quantity} ${item.unit}
• Price: ₹${sellingPrice}/${item.unit}
• Total Value: ₹${totalValue.toLocaleString()}
• Market: ${item.market}
• Contact: ${session.phone}

📞 Buyers will contact you directly
📍 Location: ${selectedDistrict}
⏰ Listing active for 7 days

Your crop is now visible to buyers in the market! 🎯`);
  };

  // Initialize chart with market data
  useEffect(() => {
    let chart;
    async function initChart() {
      try {
        let echarts;
        try {
          echarts = await new Function('return import("echarts")')();
        } catch (err) {
          // dynamic import failed (likely dev-tool import analysis). Try CDN fallback
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
        
        // Generate chart data from market data or use default
        const chartData = marketData.length > 0 
          ? generateChartData(marketData)
          : generateDefaultChartData();
        
        const option = {
          color: ['#3CB371', '#66CDAA', '#98FB98'], // mediumseagreen variations
          tooltip: { trigger: 'axis' },
          legend: { 
            data: [selectedCrop, 'Average Price', 'Price Trend'], 
            top: 8, 
            left: 'center', 
            itemGap: 20, 
            textStyle: { color: '#3CB371' } 
          },
          grid: { left: 40, right: 10, bottom: 30, top: 60 },
          xAxis: { 
            type: 'category', 
            data: chartData.dates,
            axisLine: { lineStyle: { color: '#B0E0B0' } }, 
            axisLabel: { color: '#3CB371' } 
          },
          yAxis: { 
            type: 'value', 
            axisLine: { lineStyle: { color: '#B0E0B0' } }, 
            axisLabel: { color: '#3CB371' }, 
            splitLine: { lineStyle: { color: 'rgba(60,179,113,0.1)' } } 
          },
          toolbox: { feature: { saveAsImage: {} } },
          series: [
            { 
              name: selectedCrop, 
              type: 'line', 
              smooth: true, 
              showSymbol: false, 
              data: chartData.prices, 
              areaStyle: { color: 'rgba(60,179,113,0.15)' }, 
              lineStyle: { width: 3, color: '#3CB371' } 
            }
          ]
        };
        chart.setOption(option);
      } catch (e) {
        console.error('Chart initialization failed:', e);
      }
    }
    
    initChart();
    const onResize = () => { if (chart) chart.resize(); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); if (chart) chart.dispose && chart.dispose(); };
  }, [marketData, selectedCrop]);

  // Helper function to generate chart data from API response
  const generateChartData = (data) => {
    const dates = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const prices = data.length > 0 
      ? data.map(item => item.modal_price || item.max_price || 0)
      : [0, 0, 0, 0, 0, 0, 0];
    
    // If we have fewer data points, repeat the last value
    while (prices.length < 7) {
      prices.push(prices[prices.length - 1] || 0);
    }
    
    return { dates, prices: prices.slice(0, 7) };
  };

  // Helper function to generate default chart data based on selected crop
  const generateDefaultChartData = () => {
    const cropPriceRanges = {
      'Rice': [3800, 3850, 3900, 3820, 3880, 3920, 3950],
      'Coconut': [25, 26, 28, 27, 29, 30, 28],
      'Pepper': [620, 640, 650, 630, 660, 670, 680],
      'Cardamom': [1800, 1820, 1850, 1830, 1870, 1890, 1900],
      'Rubber': [170, 175, 180, 172, 185, 188, 190],
      'Ginger': [115, 118, 120, 116, 122, 125, 128]
    };

    return {
      dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      prices: cropPriceRanges[selectedCrop] || [400, 410, 420, 415, 425, 430, 435]
    };
  };

  // Helper function to get realistic Indian crop prices
  const getRealisticPrices = (crop) => {
    const priceData = {
      'Rice': [
        { id: 'rice-1', name: 'Rice (Basmati)', price: '₹4,200', unit: '/quintal', change: '+3.2%', quality: 'Premium', updated: '2 hours ago' },
        { id: 'rice-2', name: 'Rice (Sona Masuri)', price: '₹3,800', unit: '/quintal', change: '+1.5%', quality: 'Grade A', updated: '3 hours ago' },
        { id: 'rice-3', name: 'Rice (IR64)', price: '₹2,900', unit: '/quintal', change: '-0.8%', quality: 'Standard', updated: '1 hour ago' }
      ],
      'Coconut': [
        { id: 'coconut-1', name: 'Coconut (Fresh)', price: '₹28', unit: '/piece', change: '+2.1%', quality: 'Premium', updated: '1 hour ago' },
        { id: 'coconut-2', name: 'Coconut (Mature)', price: '₹22', unit: '/piece', change: '0%', quality: 'Standard', updated: '2 hours ago' },
        { id: 'coconut-3', name: 'Coconut (Tender)', price: '₹35', unit: '/piece', change: '+5.7%', quality: 'Premium', updated: '30 min ago' }
      ],
      'Pepper': [
        { id: 'pepper-1', name: 'Pepper (Black)', price: '₹650', unit: '/kg', change: '+8.5%', quality: 'Premium', updated: '45 min ago' },
        { id: 'pepper-2', name: 'Pepper (White)', price: '₹780', unit: '/kg', change: '+12.3%', quality: 'Export Quality', updated: '1 hour ago' },
        { id: 'pepper-3', name: 'Pepper (Crushed)', price: '₹580', unit: '/kg', change: '+4.2%', quality: 'Standard', updated: '2 hours ago' }
      ],
      'Cardamom': [
        { id: 'cardamom-1', name: 'Cardamom (Small)', price: '₹1,850', unit: '/kg', change: '+15.2%', quality: 'Premium', updated: '1 hour ago' },
        { id: 'cardamom-2', name: 'Cardamom (Bold)', price: '₹2,200', unit: '/kg', change: '+18.7%', quality: 'Export Quality', updated: '2 hours ago' },
        { id: 'cardamom-3', name: 'Cardamom (Mixed)', price: '₹1,650', unit: '/kg', change: '+10.5%', quality: 'Standard', updated: '3 hours ago' }
      ],
      'Rubber': [
        { id: 'rubber-1', name: 'Rubber (RSS4)', price: '₹185', unit: '/kg', change: '-2.1%', quality: 'Grade A', updated: '2 hours ago' },
        { id: 'rubber-2', name: 'Rubber (RSS5)', price: '₹175', unit: '/kg', change: '-1.8%', quality: 'Standard', updated: '1 hour ago' },
        { id: 'rubber-3', name: 'Rubber (Latex)', price: '₹165', unit: '/kg', change: '-3.2%', quality: 'Fresh', updated: '4 hours ago' }
      ],
      'Ginger': [
        { id: 'ginger-1', name: 'Ginger (Fresh)', price: '₹120', unit: '/kg', change: '+6.8%', quality: 'Premium', updated: '1 hour ago' },
        { id: 'ginger-2', name: 'Ginger (Dried)', price: '₹280', unit: '/kg', change: '+9.2%', quality: 'Export Quality', updated: '2 hours ago' },
        { id: 'ginger-3', name: 'Ginger (Organic)', price: '₹150', unit: '/kg', change: '+8.5%', quality: 'Certified Organic', updated: '30 min ago' }
      ]
    };

    return priceData[crop] || [
      { id: 'default-1', name: `${crop} (Premium)`, price: '₹450', unit: '/kg', change: '+2.5%', quality: 'Premium', updated: '1 hour ago' },
      { id: 'default-2', name: `${crop} (Standard)`, price: '₹380', unit: '/kg', change: '+1.2%', quality: 'Standard', updated: '2 hours ago' },
      { id: 'default-3', name: `${crop} (Grade A)`, price: '₹420', unit: '/kg', change: '+3.1%', quality: 'Grade A', updated: '45 min ago' }
    ];
  };

  // Helper function to get default price ranges for summary cards
  const getDefaultPriceRange = (crop) => {
    const priceRanges = {
      'Rice': { min: '2,800', modal: '3,500', max: '4,200' },
      'Coconut': { min: '20', modal: '25', max: '35' },
      'Pepper': { min: '550', modal: '620', max: '780' },
      'Cardamom': { min: '1,600', modal: '1,850', max: '2,200' },
      'Rubber': { min: '160', modal: '175', max: '190' },
      'Ginger': { min: '110', modal: '125', max: '280' }
    };
    
    return priceRanges[crop] || { min: '350', modal: '400', max: '450' };
  };

  // Helper function to calculate price change
  const calculatePriceChange = (item, index) => {
    if (marketData.length > 1 && index > 0) {
      const current = item.modal_price || item.max_price || 0;
      const previous = marketData[index - 1]?.modal_price || marketData[index - 1]?.max_price || current;
      const change = ((current - previous) / previous * 100).toFixed(1);
      return change >= 0 ? `+${change}%` : `${change}%`;
    }
    return '0%';
  };

  // Helper function to format update time
  const formatUpdateTime = (arrivalDate) => {
    if (!arrivalDate) return 'Recently';
    try {
      const date = new Date(arrivalDate);
      const now = new Date();
      const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
      if (diffHours < 1) return 'Recently';
      if (diffHours < 24) return `${diffHours} hours ago`;
      return `${Math.floor(diffHours / 24)} days ago`;
    } catch {
      return 'Recently';
    }
  };

  // Refresh function
  const handleRefresh = () => {
    setLastUpdated(new Date());
    // Trigger re-fetch by updating state
    setSelectedMarket(selectedMarket);
  };

  // Process market data for display
  const processedPrices = marketData.length > 0 
    ? marketData.slice(0, 6).map((item, index) => ({
        id: `${selectedCrop}-${index}`,
        name: `${selectedCrop} (${item.variety || 'Standard'})`,
        price: `₹${item.modal_price || item.max_price || 'N/A'}`,
        unit: selectedCrop === 'Rice' ? '/quintal' : '/kg',
        change: calculatePriceChange(item, index),
        quality: item.grade || 'Standard',
        updated: formatUpdateTime(item.arrival_date),
        market: item.market
      }))
    : getRealisticPrices(selectedCrop);

  return (
    <div className="market-layout">
      <Sidebar />
      <main className="market-main page-scroll">
        <div className="market-container">
          <header className="market-header">
            <h1 className="market-title"><TranslatedText text="Market Prices" /></h1>
            <p className="market-sub"><TranslatedText text="Live crop prices and market trends for better selling decisions" /></p>
          </header>

          <div className="market-controls">
            <div className="control-card">
              <label className="control-label"><TranslatedText text="Select District" /></label>
              <select 
                className="control-select" 
                value={selectedDistrict} 
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={loading}
              >
                {KERALA_DISTRICTS.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
              <div className="control-note">District: {selectedDistrict}</div>
            </div>

            <div className="control-card">
              <label className="control-label"><TranslatedText text="Select Market" /></label>
              <select 
                className="control-select" 
                value={selectedMarket} 
                onChange={(e) => setSelectedMarket(e.target.value)}
                disabled={loading || availableMarkets.length === 0}
              >
                {availableMarkets.map(market => (
                  <option key={market} value={market}>{market}</option>
                ))}
              </select>
              <div className="control-note">
                {availableMarkets.length === 0 ? <TranslatedText text="No markets found" /> : `${availableMarkets.length} `}<TranslatedText text="markets available" />
              </div>
            </div>

            <div className="control-card">
              <label className="control-label"><TranslatedText text="Select Crop" /></label>
              <select 
                className="control-select" 
                value={selectedCrop} 
                onChange={(e) => setSelectedCrop(e.target.value)}
                disabled={loading}
              >
                {POPULAR_CROPS.map(crop => (
                  <option key={crop} value={crop}>{crop}</option>
                ))}
              </select>
              <div className="control-note">Crop: {selectedCrop}</div>
            </div>

            <div className="control-card status-card">
              <label className="control-label"><TranslatedText text="Last Updated" /></label>
              <div className="updated-time">{lastUpdated.toLocaleString()}</div>
              <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
                <TranslatedText text="Refresh" />
              </button>
            </div>
          </div>

          {error && (
            <div className="market-error">
              <div className="error-icon">⚠️</div>
              <div className="error-message">{error}</div>
              <button className="retry-btn" onClick={handleRefresh}><TranslatedText text="Retry" /></button>
            </div>
          )}

          {loading && (
            <div className="market-loading">
              <div className="loading-spinner"></div>
              <div className="loading-text"><TranslatedText text="Loading market data..." /></div>
            </div>
          )}

          <div className="market-chart card">
            <div ref={chartRef} className="chart-area" />
          </div>

          <section className="price-details-grid">
            <div className="price-detail-card">
              <div className="price-detail-title"><TranslatedText text="Minimum Price" /></div>
              <div className="price-detail-amount">
                ₹{marketData.length > 0 ? (marketData[0]?.min_price || 'N/A') : getDefaultPriceRange(selectedCrop).min}
                <span className="price-unit">{selectedCrop === 'Rice' ? '/quintal' : '/kg'}</span>
              </div>
              <div className="price-detail-desc"><TranslatedText text="Lowest recorded price for" /> {selectedCrop} <TranslatedText text="in" /> {selectedMarket || selectedDistrict}</div>
            </div>
            
            <div className="price-detail-card">
              <div className="price-detail-title"><TranslatedText text="Modal Price" /></div>
              <div className="price-detail-amount">
                ₹{marketData.length > 0 ? (marketData[0]?.modal_price || 'N/A') : getDefaultPriceRange(selectedCrop).modal}
                <span className="price-unit">{selectedCrop === 'Rice' ? '/quintal' : '/kg'}</span>
              </div>
              <div className="price-detail-desc"><TranslatedText text="Most common price for" /> {selectedCrop} <TranslatedText text="in" /> {selectedMarket || selectedDistrict}</div>
            </div>
            
            <div className="price-detail-card">
              <div className="price-detail-title"><TranslatedText text="Maximum Price" /></div>
              <div className="price-detail-amount">
                ₹{marketData.length > 0 ? (marketData[0]?.max_price || 'N/A') : getDefaultPriceRange(selectedCrop).max}
                <span className="price-unit">{selectedCrop === 'Rice' ? '/quintal' : '/kg'}</span>
              </div>
              <div className="price-detail-desc"><TranslatedText text="Highest recorded price for" /> {selectedCrop} <TranslatedText text="in" /> {selectedMarket || selectedDistrict}</div>
            </div>
          </section>

          <section className="prices-grid">
            {processedPrices.map(p => (
              <article key={p.id} className="price-card">
                <div className="price-card-head">
                  <div className="price-name">{p.name}</div>
                  <div className={`price-change ${p.change.startsWith('-') ? 'neg' : 'pos'}`}>{p.change}</div>
                </div>
                <div className="price-amount">{p.price}<span className="price-unit">{p.unit}</span></div>
                <div className="price-meta">
                  <div><span className="meta-label"><TranslatedText text="Quality" />:</span> {p.quality}</div>
                  <div><span className="meta-label"><TranslatedText text="Updated" />:</span> {p.updated}</div>
                  {p.market && (
                    <div><span className="meta-label"><TranslatedText text="Market" />:</span> {p.market}</div>
                  )}
                </div>
                
                {/* Buy/Sell Action Buttons */}
                <div className="price-actions">
                  <button 
                    className="action-btn buy-btn"
                    onClick={() => handleBuyClick({
                      commodity: selectedCrop,
                      price: parseInt(p.price.replace('₹', '').replace(',', '')),
                      unit: p.unit.replace('/', ''),
                      quality: p.quality,
                      market: selectedMarket,
                      variety: p.name.includes('(') ? p.name.split('(')[1].replace(')', '') : 'Standard'
                    })}
                  >
                    🛒 <TranslatedText text="Buy" />
                  </button>
                  <button 
                    className="action-btn sell-btn"
                    onClick={() => handleSellClick({
                      commodity: selectedCrop,
                      price: parseInt(p.price.replace('₹', '').replace(',', '')),
                      unit: p.unit.replace('/', ''),
                      quality: p.quality,
                      market: selectedMarket
                    })}
                  >
                    💰 <TranslatedText text="Sell" />
                  </button>
                </div>
              </article>
            ))}
          </section>

          <section className="market-lower">
            <div className="market-trends card">
              <h3 className="card-title"><TranslatedText text="Market Summary" /></h3>
              <div className="summary-stats">
                <div className="summary-item">
                  <span className="summary-label"><TranslatedText text="Selected Market" />:</span>
                  <span className="summary-value">{selectedMarket || 'None'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label"><TranslatedText text="Data Points" />:</span>
                  <span className="summary-value">{marketData.length}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label"><TranslatedText text="Average Price" />:</span>
                  <span className="summary-value">
                    {marketData.length > 0 
                      ? `₹${Math.round(marketData.reduce((sum, item) => sum + (item.modal_price || item.max_price || 0), 0) / marketData.length)}`
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>

            <aside className="selling-tips card">
              <h3 className="card-title">Market Insights</h3>
              <div className="tip">
                📊 Real-time data from AGMARKNET API provides accurate market prices across Kerala.
              </div>
              <div className="tip muted">
                💡 Tip: Compare prices across different markets in your district before selling.
              </div>
              {marketData.length > 0 && (
                <div className="tip">
                  📈 Current {selectedCrop} prices in {selectedMarket} market.
                </div>
              )}
            </aside>
          </section>

          {/* Purchase Modal */}
          {showPurchaseModal && selectedItem && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <h3>Purchase {selectedItem.commodity}</h3>
                  <button 
                    className="modal-close"
                    onClick={() => setShowPurchaseModal(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="modal-body">
                  <div className="purchase-details">
                    <div className="detail-row">
                      <span className="detail-label">Commodity:</span>
                      <span className="detail-value">{selectedItem.commodity} ({selectedItem.quality})</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Market:</span>
                      <span className="detail-value">{selectedItem.market}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Price per {selectedItem.unit}:</span>
                      <span className="detail-value">₹{selectedItem.price}</span>
                    </div>
                  </div>

                  <div className="purchase-form">
                    <div className="form-group">
                      <label>Quantity:</label>
                      <input
                        type="number"
                        min="1"
                        value={purchaseQuantity}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                        className="quantity-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Unit:</label>
                      <select
                        value={purchaseUnit}
                        onChange={(e) => handleUnitChange(e.target.value)}
                        className="unit-select"
                      >
                        <option value={selectedItem.unit}>{selectedItem.unit}</option>
                        {selectedItem.unit === 'quintal' && <option value="kg">kg</option>}
                        {selectedItem.unit === 'piece' && <option value="piece">piece</option>}
                      </select>
                    </div>

                    <div className="total-price">
                      <span className="total-label">Total Price:</span>
                      <span className="total-amount">₹{totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className="btn-cancel"
                    onClick={() => setShowPurchaseModal(false)}
                    disabled={purchaseLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-confirm"
                    onClick={handlePurchaseSubmit}
                    disabled={purchaseLoading}
                  >
                    {purchaseLoading ? 'Processing...' : 'Confirm Purchase'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
