# Workflow Definitions Guide

## Overview

This guide explains how to retrieve all workflow definitions from Ingeniux CMS using the MCP server tools.

## Available Tool

### Workflow_ListWorkflowDefinitions

**Description:** GET /workflows/definitions - Lists all workflow definitions in the CMS

**Tool Name:** `Workflow_ListWorkflowDefinitions`

## Input Parameters

All parameters are optional:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ExcludePageCount` | boolean | No | Exclude page count from results |
| `PageSize` | integer | No | Number of results per page |
| `StartIndex` | integer | No | Starting index for pagination |

## Output Schema

The tool returns a paginated list with the following structure:

```json
{
	"Results": [
		{
			"Id": "string",
			"Name": "string", 
			"CreationUser": "string",
			"Created": "2024-01-01T00:00:00Z",
			"LastModifiedUser": "string",
			"LastModified": "2024-01-01T00:00:00Z",
			"EntityType": "string",
			"Archived": false,
			"Desc": "string",
			"PagesCount": 0,
			"InitialGroupIsEmpty": false
		}
	],
	"TotalResults": 0,
	"PageSize": 0,
	"NextIndex": 0
}
```

## Usage Examples

### Basic Usage

Get all workflow definitions:

```json
{
	"tool": "Workflow_ListWorkflowDefinitions"
}
```

### With Pagination

Get first 10 workflow definitions:

```json
{
	"tool": "Workflow_ListWorkflowDefinitions",
	"ExcludePageCount": false,
	"PageSize": 10,
	"StartIndex": 0
}
```

### Exclude Page Count

Get definitions without page counts for better performance:

```json
{
	"tool": "Workflow_ListWorkflowDefinitions",
	"ExcludePageCount": true
}
```

## Response Fields

| Field | Description |
|-------|-------------|
| `Id` | Unique workflow definition identifier |
| `Name` | Workflow definition name |
| `CreationUser` | User who created the workflow |
| `Created` | Creation timestamp |
| `LastModifiedUser` | User who last modified the workflow |
| `LastModified` | Last modification timestamp |
| `EntityType` | Type of entity |
| `Archived` | Whether the workflow is archived |
| `Desc` | Workflow description |
| `PagesCount` | Number of pages using this workflow |
| `InitialGroupIsEmpty` | Whether initial group is empty |

## Configuration

Ensure the tool is enabled in your MCP configuration:

```json
{
	"alwaysAllow": [
		"Workflow_ListWorkflowDefinitions"
	]
}
```

## Related Tools

- [`Workflow_GetWorkflowDefinitionDetail`](mcp-tools-generated/tools-19.json:1703) - Get detailed workflow definition
- [`Workflow_GetWorkflow`](mcp-tools-generated/tools-19.json:1031) - Get specific workflow instance
- [`Workflow_GetWorkstates`](mcp-tools-generated/tools-19.json:1448) - Get workflow states

## Error Handling

The tool follows standard MCP error patterns. Common issues:

- **Authentication Required:** Ensure OAuth token is valid
- **Permission Denied:** User must have workflow read permissions
- **Invalid Parameters:** Check parameter types and values

## Best Practices

1. Use pagination for large result sets
2. Set `ExcludePageCount: true` for better performance when page counts aren't needed
3. Cache results when appropriate to reduce API calls
4. Handle pagination properly using `NextIndex` and `TotalResults`