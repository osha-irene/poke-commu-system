import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import boardContent from '../../data/worldContent';

const createSectionId = (label, index) => {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `board-section-${normalized || index}`;
};

const isLegendSource = (text) => (
  text.includes('영운 설화')
);

const shouldShowSectionTitle = (label, hiddenSectionTitles) => (
  !hiddenSectionTitles.includes(label)
);

const createFallbackSection = (result) => {
  const section = { id: createSectionId('Board', result.sections.length), label: 'Board', blocks: [] };
  result.sections.push(section);
  return section;
};

const parseInlineHighlights = (text) => {
  const segments = [];
  let remaining = text;
  const regex = /(===(.+?)===|==(.+?)==|\^\^(.+?)\^\^|\[([^\]]+)\]\(([^)]+)\))/;

  while (remaining.length > 0) {
    const match = remaining.match(regex);

    if (!match) {
      segments.push({ type: 'text', text: remaining });
      break;
    }

    const before = remaining.slice(0, match.index);
    if (before) {
      segments.push({ type: 'text', text: before });
    }

    if (match[2] !== undefined) {
      segments.push({ type: 'highlight-blue', text: match[2] });
    } else if (match[3] !== undefined) {
      segments.push({ type: 'highlight-green', text: match[3] });
    } else if (match[4] !== undefined) {
      segments.push({ type: 'highlight-red', text: match[4] });
    } else {
      segments.push({ type: 'link', text: match[5], href: match[6] });
    }

    remaining = remaining.slice(match.index + match[0].length);
  }

  return segments;
};

