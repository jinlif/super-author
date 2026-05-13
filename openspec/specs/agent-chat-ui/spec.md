## MODIFIED Requirements

### Requirement: Agent input area — removed all configuration controls

The AgentInput component SHALL be a pure chat input with slash command support, containing only the textarea, send/abort button, error display, temp chapter review bar, and CommandSuggestions popup.

#### Scenario: AgentInput renders without configuration
- **WHEN** AgentInput renders
- **THEN** the provider bar (`.agent-provider-bar`) SHALL NOT be present in the DOM
- **THEN** no configuration controls SHALL appear in the input area
- **THEN** CommandSuggestions popup SHALL be present (hidden initially)

### Requirement: AgentPanel header shows provider + model badge

The AgentPanel header SHALL display a compact badge indicating current provider name and active model name.

#### Scenario: Provider and model badge in header
- **WHEN** AgentPanel renders
- **THEN** the header SHALL display a badge with current provider name and model
- **THEN** the badge SHALL update reactively when provider config changes

### Requirement: Clear conversation button in header

The clear conversation 清空 button SHALL be displayed in the AgentPanel header.

#### Scenario: Clear conversation from header
- **WHEN** user clicks the 清空 button in AgentPanel header
- **THEN** agentStore.clearConversation() SHALL be called
- **THEN** all messages SHALL be cleared from the UI
