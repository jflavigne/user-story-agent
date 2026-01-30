/**
 * Unit tests for schema validation
 */

import { describe, it, expect } from 'vitest';
import { ChangeAppliedSchema, IterationOutputSchema } from '../../src/shared/schemas.js';
import { extractJSON } from '../../src/shared/json-utils.js';

describe('ChangeAppliedSchema', () => {
  it('should validate a valid change with all fields', () => {
    const change = {
      category: 'validation',
      description: 'Added email format validation',
      location: 'form fields',
    };

    const result = ChangeAppliedSchema.parse(change);
    expect(result.category).toBe('validation');
    expect(result.description).toBe('Added email format validation');
    expect(result.location).toBe('form fields');
  });

  it('should validate a change without location', () => {
    const change = {
      category: 'accessibility',
      description: 'Added ARIA labels',
    };

    const result = ChangeAppliedSchema.parse(change);
    expect(result.category).toBe('accessibility');
    expect(result.description).toBe('Added ARIA labels');
    expect(result.location).toBeUndefined();
  });

  it('should reject missing category', () => {
    const change = {
      description: 'Some change',
    };

    expect(() => ChangeAppliedSchema.parse(change)).toThrow();
  });

  it('should reject missing description', () => {
    const change = {
      category: 'validation',
    };

    expect(() => ChangeAppliedSchema.parse(change)).toThrow();
  });

  it('should reject empty category', () => {
    const change = {
      category: '',
      description: 'Some change',
    };

    expect(() => ChangeAppliedSchema.parse(change)).toThrow();
  });

  it('should reject empty description', () => {
    const change = {
      category: 'validation',
      description: '',
    };

    expect(() => ChangeAppliedSchema.parse(change)).toThrow();
  });

  it('should reject invalid location type', () => {
    const change = {
      category: 'validation',
      description: 'Some change',
      location: 123,
    };

    expect(() => ChangeAppliedSchema.parse(change)).toThrow();
  });
});

describe('IterationOutputSchema', () => {
  it('should validate a complete valid output', () => {
    const output = {
      enhancedStory: 'As a user, I want to login',
      changesApplied: [
        {
          category: 'validation',
          description: 'Added email format validation',
        },
        {
          category: 'accessibility',
          description: 'Added ARIA labels',
          location: 'form fields',
        },
      ],
      confidence: 0.85,
    };

    const result = IterationOutputSchema.parse(output);
    expect(result.enhancedStory).toBe('As a user, I want to login');
    expect(result.changesApplied).toHaveLength(2);
    expect(result.changesApplied[0].category).toBe('validation');
    expect(result.changesApplied[1].location).toBe('form fields');
    expect(result.confidence).toBe(0.85);
  });

  it('should validate output without confidence', () => {
    const output = {
      enhancedStory: 'As a user, I want to login',
      changesApplied: [],
    };

    const result = IterationOutputSchema.parse(output);
    expect(result.enhancedStory).toBe('As a user, I want to login');
    expect(result.changesApplied).toHaveLength(0);
    expect(result.confidence).toBeUndefined();
  });

  it('should validate output with empty changes array', () => {
    const output = {
      enhancedStory: 'As a user, I want to login',
      changesApplied: [],
      confidence: 0.5,
    };

    const result = IterationOutputSchema.parse(output);
    expect(result.changesApplied).toHaveLength(0);
    expect(result.confidence).toBe(0.5);
  });

  it('should reject missing enhancedStory', () => {
    const output = {
      changesApplied: [],
    };

    expect(() => IterationOutputSchema.parse(output)).toThrow();
  });

  it('should reject empty enhancedStory', () => {
    const output = {
      enhancedStory: '',
      changesApplied: [],
    };

    expect(() => IterationOutputSchema.parse(output)).toThrow();
  });

  it('should reject missing changesApplied', () => {
    const output = {
      enhancedStory: 'As a user, I want to login',
    };

    expect(() => IterationOutputSchema.parse(output)).toThrow();
  });

  it('should reject invalid changesApplied type', () => {
    const output = {
      enhancedStory: 'As a user, I want to login',
      changesApplied: 'not an array',
    };

    expect(() => IterationOutputSchema.parse(output)).toThrow();
  });

  it('should reject invalid change in changesApplied array', () => {
    const output = {
      enhancedStory: 'As a user, I want to login',
      changesApplied: [
        {
          category: 'validation',
          // missing description
        },
      ],
    };

    expect(() => IterationOutputSchema.parse(output)).toThrow();
  });

  it('should reject confidence below 0', () => {
    const output = {
      enhancedStory: 'As a user, I want to login',
      changesApplied: [],
      confidence: -0.1,
    };

    expect(() => IterationOutputSchema.parse(output)).toThrow();
  });

  it('should reject confidence above 1', () => {
    const output = {
      enhancedStory: 'As a user, I want to login',
      changesApplied: [],
      confidence: 1.1,
    };

    expect(() => IterationOutputSchema.parse(output)).toThrow();
  });

  it('should accept confidence at boundaries (0 and 1)', () => {
    const output0 = {
      enhancedStory: 'As a user, I want to login',
      changesApplied: [],
      confidence: 0,
    };

    const output1 = {
      enhancedStory: 'As a user, I want to login',
      changesApplied: [],
      confidence: 1,
    };

    expect(IterationOutputSchema.parse(output0).confidence).toBe(0);
    expect(IterationOutputSchema.parse(output1).confidence).toBe(1);
  });
});