const parseBoardContent = (content) => {
  const result = {
    title: '게시판',
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
      text: paragraphLines.join('\n'),
      segments: parseInlineHighlights(paragraphLines.join('\n'))
    });
    paragraphLines = [];
  };

  let currentList = null;

  const flushList = () => {
    if (!currentList) {
      return;
    }

    if (!currentSection) {
      currentSection = createFallbackSection(result);
    }

    currentSection.blocks.push(currentList);
    currentList = null;
  };

  content.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const spacerMatch = line.match(/^\{br(?::(\d+))?\}$/);
    if (spacerMatch) {
      flushParagraph();
      flushList();

      if (!currentSection) {
        currentSection = createFallbackSection(result);
      }

      currentSection.blocks.push({
        type: 'spacer',
        size: parseInt(spacerMatch[1] || '24', 10)
      });
      return;
    }

    const centeredMatch = line.match(/^<>\s+(.*)$/);
    if (centeredMatch) {
      flushParagraph();
      flushList();

      if (!currentSection) {
        currentSection = createFallbackSection(result);
      }

      currentSection.blocks.push({
        type: 'centered',
        text: centeredMatch[1],
        segments: parseInlineHighlights(centeredMatch[1])
      });
      return;
    }

    const creditMatch = line.match(/^%%\s+(.*)$/);
    if (creditMatch) {
      flushParagraph();
      flushList();

      if (!currentSection) {
        currentSection = createFallbackSection(result);
      }

      currentSection.blocks.push({
        type: 'credit',
        text: creditMatch[1],
        segments: parseInlineHighlights(creditMatch[1])
      });
      return;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+?)(?:\s+=(\d+)(?:x(\d+))?)?\)$/);
    if (imageMatch) {
      flushParagraph();
      flushList();

      if (!currentSection) {
        currentSection = createFallbackSection(result);
      }

      currentSection.blocks.push({
        type: 'image',
        alt: imageMatch[1],
        src: imageMatch[2],
        width: imageMatch[3] ? parseInt(imageMatch[3], 10) : null,
        height: imageMatch[4] ? parseInt(imageMatch[4], 10) : null
      });
      return;
    }

    const subBulletMatch = line.match(/^\*\*\s+(.*)$/);
    if (subBulletMatch) {
      flushParagraph();

      if (!currentSection) {
        currentSection = createFallbackSection(result);
      }

      const itemText = subBulletMatch[1];
      const item = {
        text: itemText,
        segments: parseInlineHighlights(itemText)
      };

      if (currentList && (currentList.type === 'list' || currentList.type === 'list-standalone') && currentList.items.length) {
        const parentItem = currentList.items[currentList.items.length - 1];
        if (!parentItem.children) {
          parentItem.children = [];
        }
        parentItem.children.push(item);
      } else {
        if (!currentList || currentList.type !== 'list') {
          flushList();
          currentList = { type: 'list', items: [] };
        }
        currentList.items.push(item);
      }
      return;
    }

    const bulletMatch = line.match(/^\*\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();

      if (!currentSection) {
        currentSection = createFallbackSection(result);
      }

      if (!currentList || currentList.type !== 'list') {
        flushList();
        currentList = { type: 'list', items: [] };
      }

      const itemText = bulletMatch[1];
      currentList.items.push({
        text: itemText,
        segments: parseInlineHighlights(itemText)
      });
      return;
    }

    const standaloneBulletMatch = line.match(/^&\s+(.*)$/);
    if (standaloneBulletMatch) {
      flushParagraph();

      if (!currentSection) {
        currentSection = createFallbackSection(result);
      }

      if (!currentList || currentList.type !== 'list-standalone') {
        flushList();
        currentList = { type: 'list-standalone', items: [] };
      }

      const itemText = standaloneBulletMatch[1];
      currentList.items.push({
        text: itemText,
        segments: parseInlineHighlights(itemText)
      });
      return;
    }

    flushList();

    if (line.startsWith('# ')) {
      flushParagraph();
      result.title = line.slice(2).trim() || result.title;
      return;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      let raw = line.slice(3).trim();
      const centered = raw.startsWith('{center}');
      const label = centered ? raw.slice(8).trim() : raw;
      currentSection = {
        id: createSectionId(label, result.sections.length),
        label,
        centered,
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
  flushList();

  return result;
};

const renderSegments = (segments) => (
  segments.map((segment, segIndex) => {
    if (segment.type === 'highlight-blue') {
      return (
        <mark key={segIndex} className="board__highlight-blue">
          {segment.text}
        </mark>
      );
    }

    if (segment.type === 'highlight-green') {
      return (
        <mark key={segIndex} className="board__highlight-green">
          {segment.text}
        </mark>
      );
    }

    if (segment.type === 'highlight-red') {
      return (
        <mark key={segIndex} className="board__highlight-red">
          {segment.text}
        </mark>
      );
    }

    if (segment.type === 'link') {
      return (
        <a key={segIndex} href={segment.href} target="_blank" rel="noopener noreferrer" className="board__link">
          {segment.text}
        </a>
      );
    }

    return <React.Fragment key={segIndex}>{segment.text}</React.Fragment>;
  })
);

const renderListItems = (items) => (
  items.map((item, itemIndex) => (
    <li key={itemIndex}>
      {renderSegments(item.segments)}
      {item.children && item.children.length > 0 && (
        <ul className="board__list board__list--sub">
          {renderListItems(item.children)}
        </ul>
      )}
    </li>
  ))
);

export default function BoardView({
  content = boardContent,
  tocLabel = '게시판 섹션',
  hiddenSectionTitles = ['영운설화']
}) {
  const parsedBoard = useMemo(() => parseBoardContent(content), [content]);
  const [activeSectionId, setActiveSectionId] = useState(parsedBoard.tocItems[0]?.id || '');
  const [expandedSectionId, setExpandedSectionId] = useState(parsedBoard.sections[0]?.id || '');
  const [tocTop, setTocTop] = useState(null);
  const clickScrollLockRef = useRef('');
  const clickScrollTimerRef = useRef(null);

  const sectionHeadingMap = useMemo(() => (
    parsedBoard.sections.reduce((acc, section) => {
      acc[section.id] = section.blocks
        .filter((block) => block.type === 'heading')
        .map((block) => ({
          id: block.id,
          label: block.text
        }));
      return acc;
    }, {})
  ), [parsedBoard.sections]);

  const tocItemParentMap = useMemo(() => (
    parsedBoard.sections.reduce((acc, section) => {
      acc[section.id] = section.id;
      section.blocks.forEach((block) => {
        if (block.type === 'heading') {
          acc[block.id] = section.id;
        }
      });
      return acc;
    }, {})
  ), [parsedBoard.sections]);

  useLayoutEffect(() => {
    const updateActiveSection = () => {
      const baseTop = Math.min(194, Math.max(154, window.innerHeight * 0.18 + 16));
      const surfaceTop = document.querySelector('.content-stage__surface')?.getBoundingClientRect().top ?? baseTop;
      setTocTop(Math.round(Math.max(baseTop, surfaceTop + 16)));

      const viewportMarker = window.innerHeight * 0.35;
      const sectionPositions = parsedBoard.tocItems
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
  }, [parsedBoard.tocItems, tocItemParentMap]);

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
    <section className="board">
      {parsedBoard.tocItems.length > 0 && (
        <nav
          className="board__toc"
          style={tocTop === null ? undefined : { top: `${tocTop}px` }}
          aria-label={tocLabel}
        >
          <span className="board__toc-title">Sections</span>
          <div className="board__toc-list">
            {parsedBoard.sections.map((section) => {
              const headings = sectionHeadingMap[section.id] || [];
              const isExpanded = expandedSectionId === section.id;
              const isSectionActive = activeSectionId === section.id || tocItemParentMap[activeSectionId] === section.id;

              return (
                <div
                  key={section.id}
                  className={`board__toc-group ${isExpanded ? 'is-expanded' : ''}`}
                >
                  <button
                    type="button"
                    className={`board__toc-button board__toc-button--section ${isSectionActive ? 'is-active' : ''}`}
                    onClick={() => handleTopSectionClick(section.id)}
                    aria-expanded={isExpanded}
                    aria-current={activeSectionId === section.id ? 'true' : undefined}
                  >
                    {section.label}
                  </button>

                  {headings.length > 0 && (
                    <div className="board__toc-sublist" aria-hidden={!isExpanded}>
                      {headings.map((heading) => (
                        <button
                          key={heading.id}
                          type="button"
                          className={`board__toc-button board__toc-button--heading ${activeSectionId === heading.id ? 'is-active' : ''}`}
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

      <div className="board__overlay">
        <div className="board__content">
          {parsedBoard.sections.map((section) => {
                  const bodyBlocks = section.blocks.filter((b) => b.type !== 'credit');
                  const creditBlocks = [];

            return (
              <article key={section.id} id={section.id} className={`board__section${section.centered ? ' board__section--centered' : ''}`}>
                {shouldShowSectionTitle(section.label, hiddenSectionTitles) && (
                  <h2 className="board__section-title">{section.label}</h2>
                )}
                <div className="board__section-body">
                  {bodyBlocks.map((block, index) => {
                    if (block.type === 'heading') {
                      const nextBlock = bodyBlocks[index + 1];
                      const inlineList = nextBlock && nextBlock.type === 'list' ? nextBlock : null;

                      return (
                        <div className="board__heading-row" key={`${block.type}-${index}`}>
                          <h3 id={block.id}>{block.text}</h3>
                          {inlineList && (
                            <ul className="board__list board__list--inline">
                              {renderListItems(inlineList.items)}
                            </ul>
                          )}
                        </div>
                      );
                    }

                    if (block.type === 'list') {
                      const prevBlock = bodyBlocks[index - 1];
                      if (prevBlock && prevBlock.type === 'heading') {
                        return null;
                      }

                      return (
                        <ul key={`${block.type}-${index}`} className="board__list">
                          {renderListItems(block.items)}
                        </ul>
                      );
                    }

                    if (block.type === 'centered') {
                      return (
                        <p key={`${block.type}-${index}`} className="board__p--centered">
                          {renderSegments(block.segments)}
                        </p>
                      );
                    }

                    if (block.type === 'list-standalone') {
                      return (
                        <ul key={`${block.type}-${index}`} className="board__list board__list--standalone">
                          {renderListItems(block.items)}
                        </ul>
                      );
                    }

                    if (block.type === 'spacer') {
                      return (
                        <div key={`${block.type}-${index}`} style={{ height: `${block.size}px` }} aria-hidden="true" />
                      );
                    }

                    if (block.type === 'image') {
                      const imgStyle = {};
                      if (block.width) { imgStyle.width = `${block.width}px`; imgStyle.maxWidth = `${block.width}px`; }
                      if (block.height) imgStyle.height = `${block.height}px`;
                      return (
                        <img
                          key={`${block.type}-${index}`}
                          src={block.src}
                          alt={block.alt}
                          className="board__image"
                          style={Object.keys(imgStyle).length ? imgStyle : undefined}
                        />
                      );
                    }

                    return (
                      <p
                        key={`${block.type}-${index}`}
                        className={isLegendSource(block.text) ? 'board__legend-source' : undefined}
                      >
                        {renderSegments(block.segments)}
                      </p>
                    );
                  })}
                </div>
              </article>
                );
          })}
        </div>
      </div>
      {(() => {
        const allCredits = parsedBoard.sections.flatMap((s) => s.blocks.filter((b) => b.type === 'credit'));
        return allCredits.length > 0 ? (
          <div className="board__credits">
            {allCredits.map((block, index) => (
              <p key={`credit-${index}`} className="board__credit">
                {renderSegments(block.segments)}
              </p>
            ))}
          </div>
        ) : null;
      })()}
    </section>
  );
}