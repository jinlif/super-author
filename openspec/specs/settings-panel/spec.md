## ADDED Requirements

### Requirement: Settings panel renders as editor tab

When user clicks settings icon in ActivityBar, the EditorPanel SHALL open a settings tab in the editor area.

#### Scenario: Click settings icon opens settings tab
- **WHEN** user clicks settings (⚙️) icon in ActivityBar
- **THEN** editorStore.openSettings() SHALL be called
- **THEN** a new tab with type `'settings'` and filePath `'settings://'` SHALL be created in the editor tab bar
- **THEN** the EditorPanel SHALL render `<SettingsPanel />` instead of Monaco Editor for this tab
- **THEN** the tab SHALL display ⚙️ prefix and "设置" label

#### Scenario: Settings tab deduplication
- **WHEN** user clicks settings icon when a settings tab is already open
- **THEN** the existing settings tab SHALL be activated (no duplicate tab)

#### Scenario: Sidebar only shows FileExplorer
- **WHEN** Sidebar renders
- **THEN** it SHALL only display `<FileExplorer />`
- **THEN** no settings branch SHALL exist in Sidebar

### Requirement: Settings panel has extensible section structure

SettingsPanel SHALL use a section-based layout where each setting category is a separate child component.

#### Scenario: Settings panel renders sections
- **WHEN** SettingsPanel renders
- **THEN** it SHALL display a scrollable container with section dividers
- **THEN** each section SHALL have a section title label
- **THEN** the following sections SHALL render in order: Provider, API, Model Management, Parameters, Thinking Mode
- **THEN** Thinking Mode SHALL only render when provider is Claude
- **THEN** empty/unimplemented sections SHALL NOT render

### Requirement: Settings persist across sessions

All configuration changes made in the settings panel SHALL survive page reloads.

#### Scenario: Config persists after reload
- **WHEN** user modifies any setting in the settings panel
- **WHEN** page is reloaded
- **THEN** agentStore.init() SHALL restore the saved config
- **THEN** settings panel SHALL display the saved values
