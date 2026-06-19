import React, { useState, useRef, useEffect } from 'react';
import { useAsana } from '../context/AsanaContext';
import type { Candidate, Punch } from '../context/AsanaContext';
import * as Icons from 'lucide-react';

export const HRView: React.FC = () => {
  const {
    users,
    candidates,
    punches,
    grades,
    addCandidate,
    triggerAICall,
    updateCandidateOnboarding,
    uploadPunches,
    outlets
  } = useAsana();

  // Tab State
  const [activeTab, setActiveTab] = useState<'attendance' | 'recruitment' | 'payroll' | 'onboarding'>('attendance');

  // Notification Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Attendance Intelligence States
  const [csvText, setCsvText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [whatsappAlerts, setWhatsappAlerts] = useState<{ [key: string]: boolean }>({
    o1: true,
    o2: false,
    o3: true,
    o4: false
  });

  // 2. AI Recruiter States
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('All');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(35);
  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);

  // 2b. Interactive AI Call Modal States
  const [activeCallCandidate, setActiveCallCandidate] = useState<Candidate | null>(null);
  const [callStep, setCallStep] = useState<number>(0); // 0: Dialing, 1: Q1, 2: A1, 3: Q2, 4: A2, 5: Wrapup, 6: Ended
  const [callTranscript, setCallTranscript] = useState<{ speaker: string; text: string }[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState('');
  const [inputLanguage, setInputLanguage] = useState<'ml-IN' | 'en-US'>('ml-IN');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const recognitionRef = useRef<any>(null);

  // 3. Payroll States
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [onamBonus, setOnamBonus] = useState<number>(0);
  const [globalOnamBonus, setGlobalOnamBonus] = useState<number>(0);

  // 4. Onboarding States
  const [selectedOnboardCandId, setSelectedOnboardCandId] = useState<string>('');

  // Auto-select first employee for payroll slip compiler
  useEffect(() => {
    const payrollEmployees = users.filter(u => u.role !== 'admin' && u.role !== 'ceo');
    if (payrollEmployees.length > 0 && !selectedEmpId) {
      setSelectedEmpId(payrollEmployees[0].id);
    }
  }, [users, selectedEmpId]);

  // Auto-select first shortlisted candidate for onboarding
  useEffect(() => {
    const onboardCandidates = candidates.filter(c => c.status === 'Shortlisted' || c.onboardingStatus !== 'Applied');
    if (onboardCandidates.length > 0 && !selectedOnboardCandId) {
      setSelectedOnboardCandId(onboardCandidates[0].id);
    }
  }, [candidates, selectedOnboardCandId]);

  // Toggle audio play simulation
  useEffect(() => {
    let interval: any;
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioProgress(prev => (prev >= 100 ? 0 : prev + 1));
      }, 300);
    }
    return () => clearInterval(interval);
  }, [isPlayingAudio]);

  // --- Handlers ---
  const handleLoadSampleCSV = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const sample = `Date,Employee ID,Employee Name,Clock In,Clock Out,Outlet ID,Status,Overtime (min)
${todayStr},u6,Rahul V.,09:12,18:35,o1,On Time,20
${todayStr},u7,Sandra M.,09:48,18:05,o1,Late,0
${todayStr},u4,Anju Kurian,08:55,19:10,o1,On Time,70
${todayStr},u5,Bibin Jos,09:02,18:45,o2,On Time,45
${yesterdayStr},u6,Rahul V.,09:05,18:00,o1,On Time,0
${yesterdayStr},u7,Sandra M.,09:15,18:10,o1,On Time,10`;
    setCsvText(sample);
    triggerToast("Sample biometric punch data loaded into clipboard box!");
  };

  const handleUploadPunches = async () => {
    if (!csvText.trim()) {
      alert("Please paste or load biometric CSV punches first.");
      return;
    }

    const lines = csvText.split('\n');
    const punchList: Partial<Punch>[] = [];

    // Parse CSV lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',');
      if (cols.length >= 6) {
        punchList.push({
          date: cols[0]?.trim(),
          employeeId: cols[1]?.trim(),
          employeeName: cols[2]?.trim(),
          clockIn: cols[3]?.trim(),
          clockOut: cols[4]?.trim(),
          outletId: cols[5]?.trim(),
          status: cols[6]?.trim() || 'On Time',
          overtimeMinutes: parseInt(cols[7]?.trim() || '0', 10) || 0
        });
      }
    }

    if (punchList.length === 0) {
      alert("Failed to parse any valid biometric records. Check formatting.");
      return;
    }

    await uploadPunches(punchList);
    setCsvText('');
    triggerToast(`Imported ${punchList.length} biometric punch logs to outlet server database!`);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        setCsvText(text);
        triggerToast(`Biometric file "${file.name}" loaded! Click upload to process.`);
      };
      reader.readAsText(file);
    }
  };

  const handleSimulateBulkCVs = async () => {
    setIsSimulatingUpload(true);
    // Simulate real-time parsing latency
    setTimeout(async () => {
      await addCandidate({
        name: "Meera Krishnan",
        email: "meera.krish@yahoo.com",
        phone: "+91 9446738291",
        appliedRole: "Sales Associate",
        skills: ["Customer Engagement", "Gold Jewelry Appraisal", "Malayalam & English Billing"],
        experience: "2 Years",
        education: "B.Sc Physics (Calicut University)",
        cvSummary: "Customer associate with retail showrooms records in Ernakulam. Experienced in diamond segment appraisal.",
      });

      await addCandidate({
        name: "Gokul Das",
        email: "gokul.das@gmail.com",
        phone: "+91 8089423122",
        appliedRole: "Store Manager",
        skills: ["Inventory Audit", "Store Operations", "Conflict Resolution", "Billing Systems"],
        experience: "5 Years",
        education: "BBA Retail (MG University)",
        cvSummary: "Retail store administrator managing gold asset security, cashier grids, and 15+ staff schedules.",
      });

      await addCandidate({
        name: "Aparna Nair",
        email: "aparna.n@outlook.com",
        phone: "+91 9745123984",
        appliedRole: "Accountant",
        skills: ["Tally Prime", "GST Calculation", "Kerala Tax Slabs", "Excel Audit"],
        experience: "4 Years",
        education: "M.Com Finance (Kerala University)",
        cvSummary: "Certified financial accountant handling GST filings, monthly store balances, and employee PF ledgers.",
      });

      setIsSimulatingUpload(false);
      triggerToast("AI parsed and ranked 3 candidate profiles successfully!");
    }, 1500);
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.includes('US') && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Zira')));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  const translateMalayalamToEnglish = async (text: string): Promise<string> => {
    if (!text.trim()) return '';
    try {
      setIsTranslating(true);
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ml&tl=en&dt=t&q=${encodeURIComponent(text)}`);
      if (res.ok) {
        const data = await res.json();
        setIsTranslating(false);
        return data[0][0][0] || 'Translation unavailable';
      }
    } catch (e) {
      console.error('Translation failed', e);
    }
    setIsTranslating(false);
    return 'Translation failed';
  };

  const handleRunAICall = async (candId: string) => {
    const cand = candidates.find(c => c.id === candId);
    if (!cand) return;

    setActiveCallCandidate(cand);
    setCallStep(0);
    setCallTranscript([{ speaker: 'System', text: `Dialing +91 ${cand.phone || '9446738291'}...` }]);
    setIsListening(false);
    setInterimSpeech('');
    setTypedAnswer('');

    // Ringing Simulation
    setTimeout(() => {
      setCallStep(1); // Connected
      setCallTranscript(prev => [
        ...prev,
        { speaker: 'System', text: 'Call Connected. AI Recruiter online.' }
      ]);

      const q1 = cand.appliedRole === 'Store Manager'
        ? "Hello, I am the Parakkat Jewels automated interview assistant. Tell me about your experience managing store operations and staff schedules."
        : "Hello, thank you for taking our call. Why are you interested in joining Parakkat Jewels, and tell me about your background explaining jewelry designs?";

      setTimeout(() => {
        setCallTranscript(prev => [...prev, { speaker: 'AI Agent', text: q1 }]);
        speakText(q1);
        setCallStep(2); // Waiting for Answer 1
      }, 1200);
    }, 2000);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not supported in this browser. Please use Chrome/Edge or type your response.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = inputLanguage;

    rec.onstart = () => {
      setIsListening(true);
      setInterimSpeech('');
    };

    rec.onresult = (e: any) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setInterimSpeech(text);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onerror = (e: any) => {
      console.error('Speech recognition error', e);
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const submitAnswer = async (text: string) => {
    if (!text.trim()) return;
    setInterimSpeech('');
    setTypedAnswer('');

    let displayedText = text;
    let translationText = '';

    if (inputLanguage === 'ml-IN') {
      translationText = await translateMalayalamToEnglish(text);
      displayedText = `Malayalam: ${text}\nEnglish: ${translationText}`;
    }

    setCallTranscript(prev => [...prev, { speaker: activeCallCandidate?.name || 'Candidate', text: displayedText }]);

    if (callStep === 2) {
      setCallStep(3); // AI Typing
      const q2 = activeCallCandidate?.appliedRole === 'Store Manager'
        ? "Excellent. How do you resolve conflicts between staff members under your charge, and how do you audit daily jewelry assets?"
        : "Excellent. How do you handle peak rush hours during seasonal promotions, and how do you handle customers who object to gold making charges?";

      setTimeout(() => {
        setCallTranscript(prev => [...prev, { speaker: 'AI Agent', text: q2 }]);
        speakText(q2);
        setCallStep(4); // Waiting for Answer 2
      }, 1500);
    } else if (callStep === 4) {
      setCallStep(5); // AI Wrap-up
      const wrapText = "Thank you for answering these questions. We have successfully recorded your interview dossier and will review your profile. Have a wonderful day!";
      
      setTimeout(() => {
        setCallTranscript(prev => [...prev, { speaker: 'AI Agent', text: wrapText }]);
        speakText(wrapText);
        setCallStep(6); // Interview Completed
      }, 1500);
    }
  };

  const finishCall = async () => {
    if (!activeCallCandidate) return;
    const candId = activeCallCandidate.id;
    const candName = activeCallCandidate.name;

    const savedTranscript = callTranscript.filter(t => t.speaker !== 'System');

    let keywordCount = 0;
    const fullText = savedTranscript.map(t => t.text.toLowerCase()).join(' ');
    const keywords = ['gold', 'experience', 'customer', 'audit', 'sales', 'malayalam', 'english', 'സ്വർണം', 'വിൽപ്പന', 'മാനേജർ', 'കസ്റ്റമർ'];
    keywords.forEach(word => {
      if (fullText.includes(word)) keywordCount++;
    });

    const finalScore = Math.min(98, 72 + (keywordCount * 4) + Math.floor(Math.random() * 5));

    await triggerAICall(candId, savedTranscript, finalScore);

    setActiveCallCandidate(null);
    setCallStep(0);
    setCallTranscript([]);

    triggerToast(`AI Voice interview completed for ${candName}! Score: ${finalScore}%`);

    if (selectedCandidate?.id === candId) {
      const fresh = candidates.find(c => c.id === candId);
      if (fresh) setSelectedCandidate(fresh);
    }
  };

  const handleCheckboxToggle = async (field: string, checked: boolean) => {
    if (!selectedOnboardCandId) return;
    const cand = candidates.find(c => c.id === selectedOnboardCandId);
    if (!cand) return;

    const nextChecklist = {
      ...cand.onboardingChecklist,
      [field]: checked
    };

    // Auto promote status if checklist is fully complete
    let nextStatus = cand.onboardingStatus;
    const isAllSubmitted = nextChecklist.aadhaarSubmitted &&
                            nextChecklist.panSubmitted &&
                            nextChecklist.bankDetailsSubmitted &&
                            nextChecklist.certificatesSubmitted;

    if (isAllSubmitted && nextChecklist.offerAccepted) {
      nextStatus = 'Joined';
    } else if (nextChecklist.offerAccepted) {
      nextStatus = 'Offer Accepted';
    } else {
      nextStatus = 'Offer Sent';
    }

    await updateCandidateOnboarding(selectedOnboardCandId, nextStatus, nextChecklist);
    triggerToast(`Onboarding checklist updated for ${cand.name}!`);
  };

  const handleSendOfferWhatsapp = (candName: string) => {
    triggerToast(`Simulating WhatsApp Offer Letter Dispatch: Credentials & Offer pdf sent to ${candName}!`);
  };

  const handleDistributeBonus = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalOnamBonus <= 0) return;
    setOnamBonus(globalOnamBonus);
    triggerToast(`Onam Festival Bonus of ₹${globalOnamBonus.toLocaleString()} added to all outlet staff payslips!`);
    setGlobalOnamBonus(0);
  };

  // --- Dynamic Computations ---

  // 1. Outlet Compliance Leaderboard
  const branchScores = outlets.map(out => {
    const branchPunches = punches.filter(p => p.outletId === out.id);
    const total = branchPunches.length;
    const onTime = branchPunches.filter(p => p.status === 'On Time').length;
    const overtime = branchPunches.reduce((acc, p) => acc + (p.overtimeMinutes || 0), 0);
    
    // Fallback baseline for visual aesthetics if empty
    let baselineScore = 90;
    if (out.id === 'o1') baselineScore = 96;
    if (out.id === 'o2') baselineScore = 92;
    if (out.id === 'o3') baselineScore = 87;
    if (out.id === 'o4') baselineScore = 78;

    const complianceScore = total === 0 ? baselineScore : Math.round((onTime / total) * 100);

    return {
      ...out,
      score: complianceScore,
      totalPunches: total || (out.id === 'o1' ? 8 : out.id === 'o2' ? 4 : 0),
      overtimeMins: overtime || (out.id === 'o1' ? 145 : out.id === 'o2' ? 60 : 0)
    };
  }).sort((a, b) => b.score - a.score);

  // SVG Attendance Analytics Computations
  const totalPunchesCount = punches.length;
  const onTimeCount = punches.filter(p => p.status === 'On Time').length;
  const lateCount = punches.filter(p => p.status === 'Late').length;
  const onTimePercent = totalPunchesCount > 0 ? Math.round((onTimeCount / totalPunchesCount) * 100) : 88;
  const latePercent = totalPunchesCount > 0 ? Math.round((lateCount / totalPunchesCount) * 100) : 12;

  const overtimeData = branchScores.map(b => ({
    name: b.name.replace('Ernakulam ', '').replace('Thrissur ', '').replace('Trivandrum ', '').replace('Kozhikode ', '').replace(' Road', '').replace(' East', '').replace(' Mall', ''),
    mins: b.overtimeMins
  }));
  const maxOvertime = Math.max(...overtimeData.map(d => d.mins), 60);

  // Attendance line trend over the last 5 days
  const last5Days = [];
  const todayVal = new Date();
  for (let i = 4; i >= 0; i--) {
    const d = new Date(todayVal.getTime() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const displayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const count = punches.filter(p => p.date === dateStr).length;
    // Add default baseline counts for aesthetics if database punches are empty
    let baselineCount = 0;
    if (count === 0) {
      if (i === 4) baselineCount = 6;
      if (i === 3) baselineCount = 8;
      if (i === 2) baselineCount = 12;
      if (i === 1) baselineCount = 5;
      if (i === 0) baselineCount = 8;
    }
    last5Days.push({ dateStr, displayStr, count: count || baselineCount });
  }
  const maxPunchesTrend = Math.max(...last5Days.map(d => d.count), 6);

  // 2. Kerala Professional Tax Calculations
  // Semi-annual salary ranges to monthly professional tax
  const calculateProfessionalTax = (gross: number): number => {
    const halfYearlyEquivalent = gross * 6;
    if (halfYearlyEquivalent < 12000) return 0;
    if (halfYearlyEquivalent < 18000) return 20; // 120 half yearly
    if (halfYearlyEquivalent < 30000) return 30; // 180 half yearly
    if (halfYearlyEquivalent < 45000) return 50; // 300 half yearly
    if (halfYearlyEquivalent < 60000) return 75; // 450 half yearly
    if (halfYearlyEquivalent < 75000) return 100; // 600 half yearly
    if (halfYearlyEquivalent < 100000) return 125; // 750 half yearly
    if (halfYearlyEquivalent < 125000) return 166; // 1000 half yearly
    return 208; // 1250 half yearly
  };

  // Compile Payslip values
  const getCompiledPayslip = (empId: string) => {
    const emp = users.find(u => u.id === empId);
    if (!emp) return null;

    // Look up grade by matching role
    let grade = grades.find(g => g.roleName.toLowerCase() === emp.role.replace('_', ' ').toLowerCase());
    if (!grade) {
      // fallback basic values
      grade = {
        id: 'gf',
        roleName: emp.role,
        basic: emp.role === 'store_manager' ? 25000 : 12000,
        hra: emp.role === 'store_manager' ? 8000 : 3500,
        da: emp.role === 'store_manager' ? 4000 : 2000,
        special: emp.role === 'store_manager' ? 5000 : 1500
      };
    }

    // Calculate overtime from actual punches
    const empPunches = punches.filter(p => p.employeeId === emp.id);
    const totalOvertimeMins = empPunches.reduce((acc, p) => acc + (p.overtimeMinutes || 0), 0);
    const hourlyOvertimeRate = Math.round(grade.basic / 240); // 30 days * 8 hours
    const overtimePayout = Math.round((totalOvertimeMins / 60) * hourlyOvertimeRate * 1.5); // 1.5x pay

    // Gross Salary components
    const basic = grade.basic;
    const hra = grade.hra;
    const da = grade.da;
    const special = grade.special;
    const bonus = onamBonus;
    const overtime = overtimePayout;
    const gross = basic + hra + da + special + bonus + overtime;

    // Statutory Deductions
    const epf = Math.round(basic * 0.12); // 12% of basic
    const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0; // 0.75% of gross if gross <= 21000
    const profTax = calculateProfessionalTax(gross);
    const totalDeductions = epf + esi + profTax;
    const netPay = gross - totalDeductions;

    return {
      employee: emp,
      grade,
      punchesCount: empPunches.length,
      overtimeMins: totalOvertimeMins,
      earnings: { basic, hra, da, special, bonus, overtime, gross },
      deductions: { epf, esi, profTax, total: totalDeductions },
      netPay
    };
  };

  const selectedPayslip = selectedEmpId ? getCompiledPayslip(selectedEmpId) : null;
  const currentOnboardingCand = selectedOnboardCandId ? candidates.find(c => c.id === selectedOnboardCandId) : null;

  return (
    <div className="hr-view-container animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="pj-toast animate-slide-in">
          <Icons.CheckCircle size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Interactive AI Call Modal Overlay */}
      {activeCallCandidate && (
        <div className="pj-call-overlay">
          <div className="pj-call-modal animate-scale-up">
            {/* Call Header */}
            <div className="call-modal-header">
              <div className="flex-align-center gap-12">
                <Icons.PhoneCall size={20} className="phone-pulse-icon text-success" />
                <div>
                  <span className="text-muted text-xs uppercase letter-spacing">Outbound Screening Call</span>
                  <h4>{activeCallCandidate.name}</h4>
                  <span className="phone-number">+91 {activeCallCandidate.phone}</span>
                </div>
              </div>
              
              <div className="flex-align-center gap-12">
                <div className="language-selector" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label className="text-xs mr-4" style={{ fontWeight: 600 }}>Lang:</label>
                  <select 
                    value={inputLanguage} 
                    onChange={(e) => setInputLanguage(e.target.value as any)}
                    className="dropdown-pj input-xs"
                    disabled={isListening}
                    style={{ padding: '2px 6px', fontSize: '12px' }}
                  >
                    <option value="ml-IN">Malayalam (മലയാളം)</option>
                    <option value="en-US">English</option>
                  </select>
                </div>
                {callStep === 6 && (
                  <button className="primary-btn btn-sm text-sm" onClick={finishCall}>
                    <Icons.PhoneOff size={14} />
                    <span>Save & End Call</span>
                  </button>
                )}
              </div>
            </div>

            {/* Call Status / Indicator */}
            <div className="call-status-banner">
              {callStep === 0 && <span className="status-badge calling"><Icons.Loader2 className="spinner-pj" size={14} /> Dialing candidate...</span>}
              {callStep === 1 && <span className="status-badge connected"><Icons.Volume2 size={14} /> Call Connected (AI Speaking)</span>}
              {callStep === 2 && <span className="status-badge listening"><Icons.Mic size={14} /> Awaiting Response 1 (Speak Now)</span>}
              {callStep === 3 && <span className="status-badge connected"><Icons.Loader2 className="spinner-pj" size={14} /> AI Processing...</span>}
              {callStep === 4 && <span className="status-badge listening"><Icons.Mic size={14} /> Awaiting Response 2 (Speak Now)</span>}
              {callStep === 5 && <span className="status-badge connected"><Icons.Volume2 size={14} /> AI Wrapping up...</span>}
              {callStep === 6 && <span className="status-badge ended"><Icons.CheckCircle size={14} /> Interview Completed</span>}
            </div>

            {/* Call Dialog Scroll Area */}
            <div className="call-dialog-body" id="call-dialog-scroll">
              {callTranscript.map((chat, idx) => (
                <div 
                  className={`chat-bubble-row ${chat.speaker === 'AI Agent' ? 'bot-row' : chat.speaker === 'System' ? 'system-row' : 'user-row'}`}
                  key={idx}
                >
                  <div className="chat-avatar">
                    {chat.speaker === 'AI Agent' ? 'AI' : chat.speaker === 'System' ? 'SYS' : 'C'}
                  </div>
                  <div className="chat-bubble">
                    <span className="bubble-speaker">{chat.speaker}</span>
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{chat.text}</p>
                  </div>
                </div>
              ))}
              
              {isTranslating && (
                <div className="chat-bubble-row user-row opacity-60">
                  <div className="chat-avatar">TR</div>
                  <div className="chat-bubble">
                    <span className="bubble-speaker">Google Translate</span>
                    <p className="flex-align-center gap-6" style={{ margin: 0 }}>
                      <Icons.Loader2 className="spinner-pj" size={12} />
                      Translating Malayalam to English...
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Mic / Response Section */}
            {(callStep === 2 || callStep === 4) && (
              <div className="call-mic-controls">
                <div className="mic-buttons-row">
                  <button 
                    className={`mic-ring-btn ${isListening ? 'active-listening pulsing-glow-active' : ''}`}
                    onClick={startListening}
                  >
                    <Icons.Mic size={28} />
                  </button>
                  <div className="mic-info">
                    <strong>{isListening ? 'Listening to your voice...' : 'Click microphone to speak'}</strong>
                    <p className="text-xs text-muted" style={{ margin: 0 }}>
                      Speak in {inputLanguage === 'ml-IN' ? 'Malayalam' : 'English'}. We'll transcribe and translate it.
                    </p>
                  </div>
                </div>

                {interimSpeech && (
                  <div className="interim-text-display">
                    <Icons.Volume2 size={14} className="text-warning flex-shrink-0" />
                    <span>"{interimSpeech}"</span>
                    {!isListening && (
                      <button className="primary-btn btn-xs ml-auto" onClick={() => submitAnswer(interimSpeech)}>
                        Submit Spoken Answer
                      </button>
                    )}
                  </div>
                )}

                {/* Text Fallback Input */}
                <div className="text-fallback-input mt-12">
                  <input 
                    type="text" 
                    placeholder={`Type response here in ${inputLanguage === 'ml-IN' ? 'Malayalam' : 'English'} if microphone is unavailable...`}
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    className="input-pj flex-grow-1"
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && typedAnswer.trim()) {
                        submitAnswer(typedAnswer);
                      }
                    }}
                  />
                  <button 
                    className="primary-btn" 
                    disabled={!typedAnswer.trim()}
                    onClick={() => submitAnswer(typedAnswer)}
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}

            {/* Spacer/Close Fallback in Ringing state */}
            {callStep === 0 && (
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', backgroundColor: 'var(--bg-tertiary)' }}>
                <button className="secondary-btn btn-sm" onClick={() => setActiveCallCandidate(null)}>
                  Cancel Call
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header Controls */}
      <div className="hr-header-block">
        <div>
          <h2 className="hr-title">Parakkat Jewels</h2>
          <p className="hr-subtitle">HR Intelligence & Operations Automation Dashboard</p>
        </div>
        <div className="hr-tab-switcher">
          <button 
            className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <Icons.CalendarClock size={16} />
            <span>Attendance Intelligence</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'recruitment' ? 'active' : ''}`}
            onClick={() => setActiveTab('recruitment')}
          >
            <Icons.UserSearch size={16} />
            <span>AI Recruiter & CVs</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'payroll' ? 'active' : ''}`}
            onClick={() => setActiveTab('payroll')}
          >
            <Icons.IndianRupee size={16} />
            <span>Statutory Payroll</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'onboarding' ? 'active' : ''}`}
            onClick={() => setActiveTab('onboarding')}
          >
            <Icons.FileCheck size={16} />
            <span>Onboarding Manager</span>
          </button>
        </div>
      </div>

      <div className="hr-scrollable-content">
        
        {/* ==================== SUB-VIEW: ATTENDANCE ==================== */}
        {activeTab === 'attendance' && (
          <div className="hr-grid-2col">
            
            {/* Left Column: CSV Uploader & Punches Log */}
            <div className="hr-panel-col">
              <div className="dashboard-card-pj">
                <div className="pj-card-header">
                  <Icons.UploadCloud size={18} />
                  <h4>Upload Biometric Punch Log (CSV)</h4>
                </div>
                
                <div 
                  className={`drag-drop-zone ${dragActive ? 'drag-over' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Icons.FileSpreadsheet size={32} className="csv-icon-glow" />
                  <p>Drag & drop biometric biometric.csv file here or</p>
                  <button className="secondary-btn btn-sm" onClick={() => fileInputRef.current?.click()}>
                    Browse Local File
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const reader = new FileReader();
                        reader.onload = (evt) => setCsvText(evt.target?.result as string);
                        reader.readAsText(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                <div className="form-group-pj mt-16">
                  <div className="flex-row-justify">
                    <label>CSV Text Data Preview</label>
                    <button className="link-action-btn" onClick={handleLoadSampleCSV}>
                      Load Sample Biometric CSV
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Date,Employee ID,Employee Name,Clock In,Clock Out,Outlet ID,Status,Overtime"
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    className="csv-textarea"
                  />
                </div>

                <button 
                  onClick={handleUploadPunches}
                  className="primary-btn mt-12 w-full justify-center"
                >
                  <Icons.DatabaseBackup size={16} />
                  <span>Commit Punch Logs to Database</span>
                </button>
              </div>

              {/* Punches Listing Card */}
              <div className="dashboard-card-pj flex-grow-card">
                <div className="pj-card-header">
                  <Icons.History size={16} />
                  <h4>Live Biometric Log History</h4>
                </div>
                <div className="table-scroller">
                  <table className="pj-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Clock In/Out</th>
                        <th>Outlet</th>
                        <th>Status</th>
                        <th>Overtime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {punches.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-16">
                            No biometric punches uploaded yet. Try loading sample CSV punches above.
                          </td>
                        </tr>
                      ) : (
                        punches.map(p => (
                          <tr key={p.id}>
                            <td>{p.date}</td>
                            <td><strong>{p.employeeName}</strong></td>
                            <td>{p.clockIn} - {p.clockOut}</td>
                            <td>{outlets.find(o => o.id === p.outletId)?.name || p.outletId}</td>
                            <td>
                              <span className={`badge ${p.status === 'On Time' ? 'badge-low' : 'badge-high'}`}>
                                {p.status}
                              </span>
                            </td>
                            <td>{p.overtimeMinutes > 0 ? `${p.overtimeMinutes} mins` : '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Compliance Health Leaderboard & Whatsapp Control */}
            <div className="hr-panel-col">
              <div className="dashboard-card-pj">
                <div className="pj-card-header">
                  <Icons.TrendingUp size={18} className="gold-text-accent" />
                  <h4>Branch Compliance Health Leaderboard</h4>
                </div>
                <p className="description-lbl">Ranked dynamically by daily on-time punch rates vs total store staff attendance ratio.</p>
                
                <div className="leaderboard-grid mt-16">
                  {branchScores.map((branch, idx) => (
                    <div className={`leaderboard-card rank-${idx + 1}`} key={branch.id}>
                      <div className="rank-badge">#{idx + 1}</div>
                      <div className="branch-info">
                        <h5>{branch.name}</h5>
                        <span className="sub-lbl">{branch.totalPunches} Punches • {Math.round(branch.overtimeMins/60)} hrs Overtime</span>
                      </div>
                      <div className="branch-metric-box">
                        <div className="metric-score">{branch.score}%</div>
                        <span className="metric-lbl">Compliance</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance WhatsApp Dispatcher */}
              <div className="dashboard-card-pj">
                <div className="pj-card-header">
                  <Icons.MessageSquare size={16} />
                  <h4>WhatsApp Zonal Escalation Console</h4>
                </div>
                <p className="description-lbl">Send daily attendance audit summaries automatically to Zonal managers and Outlet supervisors.</p>
                
                <div className="whatsapp-settings-list mt-12">
                  {outlets.map(o => (
                    <div className="whatsapp-toggle-row" key={o.id}>
                      <div className="toggle-info">
                        <strong>{o.name}</strong>
                        <span>Zonal Supervisor: Rajesh Nair</span>
                      </div>
                      <div className="flex-align-center gap-12">
                        <label className="switch-pj">
                          <input 
                            type="checkbox"
                            checked={!!whatsappAlerts[o.id]}
                            onChange={(e) => {
                              setWhatsappAlerts(prev => ({
                                ...prev,
                                [o.id]: e.target.checked
                              }));
                              if (e.target.checked) {
                                triggerToast(`Automatic daily WhatsApp warnings active for ${o.name}`);
                              }
                            }}
                          />
                          <span className="slider-pj"></span>
                        </label>
                        <button 
                          className="secondary-btn btn-sm text-sm icon-btn"
                          onClick={() => triggerToast(`Instant WhatsApp summary compiled and sent to Rajesh Nair for ${o.name}!`)}
                        >
                          <Icons.Send size={12} />
                          <span>Dispatch Alert</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employee Streak Tracker */}
              <div className="dashboard-card-pj">
                <div className="pj-card-header">
                  <Icons.Flame size={16} className="gold-text-accent" />
                  <h4>Top Attendance Streaks (Outlet Associates)</h4>
                </div>
                <div className="streak-grid mt-12">
                  <div className="streak-bar">
                    <div className="avatar avatar-sm bg-maroon">RV</div>
                    <div className="streak-details">
                      <strong>Rahul V. (Sales Associate)</strong>
                      <span>Ernakulam MG Road</span>
                    </div>
                    <div className="streak-badge">
                      <Icons.Flame size={12} />
                      <span>12 Days</span>
                    </div>
                  </div>

                  <div className="streak-bar">
                    <div className="avatar avatar-sm bg-maroon">AK</div>
                    <div className="streak-details">
                      <strong>Anju Kurian (Store Manager)</strong>
                      <span>Ernakulam MG Road</span>
                    </div>
                    <div className="streak-badge">
                      <Icons.Flame size={12} />
                      <span>8 Days</span>
                    </div>
                  </div>

                  <div className="streak-bar">
                    <div className="avatar avatar-sm bg-maroon">BJ</div>
                    <div className="streak-details">
                      <strong>Bibin Jos (Store Manager)</strong>
                      <span>Thrissur Round East</span>
                    </div>
                    <div className="streak-badge opacity-70">
                      <Icons.Flame size={12} />
                      <span>5 Days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          {/* SVG Compliance Analytics Dashboard */}
          <div className="dashboard-card-pj card-full-width mt-20" style={{ width: '100%', gridColumn: '1 / -1' }}>
            <div className="pj-card-header">
              <div className="flex-align-center gap-8">
                <Icons.BarChart3 size={18} className="gold-text-accent" />
                <h4>Attendance Compliance & Overtime Analytics</h4>
              </div>
            </div>
            
            <div className="analytics-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '14px' }}>
              {/* Chart 1: Donut breakdown */}
              <div className="glass-premium" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <strong style={{ fontSize: '13.5px', marginBottom: '8px' }}>Daily On-Time vs Late Proportions</strong>
                <div className="chart-svg-container">
                  <svg width="150" height="150" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--border-color)" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--primary)" strokeWidth="3" 
                      strokeDasharray={`${onTimePercent} ${100 - onTimePercent}`} strokeDashoffset="25" strokeLinecap="round" />
                    <text x="18" y="20.5" fill="var(--text-primary)" fontSize="8" fontWeight="700" textAnchor="middle">
                      {onTimePercent}%
                    </text>
                  </svg>
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: 'var(--primary)' }} />
                    <span>On Time ({onTimePercent}%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: 'var(--border-color)' }} />
                    <span>Late ({latePercent}%)</span>
                  </div>
                </div>
              </div>

              {/* Chart 2: Overtime Bar chart */}
              <div className="glass-premium" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <strong style={{ fontSize: '13.5px', marginBottom: '8px' }}>Outlet Overtime Distribution (Minutes)</strong>
                <div className="chart-svg-container" style={{ minWidth: '260px' }}>
                  <svg width="260" height="150">
                    {overtimeData.map((d, idx) => {
                      const barHeight = Math.max(10, (d.mins / maxOvertime) * 100);
                      const barX = 25 + idx * 60;
                      const barY = 120 - barHeight;
                      return (
                        <g key={idx}>
                          <defs>
                            <linearGradient id={`goldGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#d4af37" />
                              <stop offset="100%" stopColor="#7c1a22" />
                            </linearGradient>
                          </defs>
                          {/* Background tracker */}
                          <rect x={barX} y="20" width="30" height="100" fill="rgba(255,255,255,0.02)" rx="3" />
                          {/* Active Bar */}
                          <rect 
                            x={barX} 
                            y={barY} 
                            width="30" 
                            height={barHeight} 
                            fill={`url(#goldGrad-${idx})`} 
                            rx="3" 
                            style={{ transition: 'all 0.3s' }}
                          />
                          {/* Overtime minutes label */}
                          <text x={barX + 15} y={barY - 6} fill="var(--text-primary)" fontSize="9" fontWeight="700" textAnchor="middle">
                            {d.mins}m
                          </text>
                          {/* Outlet Name */}
                          <text x={barX + 15} y="138" fill="var(--text-muted)" fontSize="9.5" textAnchor="middle">
                            {d.name}
                          </text>
                        </g>
                      );
                    })}
                    {/* Baseline */}
                    <line x1="10" y1="120" x2="250" y2="120" stroke="var(--border-color)" strokeWidth="1" />
                  </svg>
                </div>
              </div>

              {/* Chart 3: Line Chart Trend */}
              <div className="glass-premium" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <strong style={{ fontSize: '13.5px', marginBottom: '8px' }}>Weekly Attendance Trend (Daily Punches)</strong>
                <div className="chart-svg-container" style={{ minWidth: '260px' }}>
                  <svg width="260" height="150">
                    {/* Gridlines */}
                    <line x1="20" y1="30" x2="250" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="20" y1="75" x2="250" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="20" y1="120" x2="250" y2="120" stroke="var(--border-color)" strokeWidth="1" />
                    
                    {/* Line Plot */}
                    {(() => {
                      const points = last5Days.map((d, idx) => {
                        const x = 30 + idx * 50;
                        const y = 120 - ((d.count / maxPunchesTrend) * 80);
                        return { x, y, label: d.displayStr, count: d.count };
                      });
                      
                      const pathD = points.reduce((acc, p, idx) => {
                        return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                      }, '');

                      return (
                        <>
                          {/* Smooth Line */}
                          <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          
                          {/* Glow overlay */}
                          <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="8" strokeOpacity="0.15" strokeLinecap="round" strokeLinejoin="round" />

                          {/* Data points */}
                          {points.map((p, idx) => (
                            <g key={idx}>
                              <circle cx={p.x} cy={p.y} r="5" fill="var(--accent)" stroke="var(--bg-primary)" strokeWidth="1.5" />
                              <text x={p.x} y={p.y - 10} fill="var(--text-primary)" fontSize="9.5" fontWeight="700" textAnchor="middle">
                                {p.count}
                              </text>
                              <text x={p.x} y="138" fill="var(--text-muted)" fontSize="9" textAnchor="middle">
                                {p.label}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* ==================== SUB-VIEW: AI RECRUITER ==================== */}
        {activeTab === 'recruitment' && (
          <div className="hr-grid-recruitment">
            
            {/* Top Stats Banner */}
            <div className="recruitment-banner card-full-width">
              <div className="banner-info">
                <h3>AI Recruiter Panel</h3>
                <p>Bulk CV Upload, AI parsing & automated outbound voice screening call logs via ElevenLabs.</p>
              </div>
              <div className="banner-actions">
                <button 
                  className="secondary-btn" 
                  disabled={isSimulatingUpload}
                  onClick={handleSimulateBulkCVs}
                >
                  {isSimulatingUpload ? (
                    <>
                      <Icons.Loader2 className="spinner-pj" size={16} />
                      <span>Parsing Resumes...</span>
                    </>
                  ) : (
                    <>
                      <Icons.UploadCloud size={16} />
                      <span>Simulate Bulk CV Upload</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Main Candidates Comparison Table */}
            <div className="dashboard-card-pj">
              <div className="pj-card-header flex-row-justify">
                <div className="flex-align-center gap-8">
                  <Icons.Users2 size={18} />
                  <h4>Candidates Fit Comparison & Outbound Status</h4>
                </div>
                <div className="filter-block">
                  <label className="text-sm mr-8">Role Filter:</label>
                  <select 
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    className="dropdown-pj input-sm"
                  >
                    <option value="All">All Applied Roles</option>
                    <option value="Store Manager">Store Manager</option>
                    <option value="Sales Associate">Sales Associate</option>
                    <option value="Accountant">Accountant</option>
                  </select>
                </div>
              </div>

              <div className="table-scroller">
                <table className="pj-table">
                  <thead>
                    <tr>
                      <th>Applicant Name</th>
                      <th>Applied Role</th>
                      <th>Experience</th>
                      <th>Key Skills parsed</th>
                      <th>AI Match Score</th>
                      <th>Interview Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates
                      .filter(c => selectedRoleFilter === 'All' || c.appliedRole === selectedRoleFilter)
                      .map(cand => (
                        <tr 
                          key={cand.id} 
                          className={`candidate-row ${selectedCandidate?.id === cand.id ? 'selected-row' : ''}`}
                          onClick={() => setSelectedCandidate(cand)}
                        >
                          <td>
                            <div className="cand-cell">
                              <strong>{cand.name}</strong>
                              <span className="text-muted text-sm">{cand.email}</span>
                            </div>
                          </td>
                          <td>{cand.appliedRole}</td>
                          <td>{cand.experience || '1 Year'}</td>
                          <td>
                            <div className="skills-badge-list">
                              {cand.skills.slice(0, 3).map((s, idx) => (
                                <span key={idx} className="badge badge-low text-xs">{s}</span>
                              ))}
                              {cand.skills.length > 3 && <span className="text-muted text-xs">+{cand.skills.length - 3} more</span>}
                            </div>
                          </td>
                          <td>
                            <div className="fit-score-cell">
                              <span className={`fit-lbl ${cand.score >= 85 ? 'text-success' : cand.score >= 70 ? 'text-warning' : 'text-danger'}`}>
                                {cand.score}% Fit
                              </span>
                              <div className="fit-bar-container">
                                <div className="fit-bar" style={{ width: `${cand.score}%`, backgroundColor: cand.score >= 85 ? 'var(--color-success)' : cand.score >= 70 ? 'var(--color-warning)' : 'var(--color-danger)' }} />
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${cand.interviewStatus === 'Completed' ? 'badge-low' : 'badge-medium'}`}>
                              {cand.interviewStatus}
                            </span>
                          </td>
                          <td>
                            <div className="actions-cell flex-align-center gap-8" onClick={e => e.stopPropagation()}>
                              {cand.interviewStatus === 'Pending' ? (
                                <button 
                                  className="primary-btn btn-sm text-sm"
                                  disabled={activeCallCandidate !== null}
                                  onClick={() => handleRunAICall(cand.id)}
                                >
                                  {activeCallCandidate?.id === cand.id ? (
                                    <>
                                      <Icons.Loader2 className="spinner-pj" size={12} />
                                      <span>Interviewing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Icons.PhoneCall size={12} />
                                      <span>Trigger AI Interview</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <button 
                                  className="secondary-btn btn-sm text-sm"
                                  onClick={() => setSelectedCandidate(cand)}
                                >
                                  <Icons.FileText size={12} />
                                  <span>View Log</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Call Transcript & Audio Log Player Drawer/Card */}
            <div className="recruitment-details-card">
              {selectedCandidate ? (
                <div className="dashboard-card-pj height-100 flex-column-card">
                  <div className="details-header">
                    <div>
                      <span className="text-muted text-xs uppercase letter-spacing">Applicant Log Dossier</span>
                      <h3>{selectedCandidate.name}</h3>
                      <p className="role-p">{selectedCandidate.appliedRole} • {selectedCandidate.experience} Exp</p>
                    </div>
                    <div className="score-badge-circle">
                      <span className="circle-score">{selectedCandidate.score}%</span>
                      <span className="circle-lbl">Fit score</span>
                    </div>
                  </div>

                  <div className="details-scrollable-body mt-16">
                    {/* Resume Details */}
                    <div className="details-section-pj">
                      <h5>CV Parsing Summary</h5>
                      <p className="cv-summary-txt">{selectedCandidate.cvSummary}</p>
                      <div className="education-skills-block mt-8">
                        <div>
                          <strong>Education:</strong> {selectedCandidate.education}
                        </div>
                        <div className="mt-4">
                          <strong>Full Technical Skills:</strong>
                          <div className="skills-badge-list mt-4">
                            {selectedCandidate.skills.map((s, idx) => (
                              <span key={idx} className="badge badge-medium text-xs">{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interview Audio/Transcript Block */}
                    <div className="details-section-pj border-top mt-16 pt-16">
                      <div className="flex-row-justify">
                        <h5>Outbound Call Interview Audio</h5>
                        <span className="badge badge-low text-xs">ElevenLabs Simulated API</span>
                      </div>

                      {selectedCandidate.interviewStatus === 'Completed' ? (
                        <div className="audio-player-box mt-12">
                          <button 
                            className="play-audio-btn"
                            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                          >
                            {isPlayingAudio ? <Icons.Pause size={18} /> : <Icons.Play size={18} />}
                          </button>
                          
                          <div className="player-progress-area">
                            <div className="waves-animator">
                              <span className={`wave-bar ${isPlayingAudio ? 'animating delay-1' : ''}`} />
                              <span className={`wave-bar ${isPlayingAudio ? 'animating delay-2' : ''}`} />
                              <span className={`wave-bar ${isPlayingAudio ? 'animating delay-3' : ''}`} style={{ height: '28px' }} />
                              <span className={`wave-bar ${isPlayingAudio ? 'animating delay-4' : ''}`} />
                              <span className={`wave-bar ${isPlayingAudio ? 'animating delay-5' : ''}`} style={{ height: '32px' }} />
                              <span className={`wave-bar ${isPlayingAudio ? 'animating delay-6' : ''}`} />
                              <span className={`wave-bar ${isPlayingAudio ? 'animating delay-7' : ''}`} />
                            </div>
                            <div className="progress-bar-bg">
                              <div className="progress-bar-fill" style={{ width: `${audioProgress}%` }} />
                            </div>
                            <span className="time-lbl">01:{Math.floor(audioProgress * 0.4).toString().padStart(2, '0')} / 02:40</span>
                          </div>
                        </div>
                      ) : (
                        <div className="audio-placeholder-card mt-12">
                          <Icons.PhoneCall size={24} className="phone-bounce-icon" />
                          <p>Interview pending. Trigger the ElevenLabs outbound voice interview call to generate records.</p>
                          <button 
                            className="primary-btn btn-sm mt-8"
                            disabled={activeCallCandidate !== null}
                            onClick={() => handleRunAICall(selectedCandidate.id)}
                          >
                            {activeCallCandidate?.id === selectedCandidate.id ? "Connecting..." : "Trigger AI Phone Interview"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Transcript Chat Bubbles */}
                    {selectedCandidate.interviewStatus === 'Completed' && (
                      <div className="details-section-pj border-top mt-16 pt-16">
                        <h5>Conversational Transcript</h5>
                        <div className="transcript-chat mt-12">
                          {selectedCandidate.transcript && selectedCandidate.transcript.length > 0 ? (
                            selectedCandidate.transcript.map((chat, idx) => (
                              <div 
                                className={`chat-bubble-row ${chat.speaker === 'AI Agent' || chat.speaker === 'AI Interviewer' ? 'bot-row' : 'user-row'}`}
                                key={idx}
                              >
                                <div className="chat-avatar">
                                  {chat.speaker === 'AI Agent' || chat.speaker === 'AI Interviewer' ? 'AI' : 'C'}
                                </div>
                                <div className="chat-bubble">
                                  <span className="bubble-speaker">{chat.speaker}</span>
                                  <p>{chat.text}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted text-sm text-center">No dialog transcript compiled.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="dashboard-card-pj height-100 flex-center-card text-center text-muted">
                  <Icons.UserCheck size={48} className="placeholder-icon-color" />
                  <h4>Select a Candidate</h4>
                  <p>Click on any candidate row in the comparison grid to view full CV parse documents, ElevenLabs voice recordings, and conversation transcript cards.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SUB-VIEW: STATUTORY PAYROLL ==================== */}
        {activeTab === 'payroll' && (
          <div className="hr-grid-2col">
            
            {/* Left Column: Slabs Viewer & Settings */}
            <div className="hr-panel-col">
              
              {/* Kerala Slabs Description */}
              <div className="dashboard-card-pj">
                <div className="pj-card-header">
                  <Icons.Receipt size={18} className="gold-text-accent" />
                  <h4>Indian & Kerala Statutory Deductions</h4>
                </div>
                <div className="slabs-info-list">
                  <div className="slab-info-item">
                    <span className="slab-badge">EPF Slabs</span>
                    <div>
                      <strong>Employees' Provident Fund Act</strong>
                      <p>12% deduction from Basic salary. Matching 12% employer contribution ledgered.</p>
                    </div>
                  </div>

                  <div className="slab-info-item">
                    <span className="slab-badge">ESI Slabs</span>
                    <div>
                      <strong>Employee State Insurance</strong>
                      <p>0.75% of Gross salary. Applicable only if Gross salary is ₹21,000 or below. Employer contribution at 3.25%.</p>
                    </div>
                  </div>

                  <div className="slab-info-item">
                    <span className="slab-badge">Kerala PT</span>
                    <div>
                      <strong>Kerala Professional Tax (Act 1996)</strong>
                      <p>Semi-annual tax brackets calculated monthly from gross payout bands. Ranging ₹20 to ₹208 per month.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Onam Bonus Controller */}
              <div className="dashboard-card-pj">
                <div className="pj-card-header">
                  <Icons.Sparkles size={16} className="gold-text-accent" />
                  <h4>Kerala Onam Festival Bonus</h4>
                </div>
                <p className="description-lbl">Configure the annual state festival allowance to distribute across the outlet ledger sheets.</p>
                
                <form onSubmit={handleDistributeBonus} className="mt-12">
                  <div className="form-group-pj">
                    <label>Onam Bonus Payout (₹)</label>
                    <div className="input-with-button">
                      <input 
                        type="number" 
                        placeholder="e.g. 5000"
                        value={globalOnamBonus || ''}
                        onChange={(e) => setGlobalOnamBonus(parseInt(e.target.value, 10) || 0)}
                        className="input-pj"
                      />
                      <button type="submit" className="primary-btn flex-shrink-0">
                        Distribute Bonus
                      </button>
                    </div>
                  </div>
                </form>
                {onamBonus > 0 && (
                  <div className="success-banner mt-12">
                    <Icons.CheckCircle size={14} className="text-success" />
                    <span>Onam Bonus of ₹{onamBonus.toLocaleString()} is active on current month payroll payouts!</span>
                    <button className="link-action-btn ml-auto text-sm" onClick={() => setOnamBonus(0)}>Cancel Bonus</button>
                  </div>
                )}
              </div>

              {/* PayGrade Bands Listing */}
              <div className="dashboard-card-pj flex-grow-card">
                <div className="pj-card-header">
                  <Icons.FolderTree size={16} />
                  <h4>Parakkat Jewels PayGrade Bands</h4>
                </div>
                <table className="pj-table font-sm">
                  <thead>
                    <tr>
                      <th>Role Grade</th>
                      <th>Basic</th>
                      <th>HRA</th>
                      <th>DA</th>
                      <th>Special</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map(g => (
                      <tr key={g.id}>
                        <td><strong>{g.roleName}</strong></td>
                        <td>₹{g.basic.toLocaleString()}</td>
                        <td>₹{g.hra.toLocaleString()}</td>
                        <td>₹{g.da.toLocaleString()}</td>
                        <td>₹{g.special.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Dynamic Payslip Compiler (Printable) */}
            <div className="hr-panel-col">
              <div className="dashboard-card-pj flex-grow-card flex-column-card">
                <div className="pj-card-header flex-row-justify border-bottom pb-12">
                  <div className="flex-align-center gap-8">
                    <Icons.FileText size={18} />
                    <h4>Monthly Payslip Compiler</h4>
                  </div>
                  
                  <div className="flex-align-center gap-8">
                    <select
                      value={selectedEmpId}
                      onChange={(e) => setSelectedEmpId(e.target.value)}
                      className="dropdown-pj input-sm font-semibold"
                    >
                      {users
                        .filter(u => u.role !== 'admin' && u.role !== 'ceo')
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                        ))}
                    </select>

                    <button 
                      className="secondary-btn btn-sm print-hide"
                      onClick={() => window.print()}
                      title="Print Payslip to PDF"
                    >
                      <Icons.Printer size={14} />
                      <span>Print Slip</span>
                    </button>
                  </div>
                </div>

                {selectedPayslip ? (
                  <div id="printable-payslip" className="payslip-document-wrapper mt-16 animate-scale-up">
                    
                    {/* Printable Payslip Body */}
                    <div className="payslip-border-trim">
                      <div className="payslip-inner">
                        
                        {/* Company Crest Branding */}
                        <div className="payslip-branding">
                          <div className="brand-crest">
                            <span className="crest-logo">PJ</span>
                          </div>
                          <div className="brand-info">
                            <h3 className="brand-title">PARAKKAT JEWELS</h3>
                            <span className="brand-subtitle">Retail Showroom Outlets Group, Kerala</span>
                            <span className="brand-addr">Corporate Office: Ernakulam, Kerala, PIN - 682016</span>
                          </div>
                        </div>

                        <div className="payslip-doc-title">
                          <h4>SALARY PAYSLIP - JUNE 2026</h4>
                        </div>

                        {/* Employee Meta details */}
                        <div className="payslip-meta-grid">
                          <div>
                            <span className="lbl">Employee Name</span>
                            <span className="val">{selectedPayslip.employee.name}</span>
                          </div>
                          <div>
                            <span className="lbl">Employee ID</span>
                            <span className="val">{selectedPayslip.employee.id}</span>
                          </div>
                          <div>
                            <span className="lbl">Designation / Role</span>
                            <span className="val capitalize">{selectedPayslip.employee.role.replace('_', ' ')}</span>
                          </div>
                          <div>
                            <span className="lbl">Showroom Outlet</span>
                            <span className="val">
                              {outlets.find(o => o.id === selectedPayslip.employee.outletId)?.name || 'Head Office'}
                            </span>
                          </div>
                          <div>
                            <span className="lbl">EPF Number</span>
                            <span className="val">PF/KKD/68320/2026</span>
                          </div>
                          <div>
                            <span className="lbl">Attendance Records</span>
                            <span className="val">{selectedPayslip.punchesCount} Active Shifts</span>
                          </div>
                        </div>

                        {/* Earnings & Deductions Table */}
                        <div className="payslip-table-grid mt-16">
                          
                          {/* Earnings side */}
                          <div className="payslip-col-table">
                            <div className="col-header">
                              <span>Earnings</span>
                              <span>Amount (₹)</span>
                            </div>
                            <div className="col-row">
                              <span>Basic Salary</span>
                              <span>₹{selectedPayslip.earnings.basic.toLocaleString()}</span>
                            </div>
                            <div className="col-row">
                              <span>House Rent Allowance (HRA)</span>
                              <span>₹{selectedPayslip.earnings.hra.toLocaleString()}</span>
                            </div>
                            <div className="col-row">
                              <span>Dearness Allowance (DA)</span>
                              <span>₹{selectedPayslip.earnings.da.toLocaleString()}</span>
                            </div>
                            <div className="col-row">
                              <span>Special Showroom Allowance</span>
                              <span>₹{selectedPayslip.earnings.special.toLocaleString()}</span>
                            </div>
                            <div className="col-row">
                              <span>Overtime Allowance ({selectedPayslip.overtimeMins} min)</span>
                              <span>₹{selectedPayslip.earnings.overtime.toLocaleString()}</span>
                            </div>
                            {selectedPayslip.earnings.bonus > 0 && (
                              <div className="col-row highlight-bonus">
                                <span>Onam Festival Bonus</span>
                                <span>₹{selectedPayslip.earnings.bonus.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="col-row total-row font-semibold">
                              <span>Gross Earnings</span>
                              <span>₹{selectedPayslip.earnings.gross.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Deductions side */}
                          <div className="payslip-col-table border-left">
                            <div className="col-header">
                              <span>Deductions</span>
                              <span>Amount (₹)</span>
                            </div>
                            <div className="col-row">
                              <span>Employees Provident Fund (EPF 12%)</span>
                              <span>₹{selectedPayslip.deductions.epf.toLocaleString()}</span>
                            </div>
                            <div className="col-row">
                              <span>Employee State Insurance (ESI 0.75%)</span>
                              <span>₹{selectedPayslip.deductions.esi.toLocaleString()}</span>
                            </div>
                            <div className="col-row">
                              <span>Kerala Professional Tax (PT Slabs)</span>
                              <span>₹{selectedPayslip.deductions.profTax.toLocaleString()}</span>
                            </div>
                            <div className="col-row spacer-row" />
                            <div className="col-row spacer-row" />
                            {selectedPayslip.earnings.bonus > 0 && (
                              <div className="col-row spacer-row" />
                            )}
                            <div className="col-row total-row font-semibold">
                              <span>Total Deductions</span>
                              <span>₹{selectedPayslip.deductions.total.toLocaleString()}</span>
                            </div>
                          </div>

                        </div>

                        {/* Net Salary Payable */}
                        <div className="net-pay-banner">
                          <div className="net-left">
                            <span className="net-title">NET SALARY PAYABLE</span>
                            <span className="net-desc">(Gross Earnings minus Total Deductions)</span>
                          </div>
                          <div className="net-right">
                            <span className="net-val">₹{selectedPayslip.netPay.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Disclaimers & Signatures */}
                        <div className="payslip-footer mt-24">
                          <p className="terms-lbl">This is a system-generated salary slip for Parakkat Jewels portal, compliant with Kerala state professional tax slabs and Indian EPFO statutes. No physical signature is required.</p>
                          <div className="signatures-row mt-32">
                            <div className="signature-box">
                              <span className="sig-line"></span>
                              <span className="sig-lbl">HR Operations Director</span>
                            </div>
                            <div className="signature-box">
                              <span className="sig-line"></span>
                              <span className="sig-lbl">Employee Acknowledgment</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="flex-center-card text-center text-muted flex-grow-card">
                    <Icons.FileText size={48} className="placeholder-icon-color" />
                    <h4>Select Employee</h4>
                    <p>Choose an active employee to compile their monthly salary slip.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== SUB-VIEW: ONBOARDING ==================== */}
        {activeTab === 'onboarding' && (
          <div className="hr-grid-2col">
            
            {/* Left Column: Shortlisted Hires List */}
            <div className="hr-panel-col">
              <div className="dashboard-card-pj flex-grow-card">
                <div className="pj-card-header">
                  <Icons.Sparkles size={18} className="gold-text-accent" />
                  <h4>Shortlisted Candidate Hires</h4>
                </div>
                <p className="description-lbl">Manage pre-joining verification logs, offer letter acceptances, and onboarding checklists.</p>
                
                <div className="onboard-candidate-list mt-12">
                  {candidates
                    .filter(c => c.status === 'Shortlisted' || c.onboardingStatus !== 'Applied')
                    .map(cand => (
                      <div 
                        className={`onboard-cand-bar ${selectedOnboardCandId === cand.id ? 'active' : ''}`}
                        key={cand.id}
                        onClick={() => setSelectedOnboardCandId(cand.id)}
                      >
                        <div className="avatar avatar-md bg-maroon">
                          {cand.name.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="onboard-details">
                          <strong>{cand.name}</strong>
                          <span>{cand.appliedRole} • AI Fit: {cand.score}%</span>
                        </div>
                        <div className="onboard-badge-cell">
                          <span className={`badge ${cand.onboardingStatus === 'Joined' ? 'badge-low' : 'badge-medium'}`}>
                            {cand.onboardingStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  
                  {candidates.filter(c => c.status === 'Shortlisted' || c.onboardingStatus !== 'Applied').length === 0 && (
                    <div className="text-center text-muted py-24">
                      No candidates shortlisted for onboarding yet. Upload candidates or run AI interview interviews.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Offer Card & Pre-joining Document Checklist */}
            <div className="hr-panel-col">
              {currentOnboardingCand ? (
                <div className="dashboard-card-pj flex-grow-card flex-column-card">
                  <div className="pj-card-header flex-row-justify border-bottom pb-12">
                    <div className="flex-align-center gap-8">
                      <Icons.FileCheck size={18} />
                      <h4>Onboarding Dossier: {currentOnboardingCand.name}</h4>
                    </div>
                    <button 
                      className="primary-btn btn-sm text-sm"
                      onClick={() => handleSendOfferWhatsapp(currentOnboardingCand.name)}
                    >
                      <Icons.MessageCircle size={12} />
                      <span>WhatsApp Offer letter</span>
                    </button>
                  </div>

                  <div className="onboard-scrollable mt-16 flex-grow-card-body">
                    
                    {/* Royal Digital Offer Card */}
                    <div className="royal-offer-card animate-scale-up">
                      <div className="gold-seal">PJ</div>
                      <h4 className="offer-title">LETTER OF OFFER</h4>
                      <p className="offer-body-txt">We are pleased to offer you the position of <strong>{currentOnboardingCand.appliedRole}</strong> at Parakkat Jewels.</p>
                      
                      <div className="offer-stats-grid mt-12">
                        <div className="stat-box">
                          <span className="lbl">Basic Salary</span>
                          <span className="val">₹{currentOnboardingCand.appliedRole === 'Store Manager' ? '25,000' : currentOnboardingCand.appliedRole === 'Accountant' ? '18,000' : '15,000'} /mo</span>
                        </div>
                        <div className="stat-box">
                          <span className="lbl">Joining Date</span>
                          <span className="val">July 01, 2026</span>
                        </div>
                      </div>

                      <div className="offer-footer-terms">
                        <span>Issued by: Parakkat Jewels Executive Committee</span>
                      </div>
                    </div>

                    {/* Pre-joining verification checklists */}
                    <div className="verification-check-block mt-24">
                      <h5>Pre-joining Documents Verification</h5>
                      <p className="description-lbl">Check off received Aadhaar/PAN cards and bank details certificates from the candidate.</p>

                      <div className="check-rows-list mt-12">
                        
                        <label className="checkbox-row-pj">
                          <input 
                            type="checkbox"
                            checked={!!currentOnboardingCand.onboardingChecklist.offerAccepted}
                            onChange={(e) => handleCheckboxToggle('offerAccepted', e.target.checked)}
                          />
                          <div className="checkbox-custom"></div>
                          <div className="check-info">
                            <strong>Offer Accepted</strong>
                            <span>Candidate signed the digital offer sheet copy.</span>
                          </div>
                        </label>

                        <label className="checkbox-row-pj">
                          <input 
                            type="checkbox"
                            checked={!!currentOnboardingCand.onboardingChecklist.aadhaarSubmitted}
                            onChange={(e) => handleCheckboxToggle('aadhaarSubmitted', e.target.checked)}
                          />
                          <div className="checkbox-custom"></div>
                          <div className="check-info">
                            <strong>Aadhaar Card Submitted</strong>
                            <span>12-digit UIDAI proof scanned and archived.</span>
                          </div>
                        </label>

                        <label className="checkbox-row-pj">
                          <input 
                            type="checkbox"
                            checked={!!currentOnboardingCand.onboardingChecklist.panSubmitted}
                            onChange={(e) => handleCheckboxToggle('panSubmitted', e.target.checked)}
                          />
                          <div className="checkbox-custom"></div>
                          <div className="check-info">
                            <strong>PAN Card Verification</strong>
                            <span>Taxation Account proof verified.</span>
                          </div>
                        </label>

                        <label className="checkbox-row-pj">
                          <input 
                            type="checkbox"
                            checked={!!currentOnboardingCand.onboardingChecklist.bankDetailsSubmitted}
                            onChange={(e) => handleCheckboxToggle('bankDetailsSubmitted', e.target.checked)}
                          />
                          <div className="checkbox-custom"></div>
                          <div className="check-info">
                            <strong>Bank Account details</strong>
                            <span>Salary account number and IFSC submitted for payroll.</span>
                          </div>
                        </label>

                        <label className="checkbox-row-pj">
                          <input 
                            type="checkbox"
                            checked={!!currentOnboardingCand.onboardingChecklist.certificatesSubmitted}
                            onChange={(e) => handleCheckboxToggle('certificatesSubmitted', e.target.checked)}
                          />
                          <div className="checkbox-custom"></div>
                          <div className="check-info">
                            <strong>Academic & Work Certificates</strong>
                            <span>Prior experience certificate scanned logs.</span>
                          </div>
                        </label>

                      </div>

                      {/* Onboarding progress bar */}
                      <div className="progress-summary mt-24">
                        <div className="flex-row-justify text-sm">
                          <strong>Checklist Progress</strong>
                          <span>
                            {Object.values(currentOnboardingCand.onboardingChecklist).filter(Boolean).length} of 5 completed
                          </span>
                        </div>
                        <div className="progress-bar-bg mt-6">
                          <div 
                            className="progress-bar-fill" 
                            style={{ 
                              width: `${(Object.values(currentOnboardingCand.onboardingChecklist).filter(Boolean).length / 5) * 100}%` 
                            }} 
                          />
                        </div>
                      </div>

                    </div>

                  </div>
                </div>
              ) : (
                <div className="dashboard-card-pj height-100 flex-center-card text-center text-muted">
                  <Icons.FileCheck size={48} className="placeholder-icon-color" />
                  <h4>Select a Hire</h4>
                  <p>Choose a shortlisted candidate from the left list to review their Letter of Offer and checklist files.</p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Styled Embed System (Vanilla CSS for Premium Parakkat Theme) */}
      <style>{`
        .hr-view-container {
          padding: 24px;
          height: calc(100vh - var(--header-height));
          display: flex;
          flex-direction: column;
          background-color: var(--bg-secondary);
          overflow: hidden;
        }

        .hr-header-block {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
          margin-bottom: 16px;
          flex-shrink: 0;
        }

        .hr-title {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 700;
          color: var(--primary);
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .hr-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .hr-tab-switcher {
          display: flex;
          background-color: var(--bg-tertiary);
          padding: 4px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          gap: 4px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }

        .tab-btn:hover {
          color: var(--text-primary);
          background-color: var(--bg-hover);
        }

        .tab-btn.active {
          background-color: var(--bg-primary);
          color: var(--primary);
          box-shadow: var(--shadow-sm);
        }

        .hr-scrollable-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding-right: 4px;
        }

        .hr-grid-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: stretch;
        }

        @media (max-width: 1100px) {
          .hr-grid-2col {
            grid-template-columns: 1fr;
          }
        }

        .hr-panel-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .dashboard-card-pj {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 20px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
        }

        .flex-grow-card {
          flex: 1;
        }

        .flex-column-card {
          display: flex;
          flex-direction: column;
        }

        .flex-center-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .height-100 {
          height: 100%;
        }

        .pj-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }

        .pj-card-header h4 {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 15px;
          color: var(--text-primary);
        }

        .description-lbl {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .mt-12 { margin-top: 12px; }
        .mt-16 { margin-top: 16px; }
        .mt-24 { margin-top: 24px; }
        .mt-32 { margin-top: 32px; }
        .mb-12 { margin-bottom: 12px; }
        .pb-12 { padding-bottom: 12px; }
        .pt-16 { padding-top: 16px; }
        .mr-8 { margin-right: 8px; }
        .ml-auto { margin-left: auto; }
        .ml-8 { margin-left: 8px; }
        .mt-4 { margin-top: 4px; }
        .mt-6 { margin-top: 6px; }
        .mt-8 { margin-top: 8px; }
        .py-16 { padding-top: 16px; padding-bottom: 16px; }
        .py-24 { padding-top: 24px; padding-bottom: 24px; }
        .w-full { width: 100%; }
        .flex-shrink-0 { flex-shrink: 0; }
        .font-sm { font-size: 12px !important; }
        .font-semibold { font-weight: 600; }
        .text-xs { font-size: 10.5px !important; }
        .text-sm { font-size: 12px !important; }
        .text-center { text-align: center; }
        .flex-align-center { display: flex; align-items: center; }
        .flex-row-justify { display: flex; align-items: center; justify-content: space-between; }
        .gap-8 { gap: 8px; }
        .gap-12 { gap: 12px; }
        .border-top { border-top: 1px solid var(--border-color); }
        .border-bottom { border-bottom: 1px solid var(--border-color); }
        .opacity-70 { opacity: 0.7; }
        .text-success { color: var(--color-success) !important; }
        .text-warning { color: var(--color-warning) !important; }
        .text-danger { color: var(--color-danger) !important; }

        /* Drag and Drop Zone */
        .drag-drop-zone {
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-md);
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background-color: var(--bg-tertiary);
          text-align: center;
          cursor: pointer;
          transition: border-color var(--transition-fast), background-color var(--transition-fast);
        }

        .drag-drop-zone:hover {
          border-color: var(--primary);
          background-color: var(--bg-hover);
        }

        .csv-icon-glow {
          color: var(--text-muted);
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.05));
        }

        .btn-sm {
          padding: 4px 10px;
          font-size: 12px;
          border-radius: var(--radius-sm);
        }

        .input-sm {
          padding: 4px 8px;
          font-size: 12px;
        }

        .csv-textarea {
          width: 100%;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          padding: 8px;
          font-family: monospace;
          font-size: 11.5px;
          background-color: var(--bg-secondary);
          resize: vertical;
        }

        .csv-textarea:focus {
          outline: none;
          border-color: var(--primary);
        }

        .link-action-btn {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--primary);
          background: none;
          border: none;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
        }

        .link-action-btn:hover {
          color: var(--primary-hover);
        }

        /* Scrollers and tables */
        .table-scroller {
          max-height: 250px;
          overflow-y: auto;
          margin-top: 8px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
        }

        .pj-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .pj-table th, .pj-table td {
          padding: 8px 12px;
          font-size: 12.5px;
          border-bottom: 1px solid var(--border-color);
        }

        .pj-table th {
          background-color: var(--bg-tertiary);
          font-weight: 600;
          color: var(--text-secondary);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .pj-table tbody tr:hover {
          background-color: var(--bg-hover);
        }

        /* Leaderboard and stats */
        .leaderboard-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .leaderboard-card {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          position: relative;
          overflow: hidden;
        }

        .leaderboard-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
        }

        .leaderboard-card.rank-1::before { background-color: var(--accent); }
        .leaderboard-card.rank-2::before { background-color: #a3a3a3; }
        .leaderboard-card.rank-3::before { background-color: #b45309; }
        .leaderboard-card.rank-4::before { background-color: #6b7280; }

        .rank-badge {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 14px;
          color: var(--text-secondary);
          width: 28px;
        }

        .branch-info {
          flex: 1;
        }

        .branch-info h5 {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .sub-lbl {
          font-size: 11px;
          color: var(--text-muted);
        }

        .branch-metric-box {
          text-align: right;
        }

        .metric-score {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
        }

        .metric-lbl {
          font-size: 9px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        /* WhatsApp Dispatcher console */
        .whatsapp-settings-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .whatsapp-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
        }

        .toggle-info {
          display: flex;
          flex-direction: column;
        }

        .toggle-info strong {
          font-size: 13px;
        }

        .toggle-info span {
          font-size: 10.5px;
          color: var(--text-muted);
        }

        .icon-btn {
          gap: 4px;
          font-size: 11px;
        }

        /* Switch PJ custom toggle styling */
        .switch-pj {
          position: relative;
          display: inline-block;
          width: 34px;
          height: 20px;
        }

        .switch-pj input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider-pj {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--border-hover);
          transition: .3s;
          border-radius: 20px;
        }

        .slider-pj:before {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
        }

        input:checked + .slider-pj {
          background-color: var(--primary);
        }

        input:checked + .slider-pj:before {
          transform: translateX(14px);
        }

        /* Streaks */
        .streak-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .streak-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background-color: var(--bg-tertiary);
          border-radius: var(--radius-sm);
        }

        .avatar-sm {
          width: 26px;
          height: 26px;
          font-size: 9px;
        }

        .bg-maroon {
          background-color: var(--primary);
        }

        .streak-details {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .streak-details strong {
          font-size: 12.5px;
        }

        .streak-details span {
          font-size: 10.5px;
          color: var(--text-muted);
        }

        .streak-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background-color: var(--badge-medium-bg);
          color: var(--badge-medium-text);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 10.5px;
          font-weight: 600;
        }

        /* ==================== RECRUITMENT PANELS ==================== */
        .hr-grid-recruitment {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          grid-template-rows: auto 1fr;
          gap: 20px;
          align-items: stretch;
        }

        @media (max-width: 1100px) {
          .hr-grid-recruitment {
            grid-template-columns: 1fr;
          }
        }

        .card-full-width {
          grid-column: 1 / -1;
        }

        .recruitment-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-hover) 100%);
          border: 1px solid var(--border-color);
          padding: 16px 20px;
          border-radius: var(--radius-md);
        }

        .banner-info h3 {
          font-family: var(--font-display);
          font-weight: 700;
          color: var(--primary);
        }

        .banner-info p {
          font-size: 12.5px;
          color: var(--text-secondary);
        }

        .spinner-pj {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        .candidate-row {
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }

        .candidate-row.selected-row {
          background-color: var(--bg-active);
        }

        .cand-cell {
          display: flex;
          flex-direction: column;
        }

        .skills-badge-list {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .text-xs { font-size: 10px; }

        .fit-score-cell {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .fit-lbl {
          font-size: 11px;
          font-weight: 700;
        }

        .fit-bar-container {
          width: 80px;
          height: 5px;
          background-color: var(--border-color);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .fit-bar {
          height: 100%;
          border-radius: var(--radius-full);
        }

        /* Candidate Details Dossier Drawer */
        .recruitment-details-card {
          height: 520px;
          overflow: hidden;
        }

        .details-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border-color);
        }

        .letter-spacing {
          letter-spacing: 0.05em;
        }

        .details-header h3 {
          font-family: var(--font-display);
          font-weight: 700;
          color: var(--primary);
          margin-top: 2px;
        }

        .role-p {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .score-badge-circle {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          border-radius: var(--radius-full);
          border: 3px solid var(--accent);
          background-color: var(--bg-tertiary);
        }

        .circle-score {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 15px;
          color: var(--primary);
        }

        .circle-lbl {
          font-size: 8px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .details-scrollable-body {
          flex: 1;
          overflow-y: auto;
          padding-right: 4px;
        }

        .details-section-pj h5 {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 13.5px;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .cv-summary-txt {
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .education-skills-block {
          font-size: 12px;
          color: var(--text-primary);
        }

        /* Simulated ElevenLabs audio block */
        .audio-player-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background-color: var(--bg-tertiary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .play-audio-btn {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background-color: var(--primary);
          color: var(--text-inverse);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-sm);
        }

        .play-audio-btn:hover {
          background-color: var(--primary-hover);
        }

        .player-progress-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .progress-bar-bg {
          width: 100%;
          height: 5px;
          background-color: var(--border-color);
          border-radius: var(--radius-full);
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--primary-gradient);
          border-radius: var(--radius-full);
        }

        .time-lbl {
          font-size: 10px;
          color: var(--text-muted);
          text-align: right;
        }

        .waves-animator {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 20px;
        }

        .wave-bar {
          display: inline-block;
          width: 3px;
          height: 10px;
          background-color: var(--text-muted);
          border-radius: var(--radius-full);
        }

        .wave-bar.animating {
          background-color: var(--primary);
          animation: waveOscillate 1.2s ease-in-out infinite alternate;
        }

        .wave-bar.delay-1 { animation-delay: 0.1s; }
        .wave-bar.delay-2 { animation-delay: 0.3s; }
        .wave-bar.delay-3 { animation-delay: 0.5s; }
        .wave-bar.delay-4 { animation-delay: 0.2s; }
        .wave-bar.delay-5 { animation-delay: 0.4s; }
        .wave-bar.delay-6 { animation-delay: 0.6s; }
        .wave-bar.delay-7 { animation-delay: 0.15s; }

        @keyframes waveOscillate {
          from { height: 6px; }
          to { height: 18px; }
        }

        .audio-placeholder-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background-color: var(--bg-tertiary);
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-md);
          text-align: center;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .phone-bounce-icon {
          color: var(--text-muted);
          animation: phoneBounce 1.5s infinite;
        }

        @keyframes phoneBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* Transcript Chat bubbles */
        .transcript-chat {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 10px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          max-height: 240px;
          overflow-y: auto;
        }

        .chat-bubble-row {
          display: flex;
          gap: 10px;
          max-width: 85%;
        }

        .chat-bubble-row.bot-row {
          align-self: flex-start;
        }

        .chat-bubble-row.user-row {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .chat-avatar {
          width: 24px;
          height: 24px;
          border-radius: var(--radius-full);
          background-color: var(--border-color);
          color: var(--text-secondary);
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 4px;
        }

        .bot-row .chat-avatar {
          background-color: var(--accent);
          color: var(--primary);
        }

        .chat-bubble {
          padding: 8px 12px;
          border-radius: var(--radius-md);
          font-size: 12px;
          line-height: 1.4;
          background-color: var(--bg-tertiary);
        }

        .bot-row .chat-bubble {
          background-color: var(--accent-light);
          border-left: 3px solid var(--primary);
        }

        .user-row .chat-bubble {
          background-color: var(--bg-hover);
        }

        .bubble-speaker {
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 2px;
          display: block;
        }

        /* ==================== PAYROLL PANELS ==================== */
        .slabs-info-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }

        .slab-info-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 10px;
          background-color: var(--bg-tertiary);
          border-radius: var(--radius-sm);
        }

        .slab-badge {
          display: inline-block;
          font-size: 9px;
          font-weight: 700;
          color: var(--primary);
          background-color: var(--accent-light);
          border: 1px solid var(--accent);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          flex-shrink: 0;
          text-transform: uppercase;
        }

        .slab-info-item p {
          font-size: 11.5px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .input-with-button {
          display: flex;
          gap: 8px;
        }

        .input-pj {
          flex: 1;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          font-size: 13px;
          background-color: var(--bg-secondary);
        }

        .input-pj:focus {
          outline: none;
          border-color: var(--primary);
        }

        .success-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: var(--badge-low-bg);
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-success);
          font-size: 11px;
        }

        /* Payslip printable document styling */
        .payslip-document-wrapper {
          background-color: #ffffff;
          padding: 16px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-color);
          overflow-y: auto;
          max-height: 480px;
        }

        .payslip-border-trim {
          border: 2px solid var(--primary);
          padding: 4px;
        }

        .payslip-inner {
          border: 1px solid var(--border-color);
          padding: 16px;
          background-color: #ffffff;
          color: #111111;
        }

        .payslip-branding {
          display: flex;
          align-items: center;
          gap: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #111111;
        }

        .brand-crest {
          width: 52px;
          height: 52px;
          border: 2px solid var(--accent);
          background-color: var(--primary);
          color: #ffffff;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 24px;
        }

        .brand-title {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 20px;
          color: var(--primary);
          letter-spacing: 0.05em;
        }

        .brand-subtitle {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #555555;
          text-transform: uppercase;
        }

        .brand-addr {
          display: block;
          font-size: 9px;
          color: #777777;
        }

        .payslip-doc-title {
          text-align: center;
          margin-top: 10px;
          margin-bottom: 12px;
          background-color: #f7f5f2;
          padding: 4px;
          border: 1px solid var(--border-color);
        }

        .payslip-doc-title h4 {
          font-weight: 700;
          font-size: 12px;
          color: var(--primary);
          letter-spacing: 0.05em;
        }

        .payslip-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 11px;
          border-bottom: 1px solid #111111;
          padding-bottom: 10px;
        }

        .payslip-meta-grid .lbl {
          font-weight: 700;
          color: #555555;
          display: inline-block;
          width: 140px;
        }

        .payslip-meta-grid .val {
          font-weight: 600;
          color: #111111;
        }

        .payslip-table-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          font-size: 11px;
          border-bottom: 2px solid #111111;
        }

        .payslip-col-table {
          display: flex;
          flex-direction: column;
        }

        .payslip-col-table.border-left {
          border-left: 1px solid #111111;
        }

        .payslip-col-table .col-header {
          display: flex;
          justify-content: space-between;
          font-weight: 700;
          background-color: #f1ebd8;
          padding: 6px 8px;
          border-bottom: 1px solid #111111;
          text-transform: uppercase;
        }

        .payslip-col-table .col-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 8px;
          border-bottom: 1px solid #eee;
        }

        .payslip-col-table .col-row.spacer-row {
          height: 23px;
          border-bottom: none;
        }

        .payslip-col-table .col-row.highlight-bonus {
          background-color: #fef8e7;
          font-weight: 600;
        }

        .payslip-col-table .total-row {
          border-top: 1px solid #111111;
          border-bottom: none;
          background-color: #f7f5f2;
          padding: 6px 8px;
        }

        .net-pay-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background-color: #f0ead8;
          border: 1.5px solid var(--primary);
          margin-top: 12px;
        }

        .net-left {
          display: flex;
          flex-direction: column;
        }

        .net-title {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 13px;
          color: var(--primary);
        }

        .net-desc {
          font-size: 8px;
          color: #555555;
          font-weight: 600;
        }

        .net-val {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 20px;
          color: var(--primary);
        }

        .payslip-footer {
          font-size: 9px;
          line-height: 1.4;
          color: #555555;
        }

        .signatures-row {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
        }

        .signature-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 180px;
        }

        .sig-line {
          width: 100%;
          border-top: 1px dashed #777777;
          margin-bottom: 4px;
        }

        .sig-lbl {
          font-size: 9px;
          font-weight: 600;
          color: #333333;
        }

        /* ==================== ONBOARDING PANELS ==================== */
        .onboard-candidate-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .onboard-cand-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }

        .onboard-cand-bar:hover {
          background-color: var(--bg-hover);
        }

        .onboard-cand-bar.active {
          background-color: var(--bg-active);
          border-color: var(--primary);
        }

        .avatar-md {
          width: 32px;
          height: 32px;
          font-size: 11px;
        }

        .onboard-details {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .onboard-details strong {
          font-size: 13.5px;
        }

        .onboard-details span {
          font-size: 11px;
          color: var(--text-muted);
        }

        .onboard-badge-cell {
          text-align: right;
        }

        /* Royal digital offer card styling */
        .royal-offer-card {
          background: linear-gradient(135deg, #7c1a22 0%, #3a0b0f 100%);
          color: #ffffff;
          border-radius: var(--radius-lg);
          padding: 24px;
          position: relative;
          box-shadow: var(--shadow-md);
          overflow: hidden;
          border: 1.5px solid var(--accent);
        }

        .royal-offer-card::after {
          content: '';
          position: absolute;
          right: -40px;
          bottom: -40px;
          width: 160px;
          height: 160px;
          border-radius: 50%;
          border: 2px solid rgba(212, 175, 55, 0.1);
        }

        .gold-seal {
          position: absolute;
          right: 20px;
          top: 20px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--accent);
          color: #7c1a22;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 14px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .offer-title {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 16px;
          color: var(--accent);
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        .offer-body-txt {
          font-size: 12.5px;
          line-height: 1.5;
          opacity: 0.9;
        }

        .offer-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 12px;
        }

        .stat-box {
          display: flex;
          flex-direction: column;
        }

        .stat-box .lbl {
          font-size: 9px;
          opacity: 0.6;
          text-transform: uppercase;
        }

        .stat-box .val {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 700;
          color: var(--accent);
        }

        .offer-footer-terms {
          font-size: 9px;
          opacity: 0.5;
          margin-top: 16px;
          text-align: right;
        }

        /* Checkbox PJ styling */
        .verification-check-block {
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 16px;
        }

        .check-rows-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .checkbox-row-pj {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
          padding: 4px;
        }

        .checkbox-row-pj input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
        }

        .checkbox-custom {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 2px solid var(--border-hover);
          background-color: var(--bg-primary);
          flex-shrink: 0;
          margin-top: 2px;
          position: relative;
          transition: border-color var(--transition-fast), background-color var(--transition-fast);
        }

        .checkbox-row-pj:hover .checkbox-custom {
          border-color: var(--primary);
        }

        .checkbox-row-pj input:checked + .checkbox-custom {
          background-color: var(--primary);
          border-color: var(--primary);
        }

        .checkbox-row-pj input:checked + .checkbox-custom::after {
          content: '✓';
          color: white;
          font-weight: 700;
          font-size: 11px;
          position: absolute;
          left: 3px;
          top: -1px;
        }

        .check-info {
          display: flex;
          flex-direction: column;
        }

        .check-info strong {
          font-size: 13px;
          color: var(--text-primary);
        }

        .check-info span {
          font-size: 10.5px;
          color: var(--text-muted);
          margin-top: 1px;
        }

        .onboard-scrollable {
          flex: 1;
          overflow-y: auto;
          padding-right: 4px;
        }

        .flex-grow-card-body {
          display: flex;
          flex-direction: column;
        }

        .dropdown-pj {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          outline: none;
        }

        .dropdown-pj:focus {
          border-color: var(--primary);
        }

        /* Toast popup */
        .pj-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background-color: #221d1b;
          color: #f5f0eb;
          border-left: 4px solid var(--accent);
          padding: 12px 18px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: var(--shadow-lg);
          z-index: 1000;
          font-size: 13px;
          font-weight: 500;
        }

        /* Print Media styling for payslips */
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-payslip, #printable-payslip * {
            visibility: visible;
          }
          #printable-payslip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            max-height: none;
            box-shadow: none;
            border: none;
            padding: 0;
            margin: 0;
          }
          .print-hide {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
};
