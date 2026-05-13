## ADDED Requirements

### Requirement: Custom command definition type

A `CustomCommand` type SHALL be defined for user-created slash commands.

#### Scenario: CustomCommand type
- **WHEN** CustomCommand type is defined
- **THEN** it SHALL have `name: string` (command name without `/`)
- **THEN** it SHALL have `description: string` (displayed in suggestions)
- **THEN** it SHALL have `prompt: string` (template text filled into input)

### Requirement: Commands auto-loaded from file system

Custom commands SHALL be defined as `.md` files in the book's `.super-author/commands/` directory, automatically discovered and loaded without a settings UI.

#### Scenario: Command file format
- **WHEN** a `.md` file exists in `.super-author/commands/`
- **THEN** it SHALL use YAML frontmatter with `name` and `description` fields
- **THEN** the markdown body SHALL be used as the prompt template
- **THEN** the file SHALL be parsed by ConfigService.loadCommandsFromDir()

#### Scenario: Commands loaded on book open
- **WHEN** user opens a book
- **THEN** agentStore.reloadCommands(bookDir) SHALL be called
- **THEN** all `.md` files in `{bookDir}/.super-author/commands/` SHALL be parsed
- **THEN** valid commands SHALL be registered in CommandRegistry via registerCustom()

#### Scenario: Default command files on book creation
- **WHEN** a new book is created via BookRepository.createBook()
- **THEN** default command files (continue.md, polish.md, outline.md) SHALL be written to `.super-author/commands/`

#### Scenario: Missing commands directory
- **WHEN** the `.super-author/commands/` directory does not exist
- **THEN** loadCommandsFromDir() SHALL return an empty array
- **THEN** no custom commands SHALL be registered

### Requirement: Custom command execution (fill mode)

When user selects a custom command from CommandSuggestions, the prompt template SHALL be filled into the input area.

#### Scenario: Select custom command fills prompt
- **WHEN** user selects a custom command from CommandSuggestions
- **THEN** the prompt template SHALL be inserted into the AgentInput textarea
- **THEN** the user SHALL be able to edit the text before sending
- **THEN** the `/command` text SHALL be replaced by the prompt

#### Scenario: Custom command with cursor placeholder
- **WHEN** prompt template contains `{cursor}`
- **THEN** the cursor SHALL be positioned at the `{cursor}` marker after fill
- **THEN** `{cursor}` SHALL be removed from the final filled text
