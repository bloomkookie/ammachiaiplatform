import React, { useState } from 'react';
import './detect.css';
import Sidebar from '../components/Sidebar.jsx';
import TranslatedText from '../components/TranslatedText';
import { useLanguage } from '../context/LanguageContext';
import { translate } from '../utils/translate';
import { apiFetch } from '../utils/api';

export default function Detect(){
  const { language } = useLanguage();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [remedies, setRemedies] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGettingRemedies, setIsGettingRemedies] = useState(false);
  const [error, setError] = useState(null);


  function onChoose(e){
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(f.type)) {
      setError(<TranslatedText text="Please upload a valid image file (JPG, PNG)" />);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError(<TranslatedText text="File size must be less than 5MB" />);
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setRemedies(null);
    setError(null);
  }

  function onDrop(e){
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(f.type)) {
      setError('Please upload a valid image file (JPG, PNG)');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setRemedies(null);
    setError(null);
  }

  function onDragOver(e){ e.preventDefault(); }
  function onDragEnter(e){ e.preventDefault(); }
  function onDragLeave(e){ e.preventDefault(); }

  async function analyzeDisease(){
    if (!file) return;

    setIsProcessing(true);
    setResult(null);
    setRemedies(null);
    setError(null);

    try {
      // Use backend API endpoint like Chat.jsx does
      const formData = new FormData();
      formData.append('image', file);
      formData.append('language', language); // Send language preference

      const response = await apiFetch('/api/disease/detect', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.result) {
        // Track crops scanned for activity statistics
        const currentCount = parseInt(localStorage.getItem('cropsScanned') || '0');
        localStorage.setItem('cropsScanned', (currentCount + 1).toString());
        
        // Track daily activity
        const today = new Date().toDateString();
        const activeDays = JSON.parse(localStorage.getItem('activeDays') || '[]');
        if (!activeDays.includes(today)) {
          activeDays.push(today);
          localStorage.setItem('activeDays', JSON.stringify(activeDays));
        }
        
        // Handle backend response format
        const result = data.result;
        
        let parsed;
        if (result.plant_name) {
          // Structured response from Gemini
          parsed = {
            isHealthy: result.is_healthy,
            diseaseName: result.disease_name || "No disease detected",
            description: result.treatment || result.analysis || "Analysis completed",
            remedies: result.prevention ? [result.prevention] : [],
            confidence: result.confidence || 80,
            plantName: result.plant_name
          };
        } else if (result.analysis) {
          // Parse text response and format it better
          const analysis = result.analysis;
          
          // Try to extract disease name from the analysis
          const diseaseMatch = analysis.match(/\*\*Disease\/Pest\*\*[:\s]*([^\n\r*]+)/i) || 
                               analysis.match(/Disease\/Pest[:\s]*([^\n\r*]+)/i) ||
                               analysis.match(/Disease[:\s]*([^\n\r.]+)/i);
          const diseaseName = diseaseMatch ? diseaseMatch[1].trim() : "Disease detected";
          
          // Extract plant name
          const plantMatch = analysis.match(/\*\*Plant\*\*[:\s]*([^\n\r*]+)/i);
          const plantName = plantMatch ? plantMatch[1].trim() : null;
          
          // Extract confidence
          const confidenceMatch = analysis.match(/\*\*Confidence\*\*[:\s]*(\d+)/i);
          const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) * 10 : 85;
          
          parsed = {
            isHealthy: false,
            diseaseName: diseaseName,
            plantName: plantName,
            description: "Disease detected - see treatment below",
            remedies: [],
            confidence: confidence,
            fullAnalysis: analysis
          };
        } else {
          // Fallback text response
          parsed = {
            isHealthy: true,
            description: result.analysis || "Analysis completed",
            confidence: 70
          };
        }

        setResult(parsed);

        if (!parsed.isHealthy && parsed.diseaseName) {
          setRemedies(parsed.remedies?.join("\n") || translate("No specific remedies provided"));
        }
      } else {
        throw new Error(data.message || "Failed to analyze image");
      }
    } catch (err) {
      console.error('Disease detection error:', err);
      setError(<TranslatedText text="Failed to analyze the image. Please try again with a clearer photo." />);
    } finally {
      setIsProcessing(false);
    }
  }

  function resetDetection() {
    setPreview(null);
    setFile(null);
    setResult(null);
    setRemedies(null);
    setError(null);
  }

  // helper: file → base64
  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  return (
    <div className="detect-layout">
      <Sidebar />
      <main className="detect-main page-scroll">
        <div className="detect-container">
          <header className="detect-header">
            <h1 className="detect-title"><TranslatedText text="Disease Detection" /></h1>
            <p className="detect-sub"><TranslatedText text="Upload a photo of your crop to detect diseases" /> 🔬</p>
          </header>

          {error && (
            <div className="error-card card">
              <div className="error-icon">⚠️</div>
              <div className="error-message">{error}</div>
              <button className="error-close" onClick={() => setError(null)}>×</button>
            </div>
          )}

          {/* Upload Section */}
          <div className="upload-card card" 
               onDrop={onDrop} 
               onDragOver={onDragOver}
               onDragEnter={onDragEnter}
               onDragLeave={onDragLeave}>
            <div className="upload-inner">
              <h3><TranslatedText text="Upload Crop Photo" /></h3>
              <p className="upload-note"><TranslatedText text="Drag and drop your image here, or click to browse" /></p>
              <div className="upload-actions">
                <label className="choose-btn">
                  📁 Choose File
                  <input type="file" accept="image/*" onChange={onChoose} />
                </label>
              </div>
              <div className="formats">Supported formats: JPG, PNG • Max size: 5MB</div>
            </div>
          </div>

          {preview && (
            <div className="preview-section card">
              <div className="preview-image-container">
                <img src={preview} alt="Crop preview" className="preview-img" />
                <div className="preview-overlay">
                  <button className="preview-remove" onClick={resetDetection} title="Remove image">×</button>
                </div>
              </div>
              <div className="preview-info">
                <h4>Ready for Analysis</h4>
                <p>Click "Analyze Photo" to detect diseases in your crop image</p>
                <div className="preview-actions">
                  <button className="btn-outline" onClick={resetDetection}>Remove</button>
                  <button 
                    className="btn-submit" 
                    onClick={analyzeDisease} 
                    disabled={isProcessing || !file}
                  >
                    {isProcessing ? (
                      <>
                        <span className="spinner"></span>
                        Analyzing...
                      </>
                    ) : (
                      <>🔍 Analyze Photo</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="result-card card">
              <div className="result-header">
                <h3>
                  {result.isHealthy ? "✅ Healthy Plant" : "🦠 Disease Detected"}
                </h3>
                {result.confidence && (
                  <div className="confidence-badge">
                    {result.confidence}% confidence
                  </div>
                )}
              </div>

              <div className="health-status">
                <h4>🏥 Health Assessment</h4>
                <div className={`health-indicator ${result.isHealthy ? 'healthy' : 'diseased'}`}>
                  {result.isHealthy ? 'Plant appears healthy' : 'Disease detected'}
                </div>
              </div>

              {!result.isHealthy && (
                <div className="disease-result">
                  <div className="disease-details">
                    <h4>🦠 Disease Information</h4>
                    <div className="disease-info-grid">
                      <div className="info-item">
                        <strong>Disease:</strong> {result.diseaseName}
                      </div>
                      {result.plantName && (
                        <div className="info-item">
                          <strong>Plant:</strong> {result.plantName}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {(remedies || (result.remedies && result.remedies.length > 0) || result.fullAnalysis) && (
                    <div className="remedies-section">
                      <h4>💊 Quick Treatment</h4>
                      <div className="treatment-grid">
                        {result.fullAnalysis && (
                          <div className="treatment-bullets">
                            {result.fullAnalysis.split('\n').filter(line => line.includes('•')).map((line, index) => (
                              <div key={index} className="bullet-item" dangerouslySetInnerHTML={{
                                __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/•/, '•')
                              }} />
                            ))}
                          </div>
                        )}
                        
                        {result.remedies && result.remedies.length > 0 && (
                          <ul className="remedies-bullets">
                            {result.remedies.map((remedy, index) => (
                              <li key={index} className="remedy-bullet" dangerouslySetInnerHTML={{
                                __html: remedy.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              }} />
                            ))}
                          </ul>
                        )}
                        
                        {remedies && !result.remedies && (
                          <div className="remedies-text">
                            {remedies.split('\n').filter(line => line.trim()).map((line, index) => (
                              <div key={index} className="remedy-line">{line}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {result.fullAnalysis && (
                    <div className="full-analysis-section">
                      <details>
                        <summary>📋 View Full Analysis</summary>
                        <div className="full-analysis-content">
                          {result.fullAnalysis.split('\n').map((line, index) => (
                            <p key={index} dangerouslySetInnerHTML={{
                              __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            }} />
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
