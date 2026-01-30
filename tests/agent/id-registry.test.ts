/**
 * Unit tests for id-registry.ts
 */

import { describe, it, expect } from 'vitest';
import {
  IDRegistry,
  mintStableId,
  normalizeCanonicalName,
  getPrefix,
  type EntityType,
} from '../../src/agent/id-registry.js';

describe('normalizeCanonicalName', () => {
  it('converts to uppercase', () => {
    expect(normalizeCanonicalName('login button')).toBe('LOGIN_BUTTON');
    expect(normalizeCanonicalName('Login Button')).toBe('LOGIN_BUTTON');
  });

  it('replaces spaces with underscores', () => {
    expect(normalizeCanonicalName('User Profile')).toBe('USER_PROFILE');
  });

  it('replaces hyphens with underscores', () => {
    expect(normalizeCanonicalName('user-authenticated')).toBe('USER_AUTHENTICATED');
    expect(normalizeCanonicalName('login-to-dashboard')).toBe('LOGIN_TO_DASHBOARD');
  });

  it('removes non-alphanumeric except underscores', () => {
    expect(normalizeCanonicalName('Login & Button')).toBe('LOGIN_BUTTON');
    expect(normalizeCanonicalName('User (Profile)')).toBe('USER_PROFILE');
  });

  it('collapses multiple underscores to single', () => {
    expect(normalizeCanonicalName('login   button')).toBe('LOGIN_BUTTON');
    expect(normalizeCanonicalName('user--profile')).toBe('USER_PROFILE');
  });

  it('trims leading and trailing underscores', () => {
    expect(normalizeCanonicalName('  login button  ')).toBe('LOGIN_BUTTON');
  });

  it('returns empty string for empty or invalid input', () => {
    expect(normalizeCanonicalName('')).toBe('');
    expect(normalizeCanonicalName('   ')).toBe('');
  });
});

describe('getPrefix', () => {
  it('returns correct prefix for each entity type', () => {
    expect(getPrefix('component')).toBe('COMP-');
    expect(getPrefix('stateModel')).toBe('C-STATE-');
    expect(getPrefix('event')).toBe('E-');
    expect(getPrefix('dataFlow')).toBe('DF-');
  });
});

describe('mintStableId', () => {
  it('produces expected IDs from ticket examples', () => {
    const registry = new IDRegistry();
    expect(mintStableId('Login Button', 'component', registry)).toBe('COMP-LOGIN-BUTTON');
    expect(mintStableId('User Profile', 'stateModel', registry)).toBe('C-STATE-USER-PROFILE');
    expect(mintStableId('user-authenticated', 'event', registry)).toBe('E-USER-AUTHENTICATED');
    expect(mintStableId('login-to-dashboard', 'dataFlow', registry)).toBe('DF-LOGIN-TO-DASHBOARD');
  });

  it('same canonical name + entity type returns same ID every time (deterministic)', () => {
    const registry = new IDRegistry();
    const id1 = mintStableId('Login Button', 'component', registry);
    const id2 = mintStableId('Login Button', 'component', registry);
    expect(id1).toBe('COMP-LOGIN-BUTTON');
    expect(id2).toBe(id1);
  });

  it('different entity types get different prefixes', () => {
    const registry = new IDRegistry();
    expect(mintStableId('Login', 'component', registry)).toBe('COMP-LOGIN');
    expect(mintStableId('Login', 'event', registry)).toBe('E-LOGIN');
    expect(mintStableId('Login', 'dataFlow', registry)).toBe('DF-LOGIN');
    expect(mintStableId('Login', 'stateModel', registry)).toBe('C-STATE-LOGIN');
  });

  it('collision: different canonical names that normalize to same key get base, base_2, base_3', () => {
    const registry = new IDRegistry();
    const a = mintStableId('Login Button', 'component', registry);
    const b = mintStableId('login  button', 'component', registry); // same key, different string
    const c = mintStableId('LOGIN_BUTTON', 'component', registry);  // same key, different string
    expect(a).toBe('COMP-LOGIN-BUTTON');
    expect(b).toBe('COMP-LOGIN-BUTTON_2');
    expect(c).toBe('COMP-LOGIN-BUTTON_3');
  });

  it('same input after collision still returns same ID', () => {
    const registry = new IDRegistry();
    mintStableId('Login Button', 'component', registry);
    mintStableId('login  button', 'component', registry);
    expect(mintStableId('login  button', 'component', registry)).toBe('COMP-LOGIN-BUTTON_2');
    expect(mintStableId('Login Button', 'component', registry)).toBe('COMP-LOGIN-BUTTON');
  });

  it('IDs are stable across repeated mints in same order', () => {
    const registry = new IDRegistry();
    const ids1: string[] = [];
    const ids2: string[] = [];
    for (let i = 0; i < 3; i++) {
      ids1.push(mintStableId(`Item ${i}`, 'component', registry));
    }
    const registry2 = new IDRegistry();
    for (let i = 0; i < 3; i++) {
      ids2.push(mintStableId(`Item ${i}`, 'component', registry2));
    }
    expect(ids1).toEqual(ids2);
    expect(ids1).toEqual(['COMP-ITEM-0', 'COMP-ITEM-1', 'COMP-ITEM-2']);
  });
});

describe('IDRegistry', () => {
  it('get returns undefined when never minted', () => {
    const registry = new IDRegistry();
    expect(registry.get('component', 'LOGIN_BUTTON', 'Login Button')).toBeUndefined();
  });

  it('get returns minted ID after mint', () => {
    const registry = new IDRegistry();
    const id = mintStableId('Login Button', 'component', registry);
    expect(registry.get('component', 'LOGIN_BUTTON', 'Login Button')).toBe(id);
  });

  it('countForKey returns 0 then incrementing counts', () => {
    const registry = new IDRegistry();
    expect(registry.countForKey('component', 'LOGIN_BUTTON')).toBe(0);
    mintStableId('Login Button', 'component', registry);
    expect(registry.countForKey('component', 'LOGIN_BUTTON')).toBe(1);
    mintStableId('login  button', 'component', registry);
    expect(registry.countForKey('component', 'LOGIN_BUTTON')).toBe(2);
  });

  it('snapshot reflects all minted IDs', () => {
    const registry = new IDRegistry();
    mintStableId('Login Button', 'component', registry);
    mintStableId('User Profile', 'stateModel', registry);
    const snap = registry.snapshot();
    expect(snap.size).toBe(2);
    expect(snap.get('component:LOGIN_BUTTON')?.get('Login Button')).toBe('COMP-LOGIN-BUTTON');
    expect(snap.get('stateModel:USER_PROFILE')?.get('User Profile')).toBe('C-STATE-USER-PROFILE');
  });
});
