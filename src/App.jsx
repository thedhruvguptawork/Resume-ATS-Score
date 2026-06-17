import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Trash2, 
  Check, 
  AlertTriangle,
  RotateCcw,
  Flag,
  Zap,
  Info
} from 'lucide-react';
import { parsePdf, parseDocx } from './utils/parser';

// Pre-configured Gemini 
//  Key loaded from Vite env
const PRECONFIGURED_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ;

function App() {
  // Input states (restarts on page refresh: no localStorage getters/setters for text or results)
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [showJobDesc, setShowJobDesc] = useState(false);
  const [fileName, setFileName] = useState('');
  
  // UI and Analysis States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0); 
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [rawFallback, setRawFallback] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Typewriter effect title state
  const [typedTitle, setTypedTitle] = useState('');
  
  // Easing/Stagger triggers
  const [displayScore, setDisplayScore] = useState(0);
  const [barsActive, setBarsActive] = useState(false);
  const [itemsActive, setItemsActive] = useState(false);

  const fileInputRef = useRef(null);

  // Title Typewriter Effect on Mount
  useEffect(() => {
    const fullTitle = 'RÉSUMÉ AUTOPSY';
    let index = 0;
    const interval = setInterval(() => {
      setTypedTitle(fullTitle.substring(0, index + 1));
      index++;
      if (index >= fullTitle.length) {
        clearInterval(interval);
      }
    }, 60);
    return () => clearInterval(interval);
  }, []);

  // Set up intersection observer for scroll reveals
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.05 });
    
    const targets = document.querySelectorAll('.reveal-section');
    targets.forEach(t => observer.observe(t));
    
    return () => observer.disconnect();
  }, [analysisResult, rawFallback]);

  // Easing and stagger triggers when results change
  useEffect(() => {
    if (!analysisResult) return;
    
    // 1. Score count up over 1.2s (easeOutQuart)
    const target = analysisResult.ats_score;
    let startTimestamp = null;
    const duration = 1200;
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      setDisplayScore(Math.floor(easedProgress * target));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayScore(target);
      }
    };
    window.requestAnimationFrame(step);

    // 2. Trigger category bars width scale with 100ms staggers
    setBarsActive(false);
    const barsTimer = setTimeout(() => {
      setBarsActive(true);
    }, 100);

    // 3. Trigger list suggestions slide-ins with 30ms staggers
    setItemsActive(false);
    const itemsTimer = setTimeout(() => {
      setItemsActive(true);
    }, 300);

    return () => {
      clearTimeout(barsTimer);
      clearTimeout(itemsTimer);
    };
  }, [analysisResult]);

  // Progress bar animation during loading states
  useEffect(() => {
    let interval;
    if (isLoading) {
      setLoadingProgress(0);
      interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev < 90) return prev + Math.floor(Math.random() * 8) + 2;
          return prev;
        });
      }, 200);
    } else {
      setLoadingProgress(100);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Input Event handlers
  const handleResumeTextChange = (e) => {
    setResumeText(e.target.value);
  };

  const handleJobDescChange = (e) => {
    setJobDescription(e.target.value);
  };

  // Drag and drop events
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  const processUploadedFile = async (file) => {
    setError(null);
    setIsLoading(true);
    setLoadingStep(1); 
    setFileName(file.name);

    try {
      let text = '';
      if (file.name.endsWith('.pdf')) {
        text = await parsePdf(file);
      } else if (file.name.endsWith('.docx')) {
        text = await parseDocx(file);
      } else if (file.name.endsWith('.txt')) {
        text = await file.text();
      } else {
        throw new Error('Unsupported format. Please upload PDF, DOCX, or TXT file.');
      }

      if (!text.trim()) {
        throw new Error('This document has no readable text content.');
      }

      setResumeText(text);
    } catch (err) {
      console.error(err);
      setError(`File parse error: ${err.message}`);
      setFileName('');
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const removeFile = () => {
    setFileName('');
    setResumeText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getWordCount = (text) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const wordCount = getWordCount(resumeText);
  const isResumeShort = wordCount > 0 && wordCount < 100;

  // Analysis API Call
  const handleAnalyze = async () => {
    if (!resumeText.trim()) {
      setError('Resume content is empty.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setRawFallback('');
    setLoadingStep(2); 

    // Dynamically calculate today's date for current evaluation accuracy
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const prompt = `
TODAY'S DATE: ${today}

You are an expert Applicant Tracking System (ATS) analyst and senior HR consultant with 15+ years of experience in recruitment across tech, finance, marketing, and operations industries. You have deep knowledge of how ATS software (Workday, Greenhouse, Lever, iCIMS, Taleo) parses, ranks, and filters resumes.

Your job is to analyse the resume provided and return an HONEST, BRUTALLY ACCURATE ATS compatibility score and actionable feedback. Do NOT be encouraging for the sake of it — if a resume is weak, say so clearly. Recruiters depend on accuracy.

ANALYSIS INSTRUCTIONS:
- If a job description is provided, tailor your entire analysis to that specific role and industry.
- If no job description is provided, evaluate the resume as a general professional document.
- Identify exact missing keywords, weak phrasing, formatting issues, and structural problems that would cause ATS rejection or low ranking.
- Quantify everything you can — ATS systems reward numbers, metrics, and specifics.
- Important: Use the TODAY'S DATE value above to accurately judge employment timelines, gaps, and tenure of recently listed jobs.

SCORING RUBRIC (total 100 points):
- Keywords & Terminology (25 pts): Presence of industry-standard keywords, job-title relevance, technical skills, tools, certifications
- Work Experience Quality (25 pts): Use of action verbs, quantified achievements, relevance of roles, career progression clarity
- Formatting & Parseability (20 pts): Clean structure, no tables/columns/graphics that break ATS parsing, standard section headings, no headers/footers with critical info
- Skills Section (20 pts): Hard skills, soft skills, tools, technologies — completeness and relevance
- Education & Certifications (10 pts): Degree clarity, institution, year, relevant certifications

RESUME TEXT:
${resumeText}

${jobDescription ? `TARGET JOB DESCRIPTION:\n${jobDescription}` : ""}

RESPOND ONLY IN THIS EXACT JSON FORMAT — no preamble, no markdown, no explanation outside the JSON:

{
  "ats_score": 78,
  "score_breakdown": {
    "keywords": { "score": 18, "max": 25 },
    "work_experience": { "score": 20, "max": 25 },
    "formatting": { "score": 15, "max": 20 },
    "skills": { "score": 17, "max": 20 },
    "education": { "score": 8, "max": 10 }
  },
  "verdict": "Good",
  "overall_summary": "A brief summary of the evaluation.",
  "strengths": [
    "strength 1",
    "strength 2",
    "strength 3"
  ],
  "critical_improvements": [
    "actionable fix 1",
    "actionable fix 2",
    "actionable fix 3",
    "actionable fix 4",
    "actionable fix 5"
  ],
  "missing_keywords": ["keyword1", "keyword2", "keyword3"],
  "red_flags": ["anything that breaks parsing or recruiter concern"],
  "quick_wins": ["changes that take under 10 minutes to improve score"]
}
`;

    // Simulated progress transitions
    const stepTimer1 = setTimeout(() => setLoadingStep(3), 1500);
    const stepTimer2 = setTimeout(() => setLoadingStep(4), 3000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${PRECONFIGURED_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        }
      );

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        const errorMessage = errorJson?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) {
        throw new Error("No response returned from the Gemini model.");
      }

      try {
        const parsedResult = JSON.parse(rawText.trim());
        setAnalysisResult(parsedResult);
      } catch (jsonErr) {
        console.error("JSON parsing failed, fallback set:", jsonErr);
        setRawFallback(rawText);
        setError("Error: Received response, but could not parse the formatted dashboard. Showing raw autopsy report details.");
      }

    } catch (err) {
      console.error(err);
      setError(`Gemini API Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const handleReset = () => {
    setResumeText('');
    setJobDescription('');
    setFileName('');
    setAnalysisResult(null);
    setRawFallback('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Color mappings based on score range
  const getScoreColor = (score) => {
    if (score < 50) return '#C4452A'; // brick red
    if (score < 75) return '#E8C547'; // golden yellow
    return '#4CAF7D'; // muted green
  };

  const scoreColor = analysisResult ? getScoreColor(analysisResult.ats_score) : '#AAAAAA';

  const renderProgressCategory = (label, scoreObj, idx) => {
    const score = scoreObj?.score ?? 0;
    const max = scoreObj?.max ?? 100;
    const pct = max > 0 ? (score / max) * 100 : 0;

    return (
      <div key={label} className="category-progress-track">
        <div className="category-bar-label">
          <span>{label}</span>
          <span>{score}/{max}</span>
        </div>
        <div className="category-bar-bg">
          <div 
            className="category-bar-fill" 
            style={{ 
              width: barsActive ? `${pct}%` : '0%', 
              transitionDelay: `${idx * 100}ms` 
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="editorial-container">
      {/* Header with Creator and Heroes button in the hero area */}
      <header className="reveal-section visible" style={{ borderBottom: '1px solid #222222', paddingBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h1 className="headline-display">{typedTitle}</h1>
            <p className="subheadline-mono" style={{ maxWidth: '420px' }}>
              We read between the lines. ATS systems don't forgive — and neither do we.
            </p>
            {/* INITIATE AUTOPSY Scroll Trigger Button */}
            <div style={{ marginTop: '1.5rem' }}>
              <button 
                type="button"
                onClick={() => document.getElementById('autopsy-input-zone')?.scrollIntoView({ behavior: 'smooth' })}
                className="hero-action-btn"
              >
                INITIATE AUTOPSY ↓
              </button>
            </div>
          </div>
          <div className="header-meta-block">
            <div className="meta-line">CREATOR: DHRUV GUPTA</div>
            <div className="meta-line">CONTACT: <a href="mailto:thedhruvguptawork@gmail.com">thedhruvguptawork@gmail.com</a></div>
            <div style={{ marginTop: '0.85rem' }}>
              <a 
                href="https://digitalheroesco.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hero-outlined-pill-btn"
              >
                Built for Digital Heroes
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* How It Works */}
      <section className="reveal-section visible">
        <span className="label-mono">HOW IT WORKS</span>
        <div className="how-it-works-row">
          <div className="how-step-card">
            <span className="how-step-num">01</span>
            <h4 className="how-step-title">UPLOAD YOUR RESUME</h4>
            <p className="how-step-desc">Paste raw text or drop your PDF/DOCX file directly in the browser.</p>
          </div>
          <div className="how-step-card">
            <span className="how-step-num">02</span>
            <h4 className="how-step-title">AI RUNS THE AUTOPSY</h4>
            <p className="how-step-desc">Gemini analyses every line against industry keywords and recruiter standards.</p>
          </div>
          <div className="how-step-card">
            <span className="how-step-num">03</span>
            <h4 className="how-step-title">GET YOUR SCORE</h4>
            <p className="how-step-desc">Receive a brutally honest rating, red flags, and high-impact quick wins.</p>
          </div>
        </div>
      </section>

      {/* Benchmarks Grid (Visual filler) */}
      <section className="reveal-section visible">
        <h3 className="section-heading-serif">AUTOPSY METRICS & BENCHMARKS</h3>
        <p className="subheadline-mono" style={{ marginBottom: '1.25rem' }}>
          Our audit checks the 5 pillars of resume parseability and recruiter alignment:
        </p>
        <div className="metrics-grid">
          <div className="metric-row">
            <span className="metric-col-label">01 / PARSEABILITY</span>
            <span className="metric-col-desc">Checks for double columns, graphics, text boxes, and tables that block parser indexers.</span>
          </div>
          <div className="metric-row">
            <span className="metric-col-label">02 / KEYWORD ALIGNMENT</span>
            <span className="metric-col-desc">Evaluates industry-specific terms and direct matches to target job descriptions.</span>
          </div>
          <div className="metric-row">
            <span className="metric-col-label">03 / QUANTIFIABLE PROOF</span>
            <span className="metric-col-desc">Looks for metrics, percents, and dollar values. ATS and recruiters reward numbers.</span>
          </div>
          <div className="metric-row">
            <span className="metric-col-label">04 / FORMAT STRUCTURE</span>
            <span className="metric-col-desc">Audits standard headings (Experience, Education, Skills) to avoid parser routing errors.</span>
          </div>
          <div className="metric-row">
            <span className="metric-col-label">05 / ACTION DENSITY</span>
            <span className="metric-col-desc">Measures usage of high-impact action verbs vs. passive phrases or responsibilities list.</span>
          </div>
        </div>
      </section>

      {/* Resume Input Zone */}
      <section id="autopsy-input-zone" className="reveal-section visible" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <span className="label-mono">CHOOSE UPLOAD METHOD</span>
        
        <div className="input-zone-grid">
          {/* File Upload Zone */}
          {fileName ? (
            <div className="file-loaded-tag">
              <Check className="checkmark-tick" size={16} />
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.85rem' }}>{fileName}</span>
              <button onClick={removeFile} title="Remove File">
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <div 
              className={`editorial-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <Upload size={24} style={{ color: '#E8C547' }} />
              <span className="dropzone-label">DRAG & DROP FILE</span>
              <span className="dropzone-sub">PDF, DOCX, OR TXT</span>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pdf,.docx,.txt" 
                style={{ display: 'none' }} 
              />
            </div>
          )}

          <div className="vertical-divider">OR</div>

          {/* Textarea */}
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <textarea
              placeholder="PASTE RAW RESUME TEXT..."
              value={resumeText}
              onChange={handleResumeTextChange}
              className={`mono-input mono-textarea ${error && !resumeText.trim() ? 'error' : ''}`}
            />
          </div>
        </div>

        {error && !resumeText.trim() && <div className="error-message">Resume content is required.</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
          <span className={`word-count-badge ${isResumeShort ? 'warning' : ''}`} style={{ fontFamily: 'IBM Plex Mono' }}>
            {wordCount} WORDS
          </span>
          {isResumeShort && (
            <span className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: 0 }}>
              <AlertTriangle size={12} /> SHORT RESUMES MAY YIELD LESS ACCURATE AUDITS
            </span>
          )}
        </div>
      </section>

      {/* Collapsible Optional Job Description */}
      <section className="reveal-section visible">
        <button 
          type="button" 
          className="editorial-collapse-btn"
          onClick={() => setShowJobDesc(!showJobDesc)}
        >
          {showJobDesc ? '−' : '+'} ADD JOB DESCRIPTION (IMPROVES SCORING ACCURACY)
        </button>

        {showJobDesc && (
          <div className="collapsible-content">
            <textarea
              placeholder="PASTE THE TARGET JOB DESCRIPTION..."
              value={jobDescription}
              onChange={handleJobDescChange}
              className="mono-input"
              style={{ minHeight: '130px', resize: 'vertical' }}
            />
          </div>
        )}
      </section>

      {/* Buttons and Loading State */}
      <section className="reveal-section visible">
        {isLoading ? (
          <div className="autopsy-progress-container">
            <div className="autopsy-progress-bar" style={{ width: `${loadingProgress}%` }} />
            <span className="autopsy-progress-label">
              {loadingStep === 1 && 'Reading Document...'}
              {loadingStep === 2 && 'Structuring Autopsy...'}
              {loadingStep === 3 && 'Evaluating ATS Rubric...'}
              {loadingStep === 4 && 'Assembling Findings...'}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            {analysisResult || rawFallback || resumeText ? (
              <button 
                type="button" 
                onClick={handleReset} 
                className="btn btn-secondary"
                style={{ flex: '0 0 auto', width: 'auto', padding: '0 1.25rem' }}
                title="Reset Autopsy Settings"
              >
                <RotateCcw size={18} />
              </button>
            ) : null}
            <button 
              type="button" 
              onClick={handleAnalyze} 
              disabled={isLoading || !resumeText.trim()}
              className="analyse-btn"
              style={{ flex: 1 }}
            >
              RUN AUTOPSY
            </button>
          </div>
        )}
      </section>

      {/* Error Output block */}
      {error && resumeText.trim() && (
        <section className="reveal-section visible error-panel">
          <div className="error-header">
            <AlertTriangle size={20} />
            <span>AUTOPSY FAILED</span>
          </div>
          <div className="error-body">{error}</div>
          <button type="button" onClick={handleAnalyze} className="analyse-btn" style={{ marginTop: '1rem' }}>
            RE-RUN AUTOPSY
          </button>
        </section>
      )}

      {/* RESULTS DISPLAY PANEL */}
      {!isLoading && (analysisResult || rawFallback) && (
        <div className="editorial-results">
          
          {/* Score Block */}
          {analysisResult && (
            <section className="reveal-section score-card-layout">
              <div className="score-card-left">
                <h2 className="massive-score-num" style={{ color: scoreColor }}>
                  {displayScore}
                </h2>
                <div className="verdict-badge-box" style={{ color: scoreColor }}>
                  {analysisResult.verdict || 'Needs Work'}
                </div>
              </div>
              <div className="score-card-right">
                {renderProgressCategory('Keywords & Terminology', analysisResult.score_breakdown?.keywords, 0)}
                {renderProgressCategory('Work Experience', analysisResult.score_breakdown?.work_experience, 1)}
                {renderProgressCategory('Formatting & Parse', analysisResult.score_breakdown?.formatting, 2)}
                {renderProgressCategory('Skills Match', analysisResult.score_breakdown?.skills, 3)}
                {renderProgressCategory('Education & Cert', analysisResult.score_breakdown?.education, 4)}
              </div>
            </section>
          )}

          {/* Verdict Summary */}
          {analysisResult && (
            <section className="reveal-section">
              <h3 className="section-heading-serif">THE VERDICT</h3>
              <p style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.9rem', lineHeight: 1.7, color: '#AAAAAA' }}>
                {analysisResult.overall_summary || analysisResult.overall_verdict}
              </p>
            </section>
          )}

          {/* Red Flags Panel */}
          {analysisResult && analysisResult.red_flags && analysisResult.red_flags.length > 0 && (
            <section className="reveal-section red-flags-block-panel">
              <h3 className="red-flags-heading">⚠ RED FLAGS</h3>
              <ul className="list-items" style={{ paddingLeft: 0 }}>
                {analysisResult.red_flags.map((rf, idx) => (
                  <li 
                    key={idx} 
                    className={`stagger-item stagger-line ${itemsActive ? 'visible' : ''}`}
                    style={{ transitionDelay: `${idx * 30}ms` }}
                  >
                    <span>{rf}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Strengths */}
          {analysisResult && (
            <section className="reveal-section">
              <h3 className="section-heading-serif">WHAT'S WORKING</h3>
              <ul className="list-items stagger-list-container">
                {analysisResult.strengths?.map((str, idx) => (
                  <li 
                    key={idx} 
                    className={`stagger-item stagger-line ${itemsActive ? 'visible' : ''}`}
                    style={{ transitionDelay: `${idx * 30}ms` }}
                  >
                    <span className="prefix golden-triangle">▸</span>
                    <span>{str}</span>
                  </li>
                ))}
                {(!analysisResult.strengths || analysisResult.strengths.length === 0) && (
                  <li className="stagger-line" style={{ color: '#444444' }}>No significant strengths identified.</li>
                )}
              </ul>
            </section>
          )}

          {/* Critical Improvements */}
          {analysisResult && (
            <section className="reveal-section">
              <h3 className="section-heading-serif">WHAT'S KILLING YOUR SCORE</h3>
              <ul className="list-items stagger-list-container">
                {analysisResult.critical_improvements?.map((imp, idx) => (
                  <li 
                    key={idx} 
                    className={`stagger-item stagger-line ${itemsActive ? 'visible' : ''}`}
                    style={{ transitionDelay: `${idx * 30}ms` }}
                  >
                    <span className="prefix brick-arrow">→</span>
                    <span>{imp}</span>
                  </li>
                ))}
                {(!analysisResult.critical_improvements || analysisResult.critical_improvements.length === 0) && (
                  <li className="stagger-line" style={{ color: '#444444' }}>No critical score issues reported.</li>
                )}
              </ul>
            </section>
          )}

          {/* Quick Wins */}
          {analysisResult && (
            <section className="reveal-section">
              <h3 className="section-heading-serif">QUICK WINS (&lt; 10 MIN)</h3>
              <ul className="list-items stagger-list-container">
                {analysisResult.quick_wins?.map((qw, idx) => (
                  <li 
                    key={idx} 
                    className={`stagger-item stagger-line ${itemsActive ? 'visible' : ''}`}
                    style={{ transitionDelay: `${idx * 30}ms` }}
                  >
                    <span className="prefix green-check">✓</span>
                    <span>{qw}</span>
                  </li>
                ))}
                {(!analysisResult.quick_wins || analysisResult.quick_wins.length === 0) && (
                  <li className="stagger-line" style={{ color: '#444444' }}>No quick fixes recommended.</li>
                )}
              </ul>
            </section>
          )}

          {/* Missing Keywords */}
          {analysisResult && (
            <section className="reveal-section">
              <h3 className="section-heading-serif">MISSING KEYWORDS</h3>
              {analysisResult.missing_keywords && analysisResult.missing_keywords.length > 0 ? (
                <div className="keywords-pills-wrap">
                  {analysisResult.missing_keywords.map((kw, idx) => (
                    <span key={idx} className="editorial-keyword-pill">
                      {kw}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.9rem', color: '#4CAF7D' }}>
                  No critical missing keywords identified. Your resume matches key target terminology.
                </div>
              )}
            </section>
          )}

          {/* Raw Report Fallback */}
          {rawFallback && (
            <section className="reveal-section">
              <h3 className="section-heading-serif" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={20} />
                RAW AUTOPSY FINDINGS
              </h3>
              <div className="raw-fallback-details">
                <pre className="raw-fallback-text">{rawFallback}</pre>
              </div>
            </section>
          )}

        </div>
      )}

      {/* Footer credits */}
      <footer className="editorial-footer">
        <div>
          Built by Dhruv Gupta · thedhruvguptawork@gmail.com
        </div>
      </footer>
    </div>
  );
}

export default App;
