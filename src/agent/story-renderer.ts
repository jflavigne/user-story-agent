/**
 * Deterministic markdown renderer for StoryStructure.
 * No semantic judgment; pure function from structure to canonical template.
 */

import type {
  StoryStructure,
  Item,
  ImplementationNotes,
  UIMappingItem,
  StoryInterconnections,
} from '../shared/types.js';

/**
 * Renders a story structure to canonical markdown. Order and format are fixed.
 */
export class StoryRenderer {
  /**
   * Renders story structure to markdown using the canonical template.
   *
   * @param story - Structured story data
   * @returns Markdown string (no semantic judgment, pure function)
   */
  toMarkdown(story: StoryStructure): string {
    const sections: string[] = [];

    // Canonical template (USA-41): title, then As a / I want / So that
    sections.push(`# ${this.escapeHeading(story.title)}`);
    sections.push('');
    sections.push(`As a ${this.escapeInline(story.story.asA)}`);
    sections.push(`I want ${this.escapeInline(story.story.iWant)}`);
    sections.push(`So that ${this.escapeInline(story.story.soThat)}`);
    sections.push('');

    sections.push('## User-Visible Behavior');
    sections.push('');
    sections.push(...this.renderItems(story.userVisibleBehavior));
    sections.push('');

    sections.push('## Acceptance Criteria (Outcome)');
    sections.push('');
    sections.push(...this.renderItems(story.outcomeAcceptanceCriteria));
    sections.push('');

    sections.push('## Acceptance Criteria (System)');
    sections.push('');
    sections.push(...this.renderItems(story.systemAcceptanceCriteria));
    sections.push('');

    sections.push('## Implementation Notes');
    sections.push('');
    sections.push(...this.renderImplementationNotes(story.implementationNotes));
    sections.push('');

    if (story.uiMapping && story.uiMapping.length > 0) {
      sections.push('## UI Mapping');
      sections.push('');
      sections.push(...this.renderUIMapping(story.uiMapping));
      sections.push('');
    }

    if (story.openQuestions && story.openQuestions.length > 0) {
      sections.push('## Open Questions');
      sections.push('');
      sections.push(...this.renderItems(story.openQuestions));
      sections.push('');
    }

    if (story.edgeCases && story.edgeCases.length > 0) {
      sections.push('## Edge Cases');
      sections.push('');
      sections.push(...this.renderItems(story.edgeCases));
      sections.push('');
    }

    if (story.nonGoals && story.nonGoals.length > 0) {
      sections.push('## Non-Goals');
      sections.push('');
      sections.push(...this.renderItems(story.nonGoals));
      sections.push('');
    }

    return this.joinSections(sections);
  }

