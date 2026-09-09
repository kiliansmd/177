import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../assets/scroll.js', import.meta.url), 'utf8');

function browser({ fallback = false, checkout = false } = {}) {
  const calls = [], timers = new Map();
  let sequence = 0;
  const events = () => ({ listeners: {}, addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }, fire(type, event = {}) { for (const fn of this.listeners[type] || []) fn({ type, ...event }); } });
  class Element { constructor(blocked = false) { this.blocked = blocked; } closest() { return this.blocked ? this : null; } }
  const win = Object.assign(events(), { scrollY: 0, innerHeight: 900, visualViewport: Object.assign(events(), { height: 900, scale: 1 }), getSelection: () => ({ isCollapsed: !win.selected }), scrollTo: options => calls.push(options) });
  const section = top => ({ offsetHeight: 800, matches: () => true, getBoundingClientRect: () => ({ top: top - win.scrollY }) });
  const doc = Object.assign(events(), { documentElement: { scrollHeight: 5000, clientHeight: 900 }, activeElement: new Element(), hidden: false, querySelector: selector => selector === 'main' ? { children: [section(120), section(900), section(2100)] } : selector.includes('.join-area') && checkout ? {} : null });
  if (!fallback) doc.onscrollend = null;
  vm.runInNewContext(source, { window: win, document: doc, Element, getComputedStyle: () => ({ scrollPaddingTop: '108px' }), setTimeout: fn => { const id = ++sequence; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id) });
  const wheel = (blocked = false, extra = {}) => win.fire('wheel', { target: new Element(blocked), deltaY: 100, deltaX: 0, ...extra });
  const stop = () => doc.fire('scrollend');
  const flush = () => { const pending = [...timers.values()]; timers.clear(); for (const fn of pending) fn(); };
  return { win, doc, calls, wheel, stop, flush, timers, Element };
}

for (const position of [774, 810]) test(`settles a ${position < 792 ? 'short' : 'long'} gesture near the section`, () => {
  const b = browser(); b.wheel(); b.win.scrollY = position; b.stop();
  assert.deepEqual(JSON.parse(JSON.stringify(b.calls)), [{ top: 792, behavior: 'smooth' }]);
  b.win.scrollY = 792; b.stop(); assert.equal(b.calls.length, 1);
});

test('fine adjustments can leave a settled position', () => {
  const b = browser(); b.win.scrollY = 792; b.stop(); b.wheel(); b.win.scrollY = 806; b.stop(); assert.equal(b.calls.length, 0);
});
test('passive wheel dispatch after compositor scrolling still corrects the first gesture', () => {
  const b = browser(); b.win.scrollY = 774; b.wheel(); b.stop(); assert.equal(b.calls[0].top, 792);
});
test('small wheel input after an external scroll is still free', () => {
  const b = browser(); b.win.scrollY = 792; b.wheel(false, { deltaY: 14 }); b.win.scrollY = 806; b.stop(); assert.equal(b.calls.length, 0);
});
test('a long gesture ending outside the small radius stays untouched', () => {
  const b = browser(); b.wheel(); b.win.scrollY = 680; b.stop(); assert.equal(b.calls.length, 0);
});
test('new input interrupts the correction and is free to move', () => {
  const b = browser(); b.wheel(); b.win.scrollY = 774; b.stop();
  b.win.scrollY = 780; b.wheel(); assert.equal(b.calls[1].behavior, 'instant'); assert.equal(b.calls[1].top, 780);
  b.win.scrollY = 798; b.stop(); assert.equal(b.calls.length, 2);
});
test('touch correction waits for the finger and momentum to finish', () => {
  const b = browser(); b.win.fire('touchstart', { target: new b.Element(), touches: [{}] });
  b.win.scrollY = 774; b.stop(); assert.equal(b.calls.length, 0);
  b.win.fire('touchend', { touches: [] }); b.stop(); assert.equal(b.calls[0].top, 792);
});
test('pinch gestures stay native', () => {
  const b = browser(); b.win.fire('touchstart', { target: new b.Element(), touches: [{}, {}] });
  b.win.scrollY = 774; b.win.fire('touchend', { touches: [] }); b.stop(); assert.equal(b.calls.length, 0);
});
for (const event of ['click', 'keydown', 'focusin']) test(`${event} preserves its own target`, () => {
  const b = browser(); b.wheel(); b.win.scrollY = 774; b.doc.fire(event); b.stop(); assert.equal(b.calls.length, 0);
});
for (const event of ['hashchange', 'popstate', 'pageshow', 'resize']) test(`${event} does not trigger a corrective jump`, () => {
  const b = browser(); b.wheel(); b.win.scrollY = 774; b.win.fire(event); b.stop(); assert.equal(b.calls.length, 0);
});
test('selected text, focused fields and pinch zoom are not repositioned', () => {
  for (const guard of ['selection', 'focus', 'zoom']) {
    const b = browser(); b.wheel(); b.win.scrollY = 774;
    if (guard === 'selection') b.win.selected = true;
    if (guard === 'focus') b.doc.activeElement = new b.Element(true);
    if (guard === 'zoom') b.win.visualViewport.scale = 2;
    b.stop(); assert.equal(b.calls.length, 0, guard);
  }
});
test('nested controls and checkout are not armed', () => {
  const nested = browser(); nested.wheel(true); nested.win.scrollY = 774; nested.stop(); assert.equal(nested.calls.length, 0);
  const checkout = browser({ checkout: true }); checkout.wheel(); checkout.win.scrollY = 774; checkout.stop(); assert.equal(checkout.calls.length, 0);
});
test('fallback uses one timer and settles after scrolling stops', () => {
  const b = browser({ fallback: true }); b.wheel(); b.win.scrollY = 774;
  for (let n = 0; n < 20; n++) b.doc.fire('scroll');
  assert.equal(b.timers.size, 1); assert.equal(b.calls.length, 0); b.flush(); assert.equal(b.calls[0].top, 792);
});
test('fallback also waits for touch release', () => {
  const b = browser({ fallback: true }); b.win.fire('touchstart', { target: new b.Element(), touches: [{}] });
  b.win.scrollY = 774; b.doc.fire('scroll'); b.flush(); assert.equal(b.calls.length, 0);
  b.win.fire('touchend', { touches: [] }); b.flush(); assert.equal(b.calls[0].top, 792);
});
