# Data Model: Notion Integration Enhancement

**Feature**: Notion Integration Enhancement
**Date**: 2025-09-27
**Branch**: `001-save-to-notion`

## Overview
This document defines the data entities and relationships for enhancing the Notion integration feature. The model extends the existing WebClip Assistant data structures with comprehensive field mapping, validation, and configuration management.

## Core Entities

### 1. NotionConfiguration
Represents the user's Notion integration settings and configuration.

**Fields**:
- `integrationToken` (string, required): Notion API integration token
- `databaseId` (string, required): Target Notion database ID
- `fieldMapping` (FieldMapping, required): Configuration for mapping extension fields to Notion properties
- `connectionStatus` (enum: 'disconnected' | 'connected' | 'error'): Current connection state
- `lastTested` (timestamp): Last successful connection test timestamp
- `validationResults` (ValidationResult[]): Results of the last configuration validation

**Validation Rules**:
- `integrationToken`: Must match Notion token format (starts with 'secret_')
- `databaseId`: Must be valid Notion database ID format
- `fieldMapping`: Must reference valid Notion property types

### 2. FieldMapping
Configuration for mapping extension fields to Notion database properties.

**Fields**:
- `title` (string): Name of Notion title property (default: "Name")
- `url` (string): Name of Notion URL property (default: "URL")
- `tags` (string): Name of Notion multi-select property (default: "Tags")
- `content` (string): Name of Notion rich text property (default: "Page Content")
- `customMappings` (Object[]): Additional field mappings beyond defaults

**Validation Rules**:
- All mapped property names must exist in target Notion database
- Property types must match expected data types (title, URL, multi-select, rich_text)
- Required properties must be mapped (title, content)

### 3. ValidationResult
Represents the result of validating Notion configuration against database schema.

**Fields**:
- `isValid` (boolean): Overall validation status
- `errors` (ValidationError[]): List of validation errors
- `warnings` (ValidationWarning[]): List of validation warnings
- `databaseSchema` (DatabaseSchema): Retrieved Notion database schema

### 4. ValidationError
Detailed information about configuration validation failures.

**Fields**:
- `field` (string): Field that failed validation
- `message` (string): Human-readable error message
- `severity` (enum: 'error' | 'warning'): Error severity level
- `suggestion` (string): Suggested fix for the error

### 5. DatabaseSchema
Represents the structure of a Notion database for validation and mapping.

**Fields**:
- `id` (string): Database ID
- `title` (string): Database title
- `properties` (Property[]): Available properties in the database
- `createdTime` (timestamp): Database creation timestamp
- `lastEditedTime` (timestamp): Last modification timestamp

### 6. Property
Represents a single property in a Notion database.

**Fields**:
- `id` (string): Property ID
- `name` (string): Property display name
- `type` (enum: 'title' | 'url' | 'multi_select' | 'rich_text' | 'text' | 'number' | 'select' | 'date' | 'people' | 'files' | 'checkbox' | 'phone' | 'email' | 'formula' | 'relation' | 'rollup' | 'created_time' | 'created_by' | 'last_edited_time' | 'last_edited_by'): Property type
- `required` (boolean): Whether this property is required

## Data Flow

### Configuration Flow
```
User Input → Validation → Storage → Connection Test → Usage
     ↓           ↓          ↓            ↓           ↓
Settings UI → FieldMapping → Chrome Local → Notion API → Save Operation
```

### Save Operation Flow
```
Web Clip Data → Field Mapping → API Request → Response → User Feedback
      ↓            ↓           ↓           ↓          ↓
Popup Data → NotionFormat → Notion API → Result → Toast Notification
```

## State Management

### Chrome Storage Schema
```javascript
{
  "notionConfig": {
    "integrationToken": "secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "databaseId": "12345678-1234-1234-1234-123456789012",
    "fieldMapping": {
      "title": "Name",
      "url": "URL",
      "tags": "Tags",
      "content": "Page Content"
    },
    "connectionStatus": "connected",
    "lastTested": "2025-09-27T10:30:00.000Z"
  }
}
```

### In-Memory State
```javascript
// Popup Manager
{
  currentData: { /* Web clip data */ },
  settings: { /* User settings including notionConfig */ },
  isLoading: false,
  notionStatus: 'idle' | 'validating' | 'saving' | 'success' | 'error'
}

// Settings Manager
{
  formData: { /* Current form data */ },
  validationResults: { /* Validation state */ },
  isDirty: false,
  isTesting: false
}
```

## Validation Rules

### Field Mapping Validation
1. **Property Existence**: All mapped properties must exist in target database
2. **Type Compatibility**: Mapped properties must support the expected data type
3. **Required Fields**: Title and content properties must be mapped
4. **Name Uniqueness**: Property names must be unique within database

### Configuration Validation
1. **Token Format**: Must be valid Notion integration token
2. **Database Access**: Token must have access to specified database
3. **Permission Level**: Token must have sufficient permissions for create operations
4. **Rate Limits**: Must respect Notion API rate limits

### Data Validation (Pre-Save)
1. **Title Length**: Must fit within Notion title property constraints (typically 100 chars)
2. **URL Format**: Must be valid URL format
3. **Tag Format**: Tags must be valid multi-select option names
4. **Content Length**: Must respect Notion rich text property limits

## API Integration

### Notion API Request Structure
```javascript
{
  "parent": { "database_id": "database-id" },
  "properties": {
    "Name": { "title": [{ "text": { "content": "Page Title" } }] },
    "URL": { "url": "https://example.com" },
    "Tags": { "multi_select": [{ "name": "tag1" }, { "name": "tag2" }] },
    "Page Content": { "rich_text": [{ "text": { "content": "Content text" } }] }
  }
}
```

### Response Handling
- **Success**: Return created page ID and metadata
- **Validation Error**: Return detailed field validation errors
- **Authentication Error**: Return clear token configuration error
- **Rate Limit Error**: Return retry recommendation
- **Network Error**: Return connection failure with retry option

## Error Handling

### Error Types
1. **ConfigurationError**: Invalid Notion configuration
2. **ValidationError**: Data validation failure
3. **APIError**: Notion API request failure
4. **NetworkError**: Network connectivity issues
5. **PermissionError**: Insufficient API permissions

### Error Recovery
- **Configuration Issues**: Guide user to settings page
- **Validation Issues**: Show specific field errors and suggestions
- **API Issues**: Provide retry mechanism and status updates
- **Network Issues**: Show offline status and retry when connection restored

## Migration Considerations

### From Current Implementation
- Existing basic configuration will be preserved
- Field mapping will be added with sensible defaults
- Validation will be enhanced without breaking existing functionality
- User data migration is not required (additive changes only)

### Future Extensibility
- Field mapping structure supports additional custom mappings
- Validation system can accommodate new Notion property types
- Configuration schema can extend for additional integrations
- Error handling framework supports new error types

## Security Considerations

### Data Protection
- Integration tokens stored securely in Chrome local storage
- No token logging or exposure in error messages
- Configuration validation prevents accidental token exposure
- All API calls use HTTPS

### Privacy
- Notion configuration never synced across devices
- No telemetry or analytics on Notion usage
- User data remains under user's control
- Configuration can be easily cleared/reset

This data model provides a comprehensive foundation for implementing the enhanced Notion integration while maintaining compatibility with the existing WebClip Assistant codebase.