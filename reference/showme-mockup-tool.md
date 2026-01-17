# ShowMe: Visual Mockup & Annotation Tool for Claude Code

## Overview

ShowMe is a visual mockup and annotation tool designed specifically for Claude Code. It addresses a critical limitation: Claude Code cannot see the user's screen, forcing developers to describe visual issues verbally.

**Repository**: https://github.com/yaronbeen/ShowMe

## How It Works

### Workflow

1. User types `/showme` in Claude Code
2. A browser canvas window opens
3. User pastes screenshots or draws mockups
4. User adds coordinate-tracked annotations
5. User clicks "Send to Claude" to submit structured data

### Key Advantage

Instead of vague descriptions like "move it left," Claude receives precise coordinates:

> "Annotation #3 at coordinates (452, 128) - this button needs 16px margin-right."

## Annotation System

ShowMe provides four annotation types:

| Type | Purpose |
|------|---------|
| **Pin** | Numbered point markers for specific issues |
| **Area** | Selection rectangles highlighting regions needing work |
| **Arrow** | Directional indicators showing desired movement/flow |
| **Highlight** | Freehand emphasis marks |

Each annotation stores exact pixel coordinates and accepts individual feedback text.

## Drawing Tools

- Pen, Rectangle, Circle, Arrow, Text, Eraser
- Multi-page support for complex mockups
- Independent undo/redo per page
- Image import capability

## Data Structure Sent to Claude

```json
{
  "hookSpecificOutput": {
    "showme": {
      "pages": [{
        "id": "page-1",
        "name": "Homepage",
        "imagePath": "/tmp/showme-page1.png",
        "width": 1920,
        "height": 1080,
        "annotations": [{
          "id": "ann-1",
          "type": "pin",
          "number": 1,
          "bounds": {"x": 452, "y": 128, "width": 0, "height": 0},
          "feedback": "Button needs 16px margin-right"
        }]
      }],
      "globalNotes": "Overall feedback for the entire mockup"
    }
  }
}
```

Images save to temporary PNG files rather than base64 encoding to avoid stdout bloat.

## Installation

**Prerequisites:** Bun runtime

```bash
git clone https://github.com/yaronbeen/ShowMe.git
cd ShowMe
bun install
bun run dev
```

## Hook Configuration

The tool integrates via `hooks/hooks.json`:

```json
{
  "matcher": {
    "type": "Skill",
    "skill_name": "showme"
  },
  "hooks": [{
    "type": "command",
    "command": "bun run server/index.ts",
    "timeout": 300
  }]
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Z/Y` | Undo/Redo |
| `Ctrl + V` | Paste screenshot |
| `Ctrl + Mouse Wheel` | Zoom canvas |
| `Space + Drag` | Pan canvas |
| `Delete` | Remove annotation |

## Technical Stack

- **Server:** Bun runtime (TypeScript)
- **Frontend:** Canvas-based drawing application
- **Languages:** TypeScript (71.8%), CSS (14.9%), HTML (11.1%)

## Relevance for Mockup Analysis Skill

ShowMe provides a pattern for:
1. **Structured image input** - Coordinates and annotations
2. **Multi-page support** - Handle complex mockups
3. **Hook integration** - Launch external tools from Claude Code
4. **Precise feedback** - Coordinate-aware communication

This could be adapted for a mockup analysis skill that:
- Accepts annotated screenshots
- Extracts component boundaries
- Generates user stories based on identified elements

## License

MIT
