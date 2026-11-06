// Visible work is tied to actual task stages. No estimated percentages or
// minimum execution time are added to an engineering calculation.
export function yieldToPaint() {
  return new Promise(resolve => {
    let settled = false, frame = null;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(fallback);
      if (frame != null) globalThis.cancelAnimationFrame?.(frame);
      resolve();
    };
    // Background documents may suspend animation frames. Keep work usable there.
    const fallback = setTimeout(finish, 80);
    if (typeof globalThis.requestAnimationFrame === 'function') {
      frame = requestAnimationFrame(() => setTimeout(finish, 0));
    } else setTimeout(finish, 0);
  });
}

export function createWorkFeedback({document: doc = globalThis.document, now = () => performance.now()} = {}) {
  let task = null, hideTimer = null, observer = null, surface = null, nodes = null;
  const attr = (node, name) => node?.getAttribute?.(name) ?? null;
  const restoreAttr = (node, name, value) => {
    if (!node) return;
    if (value == null) node.removeAttribute(name);
    else node.setAttribute(name, value);
  };
  const make = (tag, className, text = '') => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const append = (parent, ...children) => children.forEach(child => parent.appendChild(child));
  const timer = (callback, delay) => {
    const id = setTimeout(callback, delay);
    id?.unref?.();
    return id;
  };

  function mount() {
    if (surface) return;
    surface = make('section', 'work-status');
    surface.id = 'work-status';
    surface.hidden = true;
    surface.setAttribute('role', 'region');
    surface.setAttribute('aria-label', 'Calculation activity');
    if (typeof surface.showPopover === 'function') surface.setAttribute('popover', 'manual');

    const signal = make('div', 'work-signal');
    signal.setAttribute('aria-hidden', 'true');
    append(signal, make('i'));
    const header = make('header', 'work-status-head');
    const orbit = make('span', 'work-orbit');
    orbit.setAttribute('aria-hidden', 'true');
    append(orbit, make('i'), make('b'));
    const heading = make('div', 'work-status-heading');
    const kicker = make('span', 'work-kicker', 'LOCAL ENGINE');
    const title = make('strong', 'work-title');
    title.id = 'work-status-title';
    append(heading, kicker, title);
    const action = make('button', 'work-status-action', '×');
    action.type = 'button';
    action.dataset.workCancel = '';
    action.hidden = true;
    append(header, orbit, heading, action);

    const body = make('div', 'work-status-body');
    const detail = make('p', 'work-detail');
    const steps = make('ol', 'work-steps');
    steps.setAttribute('aria-label', 'Calculation stages');
    const measure = make('div', 'work-measure');
    measure.hidden = true;
    const measureLabel = make('span', 'work-measure-label');
    const progress = make('div', 'work-measure-track');
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', 'Reported calculation progress');
    const fill = make('i');
    append(progress, fill);
    append(measure, measureLabel, progress);
    append(body, detail, steps, measure);

    const footer = make('footer', 'work-status-footer');
    const elapsed = make('span', 'work-elapsed');
    elapsed.setAttribute('aria-hidden', 'true');
    const hint = make('span', 'work-status-hint', 'Computing in your browser');
    append(footer, elapsed, hint);
    const live = make('span', 'work-announcement');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    append(surface, signal, header, body, footer, live);
    doc.body.appendChild(surface);
    nodes = {title, detail, steps, measure, measureLabel, progress, fill, elapsed, hint, action, live};
    action.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (task?.running) task.handle.cancel();
      else hide();
    });
    doc.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !task?.running || !task.blocking) return;
      event.preventDefault();
      event.stopPropagation();
      if (task.cancelCallback) task.handle.cancel();
    }, true);
    const MutationObserverType = doc.defaultView?.MutationObserver ?? globalThis.MutationObserver;
    if (typeof MutationObserverType === 'function') {
      observer = new MutationObserverType(() => {
        if (task?.running) syncHost(task);
      });
      observer.observe(doc.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['open']});
    }
  }

  function topHost() {
    // A popover outside a modal can remain inert. Put the work surface inside
    // the active dialog and lock its other children, keeping Cancel accessible.
    const dialogs = [...doc.querySelectorAll('dialog[open]')].filter(node => node !== surface);
    const focused = doc.activeElement?.closest?.('dialog[open]');
    return focused?.tagName === 'DIALOG' && focused.open ? focused : dialogs.at(-1) ?? doc.body;
  }

  function show() {
    surface.hidden = false;
    if (typeof surface.showPopover === 'function') {
      try { surface.showPopover(); } catch { /* The fixed-position fallback remains usable. */ }
    }
  }

  function hide() {
    if (!surface) return;
    clearTimeout(hideTimer);
    hideTimer = null;
    try { surface.hidePopover?.(); } catch { /* A parent dialog may already have closed it. */ }
    surface.hidden = true;
    if (!task?.running) task = null;
  }

  function restoreLocks(owner) {
    for (const entry of owner.locks) {
      restoreAttr(entry.node, 'inert', entry.inert);
      restoreAttr(entry.node, 'aria-busy', entry.busy);
    }
    owner.locks.length = 0;
  }

  function lockWorkspace(owner) {
    if (!owner.blocking) return;
    const recorded = new Set();
    const lock = node => {
      if (!node || node === surface || recorded.has(node)) return;
      if (node === surface.parentElement || node.contains?.(surface)) {
        for (const child of [...(node.children ?? [])]) lock(child);
        return;
      }
      recorded.add(node);
      owner.locks.push({node, inert: attr(node, 'inert'), busy: attr(node, 'aria-busy')});
      node.setAttribute('inert', '');
      node.setAttribute('aria-busy', 'true');
    };
    for (const id of ['main', 'rail', 'lifecycle']) lock(doc.getElementById(id));
    for (const node of doc.querySelectorAll('.topbar, dialog[open]')) lock(node);
  }

  function syncHost(owner) {
    if (task !== owner || !owner.running) return;
    const target = topHost();
    if (surface.parentElement === target) return;
    restoreLocks(owner);
    try { surface.hidePopover?.(); } catch { /* Already hidden. */ }
    target.appendChild(surface);
    lockWorkspace(owner);
    show();
  }

  function elapsed(owner) {
    const seconds = Math.max(0, (now() - owner.started) / 1000);
    const duration = seconds < 60 ? seconds.toFixed(1) + ' s' : Math.floor(seconds / 60) + 'm ' + Math.floor(seconds % 60) + 's';
    nodes.elapsed.textContent = duration + (owner.running ? ' elapsed' : ' total');
    return duration;
  }

  function announce(owner, text) {
    if (task !== owner || owner.announcement === text) return;
    owner.announcement = text;
    nodes.live.textContent = text;
  }

  function setAction(owner) {
    if (task !== owner) return;
    const cancellable = owner.running && typeof owner.cancelCallback === 'function';
    nodes.action.hidden = owner.running && !cancellable;
    nodes.action.setAttribute('aria-label', owner.running ? 'Cancel calculation' : 'Dismiss calculation status');
    nodes.action.title = owner.running ? 'Cancel calculation (Esc)' : 'Dismiss';
    nodes.hint.textContent = cancellable ? 'Esc to cancel · local computation' : owner.running ? 'Computing in your browser' : owner.state === 'error' ? 'Review the message and try again' : owner.state === 'cancelled' ? 'No pending calculation' : 'Results ready';
  }

  function renderSteps(owner) {
    owner.stepNodes.forEach((entry, index) => {
      const state = owner.state === 'ready' || index < owner.stepIndex ? 'complete' : index === owner.stepIndex ? owner.state === 'error' ? 'error' : owner.state === 'cancelled' ? 'cancelled' : 'current' : 'waiting';
      entry.item.dataset.state = state;
      entry.marker.textContent = state === 'complete' ? '✓' : state === 'error' ? '!' : String(index + 1).padStart(2, '0');
      if (state === 'current') entry.item.setAttribute('aria-current', 'step');
      else entry.item.removeAttribute('aria-current');
    });
  }

  function release(owner, restoreFocus = true) {
    clearTimeout(owner.expandTimer);
    clearInterval(owner.elapsedTimer);
    restoreLocks(owner);
    restoreAttr(doc.body, 'data-work-active', owner.bodyWork);
    if (owner.source) {
      restoreAttr(owner.source, 'aria-busy', owner.sourceBusy);
      restoreAttr(owner.source, 'aria-disabled', owner.sourceAriaDisabled);
      if (!owner.sourceWasWorking) owner.source.classList.remove('is-working');
      if (owner.sourceDisabled != null) owner.source.disabled = owner.sourceDisabled;
    }
    const active = doc.activeElement;
    const prior = owner.focusBefore;
    // Preserve focus if the operation has already moved it into its result.
    if (restoreFocus && prior?.isConnected && (active == null || active === doc.body || surface.contains?.(active))) {
      const dialog = prior.closest?.('dialog');
      if (!(dialog?.tagName === 'DIALOG' && !dialog.open) && !prior.closest?.('[inert]')) prior.focus?.({preventScroll: true});
    }
  }

  function settle(owner, state, message) {
    if (task !== owner || !owner.running) return;
    owner.running = false;
    owner.state = state;
    const duration = elapsed(owner);
    const resultDialog = state === 'ready' && doc.querySelectorAll('dialog[open]').length > 0;
    release(owner, !resultDialog);
    surface.dataset.state = state;
    if (state === 'error') {
      surface.dataset.expanded = 'true';
      nodes.title.textContent = 'Calculation stopped';
      nodes.detail.textContent = String(message || 'The calculation could not finish. Try the action again.');
    } else if (state === 'cancelled') {
      surface.dataset.expanded = 'false';
      nodes.title.textContent = 'Calculation cancelled';
      nodes.detail.textContent = owner.title;
    } else {
      surface.dataset.expanded = 'false';
      nodes.title.textContent = typeof message === 'object' ? message.title || 'Ready' : message || 'Ready';
      nodes.detail.textContent = typeof message === 'object' ? message.detail || owner.title : owner.title;
    }
    renderSteps(owner);
    setAction(owner);
    announce(owner, nodes.title.textContent + '. ' + (state === 'error' ? nodes.detail.textContent : owner.title + '. ' + duration + '.'));
    // The result dialog is itself the completion acknowledgement. Do not leave
    // a transient work card over its actions or take its autofocus away.
    if (resultDialog) hide();
    else if (state !== 'error') hideTimer = timer(() => { if (task === owner && !owner.running) hide(); }, 1350);
  }

  function begin({title = 'Calculating', detail = '', steps = [], source = null, cancel = null, blocking = true, expandImmediately = false} = {}) {
    if (task?.running) throw Error('A calculation is already in progress.');
    mount();
    clearTimeout(hideTimer);
    hideTimer = null;
    const owner = {
      title: String(title), running: true, state: 'working', started: now(), blocking: !!blocking,
      cancelCallback: typeof cancel === 'function' ? cancel : null, locks: [], stepIndex: 0, stepNodes: [],
      focusBefore: doc.activeElement, bodyWork: attr(doc.body, 'data-work-active'),
      source, sourceBusy: attr(source, 'aria-busy'), sourceAriaDisabled: attr(source, 'aria-disabled'),
      sourceDisabled: typeof source?.disabled === 'boolean' ? source.disabled : null,
      sourceWasWorking: source?.classList?.contains('is-working') ?? false,
      expandTimer: null, elapsedTimer: null, announcement: ''
    };
    task = owner;
    surface.dataset.state = 'working';
    surface.dataset.expanded = expandImmediately ? 'true' : 'false';
    nodes.title.textContent = owner.title;
    nodes.detail.textContent = String(detail);
    nodes.steps.textContent = '';
    nodes.steps.hidden = !steps.length;
    for (const text of steps) {
      const item = make('li'), marker = make('span', 'work-step-marker'), label = make('span', 'work-step-label', String(text));
      marker.setAttribute('aria-hidden', 'true');
      append(item, marker, label);
      nodes.steps.appendChild(item);
      owner.stepNodes.push({item, marker, label});
    }
    nodes.measure.hidden = true;
    for (const name of ['aria-valuenow', 'aria-valuemax', 'aria-valuemin', 'aria-valuetext']) nodes.progress.removeAttribute(name);
    doc.body.setAttribute('data-work-active', 'true');
    if (source) {
      source.setAttribute('aria-busy', 'true');
      source.setAttribute('aria-disabled', 'true');
      source.classList.add('is-working');
      if (owner.sourceDisabled != null) source.disabled = true;
    }

    const handle = {
      stage(index, detailText) {
        if (task !== owner || !owner.running) return handle;
        syncHost(owner);
        const next = Math.max(0, Math.min(Math.max(0, owner.stepNodes.length - 1), Math.floor(Number(index) || 0)));
        if (next !== owner.stepIndex) nodes.measure.hidden = true;
        owner.stepIndex = next;
        if (detailText != null) nodes.detail.textContent = String(detailText);
        renderSteps(owner);
        announce(owner, owner.title + '. ' + (owner.stepNodes[next]?.label.textContent || '') + '. ' + nodes.detail.textContent);
        return handle;
      },
      progress(done, total, detailText) {
        if (task !== owner || !owner.running) return handle;
        if (done && typeof done === 'object') {
          const value = done;
          done = value.done ?? value.days ?? value.completed;
          total = value.total ?? value.totalDays;
          detailText = value.detail ?? value.label ?? detailText;
        }
        if (detailText != null) nodes.detail.textContent = String(detailText);
        if (Number.isFinite(done) && Number.isFinite(total) && total > 0) {
          const completed = Math.max(0, Math.min(total, done));
          nodes.measure.hidden = false;
          nodes.measureLabel.textContent = completed.toLocaleString('en-US') + ' / ' + total.toLocaleString('en-US');
          nodes.progress.setAttribute('aria-valuemin', '0');
          nodes.progress.setAttribute('aria-valuemax', String(total));
          nodes.progress.setAttribute('aria-valuenow', String(completed));
          nodes.progress.setAttribute('aria-valuetext', nodes.measureLabel.textContent + (detailText ? ' · ' + detailText : ' completed'));
          nodes.fill.style.transform = 'scaleX(' + completed / total + ')';
        }
        if (detailText) announce(owner, owner.title + '. ' + detailText);
        return handle;
      },
      reveal() {
        if (task === owner && owner.running) {
          clearTimeout(owner.expandTimer);
          surface.dataset.expanded = 'true';
          syncHost(owner);
        }
        return handle;
      },
      setCancelable(callback) {
        if (task !== owner || !owner.running) return handle;
        owner.cancelCallback = typeof callback === 'function' ? callback : null;
        setAction(owner);
        return handle;
      },
      finish(message) { settle(owner, 'ready', message); },
      fail(message) { settle(owner, 'error', message?.message ?? message); },
      cancel() {
        if (task !== owner || !owner.running || !owner.cancelCallback) return false;
        const callback = owner.cancelCallback;
        owner.cancelCallback = null;
        try { callback(); } catch (error) { settle(owner, 'error', error?.message ?? String(error)); return false; }
        settle(owner, 'cancelled');
        return true;
      },
      get active() { return task === owner && owner.running; }
    };
    owner.handle = handle;
    const target = topHost();
    if (surface.parentElement !== target) target.appendChild(surface);
    lockWorkspace(owner);
    show();
    renderSteps(owner);
    setAction(owner);
    elapsed(owner);
    announce(owner, owner.title + '. ' + detail + (owner.cancelCallback ? ' Press Escape to cancel.' : ''));
    if (!expandImmediately) owner.expandTimer = timer(() => handle.reveal(), 140);
    owner.elapsedTimer = setInterval(() => { if (task === owner && owner.running) elapsed(owner); }, 250);
    owner.elapsedTimer?.unref?.();
    return handle;
  }

  return {
    begin,
    get active() { return task?.running === true; },
    get current() { return task?.running ? task.handle : null; },
    dismiss() { if (!task?.running) hide(); }
  };
}
