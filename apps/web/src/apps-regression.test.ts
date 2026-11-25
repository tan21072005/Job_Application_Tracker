import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('./views/Applications.tsx', import.meta.url), 'utf8');

describe('Applications regressions', () => {
  it('prunes a hidden selection when the filter changes', () => {
    expect(view).toContain('setSelectedIds(previous => {');
    expect(view).toContain('}, [visible]);');
  });

  it('compares lanes, not target statuses, when moving a card', () => {
    expect(view).toContain('if (laneKeyOf(targetApp.status) === lane.key) return false;');
    expect(view).toContain('if (laneKeyOf(app.status) === target.key) return;');
    expect(view).not.toContain('targetApp.status === lane.targetStatus');
  });

  it('does not announce a failed move as success', () => {
    expect(view).toContain('void handleDropOnLane(app.id, target).then(moved => {');
    expect(view).toContain('if (!moved) return;');
  });
});
