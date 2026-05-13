## ADDED Requirements

### Requirement: Unified data home directory

The system SHALL store all user data under `~/.superauthor/` directory.

- **WHEN** the application starts for the first time
- **THEN** it SHALL create `~/.superauthor/` directory with subdirectories: `books/`, `skills/`

#### Scenario: Create home directory on first launch

- **WHEN** application initializes and `~/.superauthor/` does not exist
- **THEN** the system SHALL create `~/.superauthor/` and its subdirectories

#### Scenario: Books directory structure

- **WHEN** a book is created under `~/.superauthor/books/`
- **THEN** the system SHALL create `{book}/chapters/`, `{book}/outline/`, `{book}/characters/`, and `{book}/.super-author/skills/`, `{book}/.super-author/commands/`

### Requirement: Non-configurable root path

The `~/.superauthor/` root path SHALL NOT be configurable by the user.

- **WHEN** any component attempts to read or write application data
- **THEN** all paths SHALL be derived from `~/.superauthor/`

#### Scenario: No baseDir setting

- **WHEN** the system is running
- **THEN** there SHALL be no UI or API to change the data root directory

### Requirement: ConfigService for path management

The system SHALL provide a `ConfigService` that centralizes all path derivation from the home directory.

- **WHEN** any module needs to read or write files in the application data directory
- **THEN** it SHALL use `ConfigService` to resolve the path

#### Scenario: Path derivation

- **WHEN** `ConfigService.booksDir` is accessed
- **THEN** it SHALL return `~/.superauthor/books/`
- **WHEN** `ConfigService.configPath` is accessed
- **THEN** it SHALL return `~/.superauthor/config.json`
