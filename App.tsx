
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AIInsights from './components/AIInsights';
import ReportPrintable from './components/ReportPrintable';
import HistoryView from './components/HistoryView';
import PerformanceAnalytics from './components/PerformanceAnalytics';
import AdminView from './components/AdminView';
import { 
  ReportData, 
  Equipment, 
  Solution, 
  CalibrationPoint, 
  Verification, 
  AIInsight 
} from './types';
import { 
  SECTORS, 
  NORMATIVE_REF_DEFAULT, 
  TOLERANCE_PERCENTAGE,
  CALIBRATION_MOTIVES,
  TAG_CORRELATION,
  getPhFromTemp,
  getTheoreticalSlope
} from './constants';
import { getCalibrationInsights } from './services/geminiService';

const App: React.FC = () => {
  const [isLandingPage, setIsLandingPage] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [calibrationSkipped, setCalibrationSkipped] = useState(false);
  const [history, setHistory] = useState<ReportData[]>([]);

  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };
  
  const generateNewReport = (): ReportData => {
    const today = getLocalDate();
    return {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      equipment: {
        tagAit: '',
        tagEquipment: '',
        manufacturer: 'Mettler Toledo',
        model: 'InPro 3250',
        osNumber: '',
        itNumber: '',
        classification: 'Uso Interno',
        technicianName: '',
        installationArea: '',
        calibrationDate: today,
        motive: '', 
        electrodeReplacement: false,
        electrodeManufactureDate: ''
      },
      solutions: [
        { type: 'pH 7,00', lot: '', manufactureDate: '', expiryDate: '', manufacturer: 'Mettler Toledo', calibrationTemp: 25 },
        { type: 'pH 10,00', lot: '', manufactureDate: '', expiryDate: '', manufacturer: 'Mettler Toledo', calibrationTemp: 25 }
      ],
      calibration: {
        date: today,
        indicatedPh7: 7.0,
        samplePh7: 7.0,
        error7: 0,
        indicatedPh10: 10.0,
        samplePh10: 10.0,
        error10: 0,
        mV7: 0,
        mV10: 0,
        slope: 100, 
        temperature: 25,
        uncertainty: 0.05,
        errorPercentage: 0
      },
      verification: {
        temperature: 25,
        date7: today,
        indicatedPh7: 7.0,
        samplePh7: 7.0,
        error7: 0,
        date10: today,
        indicatedPh10: 10.0,
        samplePh10: 10.0,
        error10: 0,
        mV7: 0,
        mV10: 0,
        result: 'Reprovado'
      },
      status: 'Não Conforme',
      observations: '',
      calibrationMotive: '', 
      normativeRef: NORMATIVE_REF_DEFAULT,
      responsible: {
        name: '',
        registration: '',
        sector: SECTORS[0],
        signatureDate: new Date().toLocaleDateString('pt-BR')
      }
    };
  };

  const [report, setReport] = useState<ReportData>(generateNewReport());
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('anglo_reports');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar histórico", e);
      }
    }
  }, []);

  const currentVerifSlope = (() => {
    const vTemp = report.verification.temperature;
    const vPh = getPhFromTemp(vTemp);
    const vTheoreticalSlope = getTheoreticalSlope(vTemp);
    const vPhSpan = Math.abs(vPh.ph10 - vPh.ph7);
    const vActualMvSpan = Math.abs(report.verification.mV7 - report.verification.mV10);
    return vPhSpan === 0 ? 0 : (vActualMvSpan / (vPhSpan * vTheoreticalSlope)) * 100;
  })();

  useEffect(() => {
    if (isReadOnly) return;
    const vTemp = report.verification.temperature;
    const vPh = getPhFromTemp(vTemp);
    const vError7 = ((report.verification.indicatedPh7 - vPh.ph7) / vPh.ph7) * 100;
    const vError10 = ((report.verification.indicatedPh10 - vPh.ph10) / vPh.ph10) * 100;
    const vTheoreticalSlope = getTheoreticalSlope(vTemp);
    const vPhSpan = Math.abs(vPh.ph10 - vPh.ph7);
    const vActualMvSpan = Math.abs(report.verification.mV7 - report.verification.mV10);
    const vSlope = vPhSpan === 0 ? 0 : (vActualMvSpan / (vPhSpan * vTheoreticalSlope)) * 100;
    const vIsApproved = Math.abs(vError7) <= TOLERANCE_PERCENTAGE && Math.abs(vError10) <= TOLERANCE_PERCENTAGE && vSlope >= 90 && vSlope <= 110;

    const cTemp = report.calibration.temperature;
    const cPh = getPhFromTemp(cTemp);
    const cError7 = ((report.calibration.indicatedPh7 - cPh.ph7) / cPh.ph7) * 100;
    const cError10 = ((report.calibration.indicatedPh10 - cPh.ph10) / cPh.ph10) * 100;
    const cIsApproved = Math.abs(cError7) <= TOLERANCE_PERCENTAGE && Math.abs(cError10) <= TOLERANCE_PERCENTAGE && report.calibration.slope >= 90 && report.calibration.slope <= 110;

    setReport(prev => ({
      ...prev,
      verification: { ...prev.verification, samplePh7: vPh.ph7, samplePh10: vPh.ph10, error7: vError7, error10: vError10, result: vIsApproved ? 'Aprovado' : 'Reprovado' },
      calibration: { ...prev.calibration, samplePh7: cPh.ph7, samplePh10: cPh.ph10, error7: cError7, error10: cError10 },
      status: cIsApproved ? 'Conforme' : 'Não Conforme'
    }));
  }, [report.verification.temperature, report.verification.indicatedPh7, report.verification.indicatedPh10, report.verification.mV7, report.verification.mV10, report.calibration.temperature, report.calibration.indicatedPh7, report.calibration.indicatedPh10, report.calibration.mV7, report.calibration.mV10, report.calibration.slope, isReadOnly]);

  const handleAIAnalysis = async () => {
    setLoadingAI(true);
    const insights = await getCalibrationInsights(report);
    setAiInsight(insights);
    setLoadingAI(false);
  };

  const handleSaveData = () => {
    if (isReadOnly) return;
    setIsSaving(true);
    const currentHistory = [...history];
    const newEntry = { ...report, savedAt: new Date().toISOString(), calibrationSkipped, status: calibrationSkipped ? (report.verification.result === 'Aprovado' ? 'Conforme' : 'Não Conforme') : report.status };
    const existingIndex = currentHistory.findIndex(h => h.id === report.id);
    if (existingIndex > -1) { currentHistory[existingIndex] = newEntry; } else { currentHistory.push(newEntry); }
    localStorage.setItem('anglo_reports', JSON.stringify(currentHistory));
    setHistory(currentHistory);
    setTimeout(() => { setIsSaving(false); setIsSavedSuccess(true); }, 800);
  };

  const handleNewCalibration = () => {
    setReport(generateNewReport());
    setCalibrationSkipped(false);
    setIsSavedSuccess(false);
    setIsReadOnly(false);
    setIsLandingPage(false);
    setCurrentStep(1);
    setAiInsight(null);
  };

  const handleLoadFromHistory = (historicalReport: ReportData) => {
    setReport(historicalReport);
    setCalibrationSkipped(historicalReport.calibrationSkipped || false);
    setIsReadOnly(true);
    setShowHistory(false);
    setShowAnalytics(false);
    setShowAdmin(false);
    setIsSavedSuccess(false);
    setIsLandingPage(false);
    setCurrentStep(5);
  };

  const handleWhatsappShare = () => {
    const formattedDate = report.equipment.calibrationDate.split('-').reverse().join('/');
    const shareStatus = calibrationSkipped ? (report.verification.result === 'Aprovado' ? 'CONFORME' : 'NÃO CONFORME') : (report.status === 'Conforme' ? 'CONFORME' : 'NÃO CONFORME');
    
    const text = `📄 *Relatório de calibração - ${formattedDate}*

*TAG:* ${report.equipment.tagAit}
*ATIVO:* ${report.equipment.tagEquipment || 'N/A'}

*VERIFICAÇÃO:*
• Erro pH 7,00: ${report.verification.error7.toFixed(2)}%
• Erro pH 10,00: ${report.verification.error10.toFixed(2)}%
• Slope: ${currentVerifSlope.toFixed(1)}%

*CALIBRAÇÃO:*
${calibrationSkipped ? '• Ajuste omitido (Sensor estável)' : `• Erro pH 7: ${report.calibration.error7.toFixed(2)}%
• Erro pH 10: ${report.calibration.error10.toFixed(2)}%
• Slope Final: ${report.calibration.slope.toFixed(1)}%`}

*PARECER FINAL:* ${shareStatus}
*OBSERVAÇÕES:* ${report.observations || 'Sem observações adicionais.'}

---------------------------------------
*TÉCNICO:* ${report.responsible.name}
*ID:* ${report.id}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const nextStep = () => { if (isStepValid(currentStep)) { setCurrentStep(prev => Math.min(prev + 1, 5)); } };
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));
  
  const isStepValid = (step: number): boolean => { 
    if (step === 1) return (
      report.responsible.name.trim() !== '' && 
      report.responsible.registration.trim() !== '' && 
      report.equipment.tagAit.trim() !== '' && 
      report.equipment.osNumber.trim() !== '' &&
      report.equipment.motive !== ''
    );
    if (step === 3) return (
      report.verification.indicatedPh10 !== 0 && report.verification.mV10 !== 0
    );
    if (step === 4) return (
      report.calibration.indicatedPh7 !== 0 && 
      report.calibration.indicatedPh10 !== 0 && 
      report.calibration.mV10 !== 0 &&
      report.calibration.slope !== 0
    );
    return true; 
  };
  
  const updateEquipment = (field: keyof Equipment, value: any) => { 
    if (isReadOnly) return; 
    setReport(prev => { 
      let updatedEquip = { ...prev.equipment, [field]: value }; 
      if (field === 'tagAit' && typeof value === 'string') { 
        const upperTag = value.trim().toUpperCase(); 
        if (TAG_CORRELATION[upperTag]) { 
          updatedEquip.tagEquipment = TAG_CORRELATION[upperTag]; 
        } else { 
          updatedEquip.tagEquipment = ''; 
        } 
      } 
      const updatedCalibrationMotive = field === 'motive' ? value : prev.calibrationMotive;
      return { ...prev, equipment: updatedEquip, calibrationMotive: updatedCalibrationMotive }; 
    }); 
  };
  
  const updateSolution = (index: number, field: keyof Solution, value: any) => {
    if (isReadOnly) return;
    setReport(prev => {
      const newSolutions = [...prev.solutions];
      newSolutions[index] = { ...newSolutions[index], [field]: value };
      return { ...prev, solutions: newSolutions };
    });
  };

  const updateResponsible = (field: 'name' | 'registration', value: string) => { if (isReadOnly) return; setReport(prev => ({ ...prev, responsible: { ...prev.responsible, [field]: value }, equipment: field === 'name' ? { ...prev.equipment, technicianName: value } : prev.equipment })); };
  const updateVerification = (field: keyof Verification, value: any) => { if (isReadOnly) return; setReport(prev => ({ ...prev, verification: { ...prev.verification, [field]: value } })); };
  const updateCalibration = (field: keyof CalibrationPoint, value: any) => { if (isReadOnly) return; setReport(prev => ({ ...prev, calibration: { ...prev.calibration, [field]: value } })); };
  
  const handleOpenPreview = () => setShowPreview(true);
  const handleFinalPrint = () => {
    window.print();
  };
  
  const finalStatus = calibrationSkipped 
    ? (report.verification.result === 'Aprovado' ? 'Conforme' : 'Não Conforme') 
    : report.status;

  return (
    <div className={`min-h-[100dvh] bg-[#f8fafc] flex flex-col font-sans antialiased w-full overflow-x-hidden ${isLandingPage ? 'overflow-hidden h-[100dvh]' : ''}`}>
      <Header 
        onOpenHistory={() => setShowHistory(true)} 
        onOpenAdmin={() => setShowAdmin(true)}
        onOpenAnalytics={() => setShowAnalytics(true)}
        onBackHome={() => setIsLandingPage(true)} 
      />
      
      {!isLandingPage && (
        <>
          <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-[72px] z-40 no-print shadow-sm shrink-0">
            <div className="max-w-md mx-auto flex justify-between items-center relative px-2">
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-100 -translate-y-1/2 z-0"></div>
              <div className="absolute top-1/2 left-0 h-[2px] bg-[#FFCD00] -translate-y-1/2 z-0 transition-all duration-500" style={{ width: `${(currentStep - 1) * 25}%` }}></div>
              {[1, 2, 3, 4, 5].map(step => (
                <button key={step} onClick={() => step < currentStep && isStepValid(step) && setCurrentStep(step)} className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 shadow-sm border-2 ${
                    currentStep === step ? 'bg-[#FFCD00] border-[#FFCD00] text-[#121d28] scale-110 shadow-lg' : 
                    currentStep > step ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    {currentStep > step ? <i className="fas fa-check text-[9px]"></i> : step}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <main className="flex-1 max-w-md mx-auto w-full p-4 pb-32 no-print overflow-y-auto">
            {currentStep === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-5 rounded-[1.8rem] shadow-lg border border-gray-100 space-y-4">
                  <h2 className="text-[10px] font-black text-[#121d28] uppercase tracking-[0.2em] flex items-center gap-2">
                    <i className="fas fa-user-circle text-[#FFCD00]"></i> Responsável Técnico
                  </h2>
                  <div className="space-y-3">
                    <input type="text" disabled={isReadOnly} value={report.responsible.name} onChange={(e) => updateResponsible('name', e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#FFCD00]/20 transition-all" placeholder="Nome Completo" />
                    <input type="text" inputMode="numeric" disabled={isReadOnly} value={report.responsible.registration} onChange={(e) => updateResponsible('registration', e.target.value.replace(/\D/g, ''))} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#FFCD00]/20 transition-all" placeholder="Matrícula Anglo" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-[1.8rem] shadow-lg border border-gray-100 space-y-4">
                  <h2 className="text-[10px] font-black text-[#121d28] uppercase tracking-[0.2em] flex items-center gap-2">
                    <i className="fas fa-barcode text-[#FFCD00]"></i> Identificação do Ativo
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <select disabled={isReadOnly} value={report.equipment.tagAit} onChange={(e) => updateEquipment('tagAit', e.target.value)} className="w-full bg-blue-50 border border-blue-100 rounded-xl px-3 py-3.5 text-[10px] font-black uppercase outline-none">
                      <option value="">TAG Analisador</option>
                      {Object.keys(TAG_CORRELATION).sort().map(tag => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                    <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-3.5 text-[10px] font-black text-gray-400 flex items-center">
                      {report.equipment.tagEquipment || 'TAG Equip.'}
                    </div>
                  </div>
                  <input type="text" inputMode="numeric" disabled={isReadOnly} value={report.equipment.osNumber} onChange={(e) => updateEquipment('osNumber', e.target.value.replace(/\D/g, ''))} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none" placeholder="O.S. (Ex: 123456)" />
                  <select disabled={isReadOnly} value={report.equipment.motive} onChange={(e) => updateEquipment('motive', e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none">
                    <option value="">Selecione o Motivo</option>
                    {CALIBRATION_MOTIVES.map(motive => <option key={motive} value={motive}>{motive}</option>)}
                  </select>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-5 rounded-[1.8rem] shadow-lg border border-gray-100 space-y-5">
                  <h2 className="text-[10px] font-black text-[#121d28] uppercase tracking-[0.2em] flex items-center gap-2">
                    <i className="fas fa-microscope text-[#FFCD00]"></i> Verificação de Instrumento
                  </h2>
                  <div className="bg-blue-50 p-5 rounded-[1.5rem] border border-blue-100 text-center">
                    <label className="block text-[8px] font-black text-blue-800 uppercase tracking-widest mb-2">Temperatura Amostra (°C)</label>
                    <input type="number" step="0.1" disabled={isReadOnly} value={report.verification.temperature} onChange={(e) => updateVerification('temperature', parseFloat(e.target.value))} className="w-20 text-center bg-white border border-blue-200 rounded-xl py-3 text-xl font-black text-blue-900 shadow-sm outline-none" />
                  </div>
                  {[7, 10].map(val => (
                    <div key={val} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <span className="text-[9px] font-black text-gray-700 uppercase">pH {val === 7 ? '7,00' : '10,00'}</span>
                        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${Math.abs(val === 7 ? report.verification.error7 : report.verification.error10) <= TOLERANCE_PERCENTAGE ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          Erro: {(val === 7 ? report.verification.error7 : report.verification.error10).toFixed(2)}%
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="number" placeholder="pH Lido" step="0.01" value={val === 7 ? report.verification.indicatedPh7 : report.verification.indicatedPh10} onChange={(e) => updateVerification(val === 7 ? 'indicatedPh7' : 'indicatedPh10', parseFloat(e.target.value))} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-3 text-sm font-black text-gray-800" />
                        <input type="number" placeholder="mV" step="1" value={val === 7 ? report.verification.mV7 : report.verification.mV10} onChange={(e) => updateVerification(val === 7 ? 'mV7' : 'mV10', parseFloat(e.target.value))} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-3 text-sm font-black text-gray-800" />
                      </div>
                    </div>
                  ))}
                  <div className={`p-5 rounded-3xl border-2 text-center ${report.verification.result === 'Aprovado' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-left">
                        <span className="text-[8px] font-black text-gray-500 uppercase block mb-1">Slope</span>
                        <span className="text-xl font-black text-gray-900">{currentVerifSlope.toFixed(1)}%</span>
                      </div>
                    </div>
                    {report.verification.result === 'Aprovado' && (
                      <button onClick={() => { setCalibrationSkipped(true); setCurrentStep(5); }} className="w-full mt-2 bg-white text-emerald-600 border border-emerald-200 py-3.5 rounded-xl text-[9px] font-black uppercase shadow-sm">Pular Ajuste (Sensor Estável)</button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white p-5 rounded-[1.8rem] shadow-lg border border-gray-100 space-y-6">
                  <h2 className="text-[10px] font-black text-[#121d28] uppercase tracking-[0.2em] flex items-center gap-2">
                    <i className="fas fa-tools text-[#FFCD00]"></i> Calibração Final
                  </h2>
                  <div className="bg-[#121d28] p-8 rounded-[2rem] text-center shadow-2xl">
                    <label className="block text-[9px] font-black text-[#FFCD00] uppercase mb-4 tracking-widest">Slope Final do Analisador (%)</label>
                    <input type="number" step="0.1" value={report.calibration.slope} onChange={(e) => updateCalibration('slope', parseFloat(e.target.value))} className="w-full bg-white/5 border border-[#FFCD00]/30 rounded-2xl py-5 text-4xl font-black text-[#FFCD00] text-center outline-none" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6 animate-fadeIn pb-10">
                <div className="bg-[#121d28] p-8 rounded-[2.2rem] shadow-2xl text-center border-t-8 border-[#FFCD00]">
                   <span className="text-[10px] font-black text-[#FFCD00] uppercase tracking-[0.4em] mb-4 block">Conformidade Final</span>
                   <div className={`text-3xl font-black ${finalStatus === 'Conforme' ? 'text-green-400' : 'text-red-400'}`}>
                     {finalStatus === 'Conforme' ? '✓ CONFORME' : 'X NÃO CONFORME'}
                   </div>
                </div>
                
                <AIInsights insight={aiInsight} loading={loadingAI} onRefresh={handleAIAnalysis} />
                
                <div className="bg-white p-5 rounded-[1.8rem] shadow-lg border border-gray-100 space-y-4 no-print">
                   <textarea disabled={isReadOnly} value={report.observations} onChange={(e) => setReport(prev => ({ ...prev, observations: e.target.value }))} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-bold h-24 outline-none" placeholder="Observações finais..."></textarea>
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={handleOpenPreview} className="w-full bg-white text-[#121d28] border-2 border-[#121d28] py-4 rounded-2xl font-black text-[9px] uppercase active:scale-95 transition-transform">Ver PDF</button>
                      <button onClick={handleWhatsappShare} className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-black text-[9px] uppercase active:scale-95 transition-transform">WhatsApp</button>
                   </div>
                   {!isReadOnly && !isSavedSuccess && (
                     <button onClick={handleSaveData} disabled={isSaving} className="w-full bg-[#121d28] text-white py-5 rounded-2xl font-black text-xs uppercase shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform">
                       {isSaving ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-save"></i>} Gravar Relatório
                     </button>
                   )}
                </div>
              </div>
            )}
          </main>

          {!isSavedSuccess && (
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 p-6 pb-10 flex items-center justify-between no-print z-40 shadow-xl">
              <button onClick={prevStep} disabled={currentStep === 1} className="w-14 h-14 flex items-center justify-center rounded-2xl font-black text-lg text-gray-400 bg-gray-50 active:scale-95 transition-transform">
                <i className="fas fa-arrow-left"></i>
              </button>
              <button 
                onClick={nextStep} 
                disabled={currentStep === 5 || (!isReadOnly && !isStepValid(currentStep))} 
                className={`flex-1 ml-4 h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all ${
                  (currentStep === 5 || (!isReadOnly && !isStepValid(currentStep))) ? 'bg-gray-100 text-gray-300' : 'bg-[#FFCD00] text-[#121d28]'
                }`}
              >
                {currentStep === 3 ? 'Validar' : currentStep === 4 ? 'Finalizar' : currentStep === 5 ? 'Concluído' : 'Próximo'}
              </button>
            </div>
          )}
        </>
      )}

      {isLandingPage && (
        <div className="flex-1 flex flex-col items-center justify-between p-6 bg-[#121d28] text-white animate-fadeIn relative overflow-hidden h-[100dvh] w-full">
          <div className="absolute inset-0 pointer-events-none opacity-20">
             <div className="absolute top-[-10%] left-[-20%] w-[120%] h-[120%] bg-[#FFCD00]/5 rounded-full blur-[100px] animate-pulse"></div>
          </div>
          
          <div className="w-full flex flex-col items-center pt-14 relative z-10 text-center shrink-0">
            <div className="relative mb-8">
              <div className="relative bg-white/5 p-7 rounded-[2.2rem] border border-white/10 shadow-2xl">
                <div className="w-16 h-16 bg-[#FFCD00] rounded-2xl flex items-center justify-center text-[#121d28] text-4xl shadow-xl">
                  <i className="fas fa-flask"></i>
                </div>
              </div>
            </div>
            <h1 className="text-[2.6rem] font-black tracking-tighter uppercase italic leading-none drop-shadow-xl">pH-CALIB <span className="text-[#FFCD00] not-italic">PRO</span></h1>
          </div>

          <div className="w-full max-w-[340px] flex flex-col gap-4 relative z-10 mb-10 shrink-0">
            <button onClick={handleNewCalibration} className="group relative bg-white p-7 rounded-[2.5rem] shadow-2xl transition-all border-b-[8px] border-gray-100 flex items-center gap-6 active:scale-95 transition-transform overflow-hidden">
              <div className="w-14 h-14 bg-[#121d28] rounded-2xl flex items-center justify-center text-2xl text-[#FFCD00] shadow-lg"><i className="fas fa-plus"></i></div>
              <div className="text-left">
                <h3 className="text-[1.5rem] font-black text-[#121d28] uppercase leading-none tracking-tight">Calibração</h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-2">Iniciar Procedimento</p>
              </div>
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowAnalytics(true)} className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] flex flex-col items-center active:scale-95 transition-transform">
                <i className="fas fa-chart-line text-xl text-blue-400 mb-3"></i>
                <h3 className="text-[9px] font-black text-white uppercase tracking-widest leading-none">Analytics</h3>
              </button>
              <button onClick={() => setShowHistory(true)} className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] flex flex-col items-center active:scale-95 transition-transform">
                <i className="fas fa-database text-xl text-[#FFCD00] mb-3"></i>
                <h3 className="text-[9px] font-black text-white uppercase tracking-widest leading-none">Histórico</h3>
              </button>
            </div>
          </div>

          <div className="w-full flex flex-col items-center pb-8 relative z-10 text-center shrink-0">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em]">Anglo American Brasil</p>
          </div>
        </div>
      )}

      {showHistory && <HistoryView history={history} onClose={() => setShowHistory(false)} onView={handleLoadFromHistory} />}
      {showAdmin && <AdminView history={history} onClose={() => setShowAdmin(false)} onDelete={(id) => { setHistory(prev => { const n = prev.filter(h => h.id !== id); localStorage.setItem('anglo_reports', JSON.stringify(n)); return n; }); }} />}
      {showAnalytics && <PerformanceAnalytics history={history} onClose={() => setShowAnalytics(false)} />}
      
      <div className="print-only">
        <ReportPrintable data={report} calibrationSkipped={calibrationSkipped} />
      </div>
    </div>
  );
};

export default App;
