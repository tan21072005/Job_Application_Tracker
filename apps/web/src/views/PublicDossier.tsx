import { useEffect, useState } from 'react';
import { Award, Compass, LoaderCircle, ShieldCheck, ShieldQuestion } from 'lucide-react';
import type { PublicDossierViewDTO } from '@jobtrack/contract';
import { portfolioRepository } from '../data';

interface Props {
  token: string;
}

export default function PublicDossier({ token }: Props) {
  const [dossier, setDossier] = useState<PublicDossierViewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    portfolioRepository
      .getPublicDossier(token)
      .then(result => {
        if (cancelled) return;
        if (result) {
          setDossier(result);
        } else {
          setError('Liên kết không tồn tại, đã bị thu hồi hoặc đã hết hạn.');
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Không tải được hồ sơ.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="public-dossier-shell">
        <div className="public-dossier-state" role="status">
          <LoaderCircle className="spin" size={26} />
          <p>Đang tải hồ sơ…</p>
        </div>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="public-dossier-shell">
        <div className="public-dossier-state">
          <ShieldQuestion size={30} />
          <h1>Không mở được hồ sơ</h1>
          <p>{error || 'Liên kết này không còn hiệu lực.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-dossier-shell">
      <article className="public-dossier-card">
        <header className="public-dossier-head">
          <div className={`public-dossier-stamp${dossier.isVerified ? '' : ' unverified'}`}>
            {dossier.isVerified ? <ShieldCheck size={18} /> : <ShieldQuestion size={18} />}
            <span>
              {dossier.isVerified
                ? 'XÁC THỰC BẢO CHỨNG · JOBTRACK SYSTEM'
                : 'HỒ SƠ CHƯA CÓ DỮ LIỆU XÁC THỰC'}
            </span>
          </div>
          <h1>{dossier.candidateName}</h1>
          <p className="public-dossier-title">{dossier.title}</p>
          {dossier.location && <p className="public-dossier-meta">{dossier.location}</p>}
          {dossier.targetRoles.length > 0 && (
            <div className="public-dossier-roles">
              {dossier.targetRoles.map(role => (
                <span key={role} className="public-dossier-role">{role}</span>
              ))}
            </div>
          )}
        </header>

        {dossier.bio && <p className="public-dossier-bio">{dossier.bio}</p>}

        {dossier.topSkills.length > 0 && (
          <section className="public-dossier-section">
            <h2>Kỹ năng</h2>
            <div className="public-dossier-skills">
              {dossier.topSkills.map(skill => (
                <span key={`${skill.category}-${skill.name}`} className="public-dossier-skill">
                  {skill.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {dossier.simulationReadiness && (
          <section className="public-dossier-section">
            <h2>
              <Award size={16} /> Mức độ sẵn sàng phỏng vấn
            </h2>
            <p className="public-dossier-readiness">
              <strong>{dossier.simulationReadiness.score}/100</strong>
              <span> · {dossier.simulationReadiness.grade}</span>
            </p>
          </section>
        )}

        {dossier.roadmapProgress && (
          <section className="public-dossier-section">
            <h2>
              <Compass size={16} /> Tiến độ lộ trình kỹ năng
            </h2>
            <div className="public-dossier-progress" aria-label={`${dossier.roadmapProgress.progressPercent}%`}>
              <div style={{ width: `${dossier.roadmapProgress.progressPercent}%` }} />
            </div>
            <p className="public-dossier-progress-label">
              {dossier.roadmapProgress.completedMilestones}/{dossier.roadmapProgress.totalMilestones} cột mốc ·{' '}
              {dossier.roadmapProgress.progressPercent}%
            </p>
          </section>
        )}

        {dossier.salaryExpectation && (
          <section className="public-dossier-section">
            <h2>Mức lương mong muốn</h2>
            <p>{dossier.salaryExpectation}</p>
          </section>
        )}

        {typeof dossier.activeInterviewsCount === 'number' && dossier.activeInterviewsCount > 0 && (
          <p className="public-dossier-meta">
            Đang có {dossier.activeInterviewsCount} buổi phỏng vấn đã lên lịch.
          </p>
        )}

        <footer className="public-dossier-foot">
          {dossier.isVerified ? (
            <>
              <p className="public-dossier-fingerprint">{dossier.verificationFingerprint}</p>
              <p className="public-dossier-timestamp">
                Xác thực lúc {new Date(dossier.verifiedAt).toLocaleString('vi-VN')}
              </p>
            </>
          ) : (
            <p className="public-dossier-timestamp">
              Ứng viên chưa có kỹ năng, lộ trình hay buổi phỏng vấn thử nào để bảo chứng.
            </p>
          )}
        </footer>
      </article>
    </div>
  );
}
