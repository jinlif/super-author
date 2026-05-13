## ADDED Requirements

### Requirement: Recursive directory tree view

The file explorer SHALL display the full directory tree of the currently opened book.

- **WHEN** a book is opened and the `files` activity is active
- **THEN** the sidebar SHALL render a recursive tree of all files and directories under the book directory

#### Scenario: Render directory tree

- **WHEN** a book is opened
- **THEN** the file explorer SHALL call `IFileService.readDir` recursively to build the tree
- **THEN** directories SHALL be collapsible/expandable by left-click
- **THEN** `.md` files SHALL open in the editor when left-clicked

### Requirement: System directory visual styling

System directories SHALL have distinct visual identifiers (icon and color).

| Directory | Icon | Color |
|---|---|---|
| `chapters/` | 📁 | Blue |
| `outline/` | 📋 | Green |
| `characters/` | 👤 | Purple |
| `.super-author/` | ⚙️ | Gray |

- **WHEN** the file explorer renders a system directory
- **THEN** it SHALL display the configured icon and color for that directory

#### Scenario: System directory icons

- **WHEN** `chapters/` is rendered in the tree
- **THEN** it SHALL display with a blue 📁 icon

#### Scenario: Super-author directory default collapsed

- **WHEN** the file explorer first loads
- **THEN** `.super-author/` SHALL be rendered in the default collapsed state

### Requirement: Right-click context menu

The file explorer SHALL provide a right-click context menu with directory-dependent actions.

- **WHEN** user right-clicks a directory or file in the explorer
- **THEN** a context menu SHALL appear with available actions

#### Scenario: Context menu on chapters directory

- **WHEN** user right-clicks on `chapters/`
- **THEN** the context menu SHALL show "新增卷" and "新增章节"

#### Scenario: Context menu on regular directory

- **WHEN** user right-clicks on a non-system directory
- **THEN** the context menu SHALL show "新建目录", "新建 .md 文件", and "删除"

#### Scenario: Context menu on .md file

- **WHEN** user right-clicks on a `.md` file
- **THEN** the context menu SHALL show "删除"

#### Scenario: Context menu on protected items

- **WHEN** user right-clicks on `book.json` or `.super-author/`
- **THEN** the context menu SHALL NOT appear

### Requirement: Create directory

The file explorer SHALL support creating new directories with name uniqueness validation.

- **WHEN** user selects "新建目录"
- **THEN** a prompt SHALL appear for the directory name
- **THEN** the system SHALL validate that no sibling directory or file has the same name
- **THEN** the system SHALL create the directory via `IFileService.createDir`

#### Scenario: Create directory with unique name

- **WHEN** user creates a new directory with name "灵感"
- **THEN** a directory `inspirations/` SHALL be created under the current parent

#### Scenario: Create directory with duplicate name

- **WHEN** user attempts to create a directory with a name that already exists at the same level
- **THEN** the system SHALL show an error message and NOT create the directory

### Requirement: Create .md file

The file explorer SHALL support creating new `.md` files.

- **WHEN** user selects "新建 .md 文件"
- **THEN** a prompt SHALL appear for the file title (without extension)
- **THEN** the system SHALL create a `.md` file with initial content `# {title}\n\n`
- **THEN** the system SHALL validate that no sibling file or directory has the same name

#### Scenario: Create .md file

- **WHEN** user creates a new .md file with title "世界设定"
- **THEN** a file `世界设定.md` SHALL be created with content `# 世界设定\n\n`

### Requirement: Delete nodes

The file explorer SHALL support deleting files and non-system directories.

- **WHEN** user selects "删除" on a file
- **THEN** the system SHALL delete the file after confirmation
- **WHEN** user selects "删除" on a non-system directory
- **THEN** the system SHALL recursively delete the directory after confirmation

#### Scenario: Delete file

- **WHEN** user deletes a `.md` file from a non-system directory
- **THEN** the file SHALL be removed from the file system and the tree SHALL update

#### Scenario: Delete volume

- **WHEN** user deletes a volume directory under `chapters/`
- **THEN** the volume and all its contents SHALL be deleted after confirmation
