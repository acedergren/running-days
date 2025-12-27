import { describe, it, expect } from 'vitest';
import {
  detectNewMilestones,
  getNextMilestone,
  getAchievementStatus,
  isMilestoneAchieved,
  getAllMilestones,
  MILESTONES,
  MILESTONE_NAMES
} from './achievement-service';

describe('detectNewMilestones', () => {
  it('should detect single milestone crossed', () => {
    const result = detectNewMilestones(48, 52);
    expect(result).toEqual([50]);
  });

  it('should detect multiple milestones crossed', () => {
    const result = detectNewMilestones(45, 105);
    expect(result).toEqual([50, 100]);
  });

  it('should return empty array if no milestone crossed', () => {
    const result = detectNewMilestones(55, 60);
    expect(result).toEqual([]);
  });

  it('should detect all milestones from 0 to 300', () => {
    const result = detectNewMilestones(0, 300);
    expect(result).toEqual([50, 100, 150, 200, 250, 300]);
  });

  it('should handle edge case at exactly milestone', () => {
    const result = detectNewMilestones(49, 50);
    expect(result).toEqual([50]);
  });

  it('should not include milestone if already passed', () => {
    const result = detectNewMilestones(50, 75);
    expect(result).toEqual([]);
  });
});

describe('getNextMilestone', () => {
  it('should return first milestone when at 0', () => {
    const result = getNextMilestone(0);
    expect(result).toEqual({
      milestone: 50,
      name: 'Half Century',
      daysRemaining: 50
    });
  });

  it('should return next milestone after partially completing', () => {
    const result = getNextMilestone(75);
    expect(result).toEqual({
      milestone: 100,
      name: 'Century',
      daysRemaining: 25
    });
  });

  it('should return 300 milestone when at 250', () => {
    const result = getNextMilestone(260);
    expect(result).toEqual({
      milestone: 300,
      name: 'Complete',
      daysRemaining: 40
    });
  });

  it('should return null when all milestones achieved', () => {
    const result = getNextMilestone(300);
    expect(result).toBeNull();
  });

  it('should return null when exceeding all milestones', () => {
    const result = getNextMilestone(350);
    expect(result).toBeNull();
  });
});

describe('getAchievementStatus', () => {
  it('should return empty unlocked array when no milestones achieved', () => {
    const result = getAchievementStatus(25, []);
    expect(result.unlocked).toHaveLength(0);
    expect(result.next?.milestone).toBe(50);
  });

  it('should include stored unlock dates in achievements', () => {
    const stored = [
      { milestone: 50, unlockedAt: '2024-03-15T10:00:00Z' },
      { milestone: 100, unlockedAt: '2024-06-01T12:00:00Z' }
    ];
    const result = getAchievementStatus(120, stored);

    expect(result.unlocked).toHaveLength(2);
    expect(result.unlocked[0]).toEqual({
      milestone: 50,
      name: 'Half Century',
      unlockedAt: '2024-03-15T10:00:00Z'
    });
    expect(result.unlocked[1]).toEqual({
      milestone: 100,
      name: 'Century',
      unlockedAt: '2024-06-01T12:00:00Z'
    });
    expect(result.next?.milestone).toBe(150);
  });

  it('should show null unlockedAt if not in stored achievements', () => {
    // User has 100 days but only 50-day achievement was stored
    const stored = [{ milestone: 50, unlockedAt: '2024-03-15T10:00:00Z' }];
    const result = getAchievementStatus(100, stored);

    expect(result.unlocked).toHaveLength(2);
    expect(result.unlocked[1].unlockedAt).toBeNull(); // 100-day not stored
  });

  it('should return all milestones when at 300', () => {
    const stored = MILESTONES.map(m => ({
      milestone: m,
      unlockedAt: '2024-01-01T00:00:00Z'
    }));
    const result = getAchievementStatus(300, stored);

    expect(result.unlocked).toHaveLength(6);
    expect(result.next).toBeNull();
  });
});

describe('isMilestoneAchieved', () => {
  it('should return true when days >= milestone', () => {
    expect(isMilestoneAchieved(50, 50)).toBe(true);
    expect(isMilestoneAchieved(100, 50)).toBe(true);
    expect(isMilestoneAchieved(300, 300)).toBe(true);
  });

  it('should return false when days < milestone', () => {
    expect(isMilestoneAchieved(49, 50)).toBe(false);
    expect(isMilestoneAchieved(0, 50)).toBe(false);
    expect(isMilestoneAchieved(299, 300)).toBe(false);
  });
});

describe('getAllMilestones', () => {
  it('should return all milestones with names', () => {
    const result = getAllMilestones();

    expect(result).toHaveLength(6);
    expect(result[0]).toEqual({ milestone: 50, name: 'Half Century' });
    expect(result[1]).toEqual({ milestone: 100, name: 'Century' });
    expect(result[2]).toEqual({ milestone: 150, name: 'Triple Crown' });
    expect(result[3]).toEqual({ milestone: 200, name: 'Double Century' });
    expect(result[4]).toEqual({ milestone: 250, name: 'Platinum' });
    expect(result[5]).toEqual({ milestone: 300, name: 'Complete' });
  });
});

describe('MILESTONES constant', () => {
  it('should be sorted ascending', () => {
    for (let i = 1; i < MILESTONES.length; i++) {
      expect(MILESTONES[i]).toBeGreaterThan(MILESTONES[i - 1]);
    }
  });

  it('should have corresponding names', () => {
    for (const milestone of MILESTONES) {
      expect(MILESTONE_NAMES[milestone]).toBeDefined();
      expect(typeof MILESTONE_NAMES[milestone]).toBe('string');
    }
  });
});
