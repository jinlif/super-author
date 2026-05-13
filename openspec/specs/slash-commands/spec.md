## ADDED Requirements

### Requirement: Command detection in AgentInput

AgentInput SHALL detect when user input enters command mode (typing `/` at line start or after space) and show command suggestions.

#### Scenario: Detect / at line start
- **WHEN** user types `/` as the first character of a new message
- **THEN** the system SHALL enter command mode
- **THEN** CommandSuggestions popup SHALL appear above the input

#### Scenario: Detect / after space
- **WHEN** user types a space followed by `/` in the middle of text
- **THEN** the system SHALL enter command mode
- **THEN** CommandSuggestions popup SHALL appear

#### Scenario: Normal input without /
- **WHEN** user types text that does not contain `/` at line start or after space
- **THEN** the system SHALL NOT show CommandSuggestions
- **THEN** normal send behavior SHALL apply

#### Scenario: Exit command mode
- **WHEN** user presses Escape while CommandSuggestions is open
- **THEN** CommandSuggestions SHALL close
- **THEN** the `/` (and following characters) SHALL remain in the input as normal text

### Requirement: CommandSuggestions popup

A floating popup SHALL display a filtered list of available commands as the user types after `/`.

#### Scenario: Show all commands on /
- **WHEN** user types just `/` (no following characters)
- **THEN** CommandSuggestions SHALL display all registered commands
- **THEN** commands SHALL be grouped by category (builtin / custom / skill)

#### Scenario: Filter commands as user types
- **WHEN** user types more characters after `/` (e.g., `/mod`)
- **THEN** CommandSuggestions SHALL filter to commands whose name or description matches the typed text

#### Scenario: Navigate and select with keyboard
- **WHEN** CommandSuggestions is open
- **THEN** ↑ and ↓ keys SHALL navigate through the list
- **THEN** Enter SHALL select the highlighted command
- **THEN** the popup SHALL close after selection

#### Scenario: Select with click
- **WHEN** user clicks a command entry in CommandSuggestions
- **THEN** the corresponding action SHALL execute
- **THEN** the popup SHALL close

### Requirement: Built-in /model command

The `/model` built-in command SHALL be registered in CommandRegistry and trigger ModelPickerModal.

#### Scenario: /model triggers model picker
- **WHEN** user selects `/model` from CommandSuggestions (or types `/model` and presses Enter without selecting from popup)
- **THEN** ModelPickerModal SHALL open
- **THEN** the input content SHALL NOT be sent as a message

#### Scenario: ModelPickerModal renders model list
- **WHEN** ModelPickerModal opens
- **THEN** it SHALL display all models from `providerConfig.models` as a list
- **THEN** the currently active model (`providerConfig.model`) SHALL be marked with ✓

#### Scenario: Select model from modal
- **WHEN** user clicks a model entry in ModelPickerModal
- **THEN** `agentStore.setProviderConfig({ model: selectedModel })` SHALL be called
- **THEN** the modal SHALL close
- **THEN** the chat input SHALL be cleared

#### Scenario: Dismiss modal
- **WHEN** user presses Escape or clicks outside the modal
- **THEN** ModelPickerModal SHALL close
- **THEN** input content SHALL be preserved

### Requirement: CommandSuggestions visual design

CommandSuggestions SHALL match the VS Code dark theme.

#### Scenario: Popup styling
- **WHEN** CommandSuggestions renders
- **THEN** background SHALL be `#252526`, border `#3c3c3c`, border-radius 6px
- **THEN** each command entry SHALL show: name (bold), description (secondary color), category badge
- **THEN** hovered/selected entry SHALL have `background-color: #2a2d2e`
- **THEN** category badges SHALL use distinct colors: builtin=#007acc, custom=#4ec9b0, skill=#c586c0
- **THEN** popup SHALL be positioned above the input, min-width 320px

### Requirement: CommandRegistry

A CommandRegistry class SHALL manage all command registration and search.

#### Scenario: Register builtin commands
- **WHEN** CommandRegistry initializes
- **THEN** it SHALL register `/model` as a builtin command with action `modal`
- **THEN** it SHALL be ready to accept custom and skill command registrations

#### Scenario: Register custom commands
- **WHEN** `registerCustom(commands: CustomCommand[])` is called
- **THEN** each custom command SHALL be registered with category `custom` and action `fill`
- **THEN** existing custom commands SHALL be replaced (re-registration)

#### Scenario: Search commands
- **WHEN** `search(query: string)` is called with a partial name
- **THEN** it SHALL return all commands whose name includes the query (case-insensitive)
- **THEN** results SHALL be sorted: builtin first, then custom, then skill
