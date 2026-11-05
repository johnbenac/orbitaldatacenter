// Keep discovery tied to arriving at a workspace. A flight-clock redraw can
// replace every button without making the visitor watch the introduction again.
export function createChoiceCues() {
  const seen = new Set();
  const waiting = new Map();
  const groupSelector = '[data-choice-group], #cameras';
  const groupKey = group => group.dataset.choiceGroup || group.id;
  const choiceButton = 'button:is([aria-current], [aria-pressed]):not(:disabled)';
  const buttonSelector = ':scope > ' + choiceButton;
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let workspace;

  // A chapter change can replace the focused button during its own click.
  // Restore a keyboard visitor to that same control after the new view paints.
  globalThis.document?.getElementById('main')?.addEventListener('click', event => {
    if (event.detail !== 0) return;
    const button = event.target.closest('button');
    const group = button?.parentElement;
    if (!group?.matches(groupSelector) || !button.matches(choiceButton)) return;
    const identity = Array.from(button.attributes).find(attr => attr.name.startsWith('data-') && attr.name !== 'data-tip');
    if (!identity) return;
    const doc = button.ownerDocument, visit = workspace;
    requestAnimationFrame(() => {
      if (button.isConnected || doc.activeElement !== doc.body || workspace !== visit) return;
      for (const replacement of doc.querySelectorAll(groupSelector)) {
        if (groupKey(replacement) !== groupKey(group) || replacement.closest('[hidden]')) continue;
        Array.from(replacement.querySelectorAll(buttonSelector)).find(b => b.getAttribute(identity.name) === identity.value)?.focus({preventScroll: true});
        break;
      }
    });
  }, true);

  function reveal(group) {
    const key = waiting.get(group);
    if (!key) return;
    observer?.unobserve(group);
    waiting.delete(group);
    if (seen.has(key) || !group.isConnected || reduced?.matches) return;
    const buttons = group.querySelectorAll(buttonSelector);
    if (buttons.length < 2) return;
    seen.add(key);
    for (const button of buttons) {
      const selected = button.matches('[aria-current="step"], [aria-pressed="true"]');
      button.classList.add(selected ? 'cue-selected' : 'cue-option');
    }
  }

  const observer = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
      }, { threshold: 0.25 })
    : null;

  function update(nextWorkspace, root) {
    if (nextWorkspace !== workspace) {
      observer?.disconnect();
      waiting.clear();
      seen.clear();
      workspace = nextWorkspace;
    }
    if (reduced?.matches) return;
    for (const group of waiting.keys()) {
      if (!group.isConnected || group.closest('[hidden]')) {
        observer?.unobserve(group);
        waiting.delete(group);
      }
    }
    for (const group of root.querySelectorAll(groupSelector)) {
      const key = groupKey(group);
      if (seen.has(key) || waiting.has(group) || group.closest('[hidden]')) continue;
      if (group.querySelectorAll(buttonSelector).length < 2) continue;
      waiting.set(group, key);
      if (observer) observer.observe(group);
      else reveal(group);
    }
  }
  return { update };
}
