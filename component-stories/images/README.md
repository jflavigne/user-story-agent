# Component Images

This directory should contain screenshots of all 5 components from the Figma file.

## Required Images

1. **FilterSheet.png** - Mobile bottom sheet (accordion with filters)
2. **FilterBar.png** - Desktop horizontal filter bar
3. **FilterGroup.png** - Category group with title and items
4. **FilterItem.png** - Single filter option (showing active/inactive states)
5. **SpinnerLoading.png** - Loading spinner animation

## How to Get Images

### Option 1: From This Conversation
The images were captured from Figma during the component analysis. Scroll up in this conversation to see the screenshots, then save them to this directory.

### Option 2: Directly from Figma
1. Open the [Figma file](https://www.figma.com/design/MHujefjiDpZQVpSQzE3pq1/Test_Component-Inventory?node-id=0-1&m=dev)
2. Navigate to each component section:
   - FilterSheet: Node ID `1:156`
   - FilterBar: Node ID `1:405`
   - FilterGroup: Node ID `1:459`
   - FilterItem: Node ID `1:498`
   - SpinnerLoading: Node ID `1:510`
3. Export each section as PNG (right-click → Export → PNG)
4. Save to this directory with the naming convention above

### Option 3: Use Figma API
Run this command from the project root (requires Figma access):

```bash
# You can use the mcp__figma__get_screenshot tool or similar to export programmatically
```

## Image Specifications

- **Format:** PNG
- **Resolution:** 2x for retina displays (recommended)
- **Background:** Include design background for context
- **Size:** Optimized for web (compress if needed)

## Once Images Are Added

Update the markdown files if needed to ensure image paths are correct:
- `![FilterSheet Component](./images/FilterSheet.png)`
- `![FilterBar Component](./images/FilterBar.png)`
- etc.