  /**
   * Appends Pass 2 interconnection metadata sections to existing markdown.
   * UI Mapping: "term" → componentId; Related Stories grouped by prerequisite/parallel/dependent.
   *
   * @param markdown - Existing story markdown
   * @param interconnections - Story ID, UI mapping, contract deps, ownership, related stories
   * @returns Markdown with interconnection sections appended
   */
  appendInterconnectionMetadata(markdown: string, interconnections: StoryInterconnections): string {
    let result = markdown.trimEnd();

    if (Object.keys(interconnections.uiMapping).length > 0) {
      result += '\n\n## UI Mapping\n\n';
      result += Object.entries(interconnections.uiMapping)
        .map(([term, compId]) => `- "${term}" → ${compId}`)
        .join('\n');
    }

    if (interconnections.contractDependencies.length > 0) {
      result += '\n\n## Contract Dependencies\n\n';
      result += interconnections.contractDependencies.map((id) => `- ${id}`).join('\n');
    }

    const ownership = interconnections.ownership;
    if (ownership.ownsState?.length || ownership.consumesState?.length || ownership.emitsEvents?.length || ownership.listensToEvents?.length) {
      result += '\n\n## Ownership\n\n';
      if (ownership.ownsState?.length) result += `**Owns State**: ${ownership.ownsState.join(', ')}\n`;
      if (ownership.consumesState?.length) result += `**Consumes State**: ${ownership.consumesState.join(', ')}\n`;
      if (ownership.emitsEvents?.length) result += `**Emits Events**: ${ownership.emitsEvents.join(', ')}\n`;
      if (ownership.listensToEvents?.length) result += `**Listens To**: ${ownership.listensToEvents.join(', ')}\n`;
    }

    if (interconnections.relatedStories.length > 0) {
      result += '\n\n## Related Stories\n\n';
      const byRelationship: Record<string, Array<{ storyId: string; description?: string }>> = {};
      for (const rel of interconnections.relatedStories) {
        if (!byRelationship[rel.relationship]) {
          byRelationship[rel.relationship] = [];
        }
        byRelationship[rel.relationship].push({ storyId: rel.storyId, description: rel.description });
      }
      if (byRelationship.prerequisite?.length) {
        result += '**Prerequisites**:\n';
        result += byRelationship.prerequisite.map((r) => `- ${r.storyId}${r.description ? `: ${r.description}` : ''}`).join('\n') + '\n\n';
      }
      if (byRelationship.parallel?.length) {
        result += '**Parallel**:\n';
        result += byRelationship.parallel.map((r) => `- ${r.storyId}${r.description ? `: ${r.description}` : ''}`).join('\n') + '\n\n';
      }
      if (byRelationship.dependent?.length) {
        result += '**Dependent**:\n';
        result += byRelationship.dependent.map((r) => `- ${r.storyId}${r.description ? `: ${r.description}` : ''}`).join('\n') + '\n\n';
      }
      if (byRelationship.related?.length) {
        result += '**Related**:\n';
        result += byRelationship.related.map((r) => `- ${r.storyId}${r.description ? `: ${r.description}` : ''}`).join('\n') + '\n\n';
      }
    }

    return result.trim();
  }

  private renderItems(items: Item[]): string[] {
    return items.map((item) => {
      const prefix = item.id ? `- [${item.id}] ` : '- ';
      return prefix + this.escapeInline(item.text);
    });
  }

  private renderUIMapping(items: UIMappingItem[]): string[] {
    return items.map((entry) => {
      const prefix = `- [${entry.id}] `;
      return prefix + `**${this.escapeInline(entry.productTerm)}**: ${this.escapeInline(entry.componentName)}`;
    });
  }

  /**
   * Renders implementation notes in fixed order for determinism.
   * Subsection keys: stateOwnership, dataFlow, apiContracts, loadingStates,
   * performanceNotes, securityNotes, telemetryNotes.
   */
  private renderImplementationNotes(notes: ImplementationNotes): string[] {
    const lines: string[] = [];
    const subsectionOrder: Array<{ key: keyof ImplementationNotes; label: string }> = [
      { key: 'stateOwnership', label: 'State ownership' },
      { key: 'dataFlow', label: 'Data flow' },
      { key: 'apiContracts', label: 'API contracts' },
      { key: 'loadingStates', label: 'Loading states' },
      { key: 'performanceNotes', label: 'Performance' },
      { key: 'securityNotes', label: 'Security' },
      { key: 'telemetryNotes', label: 'Telemetry' },
    ];
    for (const { key, label } of subsectionOrder) {
      const arr = notes[key];
      if (Array.isArray(arr) && arr.length > 0) {
        lines.push(`### ${label}`);
        lines.push('');
        lines.push(...this.renderItems(arr));
        lines.push('');
      }
    }
    return lines;
  }

  /** Joins section lines and normalizes to at most double newlines (deterministic). */
  private joinSections(sections: string[]): string {
    return sections.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
  }

  private escapeHeading(text: string): string {
    return text.replace(/#/g, '');
  }

  private escapeInline(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[');
  }
}
