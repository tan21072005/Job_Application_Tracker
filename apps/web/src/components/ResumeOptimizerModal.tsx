import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  Layers,
  ChevronRight,
  Flame,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Search,
  BookOpen,
  Download,
  FileText,
  Printer,
  UploadCloud
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import type { Application } from '../domain.ts';
import {
  type AtsKeywordCategory,
  type KeywordImportance,
  type BulletVariantType,
  type OptimizedResumeVariantDTO,
  type BulletOptimizationProposalDTO,
  diagnoseAtsKeywordGaps,
  extractBulletsFromResume,
  rewriteBulletPointsXyz,
  synthesizeOptimizedResume
} from '../domain.ts';
import { resumeOptimizerRepository } from '../data.ts';

interface ResumeOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications?: Application[];
  initialApplicationId?: string;
  notify?: (message: string, isError?: boolean) => void;
}

const DEFAULT_SAMPLE_RESUME = `# Nguyen Van A - Senior Fullstack Engineer
Email: nguyen.vana@example.com | Phone: 0901 234 567 | Location: Ho Chi Minh City, Vietnam
GitHub: github.com/nguyenvana | LinkedIn: linkedin.com/in/nguyenvana

## Tóm tắt chuyên môn
Kỹ sư phần mềm Fullstack với hơn 5 năm kinh nghiệm thiết kế và phát triển các hệ thống web quy mô lớn. Thành thạo TypeScript, Node.js, React và kiến trúc Microservices.

## Kinh nghiệm làm việc
- Tham gia xây dựng hệ thống thanh toán điện tử cho khách hàng doanh nghiệp sử dụng Node.js và PostgreSQL.
- Chịu trách nhiệm bảo trì hệ thống container Docker và thiết lập quy trình kiểm thử tự động.
- Viết các API endpoint phục vụ ứng dụng di động và tối ưu hóa thời gian phản hồi của cơ sở dữ liệu.
- Làm việc cùng đội ngũ kiểm thử chất lượng để phát hiện và sửa các lỗi phát sinh trên môi trường staging.
- Hướng dẫn và chia sẻ kiến thức kỹ thuật cho các kỹ sư mới gia nhập đội ngũ.

## Kỹ năng chuyên môn
- Ngôn ngữ & Frameworks: JavaScript, TypeScript, Node.js, React, Express
- Cơ sở dữ liệu: PostgreSQL, MongoDB, Redis
- Công cụ & Hạ tầng: Docker, Git, REST API`;

const DEFAULT_SAMPLE_JD = `Vị trí: Senior Fullstack Engineer (Shopee Vietnam)
Yêu cầu chuyên môn:
- Ít nhất 4 năm kinh nghiệm với TypeScript, React, Next.js và Node.js.
- Thành thạo thiết kế cơ sở dữ liệu quan hệ PostgreSQL và bộ nhớ đệm phân tán Redis.
- Kinh nghiệm thực tế với Docker, Kubernetes, CI/CD và kiến trúc Microservices.
- Hiểu biết sâu về System Design, Performance Optimization và High Availability (99.99%).
- Khả năng Technical Leadership, cố vấn kỹ sư và làm việc liên nhóm (Cross-functional).`;

