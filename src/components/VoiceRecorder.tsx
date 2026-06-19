import React, { useState, useRef } from 'react';
import { useAsana } from '../context/AsanaContext';
import * as Icons from 'lucide-react';

export const VoiceRecorder: React.FC = () => {
  const { zones, outlets, submitVoiceBroadcast, activeUser } = useAsana();

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);

  // Targets states
  const [targetRoles, setTargetRoles] = useState<string[]>(['store_manager']);
  const [targetZones, setTargetZones] = useState<string[]>([]);
  const [targetOutlets, setTargetOutlets] = useState<string[]>([]);
  const [transcription, setTranscription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inputLanguage, setInputLanguage] = useState<'ml-IN' | 'en-US'>('ml-IN');
  const [isTranslating, setIsTranslating] = useState(false);
  const recognitionRef = useRef<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert blob to base64 for database transfer
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };

        // Stop stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Set up Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = inputLanguage;

        let fullTranscript = '';
        rec.onresult = async (event: any) => {
          const resultText = event.results[event.results.length - 1][0].transcript;
          fullTranscript += (fullTranscript ? ' ' : '') + resultText;
          setTranscription(fullTranscript);
        };

        rec.onend = async () => {
          if (fullTranscript.trim()) {
            if (inputLanguage === 'ml-IN') {
              setIsTranslating(true);
              setTranscription(prev => prev + '\n\nTranslating to English...');
              try {
                const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ml&tl=en&dt=t&q=${encodeURIComponent(fullTranscript)}`);
                if (res.ok) {
                  const data = await res.json();
                  const translation = data[0][0][0] || '';
                  setTranscription(`[Malayalam]\n${fullTranscript}\n\n[English Translation]\n${translation}`);
                } else {
                  setTranscription(`[Malayalam]\n${fullTranscript}`);
                }
              } catch (err) {
                console.error(err);
                setTranscription(`[Malayalam]\n${fullTranscript}`);
              }
              setIsTranslating(false);
            } else {
              setTranscription(fullTranscript);
            }
          }
        };

        recognitionRef.current = rec;
        rec.start();
      }

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Mic access error', e);
      alert('Microphone access denied. You can still type the text summary to broadcast guidelines.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  const clearRecording = () => {
    setAudioUrl(null);
    setAudioBase64('');
    setRecordingTime(0);
    setTranscription('');
  };

  const toggleRole = (role: string) => {
    setTargetRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const toggleZone = (zoneId: string) => {
    setTargetZones(prev =>
      prev.includes(zoneId) ? prev.filter(z => z !== zoneId) : [...prev, zoneId]
    );
  };

  const toggleOutlet = (outletId: string) => {
    setTargetOutlets(prev =>
      prev.includes(outletId) ? prev.filter(o => o !== outletId) : [...prev, outletId]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcription.trim() && !audioBase64) {
      alert('Please record audio or type a guide description.');
      return;
    }

    setSubmitting(true);
    await submitVoiceBroadcast(audioBase64, transcription.trim(), {
      roles: targetRoles,
      zones: targetZones,
      outlets: targetOutlets
    });
    setSubmitting(false);

    // Reset Form
    clearRecording();
    setTranscription('');
    alert(`${activeUser?.role === 'ceo' ? 'CEO' : 'Manager'} Voice Instruction broadcasted successfully across targeted outlets!`);
  };

  return (
    <div className="voice-recorder-widget">
      <div className="widget-card-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icons.Mic size={18} className="royal-icon" />
          <h3>Broadcast {activeUser?.role === 'ceo' ? 'CEO' : 'Manager'} Voice Instruction</h3>
        </div>
        <div className="language-selector" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-secondary)' }}>Input Lang:</label>
          <select 
            value={inputLanguage} 
            onChange={(e) => setInputLanguage(e.target.value as any)}
            className="dropdown-pj"
            disabled={isRecording}
            style={{ 
              padding: '4px 8px', 
              fontSize: '12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <option value="ml-IN">Malayalam (മലയാളം)</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleBroadcast} className="voice-broadcast-form">
        {/* Audio Recording Panel */}
        <div className="recording-dashboard-panel">
          {isRecording ? (
            <div className="recording-wave-visualizer">
              <div className="time-counter">{formatTime(recordingTime)}</div>
              <div className="wave-bars-container">
                <span className="wave-bar wb-1"></span>
                <span className="wave-bar wb-2"></span>
                <span className="wave-bar wb-3"></span>
                <span className="wave-bar wb-4"></span>
                <span className="wave-bar wb-5"></span>
                <span className="wave-bar wb-6"></span>
                <span className="wave-bar wb-5"></span>
                <span className="wave-bar wb-4"></span>
                <span className="wave-bar wb-3"></span>
                <span className="wave-bar wb-2"></span>
                <span className="wave-bar wb-1"></span>
              </div>
              <button 
                type="button" 
                className="stop-rec-btn" 
                onClick={stopRecording}
              >
                <Icons.Square size={16} fill="white" />
                <span>Stop Recording</span>
              </button>
            </div>
          ) : audioUrl ? (
            <div className="audio-playback-panel animate-scale-up">
              <audio src={audioUrl} controls className="custom-html5-audio" />
              <button 
                type="button" 
                className="clear-rec-btn"
                onClick={clearRecording}
              >
                <Icons.RefreshCw size={14} />
                <span>Record Again</span>
              </button>
            </div>
          ) : (
            <button 
              type="button" 
              className="start-rec-btn animate-fade-in"
              onClick={startRecording}
            >
              <div className="mic-badge">
                <Icons.Mic size={24} fill="currentColor" />
              </div>
              <span>Start Recording Voice Guideline</span>
            </button>
          )}
        </div>

        {/* Text Area Summary */}
        <div className="broadcast-form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label>Transcription / Guidelines Summary</label>
            {isTranslating && (
              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icons.Loader2 size={10} className="spinner-pj" />
                Translating...
              </span>
            )}
          </div>
          <textarea
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder={isTranslating ? "Translating from Malayalam..." : "Type or speak to auto-transcribe instructions..."}
            required={!audioBase64}
          />
        </div>

        {/* Selection Targets Accordion */}
        <div className="targets-configuration-panel">
          {/* 1. Target Roles */}
          <div className="target-accordion-section">
            <h5>1. Target Roles</h5>
            <div className="checkboxes-row">
              {['zonal_manager', 'store_manager', 'employee'].map(role => (
                <label key={role} className="target-checkbox-label">
                  <input
                    type="checkbox"
                    checked={targetRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  <span className="checkbox-custom-name">
                    {role.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 2. Target Zones */}
          <div className="target-accordion-section">
            <h5>2. Target Zones (All if empty)</h5>
            <div className="checkboxes-row">
              {zones.map(z => (
                <label key={z.id} className="target-checkbox-label">
                  <input
                    type="checkbox"
                    checked={targetZones.includes(z.id)}
                    onChange={() => toggleZone(z.id)}
                  />
                  <span className="checkbox-custom-name">{z.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 3. Target Outlets */}
          <div className="target-accordion-section">
            <h5>3. Target Outlets (All if empty)</h5>
            <div className="outlets-checkboxes-grid">
              {outlets.map(o => (
                <label key={o.id} className="target-checkbox-label">
                  <input
                    type="checkbox"
                    checked={targetOutlets.includes(o.id)}
                    onChange={() => toggleOutlet(o.id)}
                  />
                  <span className="checkbox-custom-name">{o.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button 
          type="submit" 
          className="primary-btn submit-broadcast-btn"
          disabled={submitting}
        >
          <Icons.Radio size={16} />
          {submitting ? 'Broadcasting API...' : `Submit ${activeUser?.role === 'ceo' ? 'CEO' : 'Manager'} Broadcast Guideline`}
        </button>
      </form>

      <style>{`
        .voice-recorder-widget {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 20px;
        }

        .widget-card-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          color: var(--primary);
        }

        .widget-card-title-row h3 {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 600;
        }

        .voice-broadcast-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Recording dashboards */
        .recording-dashboard-panel {
          border: 1px dashed var(--border-color);
          background-color: var(--bg-secondary);
          border-radius: var(--radius-sm);
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 120px;
        }

        .start-rec-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .start-rec-btn:hover {
          color: var(--primary);
        }

        .mic-badge {
          background-color: var(--accent-light);
          color: var(--primary);
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform var(--transition-fast);
        }

        .start-rec-btn:hover .mic-badge {
          transform: scale(1.08);
          background-color: var(--border-color);
        }

        .stop-rec-btn {
          background-color: var(--color-danger);
          color: white;
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 12px;
        }

        .audio-playback-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .custom-html5-audio {
          width: 100%;
          height: 36px;
        }

        .clear-rec-btn {
          font-size: 11px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Waves animation */
        .recording-wave-visualizer {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .time-counter {
          font-size: 20px;
          font-weight: 700;
          font-family: var(--font-display);
          color: var(--color-danger);
          margin-bottom: 8px;
        }

        .wave-bars-container {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 24px;
        }

        .wave-bar {
          width: 3px;
          background-color: var(--color-danger);
          border-radius: var(--radius-full);
          animation: waveGrow 1s ease-in-out infinite;
        }

        .wb-1 { height: 6px; animation-delay: 0.1s; }
        .wb-2 { height: 12px; animation-delay: 0.2s; }
        .wb-3 { height: 20px; animation-delay: 0.3s; }
        .wb-4 { height: 14px; animation-delay: 0.4s; }
        .wb-5 { height: 18px; animation-delay: 0.5s; }
        .wb-6 { height: 8px; animation-delay: 0.6s; }

        @keyframes waveGrow {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.6); }
        }

        /* Input Summary */
        .broadcast-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .broadcast-form-group label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .broadcast-form-group textarea {
          width: 100%;
          min-height: 80px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          font-size: 13px;
          resize: vertical;
          background-color: var(--bg-secondary);
        }

        .broadcast-form-group textarea:focus {
          outline: none;
          border-color: var(--primary);
        }

        /* Target Configurations */
        .targets-configuration-panel {
          border: 1px solid var(--border-color);
          background-color: var(--bg-secondary);
          border-radius: var(--radius-sm);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .target-accordion-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .target-accordion-section h5 {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
        }

        .checkboxes-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        .outlets-checkboxes-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .target-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-primary);
          font-weight: 500;
          cursor: pointer;
        }

        .checkbox-custom-name {
          text-transform: capitalize;
        }

        .submit-broadcast-btn {
          width: 100%;
          justify-content: center;
          padding: 12px;
          font-weight: 600;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};
