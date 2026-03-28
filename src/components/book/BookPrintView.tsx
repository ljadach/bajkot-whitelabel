import { useParams } from 'react-router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import type { StoryDraft, StoryBlueprint, CharacterProfile } from '../../../convex/lib/bookTypes';
import { PROBLEMS, type ProblemId } from '../../lib/bookData';

// ── Types ───────────────────────────────────────────────────

interface PrintData {
  order: {
    childName: string;
    ageBracket: '3-5' | '6-8' | '9+';
    gender: 'boy' | 'girl';
    problemId: string;
  };
  storyDraft: StoryDraft | null;
  characterProfile: CharacterProfile | null;
  storyBlueprint: StoryBlueprint | null;
  illustrations: Array<{
    illustrationId: string;
    sceneRef: number | null;
    url: string | null;
  }>;
}

// ── Decorative SVG elements ─────────────────────────────────

function LeafSvg({ className = '', flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      className={className}
      width="22"
      height="28"
      viewBox="0 0 22 28"
      fill="none"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M11 2C6 6 2 14 2 20c0 3 2 6 9 6 7 0 9-3 9-6 0-6-4-14-9-18z"
        fill="#81c784"
        opacity="0.7"
      />
      <path d="M11 2v24" stroke="#4caf50" strokeWidth="1.2" />
    </svg>
  );
}

function BranchSvg({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="36" height="24" viewBox="0 0 36 24" fill="none">
      <path d="M2 20C8 18 14 10 18 6" stroke="#8d6e63" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="18" cy="5" rx="4" ry="6" fill="#a5d6a7" opacity="0.7" />
      <path d="M10 16C14 14 20 12 26 14" stroke="#8d6e63" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="27" cy="13" rx="3.5" ry="5" fill="#81c784" opacity="0.6" />
      <ellipse cx="6" cy="19" rx="3" ry="4.5" fill="#c8e6c9" opacity="0.7" />
    </svg>
  );
}

function CloudSvg({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="44" height="26" viewBox="0 0 44 26" fill="none">
      <ellipse cx="16" cy="16" rx="12" ry="8" fill="#eceff1" opacity="0.5" />
      <ellipse cx="28" cy="14" rx="10" ry="7" fill="#eceff1" opacity="0.4" />
      <ellipse cx="22" cy="10" rx="9" ry="7" fill="#f5f5f5" opacity="0.5" />
    </svg>
  );
}

function FlowerSvg({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="7" r="4" fill="#f48fb1" opacity="0.6" />
      <circle cx="7" cy="13" r="4" fill="#f48fb1" opacity="0.5" />
      <circle cx="15" cy="13" r="4" fill="#f48fb1" opacity="0.5" />
      <circle cx="11" cy="11" r="3" fill="#fff176" opacity="0.8" />
    </svg>
  );
}

function BirdFootprint({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v6M7 8L4 11M7 8l3 3" stroke="#8d6e63" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function HeartSvg({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="16" viewBox="0 0 18 16" fill="none">
      <path
        d="M9 14s-7-4.35-7-8.5C2 3.02 4.02 1 6.5 1 7.9 1 9 1.82 9 1.82S10.1 1 11.5 1C13.98 1 16 3.02 16 5.5 16 9.65 9 14 9 14z"
        fill="#ef9a9a"
        opacity="0.7"
      />
    </svg>
  );
}

function StarSvg({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M9 1l2.47 5.01L17 6.88l-3.97 3.87.94 5.46L9 13.64l-4.97 2.57.94-5.46L1 6.88l5.53-.87L9 1z"
        fill="#ffe082"
        opacity="0.7"
      />
    </svg>
  );
}

// Decorative corner elements that alternate per page
const CORNER_DECORATIONS = [
  { TopLeft: LeafSvg, BottomRight: FlowerSvg },
  { TopLeft: CloudSvg, BottomRight: LeafSvg },
  { TopLeft: FlowerSvg, BottomRight: BranchSvg },
  { TopLeft: BranchSvg, BottomRight: CloudSvg },
  { TopLeft: LeafSvg, BottomRight: BranchSvg },
  { TopLeft: CloudSvg, BottomRight: FlowerSvg },
];

// ── Font size config by age bracket ─────────────────────────

