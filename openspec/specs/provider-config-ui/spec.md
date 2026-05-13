## ADDED Requirements

### Requirement: Provider selection

User SHALL be able to switch between available AI providers (Claude, OpenAI) from the settings panel.

#### Scenario: Switch provider in settings
- **WHEN** user selects a different provider from the dropdown in settings
- **THEN** agentStore.setProviderConfig SHALL be called with the new provider id and name
- **THEN** model, models, maxTokens, temperature SHALL reset to defaults for the new provider
- **THEN** thinkingMode SHALL be set to false (OpenAI) or preserved (Claude)
- **THEN** ConfigService SHALL persist the updated config

### Requirement: API Key management

User SHALL be able to input, view (toggle masked/plain), and edit their API Key.

#### Scenario: Enter new API Key
- **WHEN** user types in the API Key input
- **THEN** agentStore.setProviderConfig SHALL be called with the updated apiKey value

#### Scenario: View masked API Key
- **WHEN** API Key is set and not in edit mode
- **THEN** the system SHALL display the key in masked format (first 3 chars + `***` + last 3 chars)
- **THEN** a [修改] button SHALL be shown to switch to edit mode

#### Scenario: Toggle key visibility
- **WHEN** user clicks [显示/隐藏] button on the API Key input
- **THEN** the input SHALL toggle between password (masked) and text (visible) modes

### Requirement: Base URL configuration

User SHALL be able to set a custom Base URL for the API endpoint.

#### Scenario: Enter Base URL
- **WHEN** user types in the Base URL input
- **THEN** agentStore.setProviderConfig SHALL be called with the updated baseUrl value
- **THEN** ConfigService SHALL persist the updated config

#### Scenario: Default Base URL
- **WHEN** Base URL is empty
- **THEN** the Provider SDK SHALL use its default endpoint
- **THEN** the input placeholder SHALL show the default URL hint (e.g., `https://api.anthropic.com` for Claude)

### Requirement: Model list management

User SHALL be able to manage a list of model names — add new models, remove existing ones, and view the currently active model.

#### Scenario: View model list
- **WHEN** Provider Configuration section renders
- **THEN** it SHALL display the current active model (highlighted)
- **THEN** it SHALL display all models in the `models` array as a list

#### Scenario: Add a new model
- **WHEN** user types a model name in the add-model input and presses Enter or clicks [添加]
- **THEN** the model SHALL be appended to the `models` array
- **THEN** agentStore.setProviderConfig SHALL persist the update

#### Scenario: Remove a model
- **WHEN** user clicks the delete button on a model entry
- **THEN** that model SHALL be removed from the `models` array
- **THEN** if the removed model was the active model, the first remaining model SHALL become the active one
- **THEN** agentStore.setProviderConfig SHALL persist the update

#### Scenario: Cannot remove last model
- **WHEN** user attempts to delete the only remaining model in the list
- **THEN** the delete button SHALL be disabled
- **THEN** no changes SHALL be made to the list

#### Scenario: Activate a model from list
- **WHEN** user clicks a model entry in the model list
- **THEN** agentStore.setProviderConfig SHALL be called with `{ model: selectedModel }`
- **THEN** the selected model SHALL be highlighted as active

### Requirement: Max Tokens configuration

User SHALL be able to set the max_tokens / context window limit.

#### Scenario: Set Max Tokens
- **WHEN** user adjusts the Max Tokens number input
- **THEN** agentStore.setProviderConfig SHALL be called with the updated maxTokens value
- **THEN** ConfigService SHALL persist the update

#### Scenario: Default value
- **WHEN** Max Tokens is not set
- **THEN** the Provider SHALL use its SDK default (Claude: 8192, OpenAI: 4096)

### Requirement: Temperature configuration

User SHALL be able to set the temperature for AI responses.

#### Scenario: Set Temperature
- **WHEN** user adjusts the Temperature number input (range 0-2, step 0.1)
- **THEN** agentStore.setProviderConfig SHALL be called with the updated temperature value
- **THEN** ConfigService SHALL persist the update

#### Scenario: Default value
- **WHEN** Temperature is not set
- **THEN** default value of 0.7 SHALL be used

### Requirement: Thinking Mode toggle (Claude only)

When provider is Claude, user SHALL be able to enable/disable extended thinking mode.

#### Scenario: Enable thinking mode for Claude
- **WHEN** user toggles thinking mode ON while provider is Claude
- **THEN** agentStore.setProviderConfig SHALL be called with `{ thinkingMode: true }`
- **THEN** maxTokens SHALL be adjusted to at least 17000 if lower

#### Scenario: Disable thinking mode
- **WHEN** user toggles thinking mode OFF
- **THEN** agentStore.setProviderConfig SHALL be called with `{ thinkingMode: false }`
- **THEN** the system SHALL revert to normal response mode

#### Scenario: Thinking mode is disabled for OpenAI
- **WHEN** provider is OpenAI
- **THEN** the thinking mode toggle SHALL be disabled/grayed out with a tooltip "仅 Claude 支持"
- **THEN** thinkingMode SHALL be forced to false
