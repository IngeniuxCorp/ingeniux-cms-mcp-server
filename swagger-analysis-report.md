# Swagger API Analysis Report

**API Title:** Ingeniux CMS WebAPI
**API Version:** 10.6.378
**Base URL:** /cxp4/api/v1
**Total Endpoints:** 396
**Authentication Required:** Yes
**Security Schemes:** JWT
**Description:** The following endpoints are part of the Ingeniux CMS 10.6.378.0 REST WebAPI

## Endpoints by HTTP Method

- **GET:** 232 endpoints
- **POST:** 89 endpoints
- **PUT:** 35 endpoints
- **DELETE:** 26 endpoints
- **PATCH:** 14 endpoints

## Endpoints by Category

### Analytics

**GET /api/v1/analytics/site-overview**
- Operation ID: Analytics_GetSiteOverview
- Parameters:
  - **pubTgtId** (query): string (required)
  - **startDate** (query): string (required)
  - **endDate** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/analytics/page-overview**
- Operation ID: Analytics_GetPageOverview
- Parameters:
  - **pageId** (query): string (required)
  - **pubTgtId** (query): string (required)
  - **startDate** (query): string (required)
  - **endDate** (query): string (required)
- Responses:
  - **200**: No description
  - **500**: When passing an invalid Publishing Target ID an ArgumentException is thrown

**GET /api/v1/analytics/report**
- Operation ID: Analytics_GetReport
- Parameters:
  - **pubTgtId** (query): string (required)
  - **reportTypeFullName** (query): string (required)
  - **pageId** (query): string (required)
  - **startDate** (query): string (required)
  - **endDate** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/analytics/google-analytic-authcode-flow**
- Operation ID: Analytics_GoogleAuthCodeFlow
- Parameters:
  - **pubtgt** (query): string (required)
  - **deviceCode** (query): string (required)
  - **interval** (query): integer (required)
- Responses:
  - **200**: No description
  - **500**: When passing an invalid Publishing Target ID an ArgumentException is thrown
or
When the specified Publishing Target doesn't have analytics enabled, or the provider enabled is not the Google Analytics provider, a TypeLoadException is thrown

**POST /api/v1/analytics/google-analytic-property-confirm**
- Operation ID: Analytics_GoogleConfirmProperty
- Parameters:
  - **pubtgt** (query): string (required)
  - **propertyId** (query): string (required)
  - **propertyName** (query): string (required)
- Responses:
  - **200**: No description
  - **500**: When passing an invalid Publishing Target ID an ArgumentException is thrown

**POST /api/v1/analytics/google-analytic-revoke-token**
- Operation ID: Analytics_GoogleRevokeToken
- Parameters:
  - **pubtgt** (query): string (required)
- Responses:
  - **200**: No description
  - **500**: When passing an invalid Publishing Target ID an ArgumentException is thrown

**POST /api/v1/analytics/device-verification**
- Operation ID: Analytics_GetDeviceVerificationResponse
- Parameters:
  - **pubtgt** (query): string (required)
- Responses:
  - **200**: No description
  - **500**: When passing an invalid Publishing Target ID an ArgumentException is thrown
or
When the specified Publishing Target doesn't have analytics enabled, or the provider enabled is not the Google Analytics provider, a TypeLoadException is thrown

### ContentUnits

**GET /api/v1/content-units/content-unit-preview-data**
- Operation ID: ContentUnits_GetContentUnitPreviewData
- Parameters:
  - **cuId** (query): string (required)
- Responses:
  - **200**: No description
  - **500**: When passing an invalid Content Unit ID an ArgumentException is thrown

**GET /api/v1/content-units/get-comp-unit-instances**
- Operation ID: ContentUnits_GetComponentUnitFragmentInstances
- Parameters:
  - **compUnitId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/content-units/get-comp-unit-content**
- Operation ID: ContentUnits_GetComponentUnitContent
- Parameters:
  - **compUnitId** (query): string (required)
- Responses:
  - **200**: No description
  - **500**: When passing an invalid Content Unit ID an ArgumentException is thrown

**PUT /api/v1/content-units/update-comp-unit-thumb**
- Operation ID: ContentUnits_UpdateComponentUnitThumbnail
- Parameters:
  - **tempAssetUrl** (query): string (required)
  - **contentUnitId** (query): string (required)
- Responses:
  - **200**: No description
  - **500**: When passing an invalid Content Unit ID an ArgumentException is thrown

**POST /api/v1/content-units/get-class-names-from-css**
- Operation ID: ContentUnits_GetClassNamesFromCss
- Parameters:
  - **input** (body): unknown (required)
- Responses:
  - **200**: No description

### Hooks

**GET /api/v1/hooks**
- Operation ID: Hooks_GetCustomHooks
- Responses:
  - **200**: No description
  - **500**: When the CustomHooks.cs file cannot be found an ArgumentException is thrown

**GET /api/v1/hooks/macros**
- Operation ID: Hooks_GetCustomMacros
- Responses:
  - **200**: No description
  - **500**: When an error is encountered retrieving the Custom Macros an ArgumentException is thrown

**POST /api/v1/hooks/macros**
- Operation ID: Hooks_ExecuteCustomMacro
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description
  - **500**: When an error is encountered running a Custom Macro an HttpResponseException is thrown

### IceComponentPicker

**GET /api/v1/dialogs/ice-comp-picker/get-ice-comp-types**
- Operation ID: IceComponentPicker_GetComponentSchemas
- Responses:
  - **200**: No description

**POST /api/v1/dialogs/ice-comp-picker/get-trays**
- Operation ID: IceComponentPicker_GetTrays
- Parameters:
  - **parameters** (body): unknown (required)
- Responses:
  - **200**: No description

**GET /api/v1/dialogs/ice-comp-picker/get-comp-thumb**
- Operation ID: IceComponentPicker_GetComponentThumb
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/dialogs/ice-comp-picker/get-list-page**
- Operation ID: IceComponentPicker_GetListPage
- Parameters:
  - **start** (query): integer (required)
  - **count** (query): integer (required)
  - **sort** (query): string (required)
  - **type** (query): string (required)
  - **name** (query): string (required)
  - **language** (query): string (required)
  - **includeCus** (query): boolean (required)
  - **includeComps** (query): boolean (required)
- Responses:
  - **200**: No description

### DITA

**GET /api/v1/dita/base**
- Operation ID: DITA_GetDITABaseInfo
- Responses:
  - **200**: No description

**GET /api/v1/dita/setup-info**
- Operation ID: DITA_GetDITASetupInfo
- Responses:
  - **200**: No description

**GET /api/v1/dita/output-formats**
- Operation ID: DITA_GetDITAOutputFormats
- Responses:
  - **200**: No description

**GET /api/v1/dita/ot-params-common**
- Operation ID: DITA_GetOTCommonParams
- Responses:
  - **200**: No description

**GET /api/v1/dita/ot-params-advanced**
- Operation ID: DITA_GetOTAdvancedParams
- Responses:
  - **200**: No description

**GET /api/v1/dita/ditavals**
- Operation ID: DITA_GetDITAVals
- Responses:
  - **200**: No description