function getFontConfig(ageBracket: string) {
  switch (ageBracket) {
    case '3-5':
      return { body: '13pt', lineHeight: '1.7', titleSize: '22pt' };
    case '6-8':
      return { body: '11pt', lineHeight: '1.65', titleSize: '20pt' };
    default:
      return { body: '9.5pt', lineHeight: '1.6', titleSize: '18pt' };
  }
}

// ── Image placeholder ───────────────────────────────────────

function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #e8f5e9 0%, #fff8e1 50%, #fce4ec 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <span style={{ fontSize: '48px' }}>🎨</span>
      <span style={{ fontSize: '11px', color: '#8d6e63', opacity: 0.6 }}>{label}</span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────

export function BookPrintView() {
  const { orderId } = useParams<{ orderId: string }>();

  const data = useQuery(
    api.bookPrintView.getBookPrintData,
    orderId ? { orderId: orderId as Id<'bookOrders'> } : 'skip',
  ) as PrintData | undefined | null;

  if (!orderId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>Brak identyfikatora zamowienia.</p>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <div style={{ textAlign: 'center', fontFamily: 'Nunito, sans-serif' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e0e0e0',
              borderTop: '4px solid #26a69a',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: '#8d6e63', fontSize: '14px' }}>Przygotowuję ksiazeczke do druku...</p>
        </div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Nunito, sans-serif' }}>
        <p style={{ color: '#8d6e63' }}>Nie znaleziono zamowienia lub brak dostepu.</p>
      </div>
    );
  }

  const { order, storyDraft, storyBlueprint, illustrations } = data;
  const draft = storyDraft;
  const fonts = getFontConfig(order.ageBracket);
  const problemTitle = PROBLEMS[order.problemId as ProblemId]?.title_pl ?? '';

  // Helper to find illustration URL by ID
  const getIllUrl = (id: string): string | null => {
    const ill = illustrations.find((i) => i.illustrationId === id);
    return ill?.url ?? null;
  };

  // Get text for a beat page - prefer readAloudVersion for young kids
  const getBeatText = (pageIndex: number): string => {
    if (!draft?.pages?.[pageIndex]) return '';
    const page = draft.pages[pageIndex];
    if (order.ageBracket === '3-5' && page.readAloudVersion) {
      return page.readAloudVersion;
    }
    return page.text || '';
  };

  const title = draft?.title || `Ksiazeczka dla ${order.childName}`;
  const subtitle = storyBlueprint?.subtitle || problemTitle || '';
  const dedication = draft?.dedication || `Dla ${order.childName}`;
  const coverUrl = getIllUrl('cover');

  // Build sheets: each sheet = 2 book pages side by side
  // Sheet 1: Cover | Dedication
  // Sheet 2: Beat 1 | Beat 2
  // Sheet 3: Beat 3 | Beat 4
  // Sheet 4: Beat 5 | Beat 6
  // Sheet 5: Parent Card | Back Cover

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600&display=swap');

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @page {
          size: A4 landscape;
          margin: 0;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: none !important;
          }
          .print-controls {
            display: none !important;
          }
          .sheet {
            box-shadow: none !important;
            margin: 0 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        @media screen {
          body {
            background: #e0e0e0 !important;
          }
        }

        .sheet {
          width: 297mm;
          height: 210mm;
          display: flex;
          position: relative;
          overflow: hidden;
          page-break-after: always;
          break-after: page;
          background: white;
          box-sizing: border-box;
        }

        .book-page {
          width: 148.5mm;
          height: 210mm;
          position: relative;
          overflow: hidden;
          padding: 8mm;
          box-sizing: border-box;
        }

        .book-page--cover {
          padding: 0;
        }

        .font-title {
          font-family: 'Baloo 2', cursive, sans-serif;
        }

        .font-body {
          font-family: 'Nunito', sans-serif;
        }

        .page-divider {
          width: 0;
          height: 210mm;
          border-left: 1px dashed #e0e0e0;
        }
      `}</style>

      {/* Print controls - hidden when printing */}
      <div
        className="print-controls"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'linear-gradient(135deg, #26a69a, #00897b)',
          color: 'white',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontFamily: 'Nunito, sans-serif',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div>
          <h1 className="font-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
            Ksiazeczka do druku: {title}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.9 }}>
            Ustaw drukarke na A4 poziomo, bez marginesow. Drukuj dwustronnie (obracanie wzdluz
            krotkiej krawedzi).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => window.print()}
            style={{
              background: 'white',
              color: '#00897b',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 28px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Baloo 2, sans-serif',
              transition: 'transform 0.1s',
            }}
            onMouseDown={(e) => ((e.target as HTMLElement).style.transform = 'scale(0.97)')}
            onMouseUp={(e) => ((e.target as HTMLElement).style.transform = 'scale(1)')}
          >
            Drukuj
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          padding: '20px 0',
        }}
        className="print-controls-hide-gap"
      >
        {/* ── Sheet 1: Cover + Dedication ───────────────── */}
        <div className="sheet" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }}>
          {/* Cover page */}
          <div className="book-page book-page--cover" style={{ position: 'relative' }}>
            {coverUrl ? (
              <img
                src={coverUrl}
                alt="Okladka"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #e8f5e9 0%, #b2dfdb 40%, #80cbc4 100%)',
                }}
              />
            )}
            {/* Title overlay */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background:
                  'linear-gradient(to top, rgba(255,255,255,0.95) 60%, rgba(255,255,255,0))',
                padding: '28mm 8mm 8mm',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '8mm',
                  left: '6mm',
                  opacity: 0.4,
                }}
              >
                <StarSvg />
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '12mm',
                  right: '8mm',
                  opacity: 0.4,
                }}
              >
                <StarSvg />
              </div>
              <h1
                className="font-title"
                style={{
                  fontSize: '22pt',
                  fontWeight: 800,
                  color: '#4e342e',
                  margin: '0 0 4px',
                  lineHeight: 1.2,
                }}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  className="font-body"
                  style={{
                    fontSize: '10pt',
                    color: '#6d4c41',
                    margin: '0 0 8px',
                    fontStyle: 'italic',
                  }}
                >
                  {subtitle}
                </p>
              )}
              <p
                className="font-body"
                style={{
                  fontSize: '9pt',
                  color: '#8d6e63',
                  margin: 0,
                }}
              >
                Ksiazeczka dla {order.childName}
              </p>
              <div
                style={{ marginTop: '6px', display: 'flex', justifyContent: 'center', gap: '4px' }}
              >
                <BranchSvg />
              </div>
            </div>
          </div>

          <div className="page-divider" />

          {/* Dedication page */}
          <div
            className="book-page"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(180deg, #fffde7 0%, #fff8e1 100%)',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', top: '10mm', left: '10mm', opacity: 0.3 }}>
              <LeafSvg />
            </div>
            <div style={{ position: 'absolute', bottom: '10mm', right: '10mm', opacity: 0.3 }}>
              <FlowerSvg />
            </div>
            <div style={{ position: 'absolute', top: '10mm', right: '10mm', opacity: 0.25 }}>
              <FlowerSvg />
            </div>
            <div style={{ padding: '0 12mm', maxWidth: '120mm' }}>
              <p
                className="font-body"
                style={{
                  fontSize: '13pt',
                  fontStyle: 'italic',
                  color: '#5d4037',
                  lineHeight: 1.8,
                  fontWeight: 600,
                }}
              >
                {dedication}
              </p>
            </div>
            <div style={{ marginTop: '12px', opacity: 0.4 }}>
              <HeartSvg />
            </div>
          </div>
        </div>

        {/* ── Sheets 2-4: Beat pages (6 beats, 2 per sheet) ── */}
        {[0, 1, 2].map((sheetIdx) => {
          const beatA = sheetIdx * 2;
          const beatB = sheetIdx * 2 + 1;
          const decorA = CORNER_DECORATIONS[beatA % CORNER_DECORATIONS.length];
          const decorB = CORNER_DECORATIONS[beatB % CORNER_DECORATIONS.length];

          return (
            <div
              key={`sheet-${sheetIdx + 2}`}
              className="sheet"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }}
            >
              {/* Left beat page */}
              <BeatPage
                beatIndex={beatA}
                text={getBeatText(beatA)}
                imageUrl={getIllUrl(`scene_${beatA + 1}`)}
                pageNumber={beatA + 1}
                fonts={fonts}
                decorTopLeft={decorA.TopLeft}
                decorBottomRight={decorA.BottomRight}
                totalBeats={draft?.pages?.length ?? 6}
              />
              <div className="page-divider" />
              {/* Right beat page */}
              <BeatPage
                beatIndex={beatB}
                text={getBeatText(beatB)}
                imageUrl={getIllUrl(`scene_${beatB + 1}`)}
                pageNumber={beatB + 1}
                fonts={fonts}
                decorTopLeft={decorB.TopLeft}
                decorBottomRight={decorB.BottomRight}
                totalBeats={draft?.pages?.length ?? 6}
              />
            </div>
          );
        })}

        {/* ── Sheet 5: Parent Card + Back Cover ─────────── */}
        <div className="sheet" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }}>
          {/* Parent card page */}
          <div
            className="book-page"
            style={{
              background: 'linear-gradient(180deg, #fff8e1 0%, #fff3e0 100%)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', top: '6mm', right: '6mm', opacity: 0.2 }}>
              <CloudSvg />
            </div>
            <h2
              className="font-title"
              style={{
                fontSize: '18pt',
                fontWeight: 700,
                color: '#4e342e',
                margin: '0 0 4mm',
                textAlign: 'center',
              }}
            >
              Dla Rodzica
            </h2>

            {draft?.parentCard ? (
              <div
                className="font-body"
                style={{ fontSize: '8.5pt', color: '#5d4037', lineHeight: 1.6 }}
              >
                <p
                  style={{
                    margin: '0 0 3mm',
                    fontStyle: 'italic',
                    fontSize: '8pt',
                    color: '#6d4c41',
                  }}
                >
                  {draft.parentCard.introPl}
                </p>

                {draft.parentCard.questions && draft.parentCard.questions.length > 0 && (
                  <>
                    <p
                      className="font-title"
                      style={{
                        fontSize: '10pt',
                        fontWeight: 700,
                        color: '#4e342e',
                        margin: '3mm 0 2mm',
                      }}
                    >
                      Pytania do rozmowy:
                    </p>
                    <ol style={{ margin: 0, paddingLeft: '5mm' }}>
                      {draft.parentCard.questions.map((q, i) => (
                        <li key={i} style={{ marginBottom: '1.5mm' }}>
                          {q}
                        </li>
                      ))}
                    </ol>
                  </>
                )}

                {draft.parentCard.activityPl && (
                  <>
                    <p
                      className="font-title"
                      style={{
                        fontSize: '10pt',
                        fontWeight: 700,
                        color: '#4e342e',
                        margin: '3mm 0 2mm',
                      }}
                    >
                      Aktywnosc:
                    </p>
                    <p style={{ margin: 0 }}>{draft.parentCard.activityPl}</p>
                  </>
                )}
              </div>
            ) : (
              <div
                className="font-body"
                style={{ fontSize: '9pt', color: '#6d4c41', lineHeight: 1.6 }}
              >
                <p style={{ margin: '0 0 3mm', fontStyle: 'italic' }}>
                  Ta bajka zostala stworzona specjalnie dla {order.childName}. Ponizej znajdziesz
                  pytania, ktore mozesz zadac dziecku po przeczytaniu bajki, aby porozmawiac o
                  uczuciach i doswiadczeniach bohatera.
                </p>
                {storyBlueprint?.beats && storyBlueprint.beats.length > 0 && (
                  <>
                    <p
                      className="font-title"
                      style={{
                        fontSize: '10pt',
                        fontWeight: 700,
                        color: '#4e342e',
                        margin: '3mm 0 2mm',
                      }}
                    >
                      Pytania do rozmowy:
                    </p>
                    <ol style={{ margin: 0, paddingLeft: '5mm' }}>
                      {storyBlueprint.beats
                        .filter((b) => b.therapeuticGoal)
                        .slice(0, 4)
                        .map((b, i) => (
                          <li key={i} style={{ marginBottom: '1.5mm' }}>
                            Jak myslisz, co czul {order.childName} gdy{' '}
                            {(b.summaryPl || b.summary || '').toLowerCase().slice(0, 60)}?
                          </li>
                        ))}
                    </ol>
                  </>
                )}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: '6mm', left: '6mm', opacity: 0.25 }}>
              <BranchSvg />
            </div>
          </div>

          <div className="page-divider" />

          {/* Back cover */}
          <div
            className="book-page"
            style={{
              background: 'linear-gradient(180deg, #e8f5e9 0%, #c8e6c9 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', top: '12mm', left: '12mm', opacity: 0.3 }}>
              <LeafSvg />
            </div>
            <div style={{ position: 'absolute', top: '12mm', right: '12mm', opacity: 0.3 }}>
              <LeafSvg flip />
            </div>
            <div style={{ position: 'absolute', bottom: '35mm', left: '16mm', opacity: 0.2 }}>
              <FlowerSvg />
            </div>
            <div style={{ position: 'absolute', bottom: '35mm', right: '16mm', opacity: 0.2 }}>
              <FlowerSvg />
            </div>

            <div style={{ marginBottom: '6mm' }}>
              <StarSvg />
            </div>

            <h2
              className="font-title"
              style={{
                fontSize: '24pt',
                fontWeight: 800,
                color: '#4e342e',
                margin: '0 0 4mm',
              }}
            >
              Koniec
            </h2>

            {draft?.coverBlurb && (
              <p
                className="font-body"
                style={{
                  fontSize: '8.5pt',
                  color: '#5d4037',
                  fontStyle: 'italic',
                  maxWidth: '100mm',
                  lineHeight: 1.6,
                  margin: '0 0 6mm',
                }}
              >
                {draft.coverBlurb}
              </p>
            )}

            <p
              className="font-body"
              style={{
                fontSize: '10pt',
                color: '#6d4c41',
                fontWeight: 600,
                margin: '0 0 3mm',
              }}
            >
              Stworzone z miloscia dla {order.childName}
            </p>

            <div style={{ display: 'flex', gap: '4px', margin: '4mm 0' }}>
              <HeartSvg />
              <HeartSvg />
              <HeartSvg />
            </div>

            <p
              className="font-body"
              style={{
                fontSize: '7pt',
                color: '#a1887f',
                margin: '8mm 0 0',
              }}
            >
              bajkoterapia.org
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Beat Page sub-component ─────────────────────────────────

interface BeatPageProps {
  beatIndex: number;
  text: string;
  imageUrl: string | null;
  pageNumber: number;
  fonts: ReturnType<typeof getFontConfig>;
  decorTopLeft: React.FC<{ className?: string }>;
  decorBottomRight: React.FC<{ className?: string }>;
  totalBeats: number;
}

function BeatPage({
  beatIndex,
  text,
  imageUrl,
  pageNumber,
  fonts,
  decorTopLeft: DecorTL,
  decorBottomRight: DecorBR,
  totalBeats,
}: BeatPageProps) {
  // If this beat doesn't exist, render an empty page
  if (beatIndex >= totalBeats || !text) {
    return (
      <div
        className="book-page"
        style={{
          background: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="font-body" style={{ color: '#ccc', fontSize: '10pt' }}>
          &nbsp;
        </span>
      </div>
    );
  }

  return (
    <div
      className="book-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        position: 'relative',
      }}
    >
      {/* Corner decorations */}
      <div style={{ position: 'absolute', top: '4mm', left: '4mm', opacity: 0.25 }}>
        <DecorTL />
      </div>
      <div style={{ position: 'absolute', bottom: '10mm', right: '4mm', opacity: 0.2 }}>
        <DecorBR />
      </div>

      {/* Illustration area - top ~53% */}
      <div
        style={{
          flex: '0 0 53%',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          margin: '0 0 3mm',
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Scena ${pageNumber}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <ImagePlaceholder label={`Scena ${pageNumber}`} />
        )}
      </div>

      {/* Text area - bottom ~40% */}
      <div
        className="font-body"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          padding: '2mm 3mm 0',
        }}
      >
        <p
          style={{
            fontSize: fonts.body,
            lineHeight: fonts.lineHeight,
            color: '#4e342e',
            margin: 0,
            textAlign: 'justify',
            hyphens: 'auto',
            WebkitHyphens: 'auto',
          }}
          lang="pl"
        >
          {text}
        </p>
      </div>

      {/* Page number with bird footprint */}
      <div
        style={{
          position: 'absolute',
          bottom: '4mm',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
        }}
      >
        <BirdFootprint />
        <span
          className="font-body"
          style={{
            fontSize: '7pt',
            color: '#bcaaa4',
            fontWeight: 600,
          }}
        >
          {pageNumber}
        </span>
      </div>
    </div>
  );
}
