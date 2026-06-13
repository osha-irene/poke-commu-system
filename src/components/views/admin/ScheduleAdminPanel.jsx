import React, { useState, useEffect, useRef } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../../../firebase';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

const EVENT_COLORS = [
  '#e85d5d', '#e8855d', '#e8c05d', '#a8c832', '#4caf6e',
  '#3aa8a0', '#4a7ab5', '#7b6fa0', '#c46fb4', '#8d6e4a',
];

function toDateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function ScheduleAdminPanel() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [tooltip, setTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState({ title: '', desc: '', start: '', color: EVENT_COLORS[0], important: false });
  const tooltipTimer = useRef(null);

  useEffect(() => {
    const load = async () => {
      const snap = await get(ref(database, 'gameData/scheduleEvents'));
      if (snap.exists()) setEvents(Object.values(snap.val()));
    };
    load();
  }, []);

  const saveEvents = async (next) => {
    const obj = {};
    next.forEach((e) => { obj[e.id] = e; });
    await set(ref(database, 'gameData/scheduleEvents'), obj);
    setEvents(next);
  };

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevDays = getDaysInMonth(prevYear, prevMonth);
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    const d = prevDays - firstDay + 1 + i;
    cells.push({ day: d, year: prevYear, month: prevMonth, muted: true, key: toDateKey(prevYear, prevMonth, d) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, year, month, muted: false, key: toDateKey(year, month, d) });
  }
  let nd = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nd, year: nextYear, month: nextMonth, muted: true, key: toDateKey(nextYear, nextMonth, nd) });
    nd++;
  }

  const pointEventsFor = (cell) => {
    if (!cell) return [];
    return events.filter((e) => e.start === cell.key);
  };

  const handleMouseEnter = (e, eventData) => {
    clearTimeout(tooltipTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip(eventData);
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  const handleMouseLeave = () => {
    tooltipTimer.current = setTimeout(() => setTooltip(null), 200);
  };

  const openAdd = (dateKey) => {
    setEditingEvent(null);
    setForm({ title: '', desc: '', start: dateKey || '', color: EVENT_COLORS[0], important: false });
    setShowForm(true);
  };

  const openEdit = (ev) => {
    setEditingEvent(ev);
    setForm({ title: ev.title, desc: ev.desc || '', start: ev.start, color: ev.color, important: ev.important || false });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.start) return;
    const id = editingEvent?.id || `ev_${Date.now()}`;
    const next = events.filter((e) => e.id !== id);
    next.push({ id, title: form.title.trim(), desc: form.desc.trim(), start: form.start, color: form.color, important: form.important });
    await saveEvents(next);
    setShowForm(false);
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    await saveEvents(events.filter((e) => e.id !== editingEvent.id));
    setShowForm(false);
  };

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div className="schedule-panel">
      <div className="schedule-panel__header">
        <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}>‹</button>
        <span>{year}년 {MONTHS[month]}</span>
        <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}>›</button>
        <button className="schedule-panel__add-btn" onClick={() => openAdd('')}>+ 일정 추가</button>
      </div>

      <div className="schedule-calendar">
        <div className="schedule-calendar__weekdays">
          {DAYS.map((d) => <div key={d} className="schedule-calendar__weekday">{d}</div>)}
        </div>

        {rows.map((row, ri) => (
          <div key={ri} className="schedule-calendar__row">
            <div className="schedule-calendar__cells">
              {row.map((cell, ci) => {
                const pts = pointEventsFor(cell);
                const isToday = !cell.muted && cell.year === today.getFullYear() && cell.month === today.getMonth() && cell.day === today.getDate();
                return (
                  <div
                    key={ci}
                    className={`schedule-calendar__cell ${cell.muted ? 'schedule-calendar__cell--muted' : ''} ${isToday ? 'schedule-calendar__cell--today' : ''}`}
                    onClick={() => openAdd(cell.key)}
                  >
                    <span className="schedule-calendar__day">{cell.day}</span>
                    {pts.map((ev) => (
                      <div
                        key={ev.id}
                        className="schedule-event schedule-event--point"
                        style={{ background: ev.color, opacity: cell.muted ? 0.6 : 1 }}
                        onMouseEnter={(e) => handleMouseEnter(e, ev)}
                        onMouseLeave={handleMouseLeave}
                        onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {tooltip && (
        <div
          className="schedule-tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
          onMouseEnter={() => clearTimeout(tooltipTimer.current)}
          onMouseLeave={handleMouseLeave}
        >
          <strong>{tooltip.title}</strong>
          <span>{tooltip.start}</span>
          {tooltip.desc && <p>{tooltip.desc}</p>}
        </div>
      )}

      {showForm && (
        <div className="schedule-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingEvent ? '일정 수정' : '일정 추가'}</h3>
            <label>제목
              <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="일정 제목" />
            </label>
            <label>설명
              <textarea value={form.desc} onChange={(e) => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="설명 (선택)" rows={2} />
            </label>
            <label className="schedule-modal__checkbox">
              <input type="checkbox" checked={form.important} onChange={(e) => setForm(f => ({ ...f, important: e.target.checked }))} />
              중요 (날짜에 원형 표시)
            </label>
            <label>날짜
              <input type="date" value={form.start} onChange={(e) => setForm(f => ({ ...f, start: e.target.value }))} />
            </label>
            <label>색상
              <div className="schedule-modal__color-row">
                <div className="schedule-modal__colors">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`schedule-modal__color-btn ${form.color === c ? 'is-selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                    />
                  ))}
                </div>
                <div className="schedule-modal__color-picker-wrap">
                  <span className="schedule-modal__color-preview" style={{ background: form.color }} />
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))}
                    className="schedule-modal__color-picker"
                    title="직접 색상 선택"
                  />
                </div>
              </div>
            </label>
            <div className="schedule-modal__actions">
              {editingEvent && <button className="schedule-modal__delete" onClick={handleDelete}>삭제</button>}
              <button onClick={() => setShowForm(false)}>취소</button>
              <button className="schedule-modal__save" onClick={handleSave}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
