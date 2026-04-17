# OpenCode Tone & Voice Guide

This document defines the tone, voice, and style for all user-facing text in OpenCode.

## Core Principles

### 1. Concise & Direct

Messages are short, action-oriented, and get to the point immediately. Avoid unnecessary words.

```
Good: "Done"
Bad:  "The operation has been completed successfully!"

Good: "File not found: config.ts"
Bad:  "We were unable to locate the specified file at the given path."
```

### 2. Technical but Accessible

Use precise technical terms (LSP, MCP, agents) but provide context when needed. Assume users are developers but don't assume they know OpenCode-specific concepts.

```
Good: "Needs authentication (run: opencode mcp auth server-name)"
Bad:  "Auth required"  // Too vague
Bad:  "The Model Context Protocol server requires OAuth 2.0 authentication..."  // Too verbose
```

### 3. Lowercase UI Labels

Buttons, actions, and short labels use lowercase. This creates a calm, understated aesthetic.

```
Good: "ok", "confirm", "cancel", "delete"
Bad:  "OK", "Confirm", "Cancel", "Delete"
```

### 4. Keyboard-First

Always include keybind hints where applicable. Users should be able to discover functionality through the UI.

```
Good: "esc interrupt"
Good: "ctrl+x copy"
Good: "Press Ctrl+P to see all available actions"
```

### 5. Helpful Error Messages

Errors should explain what went wrong and suggest next steps when possible.

```
Good: "File not found: utils.ts\nDid you mean one of these?\n  - src/utils.ts\n  - lib/utils.ts"
Bad:  "File not found"

Good: "oldString not found in content"
Bad:  "Edit failed"
```

### 6. No Emojis

Avoid emojis in all user-facing text unless the user explicitly requests them. This maintains a professional, focused interface.

```
Good: "Session exported to transcript.md"
Bad:  "Session exported to transcript.md! 🎉"
```

### 7. Safety-Conscious Warnings

Be explicit about destructive or irreversible operations. Use clear, direct warnings.

```
Good: "NEVER run destructive/irreversible git commands (like push --force, hard reset)"
Good: "This will allow [permission] until OpenCode is restarted."
```

## UI Text Patterns

### Status Indicators

Use Unicode symbols for visual indicators, not emojis:

- `✓` - Success/enabled
- `○` - Disabled/inactive
- `•` - Bullet point
- `△` - Warning
- `⊙` - Active/selected
- `←` `→` - Navigation
- `⇆` - Toggle/select
- `↑↓` - Up/down navigation

### Counts & Pluralization

Handle singular/plural forms properly:

```
Good: "1 Permission" / "3 Permissions"
Good: "1 mcp server" / "2 mcp servers"
```

### Relative Time

Use concise relative time formats:

```
"just now"
"5m ago"
"2h ago"
"3d ago"
```

### Truncation Notices

When content is truncated, explain how to see more:

```
"(Output truncated at 51200 bytes. Use 'offset' parameter to read beyond line 500)"
"(File has more lines. Use 'offset' parameter to read beyond line 2000)"
"(click to expand)"
```

### Confirmation Patterns

For destructive actions, require explicit confirmation:

```
"Press [keybind] again to confirm"
"Are you sure you want to restore the reverted messages?"
```

## Toast Messages

Toasts should be brief and indicate success/failure clearly:

```
Good: "Message copied to clipboard!"
Good: "Failed to share session"
Good: "Session exported to transcript.md"
```

## Tips & Hints

Tips should be actionable and teach one thing at a time:

```
Good: "Type @ followed by a filename to fuzzy search and attach files"
Good: "Press Ctrl+X E or /editor to compose messages in your external editor"
Good: "Use /undo to revert the last message and file changes"
```

## Error Messages by Category

### File Operations

- `"File not found: [path]"`
- `"Cannot read binary file: [path]"`
- `"Path is a directory, not a file: [path]"`

### Edit Operations

- `"oldString not found in content"`
- `"oldString and newString must be different"`
- `"Found multiple matches for oldString. Provide more surrounding lines to identify the correct match."`

### Network Operations

- `"Request failed with status code: [N]"`
- `"Response too large (exceeds 5MB limit)"`
- `"Search request timed out"`

### Validation

- `"Invalid timeout value: [N]. Timeout must be a positive number."`
- `"pattern is required"`
- `"filePath is required"`

## Occasional Humor

Rare, subtle humor is acceptable in non-critical contexts:

```
"gemini is way too hot right now"  // Rate limit message
```

Keep humor:

- Infrequent
- Non-blocking (user can still proceed)
- Related to the situation
- Professional (no memes or references that may not age well)

## Command & Dialog Titles

Use sentence case for dialog titles and command names:

```
Good: "Select model", "Export Options", "Permission required"
Bad:  "SELECT MODEL", "EXPORT OPTIONS"
```

## Prompts & Placeholders

Placeholders should give concrete examples of what to type:

```
Good: "Ask anything... \"Fix a TODO in the codebase\""
Good: "Enter filename"
Good: "API key"
```

## Agent & Tool Descriptions

Tool descriptions follow a specific structure:

1. Start with the primary function
2. List capabilities as bullet points
3. Include usage notes with warnings for edge cases
4. Use "IMPORTANT:" prefix for critical information

```
- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns
```

## Keybind Format

Keybinds are displayed in lowercase with `+` joining modifiers:

```
Good: "ctrl+x", "ctrl+alt+g", "shift+enter"
Bad:  "Ctrl+X", "CTRL+ALT+G", "Shift+Enter"
```

When showing keybind hints inline:

```
"esc cancel"
"enter confirm"
"ctrl+f fullscreen"
"⇆ select"
```
