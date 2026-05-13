## ADDED Requirements

### Requirement: Volume directory management

The `chapters/` directory SHALL support "卷" (volume) subdirectories for grouping chapters.

- **WHEN** user selects "新增卷" on `chapters/`
- **THEN** a new subdirectory SHALL be created with auto-generated numeric prefix

#### Scenario: Create first volume

- **WHEN** user creates a new volume named "黑暗森林"
- **THEN** a directory `01_黑暗森林/` SHALL be created under `chapters/`

#### Scenario: Create second volume

- **WHEN** user creates a second volume named "星际迷航" after "01_黑暗森林" exists
- **THEN** a directory `02_星际迷航/` SHALL be created under `chapters/`

#### Scenario: Delete volume

- **WHEN** user deletes a volume directory under `chapters/`
- **THEN** the system SHALL show a confirmation dialog listing all chapters in the volume
- **THEN** the system SHALL recursively delete the volume directory and all contained files

### Requirement: Chapter file creation

The `chapters/` directory SHALL support creating chapter `.md` files with auto-numbering.

- **WHEN** user selects "新增章节" inside `chapters/` root or inside a volume
- **THEN** a `.md` file SHALL be created with auto-generated numeric prefix

#### Scenario: Create chapter in volume

- **WHEN** user creates a chapter named "觉醒" inside `01_黑暗森林/` which has no chapters yet
- **THEN** a file `01-觉醒.md` SHALL be created inside `01_黑暗森林/`

#### Scenario: Create chapter in chapters root

- **WHEN** user creates a chapter named "序章" inside `chapters/` which has no files yet
- **THEN** a file `01-序章.md` SHALL be created directly under `chapters/`

#### Scenario: Auto-increment chapter number

- **WHEN** `01-觉醒.md` exists in a volume and user creates a new chapter named "探索"
- **THEN** a file `02-探索.md` SHALL be created in the same volume

### Requirement: Chapter numbering scope

Chapter numbering SHALL restart from `01` per volume.

- **WHEN** listing chapters across different volumes
- **THEN** each volume's chapters SHALL have their own independent numbering sequence

#### Scenario: Independent numbering

- **WHEN** volume `01_黑暗森林/` has `01-觉醒.md` and `02-危机.md`
- **THEN** volume `02_星际迷航/` SHALL start its first chapter at `01-相遇.md`
