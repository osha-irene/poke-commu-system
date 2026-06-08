import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import worldContent from '../../data/worldContent';

const createSectionId = (label, index) => {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `world-section-${normalized || index}`;
};

const isLegendSource = (text) => (
  text.includes('영운 설화')
);

const shouldShowSectionTitle = (label, hiddenSectionTitles) => (
  !hiddenSectionTitles.includes(label)
);

const createFallbackSection = (result) => {
  const section = { id: createSectionId('World', result.sections.length), label: 'World', blocks: [] };
  result.sections.push(section);
  return section;
};

const parseWorldContent = (content) => {
  const result = {
    title: '세계관',
    sections: [],
    tocItems: []
  };

  let currentSection = null;
  let paragraphLines = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }

    if (!currentSection) {
      currentSection = createFallbackSection(result);
    }

    currentSection.blocks.push({
      type: 'paragraph',
      text: paragraphLines.join('\n')
    });
    paragraphLines = [];
  };

  content.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      return;
    }

    if (line.startsWith('# ')) {
      flushParagraph();
      result.title = line.slice(2).trim() || result.title;
      return;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      const label = line.slice(3).trim();
      currentSection = {
        id: createSectionId(label, result.sections.length),
        label,
        blocks: []
      };
      result.sections.push(currentSection);
      result.tocItems.push({
        id: currentSection.id,
        label: currentSection.label,
        type: 'section'
      });
      return;
    }

    if (line.startsWith('### ')) {
      flushParagraph();

      if (!currentSection) {
        currentSection = createFallbackSection(result);
      }

      const text = line.slice(4).trim();
      const id = createSectionId(`${currentSection.label}-${text}`, currentSection.blocks.length);
      currentSection.blocks.push({
        type: 'heading',
        id,
        text
      });
      result.tocItems.push({
        id,
        label: text,
        type: 'heading'
      });
      return;
    }

    paragraphLines.push(rawLine.trimEnd());
  });

  flushParagraph();

  return result;
};

export default function WorldView({
  content = worldContent,
  tocLabel = '세계관 섹션',
  hiddenSectionTitles = ['영운설화']
}) {
  const parsedWorld = useMemo(() => parseWorldContent(content), [content]);
  const [activeSectionId, setActiveSectionId] = useState(parsedWorld.tocItems[0]?.id || '');
  const [expandedSectionId, setExpandedSectionId] = useState(parsedWorld.sections[0]?.id || '');
  const [tocTop, setTocTop] = useState(null);
  const clickScrollLockRef = useRef('');
  const clickScrollTimerRef = useRef(null);

  const sectionHeadingMap = useMemo(() => (
    parsedWorld.sections.reduce((acc, section) => {
      acc[section.id] = section.blocks
        .filter((block) => block.type === 'heading')
        .map((block) => ({
          id: block.id,
          label: block.text
        }));
      return acc;
    }, {})
  ), [parsedWorld.sections]);

  const tocItemParentMap = useMemo(() => (
    parsedWorld.sections.reduce((acc, section) => {
      acc[section.id] = section.id;
      section.blocks.forEach((block) => {
        if (block.type === 'heading') {
          acc[block.id] = section.id;
        }
      });
      return acc;
    }, {})
  ), [parsedWorld.sections]);

  useLayoutEffect(() => {
    const updateActiveSection = () => {
      const baseTop = Math.min(194, Math.max(154, window.innerHeight * 0.18 + 16));
      const surfaceTop = document.querySelector('.content-stage__surface')?.getBoundingClientRect().top ?? baseTop;
      setTocTop(Math.round(Math.max(baseTop, surfaceTop + 16)));

      const viewportMarker = window.innerHeight * 0.35;
      const sectionPositions = parsedWorld.tocItems
        .map((item) => {
          const element = document.getElementById(item.id);
          return element ? { id: item.id, top: element.getBoundingClientRect().top } : null;
        })
        .filter(Boolean);

      if (!sectionPositions.length) {
        return;
      }

      const activeSection = sectionPositions.reduce((current, section) => {
        if (section.top <= viewportMarker) {
          return section;
        }

        return current;
      }, sectionPositions[0]);

      setActiveSectionId(activeSection.id);

      if (clickScrollLockRef.current) {
        setExpandedSectionId(clickScrollLockRef.current);
        return;
      }

      setExpandedSectionId(tocItemParentMap[activeSection.id] || activeSection.id);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
      window.clearTimeout(clickScrollTimerRef.current);
    };
  }, [parsedWorld.tocItems, tocItemParentMap]);

  const handleSectionClick = (sectionId, lockedExpandedSectionId = tocItemParentMap[sectionId] || sectionId) => {
    const element = document.getElementById(sectionId);

    if (!element) {
      return;
    }

    clickScrollLockRef.current = lockedExpandedSectionId;
    window.clearTimeout(clickScrollTimerRef.current);
    clickScrollTimerRef.current = window.setTimeout(() => {
      clickScrollLockRef.current = '';
    }, 900);

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  const handleTopSectionClick = (sectionId) => {
    setExpandedSectionId(sectionId);
    handleSectionClick(sectionId, sectionId);
  };

  return (
    <section className="world-view">
      {parsedWorld.tocItems.length > 0 && (
        <nav
          className="world-view__toc"
          style={tocTop === null ? undefined : { top: `${tocTop}px` }}
          aria-label={tocLabel}
        >
          <span className="world-view__toc-title">Sections</span>
          <div className="world-view__toc-list">
            {parsedWorld.sections.map((section) => {
              const headings = sectionHeadingMap[section.id] || [];
              const isExpanded = expandedSectionId === section.id;
              const isSectionActive = activeSectionId === section.id || tocItemParentMap[activeSectionId] === section.id;

              return (
                <div
                  key={section.id}
                  className={`world-view__toc-group ${isExpanded ? 'is-expanded' : ''}`}
                >
                  <button
                    type="button"
                    className={`world-view__toc-button world-view__toc-button--section ${isSectionActive ? 'is-active' : ''}`}
                    onClick={() => handleTopSectionClick(section.id)}
                    aria-expanded={isExpanded}
                    aria-current={activeSectionId === section.id ? 'true' : undefined}
                  >
                    {section.label}
                  </button>

                  {headings.length > 0 && (
                    <div className="world-view__toc-sublist" aria-hidden={!isExpanded}>
                      {headings.map((heading) => (
                        <button
                          key={heading.id}
                          type="button"
                          className={`world-view__toc-button world-view__toc-button--heading ${activeSectionId === heading.id ? 'is-active' : ''}`}
                          onClick={() => handleSectionClick(heading.id)}
                          aria-current={activeSectionId === heading.id ? 'true' : undefined}
                        >
                          {heading.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      )}

      <div className="world-view__overlay">
        <div className="world-view__content">
          {parsedWorld.sections.map((section) => (
            <article key={section.id} id={section.id} className="world-view__section">
              {shouldShowSectionTitle(section.label, hiddenSectionTitles) && (
                <h2 className="world-view__section-title">{section.label}</h2>
              )}
              <div className="world-view__section-body">
                {section.blocks.map((block, index) => (
                  block.type === 'heading' ? (
                    <h3 id={block.id} key={`${block.type}-${index}`}>{block.text}</h3>
                  ) : (
                    <p
                      key={`${block.type}-${index}`}
                      className={isLegendSource(block.text) ? 'world-view__legend-source' : undefined}
                    >
                      {block.text}
                    </p>
                  )
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