describe('extractJSON', () => {
  it('should extract JSON from plain JSON string', () => {
    const text = '{"key": "value"}';
    const result = extractJSON(text);
    expect(result).toEqual({ key: 'value' });
  });

  it('should extract JSON from markdown code block with json language', () => {
    const text = '```json\n{"key": "value"}\n```';
    const result = extractJSON(text);
    expect(result).toEqual({ key: 'value' });
  });

  it('should extract JSON from markdown code block without language', () => {
    const text = '```\n{"key": "value"}\n```';
    const result = extractJSON(text);
    expect(result).toEqual({ key: 'value' });
  });

  it('should extract JSON object from text with surrounding content', () => {
    const text = 'Here is the result:\n{"key": "value"}\nThat was it.';
    const result = extractJSON(text);
    expect(result).toEqual({ key: 'value' });
  });

  it('should extract JSON array', () => {
    const text = '```json\n[1, 2, 3]\n```';
    const result = extractJSON(text);
    expect(result).toEqual([1, 2, 3]);
  });

  it('should return null for empty string', () => {
    const result = extractJSON('');
    expect(result).toBeNull();
  });

  it('should return null for text with no JSON', () => {
    const text = 'This is just plain text with no JSON';
    const result = extractJSON(text);
    expect(result).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    const text = '{"key": "value"';
    const result = extractJSON(text);
    expect(result).toBeNull();
  });

  it('should extract JSON with nested objects', () => {
    const text = '```json\n{"nested": {"key": "value"}}\n```';
    const result = extractJSON(text);
    expect(result).toEqual({ nested: { key: 'value' } });
  });

  it('should extract nested JSON object from plain text (greedy match)', () => {
    const text = 'Text: {"outer":{"inner":{"value":1}},"other":2}';
    const result = extractJSON(text);
    expect(result).toEqual({ outer: { inner: { value: 1 } }, other: 2 });
  });

  it('should extract first valid JSON when multiple code blocks exist', () => {
    const text = '```json\n{"first": true}\n```\n```json\n{"second": true}\n```';
    const result = extractJSON(text);
    expect(result).toEqual({ first: true });
  });

  it('should handle whitespace in JSON', () => {
    const text = '  {  "key"  :  "value"  }  ';
    const result = extractJSON(text);
    expect(result).toEqual({ key: 'value' });
  });
});