export const ResumeOptimizerModal: React.FC<ResumeOptimizerModalProps> = ({
  isOpen,
  onClose,
  applications = [],
  initialApplicationId,
  notify
}) => {
  const [selectedAppId, setSelectedAppId] = useState<string>(initialApplicationId || '');
  const [jobTitle, setJobTitle] = useState('Senior Fullstack Engineer');
  const [company, setCompany] = useState('Shopee Vietnam');
  const [jobDescription, setJobDescription] = useState(DEFAULT_SAMPLE_JD);
  const [resumeText, setResumeText] = useState(DEFAULT_SAMPLE_RESUME);

  const [activeStep, setActiveStep] = useState<'input' | 'studio' | 'preview'>('input');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [optimization, setOptimization] = useState<OptimizedResumeVariantDTO | null>(null);

  const [selectedVariantTypes, setSelectedVariantTypes] = useState<Record<string, BulletVariantType>>({});
  const [acceptedBullets, setAcceptedBullets] = useState<Record<string, string>>({});
  const [injectedKeywords, setInjectedKeywords] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [keywordFilter, setKeywordFilter] = useState<'all' | 'missing' | 'matched'>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'doc', 'txt', 'md'].includes(ext || '')) {
      notify?.('Chỉ hỗ trợ file .pdf, .docx, .md hoặc .txt.', true);
      return;
    }
    setIsParsingFile(true);
    try {
      const text = await resumeOptimizerRepository.parseFile(file);
      if (!text || text.trim().length === 0) {
        throw new Error('Không trích xuất được chữ từ file.');
      }
      setResumeText(text.trim());
      notify?.(`Đã tải & đọc thành công file: ${file.name}`);
    } catch (err) {
      notify?.('Không thể đọc file: ' + (err as Error).message, true);
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  useEffect(() => {
    if (!selectedAppId) return;
    const app = applications.find(a => a.id === selectedAppId);
    if (app) {
      setJobTitle(app.position);
      setCompany(app.company);
      const jdContent = `${app.position} tại ${app.company}.\n${app.notes || ''}\n${app.url ? `Nguồn tuyển dụng: ${app.url}` : ''}`;
      setJobDescription(jdContent.trim().length > 30 ? jdContent : DEFAULT_SAMPLE_JD);
    }
  }, [selectedAppId, applications]);

  const handleStartDiagnose = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      notify?.('Vui lòng nhập đầy đủ CV và JD tuyển dụng.', true);
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await resumeOptimizerRepository.diagnose({
        applicationId: selectedAppId || undefined,
        jobTitle,
        company,
        resumeText,
        jobDescription
      });
      setOptimization(res);

      const initialSelected: Record<string, BulletVariantType> = {};
      const initialAccepted: Record<string, string> = {};
      for (const p of res.proposals) {
        initialSelected[p.id] = 'metric_driven';
        if (p.variants.length > 0) {
          initialAccepted[p.originalBullet] = p.variants[0].rewrittenText;
        }
      }
      setSelectedVariantTypes(initialSelected);
      setAcceptedBullets(initialAccepted);

      const missing = res.diagnosticResult.keywordGaps
        .filter(k => !k.matched && (k.importance === 'critical' || k.importance === 'recommended'))
        .slice(0, 5)
        .map(k => k.keyword);
      setInjectedKeywords(missing);

      setActiveStep('studio');
      notify?.('Chẩn đoán ATS hoàn tất! Hãy tinh chỉnh các gạch đầu dòng theo công thức Google X-Y-Z.');
    } catch (err) {
      notify?.((err as Error).message || 'Lỗi khi chẩn đoán CV.', true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectVariant = (proposalId: string, originalBullet: string, variant: BulletVariantType, rewrittenText: string) => {
    setSelectedVariantTypes(prev => ({
      ...prev,
      [proposalId]: variant
    }));
    setAcceptedBullets(prev => ({
      ...prev,
      [originalBullet]: rewrittenText
    }));
  };

  const handleToggleKeywordInjection = (kw: string) => {
    setInjectedKeywords(prev =>
      prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw]
    );
  };

  const synthesizedPreview = useMemo(() => {
    if (!optimization) return resumeText;
    return synthesizeOptimizedResume(optimization.originalResume, acceptedBullets, injectedKeywords);
  }, [optimization, acceptedBullets, injectedKeywords, resumeText]);

  const liveAtsScore = useMemo(() => {
    if (!optimization) return 0;
    const diag = diagnoseAtsKeywordGaps(synthesizedPreview, optimization.targetJobText);
    return diag.atsScore;
  }, [optimization, synthesizedPreview]);

  const handleCopySynthesized = () => {
    navigator.clipboard.writeText(synthesizedPreview);
    setCopied(true);
    notify?.('Đã sao chép nội dung CV tối ưu vào clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadFile = (ext: 'md' | 'txt') => {
    const blob = new Blob([synthesizedPreview], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanCompany = (company || 'Company').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9-]/g, '_');
    const cleanTitle = (jobTitle || 'Role').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9-]/g, '_');
    a.download = `CV_${cleanCompany}_${cleanTitle}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify?.(`Đã tải xuống bản CV tối ưu dạng .${ext}!`);
  };

  const handleDownloadDocx = async () => {
    try {
      const lines = synthesizedPreview.split('\n');
      const docChildren: Paragraph[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          docChildren.push(new Paragraph({ text: '', spacing: { after: 100 } }));
          continue;
        }

        if (line.startsWith('# ')) {
          const titleText = line.replace(/^#\s+/, '');
          docChildren.push(
            new Paragraph({
              text: titleText,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { before: 180, after: 100 }
            })
          );
        } else if (line.startsWith('## ')) {
          const headingText = line.replace(/^##\s+/, '');
          docChildren.push(
            new Paragraph({
              text: headingText.toUpperCase(),
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 200, after: 100 },
              border: {
                bottom: {
                  color: '315bef',
                  space: 4,
                  style: BorderStyle.SINGLE,
                  size: 6
                }
              }
            })
          );
        } else if (line.startsWith('- ')) {
          const bulletText = line.replace(/^-\s+/, '');
          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: bulletText, size: 21, font: 'Calibri' })],
              bullet: { level: 0 },
              spacing: { after: 70 }
            })
          );
        } else {
          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: line, size: 21, font: 'Calibri' })],
              spacing: { after: 80 }
            })
          );
        }
      }

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 720,
                  right: 720,
                  bottom: 720,
                  left: 720
                }
              }
            },
            children: docChildren
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanCompany = (company || 'Company').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9-]/g, '_');
      const cleanTitle = (jobTitle || 'Role').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9-]/g, '_');
      a.download = `CV_${cleanCompany}_${cleanTitle}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify?.('Đã xuất file Word (.docx) chuẩn ATS thành công!');
    } catch (err) {
      notify?.('Không thể tạo file Word: ' + (err as Error).message, true);
    }
  };

  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notify?.('Vui lòng cho phép popup để in / lưu PDF.', true);
      return;
    }
    const cleanCompany = company || 'Company';
    const cleanTitle = jobTitle || 'Position';

    const lines = synthesizedPreview.split('\n');
    let htmlContent = '';
    let inList = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        if (inList) { htmlContent += '</ul>'; inList = false; }
        continue;
      }
      if (line.startsWith('# ')) {
        if (inList) { htmlContent += '</ul>'; inList = false; }
        htmlContent += `<h1 class="cv-name">${line.replace(/^#\s+/, '')}</h1>`;
      } else if (line.startsWith('## ')) {
        if (inList) { htmlContent += '</ul>'; inList = false; }
        htmlContent += `<h2 class="cv-section-title">${line.replace(/^##\s+/, '')}</h2>`;
      } else if (line.startsWith('- ')) {
        if (!inList) { htmlContent += '<ul class="cv-list">'; inList = true; }
        htmlContent += `<li>${line.replace(/^-\s+/, '')}</li>`;
      } else {
        if (inList) { htmlContent += '</ul>'; inList = false; }
        htmlContent += `<p class="cv-p">${line}</p>`;
      }
    }
    if (inList) htmlContent += '</ul>';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CV_${cleanCompany}_${cleanTitle}</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: 15mm 15mm 15mm 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              line-height: 1.5;
              color: #111827;
              background: #fff;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .cv-name {
              font-size: 20px;
              font-weight: 700;
              color: #111827;
              margin-bottom: 4px;
              text-align: center;
            }
            .cv-section-title {
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #1e3a8a;
              border-bottom: 1.5px solid #1e3a8a;
              padding-bottom: 3px;
              margin-top: 14px;
              margin-bottom: 6px;
            }
            .cv-p {
              font-size: 12px;
              color: #374151;
              margin: 3px 0;
            }
            .cv-list {
              margin: 3px 0;
              padding-left: 20px;
            }
            .cv-list li {
              font-size: 12px;
              color: #1f2937;
              margin-bottom: 3px;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSaveOptimization = async () => {
    if (!optimization) return;
    try {
      await resumeOptimizerRepository.applyRewrites(optimization.id, {
        acceptedBullets,
        injectedKeywords
      });
      notify?.('Đã lưu bản tối ưu hóa CV thành công!');
    } catch {
      notify?.('Đã lưu cấu hình tối ưu trên bộ nhớ cục bộ.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="resume-optimizer-modal-overlay" onClick={onClose}>
      <div className="resume-optimizer-modal-container" onClick={e => e.stopPropagation()}>
        <div className="resume-optimizer-header">
          <div className="resume-optimizer-title-area">
            <div className="resume-optimizer-icon-wrapper">
              <FileCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="resume-optimizer-title">Tối ưu từ khóa ATS cho CV</h2>
              <p className="resume-optimizer-subtitle">Resume ATS Optimizer & Google X-Y-Z Impact Rewriter</p>
            </div>
          </div>
          <button className="resume-optimizer-close-btn" onClick={onClose} aria-label="Đóng modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="resume-optimizer-nav-steps">
          <button
            className={`optimizer-step-btn ${activeStep === 'input' ? 'active' : ''}`}
            onClick={() => setActiveStep('input')}
          >
            <span>1. Nguồn CV & JD Mục tiêu</span>
          </button>
          <button
            className={`optimizer-step-btn ${activeStep === 'studio' ? 'active' : ''}`}
            onClick={() => optimization && setActiveStep('studio')}
            disabled={!optimization}
          >
            <span>2. Chẩn đoán ATS & X-Y-Z Studio</span>
          </button>
          <button
            className={`optimizer-step-btn ${activeStep === 'preview' ? 'active' : ''}`}
            onClick={() => optimization && setActiveStep('preview')}
            disabled={!optimization}
          >
            <span>3. Xem trước & Xuất bản CV</span>
          </button>
        </div>

        <div className="resume-optimizer-body">
          {activeStep === 'input' && (
            <div className="optimizer-input-view">
              <div className="optimizer-job-picker-bar">
                <div className="optimizer-field-group">
                  <label className="optimizer-label">Liên kết hồ sơ ứng tuyển có sẵn</label>
                  <select
                    className="optimizer-select optimizer-app-select"
                    value={selectedAppId}
                    onChange={e => setSelectedAppId(e.target.value)}
                  >
                    <option value="">-- Nhập thủ công hoặc chọn từ danh sách --</option>
                    {applications.map(app => (
                      <option key={app.id} value={app.id}>
                        {app.company} · {app.position} ({app.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="optimizer-inline-fields">
                  <div className="optimizer-field-group">
                    <label className="optimizer-label">Chức danh mục tiêu</label>
                    <input
                      type="text"
                      className="optimizer-input optimizer-job-title-input"
                      value={jobTitle}
                      onChange={e => setJobTitle(e.target.value)}
                    />
                  </div>
                  <div className="optimizer-field-group">
                    <label className="optimizer-label">Công ty</label>
                    <input
                      type="text"
                      className="optimizer-input optimizer-company-input"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="optimizer-split-editor">
                <div className="optimizer-editor-pane">
                  <div className="optimizer-pane-header">
                    <label className="optimizer-pane-title">Nội dung CV hiện tại</label>
                    <button
                      className="optimizer-text-btn"
                      onClick={() => setResumeText(DEFAULT_SAMPLE_RESUME)}
                    >
                      Dùng mẫu chuẩn
                    </button>
                  </div>

                  <div
                    className={`optimizer-dropzone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: isDragging ? '2px dashed #2563eb' : '1.5px dashed #94a3b8',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      textAlign: 'center',
                      background: isDragging ? '#eff6ff' : 'rgba(241, 245, 249, 0.6)',
                      cursor: 'pointer',
                      marginBottom: '10px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.md"
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          void handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <UploadCloud className="w-5 h-5 text-blue-600" />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>
                        {isParsingFile ? 'Đang trích xuất nội dung file CV...' : 'Tải file CV (.pdf, .docx, .md, .txt)'}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                      Kéo thả file vào đây hoặc bấm để chọn — hệ thống tự động bóc tách chữ
                    </p>
                  </div>

                  <textarea
                    className="optimizer-textarea optimizer-resume-textarea"
                    rows={12}
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    placeholder="Dán nội dung văn bản CV của bạn vào đây hoặc tải file lên..."
                  />
                </div>

                <div className="optimizer-editor-pane">
                  <div className="optimizer-pane-header">
                    <label className="optimizer-pane-title">Mô tả công việc (Job Description)</label>
                    <button
                      className="optimizer-text-btn"
                      onClick={() => setJobDescription(DEFAULT_SAMPLE_JD)}
                    >
                      Dùng JD mẫu
                    </button>
                  </div>
                  <textarea
                    className="optimizer-textarea optimizer-jd-textarea"
                    rows={12}
                    value={jobDescription}
                    onChange={e => setJobDescription(e.target.value)}
                    placeholder="Dán yêu cầu tuyển dụng (JD) từ công ty vào đây..."
                  />
                </div>
              </div>

              <div className="optimizer-action-row">
                <button
                  className="optimizer-btn-primary optimizer-diagnose-btn"
                  onClick={handleStartDiagnose}
                  disabled={isAnalyzing}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isAnalyzing ? 'Đang phân tích ATS...' : 'Bắt đầu Chẩn đoán & Tối ưu hóa ATS'}
                </button>
              </div>
            </div>
          )}

          {activeStep === 'studio' && optimization && (
            <div className="optimizer-studio-view">
              <div className="optimizer-score-banner">
                <div className="optimizer-score-dial">
                  <div className="optimizer-score-num">{liveAtsScore}%</div>
                  <div className="optimizer-score-label">Điểm ATS dự báo</div>
                </div>

                <div className="optimizer-score-breakdown">
                  <div className="optimizer-breakdown-item">
                    <span className="breakdown-name">Độ phủ Từ khóa (Keywords)</span>
                    <span className="breakdown-val text-indigo-400">
                      {optimization.diagnosticResult.scoreBreakdown.keywordRelevance}%
                    </span>
                  </div>
                  <div className="optimizer-breakdown-item">
                    <span className="breakdown-name">Cấu trúc Định lượng (Quantification)</span>
                    <span className="breakdown-val text-emerald-400">
                      {optimization.diagnosticResult.scoreBreakdown.impactQuantification}%
                    </span>
                  </div>
                  <div className="optimizer-breakdown-item">
                    <span className="breakdown-name">Độ dài & Định dạng (Formatting)</span>
                    <span className="breakdown-val text-blue-400">
                      {optimization.diagnosticResult.scoreBreakdown.formattingHealth}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="optimizer-section">
                <div className="optimizer-section-header">
                  <h3 className="optimizer-section-title">Lỗ hổng Từ khóa Tuyển dụng (Keyword Gaps)</h3>
                  <div className="optimizer-filter-tabs">
                    {(['all', 'missing', 'matched'] as const).map(tab => (
                      <button
                        key={tab}
                        className={`optimizer-filter-tab ${keywordFilter === tab ? 'active' : ''}`}
                        onClick={() => setKeywordFilter(tab)}
                      >
                        {tab === 'all' ? 'Tất cả' : tab === 'missing' ? 'Chưa có trong CV' : 'Đã có'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="optimizer-keyword-pills-grid">
                  {optimization.diagnosticResult.keywordGaps
                    .filter(k => {
                      if (keywordFilter === 'missing') return !k.matched;
                      if (keywordFilter === 'matched') return k.matched;
                      return true;
                    })
                    .map(k => {
                      const isSelectedForInjection = injectedKeywords.includes(k.keyword);
                      return (
                        <div
                          key={k.keyword}
                          className={`optimizer-keyword-pill ${k.matched ? 'matched' : 'missing'} ${isSelectedForInjection ? 'selected' : ''}`}
                          onClick={() => !k.matched && handleToggleKeywordInjection(k.keyword)}
                          title={k.matched ? 'Đã tìm thấy trong CV' : 'Nhấn để bổ sung vào mục Kỹ năng'}
                        >
                          <span className="keyword-text">{k.keyword}</span>
                          <span className={`importance-tag ${k.importance}`}>
                            {k.importance === 'critical' ? 'Trọng yếu' : k.importance === 'recommended' ? 'Khuyên dùng' : 'Tùy chọn'}
                          </span>
                          {!k.matched && (
                            <span className="injection-check">
                              {isSelectedForInjection ? '✓ Đã chọn chèn' : '+ Chèn'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="optimizer-section">
                <div className="optimizer-section-header">
                  <h3 className="optimizer-section-title">Studio Tinh chỉnh Gạch đầu dòng (Google X-Y-Z Rewriter)</h3>
                  <p className="optimizer-section-desc">
                    Mỗi bullet point được phân rã thành [X] Thành quả đạt được, [Y] Số liệu đo lường, và [Z] Phương pháp kỹ thuật.
                  </p>
                </div>

                <div className="optimizer-proposals-list">
                  {optimization.proposals.map((proposal, pIdx) => {
                    const currentVariantType = selectedVariantTypes[proposal.id] || 'metric_driven';
                    const activeVariantObj = proposal.variants.find(v => v.variantType === currentVariantType) || proposal.variants[0];

                    return (
                      <div key={proposal.id} className="optimizer-proposal-card">
                        <div className="optimizer-original-bullet-box">
                          <span className="bullet-index-tag">Gạch đầu dòng #{pIdx + 1}</span>
                          <div className="original-bullet-text">"{proposal.originalBullet}"</div>
                          <div className="weakness-tag">
                            <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-500" />
                            {proposal.detectedWeakness}
                          </div>
                        </div>

                        <div className="optimizer-variant-tabs">
                          {proposal.variants.map(variant => (
                            <button
                              key={variant.variantType}
                              className={`optimizer-variant-tab-btn ${currentVariantType === variant.variantType ? 'active' : ''}`}
                              onClick={() => handleSelectVariant(proposal.id, proposal.originalBullet, variant.variantType, variant.rewrittenText)}
                            >
                              {variant.variantType === 'metric_driven' && '📊 Định lượng (Metrics)'}
                              {variant.variantType === 'leadership' && '👥 Lãnh đạo & Quy mô'}
                              {variant.variantType === 'tech_depth' && '⚡ Kiến trúc & Chuyên sâu'}
                            </button>
                          ))}
                        </div>

                        {activeVariantObj && (
                          <div className="optimizer-variant-content-box">
                            <div className="rewritten-headline">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2 flex-shrink-0" />
                              <span className="rewritten-text">{activeVariantObj.rewrittenText}</span>
                            </div>

                            <div className="xyz-formula-pills">
                              <div className="xyz-pill pill-x">
                                <span className="xyz-label">[X] Thành quả:</span>
                                <span className="xyz-text">{activeVariantObj.xyzBreakdown.accomplishmentX}</span>
                              </div>
                              <div className="xyz-pill pill-y">
                                <span className="xyz-label">[Y] Đo lường:</span>
                                <span className="xyz-text">{activeVariantObj.xyzBreakdown.metricY}</span>
                              </div>
                              <div className="xyz-pill pill-z">
                                <span className="xyz-label">[Z] Hành động:</span>
                                <span className="xyz-text">{activeVariantObj.xyzBreakdown.actionZ}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeStep === 'preview' && (
            <div className="optimizer-preview-view">
              <div className="optimizer-preview-header">
                <div className="preview-status-pill">
                  <ShieldCheck className="w-4 h-4 mr-1 text-emerald-400" />
                  <span>Điểm ATS đạt được: <strong>{liveAtsScore}%</strong></span>
                </div>
                <div className="preview-action-btns" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="optimizer-btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px', background: '#2563eb' }}
                    onClick={handleDownloadDocx}
                    title="Tải xuống tài liệu Microsoft Word chuẩn ATS"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Xuất Word (.docx)</span>
                  </button>
                  <button
                    className="optimizer-btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px' }}
                    onClick={handlePrintPdf}
                    title="In hoặc Lưu thành file PDF chuẩn A4"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In / Tải PDF</span>
                  </button>
                  <button
                    className="optimizer-text-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '12px' }}
                    onClick={() => handleDownloadFile('md')}
                    title="Tải xuống định dạng Markdown"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.md</span>
                  </button>
                  <button className="optimizer-copy-btn" onClick={handleCopySynthesized}>
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-1 text-emerald-400" />
                        Đã chép!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Sao chép
                      </>
                    )}
                  </button>
                </div>
              </div>

              <textarea
                className="optimizer-preview-textarea"
                rows={18}
                value={synthesizedPreview}
                readOnly
              />
            </div>
          )}
        </div>

        <div className="resume-optimizer-footer">
          {activeStep === 'studio' ? (
            <>
              <button className="optimizer-btn-secondary" onClick={() => setActiveStep('input')}>
                Quay lại
              </button>
              <button
                className="optimizer-btn-primary optimizer-save-btn"
                onClick={() => {
                  handleSaveOptimization();
                  setActiveStep('preview');
                }}
              >
                Tiếp tục xem trước & Xuất bản
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </>
          ) : (
            <>
              <button className="optimizer-btn-secondary" onClick={() => setActiveStep('studio')}>
                Quay lại chỉnh sửa
              </button>
              <button
                className="optimizer-btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={handlePrintPdf}
              >
                <Printer className="w-4 h-4" />
                In / Lưu PDF
              </button>
              <button
                className="optimizer-btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#2563eb' }}
                onClick={handleDownloadDocx}
              >
                <FileText className="w-4 h-4" />
                Xuất file Word (.docx)
              </button>
              <button className="optimizer-btn-secondary optimizer-copy-btn" onClick={handleCopySynthesized}>
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'Đã sao chép!' : 'Sao chép'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