**GET /api/v1/dita/aliases**
- Operation ID: DITA_GetDITAAliases
- Parameters:
  - **assetId** (query): string (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/dita/aliases**
- Operation ID: DITA_DeleteAliases
- Parameters:
  - **assetId** (query): string (required)
  - **aliasIds** (body): array (required)
- Responses:
  - **200**: No description
  - **500**: When attempting to delete non-root Aliases, ArgumentException is thrown

**PATCH /api/v1/dita/aliases**
- Operation ID: DITA_UpdateAliases
- Parameters:
  - **assetId** (query): string (required)
  - **aliasIds** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/dita/viewalias**
- Operation ID: DITA_ViewDITAAlias
- Parameters:
  - **aliasId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/dita/ditamaps**
- Operation ID: DITA_GetDITAMaps
- Parameters:
  - **start** (query): integer (required)
  - **end** (query): integer (required)
  - **sortField** (query): string (required)
  - **sortDescending** (query): boolean (required)
  - **filter** (query): string (required)
  - **advancedSearch** (body): unknown (required)
  - **includeRemoved** (query): boolean (optional)
- Responses:
  - **200**: No description
  - **500**: When no Publishing Targets setup at all in CMS, ConfigurationErrorsException is thrown

**GET /api/v1/dita/ditamaptree**
- Operation ID: DITA_GetDITAMapTree
- Parameters:
  - **mapId** (query): string (required)
  - **pubTarget** (query): string (optional)
- Responses:
  - **200**: No description
  - **500**: When no Publishing Targets setup at all in CMS, ConfigurationErrorsException is thrown
or
When Id of the DITA Map provided is invalid, ArgumentException is thrown

**GET /api/v1/dita/ditamap-detail**
- Operation ID: DITA_GetDITAMapDetails
- Parameters:
  - **mapId** (query): string (required)
  - **pubTarget** (query): string (optional)
- Responses:
  - **200**: No description
  - **500**: When no Publishing Targets setup at all in CMS, ConfigurationErrorsException is thrown

**GET /api/v1/dita/ditamap-detail-config**
- Operation ID: DITA_GetDITAMapDetailConfiguration
- Responses:
  - **200**: No description
  - **500**: When no Publishing Targets setup at all in CMS, ConfigurationErrorsException is thrown

**PUT /api/v1/dita/ditamap-detail-config**
- Operation ID: DITA_SetDITAMapDetailConfiguration
- Parameters:
  - **fields** (body): array (required)
  - **saveGlobally** (query): boolean (required)
- Responses:
  - **200**: No description
  - **500**: When any of the fields has a blank label, ArgumentNullException is thrown
or
When no Publishing Targets setup at all in CMS, ConfigurationErrorsException is thrown
or
When "saveGlobally" is true, and current user is not an administrator, InvalidOperationException is thrown

**PUT /api/v1/dita/setup-setting**
- Operation ID: DITA_PutSetting
- Parameters:
  - **settingName** (query): string (required)
  - **settingValue** (query): string (required)
- Responses:
  - **200**: No description

**PUT /api/v1/dita/output-format-norm**
- Operation ID: DITA_SetNormalizationFormat
- Parameters:
  - **formatString** (query): string (required)
  - **name** (query): string (required)
- Responses:
  - **200**: No description

**PUT /api/v1/dita/output-format-static**
- Operation ID: DITA_SetStaticFormat
- Parameters:
  - **formatString** (query): string (required)
  - **name** (query): string (optional)
  - **selected** (query): boolean (optional)
- Responses:
  - **200**: No description

**PUT /api/v1/dita/localized-render-schema**
- Operation ID: DITA_SetLocalizedRenderSchema
- Parameters:
  - **schema** (body): unknown (required)
- Responses:
  - **200**: No description
  - **500**: An error occurred updating the localized render schema

**DELETE /api/v1/dita/remove-localized-render-schema**
- Operation ID: DITA_RemoveLocalizedRenderSchema
- Parameters:
  - **locale** (query): string (required)
- Responses:
  - **200**: No description
  - **500**: An error occurred removing the localized render schema

**PUT /api/v1/dita/ot-param**
- Operation ID: DITA_SetOTParamValue
- Parameters:
  - **param** (body): unknown (required)
- Responses:
  - **200**: No description
  - **500**: If the parameter name is not valid according to DITA-OT specs, ArgumentException is thrown

**PUT /api/v1/dita/ot-params**
- Operation ID: DITA_AddOTParams
- Parameters:
  - **otParams** (body): array (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/dita/ot-params**
- Operation ID: DITA_RemoveOTParams
- Parameters:
  - **otParams** (body): array (required)
- Responses:
  - **200**: No description

**PATCH /api/v1/dita/ditaval-manipulation**
- Operation ID: DITA_ManipulateDITAVals
- Parameters:
  - **operation** (body): unknown (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/dita/remove-ditamap**
- Operation ID: DITA_RemoveDitaMapCollection
- Parameters:
  - **mapId** (query): string (required)
- Responses:
  - **200**: No description
  - **500**: When no Publishing Targets setup at all in CMS, ConfigurationErrorsException is thrown
or
If any Assets in the DITA Map collection, including the map itself, is dependent of another DITA Asset, InvalidOperationException is thrown

**PUT /api/v1/dita/mark-ditamap**
- Operation ID: DITA_MarkPublishDitaMapCollection
- Parameters:
  - **mapId** (query): string (required)
  - **marking** (body): array (required)
- Responses:
  - **200**: No description
  - **500**: When any of the Asset were never checked in before and not ready to be marked for publish

**POST /api/v1/dita/checkout-ditamap**
- Operation ID: DITA_CheckoutDitaMapCollection
- Parameters:
  - **mapId** (query): string (required)
- Responses:
  - **200**: No description
  - **500**: When Asset not in workflow, and current user doesn't have the permission to take over content assigned to other users.
or
When Asset in workflow, and current user is not a member in the workflow's current group.

**POST /api/v1/dita/checkin-ditamap**
- Operation ID: DITA_CheckInDitaMapCollection
- Parameters:
  - **mapId** (query): string (required)
  - **pubTgtIds** (body): array (required)
- Responses:
  - **200**: No description
  - **500**: When any Asset has required fields not filled in before check in, ContentFieldFieldValidationException is thrown

**POST /api/v1/dita/publish-ditamap**
- Operation ID: DITA_PublishDITAMap
- Parameters:
  - **ditaPubParams** (body): unknown (required)
- Responses:
  - **200**: No description
  - **500**: When any Assets in the collection is checked out, InvalidOperationException is thrown

**GET /api/v1/dita/dita-maps-csv**
- Operation ID: DITA_DownloadDITAMapsCsv
- Responses:
  - **200**: No description
  - **500**: When no Publishing Targets setup at all in CMS, ConfigurationErrorsException is thrown

**GET /api/v1/dita/download-ditamap**
- Operation ID: DITA_DownloadMap
- Parameters:
  - **mapId** (query): string (required)
  - **publishingTargetId** (query): string (optional)
- Responses:
  - **200**: No description
  - **500**: When no Publishing Targets setup at all in CMS, or DITA Root not set or doesn't exist, ConfigurationErrorsException is thrown
or
When DITAMap Asset doens't exist, ArgumentException is thrown

### Configuration

**GET /api/v1/configuration/help-text**
- Operation ID: Configuration_GetHelpText
- Parameters:
  - **schemaId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/configuration/ai-help-text**
- Operation ID: Configuration_GetAIHelpText
- Parameters:
  - **schemaId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/configuration/help-text-by-content-item**
- Operation ID: Configuration_GetHelpTextByContentItem
- Parameters:
  - **contentItemId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/configuration/help-texts**
- Operation ID: Configuration_GetAllHelpText
- Responses:
  - **200**: No description

**GET /api/v1/configuration/pages/context-menu**
- Operation ID: Configuration_GetPageContextMenuConfiguration
- Responses:
  - **200**: No description

**GET /api/v1/configuration/assets/context-menu**
- Operation ID: Configuration_GetAssetContextMenuConfiguration
- Responses:
  - **200**: No description

**GET /api/v1/configuration/legacy-globals**
- Operation ID: Configuration_GetLegacyGlobals
- Responses:
  - **200**: No description

**GET /api/v1/configuration/flag**
- Operation ID: Configuration_GetFlag
- Parameters:
  - **locale** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/configuration/global-custom-tabs**
- Operation ID: Configuration_GetGlobalCustomTabs
- Responses:
  - **200**: No description

### InsiteSearch

**GET /api/v1/insite-search/custom-settings**
- Operation ID: InsiteSearch_GetCustomSettings
- Parameters:
  - **pubTgtId** (query): string (optional)
- Responses:
  - **200**: No description

**POST /api/v1/insite-search/custom-settings**
- Operation ID: InsiteSearch_SaveCustomSettings
- Parameters:
  - **pubTgtId** (query): string (required)
  - **data** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/insite-search/batch-sizes**
- Operation ID: InsiteSearch_GetBatchSizes
- Parameters:
  - **isAsset** (query): boolean (required)
- Responses:
  - **200**: No description

**POST /api/v1/insite-search/batch-sizes**
- Operation ID: InsiteSearch_SaveBatchSizes
- Parameters:
  - **isAsset** (query): boolean (required)
  - **defaultSize** (query): integer (required)
  - **data** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/insite-search/keymatches**
- Operation ID: InsiteSearch_GetKeymatches
- Responses:
  - **200**: No description

**POST /api/v1/insite-search/keymatches**
- Operation ID: InsiteSearch_SaveKeymatches
- Parameters:
  - **data** (body): array (required)
- Responses:
  - **200**: No description

**POST /api/v1/insite-search/import-csv**
- Operation ID: InsiteSearch_ImportCsv
- Responses:
  - **200**: No description

**GET /api/v1/insite-search/synonyms**
- Operation ID: InsiteSearch_GetSynonyms
- Responses:
  - **200**: No description

**POST /api/v1/insite-search/synonyms**
- Operation ID: InsiteSearch_SaveSynonyms
- Parameters:
  - **data** (body): array (required)
- Responses:
  - **200**: No description

**POST /api/v1/insite-search/import-synonyms**
- Operation ID: InsiteSearch_ImportSynonyms
- Responses:
  - **200**: No description

**GET /api/v1/insite-search/indexing-schemas**
- Operation ID: InsiteSearch_GetIndexingSchemas
- Parameters:
  - **pubTgtId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/insite-search/indexing-schemas**
- Operation ID: InsiteSearch_SaveIndexingSchemas
- Parameters:
  - **pubTgtId** (query): string (required)
  - **data** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/insite-search/indexing-schemas-only**
- Operation ID: InsiteSearch_GetIndexingSchemasOnly
- Parameters:
  - **pubTgtId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/insite-search/indexing-fields**
- Operation ID: InsiteSearch_GetIndexingFieldsForSchema
- Parameters:
  - **pubTgtId** (query): string (required)
  - **schemaId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/insite-search/indexing-fields**
- Operation ID: InsiteSearch_SaveIndexingFields
- Parameters:
  - **pubTgtId** (query): string (required)
  - **schemaId** (query): string (required)
  - **data** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/insite-search/sitewide-indexing-fields**
- Operation ID: InsiteSearch_GetIndexingSiteWideFields
- Parameters:
  - **pubTgtId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/insite-search/site-wide-indexing-fields**
- Operation ID: InsiteSearch_SaveSiteWideIndexingFields
- Parameters:
  - **pubTgtId** (query): string (required)
  - **data** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/insite-search/assetfolder-children**
- Operation ID: InsiteSearch_GetAssetFolderChildren
- Parameters:
  - **assetFolderId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/insite-search/indexed-asset-folders**
- Operation ID: InsiteSearch_GetIndexedAssetFolders
- Parameters:
  - **pubTgtId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/insite-search/asset-folders-detail**
- Operation ID: InsiteSearch_GetAssetFolderDetail
- Parameters:
  - **assetFolderId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/insite-search/indexing-asset-folders**
- Operation ID: InsiteSearch_SaveIndexingAssetFolders
- Parameters:
  - **pubTgtId** (query): string (required)
  - **data** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/insite-search/boost-schemas**
- Operation ID: InsiteSearch_GetBoostSchemas
- Parameters:
  - **pubTgtId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/insite-search/boost-schemas**
- Operation ID: InsiteSearch_SaveBoostSchemas
- Parameters:
  - **pubTgtId** (query): string (required)
  - **data** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/insite-search/boost-fields**
- Operation ID: InsiteSearch_GetBoostFieldsForSchema
- Parameters:
  - **pubTgtId** (query): string (required)
  - **schemaId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/insite-search/boost-fields**
- Operation ID: InsiteSearch_SaveBoostFieldsForSchema
- Parameters:
  - **pubTgtId** (query): string (required)
  - **schemaId** (query): string (required)
  - **data** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/insite-search/sitewide-boost-fields**
- Operation ID: InsiteSearch_GetBoostSiteWideFields
- Parameters:
  - **pubTgtId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/insite-search/site-wide-boost-fields**
- Operation ID: InsiteSearch_SaveSiteWideBoostFields
- Parameters:
  - **pubTgtId** (query): string (required)
  - **data** (body): array (required)
- Responses:
  - **200**: No description

**POST /api/v1/insite-search/apply-to-target**
- Operation ID: InsiteSearch_ApplyToTargets
- Parameters:
  - **curPubTgtId** (query): string (required)
  - **pubTgtIds** (body): array (required)
- Responses:
  - **200**: No description

### L10N

**GET /api/v1/L10N/stats**
- Operation ID: L10N_GetLocalizationStats
- Responses:
  - **200**: No description

**GET /api/v1/L10N/page-schemas**
- Operation ID: L10N_GetPageSchemas
- Parameters:
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/L10N/component-schemas**
- Operation ID: L10N_GetComponentSchemas
- Parameters:
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/L10N/asset-schemas**
- Operation ID: L10N_GetAssetSchemas
- Parameters:
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/L10N/pcrs**
- Operation ID: L10N_GetPCRs
- Parameters:
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/L10N/workflow-definitions**
- Operation ID: L10N_GetWorkflowDefinitions
- Parameters:
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/L10N/workstates**
- Operation ID: L10N_GetWorkstates
- Parameters:
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

### Logs

**GET /api/v1/logs/cms**
- Operation ID: Logs_GetCMSLog
- Parameters:
  - **sort** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/logs/cms/file**
- Operation ID: Logs_GetCMSLogFile
- Responses:
  - **200**: No description

**GET /api/v1/logs/cms/archive**
- Operation ID: Logs_GetCMSLogArchives
- Responses:
  - **200**: No description

### Notifications

**GET /api/v1/notifications/contentfreeze**
- Operation ID: Notifications_GetContentFreeze
- Responses:
  - **200**: No description

**GET /api/v1/notifications/alerts**
- Operation ID: Notifications_GetAlerts
- Parameters:
  - **all** (query): boolean (optional)
- Responses:
  - **200**: No description

### Dashboard

**GET /api/v1/dashboard/overview**
- Operation ID: Dashboard_GetOverview
- Responses:
  - **200**: No description

**GET /api/v1/dashboard/online-users**
- Operation ID: Dashboard_GetOnlineUsers
- Parameters:
  - **count** (query): integer (optional)
- Responses:
  - **200**: No description

**POST /api/v1/dashboard/comment**
- Operation ID: Dashboard_PostComment
- Parameters:
  - **comment** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/dashboard/activity-stream**
- Operation ID: Dashboard_GetActivityStream
- Parameters:
  - **count** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/dashboard/analytic_traffic-data**
- Operation ID: Dashboard_GetAnalyticTrafficData
- Parameters:
  - **pubTgtId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/dashboard/analytic_medium-data**
- Operation ID: Dashboard_GetAnalyticMediumData
- Parameters:
  - **pubTgtId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/dashboard/production-data**
- Operation ID: Dashboard_GetProductionData
- Parameters:
  - **pubTgtId** (query): string (optional)
  - **startDate** (query): string (optional)
  - **endDate** (query): string (optional)
- Responses:
  - **200**: No description

### Entity

**GET /api/v1/documents**
- Operation ID: Entity_Get
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**PATCH /api/v1/documents/archive**
- Operation ID: Entity_Archive
- Parameters:
  - **entityId** (query): string (required)
- Responses:
  - **200**: No description

**PATCH /api/v1/documents/unarchive**
- Operation ID: Entity_UnArchive
- Parameters:
  - **entityId** (query): string (required)
- Responses:
  - **200**: No description

### Themes

**GET /api/v1/themes/theme**
- Operation ID: Themes_Get
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**PUT /api/v1/themes/theme**
- Operation ID: Themes_Update
- Parameters:
  - **input** (body): unknown (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/themes/theme**
- Operation ID: Themes_Delete
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/themes/less**
- Operation ID: Themes_Less
- Parameters:
  - **id** (query): string (required)
  - **download** (query): boolean (optional)
- Responses:
  - **200**: No description

**GET /api/v1/themes/scss**
- Operation ID: Themes_Scss
- Parameters:
  - **id** (query): string (required)
  - **download** (query): boolean (optional)
- Responses:
  - **200**: No description

**GET /api/v1/themes**
- Operation ID: Themes_List
- Parameters:
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**POST /api/v1/themes**
- Operation ID: Themes_Create
- Parameters:
  - **name** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/themes/default**
- Operation ID: Themes_SetDefault
- Parameters:
  - **themeId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/themes/upload**
- Operation ID: Themes_Upload
- Responses:
  - **200**: No description

### PCR

**GET /api/v1/pcr/info**
- Operation ID: PCR_ListPCRInfo
- Parameters:
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/pcr**
- Operation ID: PCR_GetPCRInfo
- Parameters:
  - **ruleId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/pcr**
- Operation ID: PCR_CreatePCRInfo
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**PUT /api/v1/pcr**
- Operation ID: PCR_SetPCRInfo
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/pcr**
- Operation ID: PCR_RemovePCRInfo
- Parameters:
  - **pcrId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/pcr/parents**
- Operation ID: PCR_GetPCRParents
- Parameters:
  - **RuleId** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/pcr/parentpages**
- Operation ID: PCR_GetPCRParentPages
- Parameters:
  - **ruleId** (query): string (required)
  - **pageId** (query): string (optional)
- Responses:
  - **200**: No description

**GET /api/v1/pcr/childpages**
- Operation ID: PCR_GetPCRChildPages
- Parameters:
  - **pageId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/pcr/details**
- Operation ID: PCR_GetPCRDetails
- Parameters:
  - **pcrId** (query): string (required)
- Responses:
  - **200**: No description

### Preview

**GET /api/v1/preview/page-xml**
- Operation ID: Preview_GetPageXml
- Parameters:
  - **pageId** (query): string (required)
  - **version** (query): integer (optional)
  - **checkedOut** (query): boolean (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/page**
- Operation ID: Preview_GetPage
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/preview/page-descendants**
- Operation ID: Preview_GetPageDescendants
- Parameters:
  - **id** (query): string (required)
  - **depth** (query): integer (optional)
  - **maxCount** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/page-map-by-path**
- Operation ID: Preview_GetPageMapEntryByPath
- Parameters:
  - **path** (query): string (required)
  - **pubTargetId** (query): string (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/page-map**
- Operation ID: Preview_GetPageMapEntry
- Parameters:
  - **pageId** (query): string (required)
  - **pubTargetId** (query): string (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/asset-map**
- Operation ID: Preview_GetAssetMapEntry
- Parameters:
  - **id** (query): string (required)
  - **pubTargetId** (query): string (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/asset-descendants**
- Operation ID: Preview_GetAssetDescendants
- Parameters:
  - **id** (query): string (required)
  - **depth** (query): integer (optional)
  - **maxCount** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/asset-map-by-path**
- Operation ID: Preview_GetAssetMapEntryByPath
- Parameters:
  - **path** (query): string (required)
  - **pubTargetId** (query): string (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/page-reference**
- Operation ID: Preview_GetPageReference
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/preview/asset-reference**
- Operation ID: Preview_GetAssetReference
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/preview/asset-xmp**
- Operation ID: Preview_GetAssetXMP
- Parameters:
  - **id** (query): string (required)
  - **version** (query): integer (optional)
  - **checkedOut** (query): boolean (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/asset-file**
- Operation ID: Preview_GetAssetFile
- Parameters:
  - **assetId** (query): string (required)
  - **version** (query): integer (optional)
  - **checkedOut** (query): boolean (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/taxonomy**
- Operation ID: Preview_GetTaxonomyCategory
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/preview/taxonomy-by-page**
- Operation ID: Preview_GetTaxonomyCategoriesByPage
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/preview/taxonomy-by-asset**
- Operation ID: Preview_GetTaxonomyCategoriesByAsset
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/preview/taxonomy-descendants**
- Operation ID: Preview_GetTaxonomyCategoryDescendants
- Parameters:
  - **id** (query): string (required)
  - **depth** (query): integer (optional)
  - **maxCount** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/global-exports**
- Operation ID: Preview_GetGlobalExports
- Responses:
  - **200**: No description

**GET /api/v1/preview/stream/page-xml**
- Operation ID: Preview_StreamPageXml
- Parameters:
  - **pubTgtId** (query): string (required)
  - **count** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/stream/page-references**
- Operation ID: Preview_StreamPageReferences
- Parameters:
  - **count** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/stream/asset-references**
- Operation ID: Preview_StreamAssetReferences
- Parameters:
  - **count** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/stream/taxonomy**
- Operation ID: Preview_StreamTaxonomyCategories
- Parameters:
  - **count** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/page-forward-references**
- Operation ID: Preview_GetPageForwardReferences
- Parameters:
  - **ids** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/preview/page-cross-references**
- Operation ID: Preview_GetPageCrossReferences
- Parameters:
  - **ids** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/preview/dita-asset-preview-status**
- Operation ID: Preview_GetDitaAssetPreviewStatus
- Parameters:
  - **assetId** (query): string (required)
  - **mapId** (query): string (required)
  - **ditavalId** (query): string (required)
  - **ditaNormPubTargetId** (query): string (required)
  - **pubTargetId** (query): string (optional)
- Responses:
  - **200**: No description

**POST /api/v1/preview/dita-asset-preview**
- Operation ID: Preview_StartGeneratingDitaAssetPreview
- Parameters:
  - **assetId** (query): string (required)
  - **mapId** (query): string (required)
  - **ditavalId** (query): string (required)
  - **ditaNormPubTargetId** (query): string (required)
  - **pubTargetId** (query): string (optional)
- Responses:
  - **200**: No description

**DELETE /api/v1/preview/dita-asset-preview**
- Operation ID: Preview_CancelDitaAssetPreview
- Parameters:
  - **assetId** (query): string (required)
  - **mapId** (query): string (required)
  - **ditavalId** (query): string (required)
  - **ditaNormPubTargetId** (query): string (required)
  - **pubTargetId** (query): string (optional)
- Responses:
  - **200**: No description

**GET /api/v1/preview/asset-dependents-csv**
- Operation ID: Preview_DownloadLog
- Parameters:
  - **logPath** (query): string (required)
- Responses:
  - **200**: No description

### Publishing

**GET /api/v1/publishing/publish-preview-content**
- Operation ID: Publishing_GetPubPreviewTaskContentPage
- Parameters:
  - **TaskId** (query): string (optional)
  - **ForAssets** (query): boolean (optional)
  - **Filter** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**POST /api/v1/publishing/publish-preview**
- Operation ID: Publishing_PublishPreview
- Parameters:
  - **contentItemId** (query): string (required)
  - **publishingTargetId** (query): string (required)
  - **incremental** (query): boolean (required)
  - **includeChildren** (query): boolean (required)
  - **sitePublish** (query): boolean (required)
- Responses:
  - **200**: No description

**GET /api/v1/publishing/log-detail**
- Operation ID: Publishing_GetPublishingLogDetails
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/publishing/target-summary**
- Operation ID: Publishing_GetPublishingTargetPublishingSummary
- Parameters:
  - **publishingTargetId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/publishing/current-tasks**
- Operation ID: Publishing_GetCurrentTasks
- Responses:
  - **200**: No description

**GET /api/v1/publishing/redirects**
- Operation ID: Publishing_GetRedirects
- Parameters:
  - **Sort** (query): string (optional)
  - **SortDirection** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**DELETE /api/v1/publishing/redirects**
- Operation ID: Publishing_DeleteRedirects
- Parameters:
  - **redirectIds** (body): array (required)
- Responses:
  - **200**: No description

**PUT /api/v1/publishing/redirect**
- Operation ID: Publishing_SaveRedirect
- Parameters:
  - **data** (body): unknown (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/publishing/redirect**
- Operation ID: Publishing_DeleteRedirect
- Parameters:
  - **redirectId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/publishing/target**
- Operation ID: Publishing_GetPublishingTarget
- Parameters:
  - **publishingTargetId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/publishing/target**
- Operation ID: Publishing_CreatePublishingTarget
- Parameters:
  - **publishingTarget** (body): unknown (required)
- Responses:
  - **200**: No description

**PUT /api/v1/publishing/target**
- Operation ID: Publishing_UpdatePublishingTarget
- Parameters:
  - **publishingTarget** (body): unknown (required)
- Responses:
  - **200**: No description

**GET /api/v1/publishing/targets**
- Operation ID: Publishing_GetPublishingTargets
- Parameters:
  - **ProfileId** (query): string (optional)
  - **OrderBy** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/publishing/target/groups**
- Operation ID: Publishing_GetPublishingTargetGroups
- Parameters:
  - **publishingTargetId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/publishing/target/groups**
- Operation ID: Publishing_SetPublishingTargetGroups
- Parameters:
  - **publishingTargetId** (query): string (required)
  - **userGroupIds** (body): array (required)
- Responses:
  - **200**: No description

**POST /api/v1/publishing/content-publish-history**
- Operation ID: Publishing_GetContentItemPublishedToTarget
- Parameters:
  - **publishingTargetId** (query): string (required)
  - **contentItemIds** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/publishing/user-agents**
- Operation ID: Publishing_GetUserAgents
- Responses:
  - **200**: No description

**GET /api/v1/publishing/sites**
- Operation ID: Publishing_GetSites
- Responses:
  - **200**: No description

**POST /api/v1/publishing/gather-dependencies**
- Operation ID: Publishing_GetDitaDependencies
- Parameters:
  - **pubTargetIds** (query): string (required)
  - **contentIds** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/publishing/dita-output-formats**
- Operation ID: Publishing_GetDitaOutputFormats
- Parameters:
  - **searchString** (query): string (optional)
- Responses:
  - **200**: No description

**GET /api/v1/publishing/content-processors**
- Operation ID: Publishing_GetPostPublishContentProcessors
- Parameters:
  - **pubTargetId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/publishing/content-processors**
- Operation ID: Publishing_SetPostPublishContentProcessor
- Parameters:
  - **publishingTargetId** (query): string (required)
  - **contentProcessors** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/publishing/content-processor-logs**
- Operation ID: Publishing_GetContentProcessorLogs
- Parameters:
  - **StartIndex** (query): integer (optional)
  - **PageSize** (query): integer (optional)
  - **SortField** (query): string (optional)
  - **SortOrder** (query): string (optional)
  - **filter** (query): string (optional)
- Responses:
  - **200**: No description

### Reports

**GET /api/v1/reports/stats**
- Operation ID: Reports_GetStats
- Parameters:
  - **periodDataOnly** (query): boolean (required)
  - **begingDate** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/reports/scheduling**
- Operation ID: Reports_GetScheduling
- Parameters:
  - **count** (query): integer (required)
  - **workingLocale** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/reports/toggle-scheduler**
- Operation ID: Reports_ToggleScheduler
- Parameters:
  - **toStart** (query): boolean (required)
  - **workingLocale** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/reports/folder**
- Operation ID: Reports_GetFolder
- Parameters:
  - **folderId** (query): string (required)
  - **workingLocale** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/reports/folder**
- Operation ID: Reports_SaveFolder
- Parameters:
  - **folderId** (query): string (required)
  - **folderName** (query): string (required)
  - **workingLocale** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/reports/report**
- Operation ID: Reports_GetReport
- Parameters:
  - **reportId** (query): string (required)
  - **workingLocale** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/reports/columns**
- Operation ID: Reports_GetColumns
- Parameters:
  - **reportId** (query): string (required)
  - **involvedDocuments** (query): string (required)
  - **query** (query): string (required)
  - **workingLocale** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/reports/simple-report**
- Operation ID: Reports_GetSimpleReportResults
- Parameters:
  - **reportId** (query): string (required)
  - **workingLocale** (query): string (required)
- Responses:
  - **200**: No description

**PUT /api/v1/reports/simple-report**
- Operation ID: Reports_SaveSimpleReport
- Parameters:
  - **reportInfo** (body): unknown (required)
  - **workingLocale** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/reports/parameterized-report**
- Operation ID: Reports_GetParameterizedReportResults
- Parameters:
  - **reportId** (query): string (required)
  - **parameters** (body): array (required)
  - **workingLocale** (query): string (required)
- Responses:
  - **200**: No description

**PUT /api/v1/reports/parameterized-report**
- Operation ID: Reports_SaveParameterizedReport
- Parameters:
  - **reportInfo** (body): unknown (required)
  - **workingLocale** (query): string (required)
- Responses:
  - **200**: No description

**PUT /api/v1/reports/advanced-report**
- Operation ID: Reports_SaveAdvancedReport
- Parameters:
  - **reportInfo** (body): unknown (required)
  - **workingLocale** (query): string (required)
- Responses:
  - **200**: No description

**PUT /api/v1/reports/report-schedules**
- Operation ID: Reports_SaveReportSchedules
- Parameters:
  - **reportInfo** (body): unknown (required)
  - **workingLocale** (query): string (required)
- Responses:
  - **200**: No description

### Schemas

**POST /api/v1/schemas/upload**
- Operation ID: Schemas_UploadSchema
- Responses:
  - **200**: No description

**POST /api/v1/schemas/generate-thumb-from-preview**
- Operation ID: Schemas_GenerateThumbnailFromPreview
- Parameters:
  - **previewUrl** (query): string (required)
  - **compSchemaName** (query): string (required)
  - **componentId** (query): string (optional)
- Responses:
  - **200**: No description

**GET /api/v1/schemas/pages-by-comp-schema**
- Operation ID: Schemas_GetComponentSchemaReferences
- Parameters:
  - **schemaId** (query): string (required)
  - **filter** (query): string (optional)
  - **StartIndex** (query): integer (optional)
  - **PageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/schemas/schemas**
- Operation ID: Schemas_GetSchemas
- Parameters:
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/schemas/asset-schemas**
- Operation ID: Schemas_GetAssetSchemas
- Parameters:
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/schemas/asset-schemas-by-types**
- Operation ID: Schemas_GetAssetSchemasByTypes
- Parameters:
  - **assetTypes** (query): array (optional)
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/schemas/schema**
- Operation ID: Schemas_GetSchema
- Parameters:
  - **schemaIdOrRootName** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/schemas/asset-schema**
- Operation ID: Schemas_GetAssetSchema
- Parameters:
  - **schemaIdOrRootName** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/schemas/page-or-asset-schema**
- Operation ID: Schemas_GetPageOrAssetSchema
- Parameters:
  - **schemaIdOrRootName** (query): string (required)
  - **includePageSchemas** (query): boolean (required)
  - **includeAssetSchemas** (query): boolean (required)
- Responses:
  - **200**: No description

**GET /api/v1/schemas/search**
- Operation ID: Schemas_Search
- Parameters:
  - **SearchText** (query): string (optional)
  - **AllowFullListing** (query): boolean (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/schemas/search-asset-schemas**
- Operation ID: Schemas_SearchAssetSchemas
- Parameters:
  - **SearchText** (query): string (optional)
  - **AllowFullListing** (query): boolean (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/schemas/schema-usage**
- Operation ID: Schemas_GetSchemaUsage
- Parameters:
  - **SchemaId** (query): string (optional)
  - **Type** (query): string (optional)
  - **Outdated** (query): boolean (optional)
  - **SortField** (query): string (optional)
  - **SortOrder** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/schemas/schema-sync-log**
- Operation ID: Schemas_GetSchemaUsageForSyncLogPaginated
- Parameters:
  - **SyncLogId** (query): string (optional)
  - **SchemaId** (query): string (optional)
  - **Type** (query): string (optional)
  - **Outdated** (query): boolean (optional)
  - **SortField** (query): string (optional)
  - **SortOrder** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

### Assets

**POST /api/v1/assets/asset/workflow/advance**
- Operation ID: Assets_AdvanceWorkflow
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**POST /api/v1/assets/assign-to-group**
- Operation ID: Assets_AssignToGroup
- Parameters:
  - **assignAssetUserGroupRequest** (body): unknown (required)
- Responses:
  - **200**: No description

**POST /api/v1/assets/assign-to-user**
- Operation ID: Assets_AssignToUser
- Parameters:
  - **assignAssetUserRequest** (body): unknown (required)
- Responses:
  - **200**: No description

**POST /api/v1/assets/checkin**
- Operation ID: Assets_CheckIn
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**POST /api/v1/assets/checkout**
- Operation ID: Assets_CheckOut
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**POST /api/v1/assets/copy**
- Operation ID: Assets_Copy
- Parameters:
  - **srcIds** (body): array (required)
  - **tgtId** (query): string (required)
  - **overwriteSameName** (query): boolean (optional)
  - **tgtLocale** (query): string (optional)
- Responses:
  - **200**: No description

**POST /api/v1/assets/asset-folder**
- Operation ID: Assets_CreateAssetFolder
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**GET /api/v1/assets/asset-aliases**
- Operation ID: Assets_CheckAssetAliases
- Parameters:
  - **ids** (query): array (optional)
- Responses:
  - **200**: No description

**DELETE /api/v1/assets**
- Operation ID: Assets_DeleteAssetItems
- Parameters:
  - **ids** (query): array (optional)
  - **force** (query): boolean (optional)
- Responses:
  - **200**: No description

**GET /api/v1/assets/asset/ancestors**
- Operation ID: Assets_GetAncestors
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/assets/asset**
- Operation ID: Assets_GetAsset
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/assets/asset-by-path**
- Operation ID: Assets_GetAssetByPath
- Parameters:
  - **path** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/assets/asset/context**
- Operation ID: Assets_GetAssetContext
- Parameters:
  - **ids** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/assets/details**
- Operation ID: Assets_GetAssetDetails
- Parameters:
  - **id** (query): string (required)
  - **version** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/assets/history**
- Operation ID: Assets_GetAssetHistory
- Parameters:
  - **Id** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/assets/asset/children**
- Operation ID: Assets_GetChildren
- Parameters:
  - **id** (query): string (required)
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/assets/file**
- Operation ID: Assets_GetFileBinary
- Parameters:
  - **assetId** (query): string (required)
  - **download** (query): boolean (optional)
- Responses:
  - **200**: No description

**GET /api/v1/assets/asset/descendant-targets**
- Operation ID: Assets_GetFolderDescendantMarkings
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/assets/recycle-folder**
- Operation ID: Assets_GetRecycleFolder
- Responses:
  - **200**: No description

**GET /api/v1/assets/root**
- Operation ID: Assets_GetRoot
- Responses:
  - **200**: No description

**GET /api/v1/assets/root-folders**
- Operation ID: Assets_GetRootFolders
- Parameters:
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/assets/unmanaged**
- Operation ID: Assets_GetUnmanagedAsset
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/assets/unmanaged/children**
- Operation ID: Assets_GetUnmanagedChildren
- Parameters:
  - **id** (query): string (required)
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/assets/unmanaged/root-folders**
- Operation ID: Assets_GetUnmanagedRootFolders
- Parameters:
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/assets/dita-move-validation**
- Operation ID: Assets_CheckDitaContentMovingOutOfDitaRoot
- Parameters:
  - **srcIds** (query): string (required)
  - **tgtId** (query): string (required)
- Responses:
  - **200**: No description

**PATCH /api/v1/assets/move**
- Operation ID: Assets_Move
- Parameters:
  - **srcIds** (body): array (required)
  - **tgtId** (query): string (required)
  - **overwriteSameName** (query): boolean (optional)
- Responses:
  - **200**: No description

**POST /api/v1/assets/rename**
- Operation ID: Assets_Rename
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**GET /api/v1/assets/search**
- Operation ID: Assets_SearchAssetItems
- Parameters:
  - **AssetSchemas** (query): array (optional)
  - **EndDate** (query): string (optional)
  - **IncludeAssets** (query): boolean (optional)
  - **IncludeDescendants** (query): boolean (optional)
  - **IncludeFolders** (query): boolean (optional)
  - **RootId** (query): string (optional)
  - **SearchString** (query): string (optional)
  - **StartDate** (query): string (optional)
  - **TargetId** (query): string (optional)
  - **SortField** (query): string (optional)
  - **SortOrder** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/assets/search-unmanaged**
- Operation ID: Assets_SearchUnmanagedAssetItems
- Parameters:
  - **AssetSchemas** (query): array (optional)
  - **EndDate** (query): string (optional)
  - **IncludeAssets** (query): boolean (optional)
  - **IncludeDescendants** (query): boolean (optional)
  - **IncludeFolders** (query): boolean (optional)
  - **RootId** (query): string (optional)
  - **SearchString** (query): string (optional)
  - **StartDate** (query): string (optional)
  - **TargetId** (query): string (optional)
  - **SortField** (query): string (optional)
  - **SortOrder** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**POST /api/v1/assets/asset/associations**
- Operation ID: Assets_SetCategoryAssociations
- Parameters:
  - **contentId** (query): string (required)
  - **categoryIds** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/assets/total-size**
- Operation ID: Assets_TotalSize
- Responses:
  - **200**: No description

**POST /api/v1/assets/undo-checkout**
- Operation ID: Assets_UndoCheckOut
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**POST /api/v1/assets/unzip**
- Operation ID: Assets_Unzip
- Parameters:
  - **assetId** (query): string (required)
  - **cleanFolder** (query): boolean (required)
- Responses:
  - **200**: No description

**POST /api/v1/assets/upload**
- Operation ID: Assets_Upload
- Parameters:
  - **file** (formData): file (required)
    - Asset file to be uploaded.
  - **assetname** (formData): string (optional)
  - **contentid** (formData): string (optional)
  - **parentfolder** (formData): string (required)
  - **existingassetupdateid** (formData): string (optional)
  - **overrideschemaid** (formData): string (optional)
  - **schemaId** (formData): string (optional)
  - **followupupload** (formData): boolean (optional)
  - **updateonconflicts** (formData): boolean (optional)
  - **schemadefault** (formData): boolean (optional)
    - If false, must specify 'overrideschemaid'.
  - **unpackzip** (formData): boolean (optional)
    - Set 'true' when uploading a .zip file to be unpacked into its containing assets.
  - **deleteexistingfolder** (formData): boolean (optional)
    - For use only with 'unpackzip' option. Deletes already-existing asset folder with same name as .zip, along with all its contents, and creates new asset folder with unpacked .zip contents inside.
  - **zipunpackhandleconflicts** (formData): integer (optional)
    - For use only with 'unpackzip' option. Handling conflicts with existing assets in folder.
  - **skipexistingassets** (formData): boolean (optional)
    - For use only with 'unpackzip' option.
- Responses:
  - **200**: No description

**GET /api/v1/assets/asset-dependency**
- Operation ID: Assets_GetAssetDitaProperties
- Parameters:
  - **assetId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/assets/asset-owners-deep**
- Operation ID: Assets_GetAllAssetOwners
- Parameters:
  - **assetId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/assets/dita-key-defs**
- Operation ID: Assets_GetAvailableKeyDefinitions
- Parameters:
  - **assetId** (query): string (required)
  - **topMapId** (query): string (optional)
  - **includeUnconfirmed** (query): boolean (optional)
- Responses:
  - **200**: No description

**GET /api/v1/assets/asset-owners-csv**
- Operation ID: Assets_DownloadAssetOwnersCsv
- Parameters:
  - **assetId** (query): string (required)
  - **all** (query): boolean (required)
  - **pubTargetId** (query): string (optional)
  - **showAllPubTargets** (query): boolean (optional)
- Responses:
  - **200**: No description

**GET /api/v1/assets/asset-dependents-csv**
- Operation ID: Assets_DownloadAssetDependentsCsv
- Parameters:
  - **assetId** (query): string (required)
  - **all** (query): boolean (required)
  - **pubTargetId** (query): string (optional)
  - **showAllPubTargets** (query): boolean (optional)
- Responses:
  - **200**: No description

**GET /api/v1/assets/ditamap-scopes**
- Operation ID: Assets_GetAssetDITAScopes
- Parameters:
  - **assetId** (query): string (required)
  - **pubTargetId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/assets/asset-dependents-deep**
- Operation ID: Assets_GetAllAssetDependents
- Parameters:
  - **assetId** (query): string (required)
- Responses:
  - **200**: No description

**PUT /api/v1/assets/asset-dita-output-formats**
- Operation ID: Assets_SetAssetOutputFormats
- Parameters:
  - **assetId** (query): string (required)
  - **formats** (body): array (required)
- Responses:
  - **200**: No description

**PUT /api/v1/assets/asset-ditavals**
- Operation ID: Assets_SetAssetDitavals
- Parameters:
  - **assetId** (query): string (required)
  - **ditavalIds** (body): array (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/assets/dita-preview-cache**
- Operation ID: Assets_DeleteDitaPreviewCache
- Parameters:
  - **assetId** (query): string (required)
  - **pubTargetId** (query): string (optional)
- Responses:
  - **200**: No description

**PUT /api/v1/assets/dita-oxygen-oauth-creds**
- Operation ID: Assets_GetOxygenAccessCredentials
- Responses:
  - **200**: No description

### Site

**GET /api/v1/site/content-item-search**
- Operation ID: Site_SearchContentItems
- Parameters:
  - **SearchText** (query): string (optional)
  - **IncludeComponents** (query): boolean (optional)
  - **IncludePages** (query): boolean (optional)
  - **OrderByScore** (query): boolean (optional)
  - **Types** (query): array (optional)
  - **SubTypes** (query): array (optional)
  - **IncludeContentPath** (query): boolean (optional)
  - **IncludeRecycled** (query): boolean (optional)
  - **IncludeAssetRoot** (query): boolean (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/site/tab-model**
- Operation ID: Site_GetTabModel
- Parameters:
  - **contentItemId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/site/generate-asset-reference-report**
- Operation ID: Site_GenerateAssetRefernceReport
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**POST /api/v1/site/generate-broken-link-report**
- Operation ID: Site_GenerateBrokenLinkReport
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**POST /api/v1/site/generate-search-text-report**
- Operation ID: Site_GenerateTextSearchReport
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**POST /api/v1/site/generate-search-asset-text-report**
- Operation ID: Site_GenerateAssetTextSearchReport
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**POST /api/v1/site/generate-unused-assets-report**
- Operation ID: Site_GenerateUnusedAssetsReport
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**POST /api/v1/site/generate-page-reference-report**
- Operation ID: Site_GeneratePageReferenceReport
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**GET /api/v1/site/report/{sessionId}/status**
- Operation ID: Site_GetReportStatus
- Parameters:
  - **sessionId** (path): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/site/report/{sessionId}**
- Operation ID: Site_GetReport
- Parameters:
  - **sessionId** (path): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/site/report/cancel**
- Operation ID: Site_CancelReport
- Parameters:
  - **sessionId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/site/report/replace-entry**
- Operation ID: Site_ReplaceReportEntry
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**GET /api/v1/site/report/{sessionId}/file**
- Operation ID: Site_DownloadReport
- Parameters:
  - **sessionId** (path): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/site/ranked-search**
- Operation ID: Site_RankedSearch
- Parameters:
  - **Keywords** (query): string (optional)
  - **FieldName** (query): string (optional)
  - **SchemaName** (query): string (optional)
  - **Locale** (query): string (optional)
  - **FieldIsAttribute** (query): boolean (optional)
  - **FieldIsDate** (query): boolean (optional)
  - **UseCheckedOutContent** (query): boolean (optional)
  - **IncludeRecycled** (query): boolean (optional)
  - **IncludePages** (query): boolean (optional)
  - **IncludeAssets** (query): boolean (optional)
  - **SortField** (query): string (optional)
  - **SortOrder** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/site/usage-summary**
- Operation ID: Site_GetContentItemUsageSummary
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/site/usage-report**
- Operation ID: Site_GetContentItemUsageReport
- Parameters:
  - **Id** (query): string (optional)
  - **SortField** (query): string (optional)
  - **SortOrder** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

### Pages

**GET /api/v1/pages**
- Operation ID: Pages_GetPages
- Parameters:
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/pages/root**
- Operation ID: Pages_GetRoot
- Responses:
  - **200**: No description

**GET /api/v1/pages/recycle-folder**
- Operation ID: Pages_GetRecycleFolder
- Responses:
  - **200**: No description

**GET /api/v1/pages/page/children**
- Operation ID: Pages_GetChildren
- Parameters:
  - **id** (query): string (required)
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/pages/page/descendants**
- Operation ID: Pages_GetDescendants
- Parameters:
  - **id** (query): string (required)
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/pages/page/descendant-alias-count**
- Operation ID: Pages_GetDescendantAliasCount
- Parameters:
  - **id** (query): string (required)
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/pages/page/parent**
- Operation ID: Pages_GetParent
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/pages/page/ancestors**
- Operation ID: Pages_GetAncestors
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/pages/page**
- Operation ID: Pages_GetPage
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/pages/page**
- Operation ID: Pages_DeletePage
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/pages/page/details**
- Operation ID: Pages_GetPageDetails
- Parameters:
  - **id** (query): string (required)
  - **version** (query): integer (optional)
- Responses:
  - **200**: No description

**POST /api/v1/pages/page/context**
- Operation ID: Pages_GetPageContext
- Parameters:
  - **ids** (body): array (required)
- Responses:
  - **200**: No description

**POST /api/v1/pages/page/associations**
- Operation ID: Pages_SetCategoryAssociations
- Parameters:
  - **contentId** (query): string (required)
  - **categoryIds** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/pages/by-category**
- Operation ID: Pages_GetByCategory
- Parameters:
  - **categoryId** (query): integer (required)
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**PATCH /api/v1/pages/move**
- Operation ID: Pages_Move
- Parameters:
  - **srcIds** (body): array (required)
  - **tgtId** (query): string (required)
  - **position** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/pages/copy**
- Operation ID: Pages_Copy
- Parameters:
  - **isSmartCopy** (query): boolean (required)
  - **singlePageCopy** (query): boolean (required)
  - **srcIds** (body): array (required)
  - **tgtId** (query): string (required)
  - **position** (query): string (required)
  - **targetLocale** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/pages/rename**
- Operation ID: Pages_Rename
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**POST /api/v1/pages/checkin**
- Operation ID: Pages_CheckIn
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**POST /api/v1/pages/checkout**
- Operation ID: Pages_CheckOut
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**POST /api/v1/pages/page/pcr**
- Operation ID: Pages_CreatePCRPage
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**GET /api/v1/pages/history**
- Operation ID: Pages_GetPageHistory
- Parameters:
  - **Id** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/pages/page/workflow/workstates**
- Operation ID: Pages_GetWorkflowStates
- Parameters:
  - **pageId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/pages/page/design/content-units**
- Operation ID: Pages_GetContentUnits
- Parameters:
  - **pageId** (query): string (required)
  - **pubTgtId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/pages/page/workflow/advance**
- Operation ID: Pages_AdvanceWorkflow
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**PUT /api/v1/pages/dita-alias**
- Operation ID: Pages_CreateDITAAlias
- Parameters:
  - **assetId** (query): string (required)
  - **parentPageId** (query): string (required)
  - **accuracyMode** (query): boolean (optional)
  - **ditaContentOnly** (query): boolean (optional)
- Responses:
  - **200**: No description

**PATCH /api/v1/pages/dita-alias**
- Operation ID: Pages_UpdateDITAAlias
- Parameters:
  - **aliasId** (query): string (required)
  - **updateChildren** (query): boolean (optional)
- Responses:
  - **200**: No description

### Settings

**GET /api/v1/settings/setting**
- Operation ID: Settings_GetSetting
- Parameters:
  - **data** (body): unknown (required)
- Responses:
  - **200**: No description

**PUT /api/v1/settings/setting**
- Operation ID: Settings_PutSetting
- Parameters:
  - **data** (body): unknown (required)
- Responses:
  - **200**: No description

**GET /api/v1/settings/section**
- Operation ID: Settings_GetSection
- Parameters:
  - **sectionName** (query): string (required)
- Responses:
  - **200**: No description

**PUT /api/v1/settings/section**
- Operation ID: Settings_PutSection
- Parameters:
  - **sectionName** (query): string (required)
  - **data** (body): array (required)
- Responses:
  - **200**: No description

**POST /api/v1/settings/data**
- Operation ID: Settings_GetData
- Parameters:
  - **data** (body): unknown (required)
- Responses:
  - **200**: No description

**PUT /api/v1/settings/data**
- Operation ID: Settings_SetData
- Parameters:
  - **data** (body): unknown (required)
- Responses:
  - **200**: No description

**GET /api/v1/settings/custom-tabs**
- Operation ID: Settings_GetCustomTabs
- Responses:
  - **200**: No description

**PUT /api/v1/settings/custom-tabs**
- Operation ID: Settings_SetCustomTabs
- Parameters:
  - **input** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/settings/task-users**
- Operation ID: Settings_GetTaskUsers
- Parameters:
  - **q** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/settings/reset-client-secret**
- Operation ID: Settings_ResetClientSecret
- Parameters:
  - **clientId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/settings/access-tokens**
- Operation ID: Settings_GetOAuthIdentities
- Responses:
  - **200**: No description

**PUT /api/v1/settings/access-tokens**
- Operation ID: Settings_SetOAuthIdentities
- Parameters:
  - **input** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/settings/global-variables**
- Operation ID: Settings_GetGlobalVariables
- Responses:
  - **200**: No description

**PUT /api/v1/settings/global-variables**
- Operation ID: Settings_SetGlobalVariables
- Parameters:
  - **input** (body): array (required)
- Responses:
  - **200**: No description

**PATCH /api/v1/settings/deploy-dita-ot**
- Operation ID: Settings_DeployDitaOT
- Parameters:
  - **version** (query): string (required)
  - **downloadUrl** (query): string (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/settings/remove-dita-ot**
- Operation ID: Settings_RemoveDitaOTDeployment
- Responses:
  - **200**: No description

**DELETE /api/v1/settings/remove-dita-ot-plugin**
- Operation ID: Settings_RemoveDitaOTPlugin
- Parameters:
  - **pluginFolder** (query): string (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/settings/restore-dita-ot-plugin**
- Operation ID: Settings_RestoreDitaOTPlugin
- Parameters:
  - **pluginFolder** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/settings/add-dita-ot-plugin**
- Operation ID: Settings_UploadDitaOTPlugin
- Responses:
  - **200**: No description

**POST /api/v1/settings/deploy-custom-ot**
- Operation ID: Settings_DeployCustomOT
- Responses:
  - **200**: No description

**POST /api/v1/settings/ditaval-manipulation**
- Operation ID: Settings_ManipulateDitavals
- Parameters:
  - **operation** (body): unknown (required)
- Responses:
  - **200**: No description

**GET /api/v1/settings/archive-types**
- Operation ID: Settings_GetArchiveTypes
- Responses:
  - **200**: No description

**GET /api/v1/settings/page-tree-menu-groups**
- Operation ID: Settings_GetGroupsForTreeMenu
- Responses:
  - **200**: No description

**GET /api/v1/settings/asset-tree-menu-groups**
- Operation ID: Settings_GetGroupsForAssetTreeMenu
- Responses:
  - **200**: No description

**GET /api/v1/settings/page-tree-menu-items**
- Operation ID: Settings_GetPossiblePageTreeMenuItems
- Responses:
  - **200**: No description

**GET /api/v1/settings/asset-tree-menu-items**
- Operation ID: Settings_GetPossibleAssetTreeMenuItems
- Responses:
  - **200**: No description

**GET /api/v1/settings/tinymce-items**
- Operation ID: Settings_GetPossibleTinyMceItems
- Parameters:
  - **propertyName** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/settings/timezones**
- Operation ID: Settings_GetTimeZones
- Responses:
  - **200**: No description

**GET /api/v1/settings/tinymce-groups**
- Operation ID: Settings_GetTinyMceGroups
- Parameters:
  - **settingName** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/settings/presentation-formatters**
- Operation ID: Settings_GetPresentationsFormatters
- Responses:
  - **200**: No description

**GET /api/v1/settings/server-variables**
- Operation ID: Settings_GetServerVariables
- Responses:
  - **200**: No description

**POST /api/v1/settings/force-archive**
- Operation ID: Settings_ForceArchive
- Parameters:
  - **type** (query): string (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/settings/page-tree-group**
- Operation ID: Settings_RemoveGroupProfileForPageTreeMenu
- Parameters:
  - **groupId** (query): string (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/settings/asset-tree-group**
- Operation ID: Settings_RemoveGroupProfileForAssetTreeMenu
- Parameters:
  - **groupId** (query): string (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/settings/tinymce-group**
- Operation ID: Settings_RemoveTinyMceGroup
- Parameters:
  - **groupId** (query): string (required)
  - **settingName** (query): string (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/settings/dictionary**
- Operation ID: Settings_RemoveDictionary
- Parameters:
  - **locale** (query): string (required)
- Responses:
  - **200**: No description

**PUT /api/v1/settings/custom-locale**
- Operation ID: Settings_CreateCustomLocale
- Parameters:
  - **locale** (query): string (required)
  - **baseLocale** (query): string (required)
  - **englishName** (query): string (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/settings/custom-locale**
- Operation ID: Settings_RemoveCustomLocale
- Parameters:
  - **locale** (query): string (required)
- Responses:
  - **200**: No description

### Taxonomy

**GET /api/v1/taxonomy/statistics**
- Operation ID: Taxonomy_GetStats
- Responses:
  - **200**: No description

**GET /api/v1/taxonomy/categories**
- Operation ID: Taxonomy_GetCategories
- Parameters:
  - **regionCode** (query): string (optional)
  - **initialLetters** (query): string (optional)
  - **searchSynonyms** (query): boolean (optional)
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/taxonomy/root-categories**
- Operation ID: Taxonomy_GetRootCategories
- Parameters:
  - **schemaId** (query): string (optional)
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/taxonomy/category/children**
- Operation ID: Taxonomy_GetChildren
- Parameters:
  - **id** (query): string (required)
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/taxonomy/category/parent**
- Operation ID: Taxonomy_GetParent
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/taxonomy/category/ancestors**
- Operation ID: Taxonomy_GetAncestors
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/taxonomy/category**
- Operation ID: Taxonomy_GetCategory
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/taxonomy/category**
- Operation ID: Taxonomy_CreateCategory
- Parameters:
  - **name** (query): string (required)
  - **parentId** (query): string (optional)
  - **locale** (query): string (optional)
- Responses:
  - **200**: No description

**PUT /api/v1/taxonomy/category**
- Operation ID: Taxonomy_SaveCategory
- Parameters:
  - **input** (body): unknown (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/taxonomy/category**
- Operation ID: Taxonomy_DeleteCategory
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/taxonomy/category/security**
- Operation ID: Taxonomy_GetCategorySecurity
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**PUT /api/v1/taxonomy/category/security**
- Operation ID: Taxonomy_SetCategorySecurity
- Parameters:
  - **security** (body): unknown (required)
- Responses:
  - **200**: No description

**PUT /api/v1/taxonomy/category/synonyms**
- Operation ID: Taxonomy_SetCategorySynonyms
- Parameters:
  - **id** (query): string (required)
  - **regionCode** (query): string (required)
  - **synonyms** (body): array (required)
- Responses:
  - **200**: No description

**PATCH /api/v1/taxonomy/category/rename**
- Operation ID: Taxonomy_Rename
- Parameters:
  - **id** (query): string (required)
  - **newName** (query): string (required)
- Responses:
  - **200**: No description

**PATCH /api/v1/taxonomy/category/move**
- Operation ID: Taxonomy_Move
- Parameters:
  - **srcId** (query): string (required)
  - **tgtId** (query): string (required)
  - **asSibling** (query): boolean (optional)
- Responses:
  - **200**: No description

**PATCH /api/v1/taxonomy/category/copy**
- Operation ID: Taxonomy_Copy
- Parameters:
  - **srcId** (query): string (required)
  - **tgtId** (query): string (required)
  - **singleCategoryCopy** (query): boolean (optional)
  - **asSibling** (query): boolean (optional)
  - **copyAssociations** (query): boolean (optional)
- Responses:
  - **200**: No description

**PATCH /api/v1/taxonomy/category/copy-associations**
- Operation ID: Taxonomy_CopyAssociations
- Parameters:
  - **srcId** (query): string (required)
  - **tgtId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/taxonomy/category/associations**
- Operation ID: Taxonomy_GetAssociations
- Parameters:
  - **CategoryId** (query): string (optional)
  - **SortField** (query): string (optional)
  - **SortOrder** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**DELETE /api/v1/taxonomy/category/associations**
- Operation ID: Taxonomy_DeleteAssociations
- Parameters:
  - **categoryId** (query): string (required)
  - **contentIds** (body): array (required)
- Responses:
  - **200**: No description

**PATCH /api/v1/taxonomy/category/associations**
- Operation ID: Taxonomy_AddAssociations
- Parameters:
  - **categoryId** (query): string (required)
  - **contentIds** (body): array (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/taxonomy/category/association**
- Operation ID: Taxonomy_DeleteAssociation
- Parameters:
  - **categoryId** (query): string (required)
  - **contentId** (query): string (required)
- Responses:
  - **200**: No description

**PATCH /api/v1/taxonomy/category/association**
- Operation ID: Taxonomy_AddAssociation
- Parameters:
  - **categoryId** (query): string (required)
  - **contentId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/taxonomy/category/content-associations**
- Operation ID: Taxonomy_SetCategoryAssociations
- Parameters:
  - **contentId** (query): string (required)
  - **categoryIds** (body): array (required)
- Responses:
  - **200**: No description

**POST /api/v1/taxonomy/categories-with-path**
- Operation ID: Taxonomy_GetCategoriesWithPath
- Parameters:
  - **ids** (body): array (required)
- Responses:
  - **200**: No description

**GET /api/v1/taxonomy/category/has-association**
- Operation ID: Taxonomy_CategoryHasAssociations
- Parameters:
  - **categoryId** (query): string (required)
  - **recursive** (query): boolean (optional)
- Responses:
  - **200**: No description

**GET /api/v1/taxonomy/category/associated-descendants**
- Operation ID: Taxonomy_CategoriesWithAssociations
- Parameters:
  - **categoryId** (query): string (required)
  - **recursive** (query): boolean (optional)
- Responses:
  - **200**: No description

**GET /api/v1/taxonomy/quick-search**
- Operation ID: Taxonomy_QuickSearch
- Parameters:
  - **search** (query): string (required)
- Responses:
  - **200**: No description

### Test

**GET /api/v1/test/error**
- Operation ID: Test_Get
- Parameters:
  - **statusCode** (query): integer (required)
  - **message** (query): string (optional)
- Responses:
  - **200**: No description

**GET /api/v1/test/locale**
- Operation ID: Test_GetCurrentLocale
- Responses:
  - **200**: No description

**POST /api/v1/test/progress**
- Operation ID: Test_GetProgress
- Parameters:
  - **timeout** (query): integer (required)
- Responses:
  - **200**: No description

**GET /api/v1/test/claims**
- Operation ID: Test_GetClaims
- Responses:
  - **200**: No description

**GET /api/v1/test/admin-perm-test**
- Operation ID: Test_GetPermissionTest
- Responses:
  - **200**: No description

### Accounts

**POST /api/v1/accounts/login**
- Operation ID: Accounts_Login
- Parameters:
  - **request** (body): unknown (required)
- Responses:
  - **200**: No description

**GET /api/v1/accounts/membership-providers**
- Operation ID: Accounts_GetMembershipProviders
- Responses:
  - **200**: No description

**GET /api/v1/accounts/security-groups**
- Operation ID: Accounts_GetUserGroupSecurities
- Parameters:
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**POST /api/v1/accounts/users/reset-passwords**
- Operation ID: Accounts_ResetPassword
- Parameters:
  - **users** (body): array (required)
- Responses:
  - **200**: No description

### UserGroups

**GET /api/v1/groups**
- Operation ID: UserGroups_GetUserGroups
- Parameters:
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/groups/group**
- Operation ID: UserGroups_GetGroup
- Parameters:
  - **name** (query): string (required)
- Responses:
  - **200**: No description

**PUT /api/v1/groups/new-group**
- Operation ID: UserGroups_CreateGroup
- Parameters:
  - **name** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/groups/search**
- Operation ID: UserGroups_Search
- Parameters:
  - **SearchText** (query): string (optional)
  - **AllowFullListing** (query): boolean (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

### User

**GET /api/v1/users**
- Operation ID: User_GetUsers
- Parameters:
  - **groupId** (query): string (optional)
  - **startIndex** (query): integer (optional)
  - **pageSize** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/users/user**
- Operation ID: User_GetUser
- Parameters:
  - **id** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/users/assignments**
- Operation ID: User_GetAssignments
- Parameters:
  - **IncludeGroups** (query): boolean (optional)
  - **IncludeUser** (query): boolean (optional)
  - **IncludeCheckedOut** (query): boolean (optional)
  - **IncludeCheckedIn** (query): boolean (optional)
  - **FilterDisabledWorkstate** (query): boolean (optional)
  - **TypeFilter** (query): string (optional)
  - **SearchString** (query): string (optional)
  - **Sort** (query): string (optional)
  - **SortDirection** (query): string (optional)
  - **UserId** (query): string (optional)
  - **GroupId** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

### Workflow

**GET /api/v1/workflows/workflow**
- Operation ID: Workflow_GetWorkflow
- Parameters:
  - **workflowId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/workflows/by-content**
- Operation ID: Workflow_GetWorkflowByContentItem
- Parameters:
  - **contentId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/workflows/content-work-state**
- Operation ID: Workflow_GetWorkflowStates
- Parameters:
  - **contentId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/workflows/workstates**
- Operation ID: Workflow_GetWorkstates
- Parameters:
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/workflows/definitions**
- Operation ID: Workflow_ListWorkflowDefinitions
- Parameters:
  - **ExcludePageCount** (query): boolean (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/workflows/definition-detail**
- Operation ID: Workflow_GetWorkflowDefinitionDetail
- Parameters:
  - **definitionId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/workflows/report**
- Operation ID: Workflow_GetWorkflowReport
- Parameters:
  - **wfDefId** (query): string (optional)
  - **SortField** (query): string (optional)
  - **SortOrder** (query): string (optional)
  - **PageSize** (query): integer (optional)
  - **StartIndex** (query): integer (optional)
- Responses:
  - **200**: No description

**GET /api/v1/workflows/default-transition**
- Operation ID: Workflow_GetDefaultTransition
- Responses:
  - **200**: No description

**PUT /api/v1/workflows/definition**
- Operation ID: Workflow_SetWorkflowDefinitionDetails
- Parameters:
  - **definition** (body): unknown (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/workflows/definition**
- Operation ID: Workflow_DeleteWorkflowDefinition
- Parameters:
  - **definitionId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/workflows/workstate**
- Operation ID: Workflow_SaveWorkstate
- Parameters:
  - **state** (body): unknown (required)
- Responses:
  - **200**: No description

**PUT /api/v1/workflows/workstate**
- Operation ID: Workflow_CreateWorkstate
- Parameters:
  - **newState** (body): unknown (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/workflows/workstate**
- Operation ID: Workflow_DeleteWorkstate
- Parameters:
  - **workstateIds** (body): array (required)
- Responses:
  - **200**: No description

**POST /api/v1/workflows/prepare-template**
- Operation ID: Workflow_PrepareTemplate
- Parameters:
  - **data** (body): unknown (required)
- Responses:
  - **200**: No description

### Replication

**GET /api/v1/publishing/replication/target**
- Operation ID: Replication_ReplicationTarget
- Parameters:
  - **replicationTargetId** (query): string (required)
  - **publishingTargetId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/publishing/replication/target**
- Operation ID: Replication_CreateReplicationTarget
- Parameters:
  - **replicationTarget** (body): unknown (required)
- Responses:
  - **200**: No description

**PUT /api/v1/publishing/replication/target**
- Operation ID: Replication_UpdateReplicationTarget
- Parameters:
  - **replicationTarget** (body): unknown (required)
- Responses:
  - **200**: No description

**DELETE /api/v1/publishing/replication/target**
- Operation ID: Replication_DeleteReplicationTarget
- Parameters:
  - **replicationTargetId** (query): string (required)
  - **publishingTargetId** (query): string (required)
- Responses:
  - **204**: No description

**GET /api/v1/publishing/replication/aws-region-endpoints**
- Operation ID: Replication_GetAwsRegionEndpoints
- Responses:
  - **200**: No description

**GET /api/v1/publishing/replication/target/log-detail**
- Operation ID: Replication_GetReplicationLogDetails
- Parameters:
  - **replicationTargetId** (query): string (required)
- Responses:
  - **200**: No description

**GET /api/v1/publishing/replication/target-types**
- Operation ID: Replication_GetReplicationTargetTypes
- Responses:
  - **200**: No description

**GET /api/v1/publishing/replication/targets**
- Operation ID: Replication_ReplicationTargets
- Parameters:
  - **publishingTargetId** (query): string (required)
- Responses:
  - **200**: No description

**POST /api/v1/publishing/replication/targets**
- Operation ID: Replication_SetReplicationTargets
- Parameters:
  - **publishingTargetId** (query): string (required)
  - **replicationTargets** (body): array (required)
- Responses:
  - **200**: No description

**POST /api/v1/publishing/replication/upload-cert**
- Operation ID: Replication_UploadCertificate
- Responses:
  - **200**: No description

**POST /api/v1/publishing/replication/upload-private-key**
- Operation ID: Replication_UploadPrivateKey
- Responses:
  - **200**: No description
