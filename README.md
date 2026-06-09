# CanvasAuditHistory
<img width="806" height="467" alt="image" src="https://github.com/user-attachments/assets/bb52279a-d967-4b6c-b72a-537eac25a11c" />

## Overview

Model-Driven apps have always allowed the user to view the native Dataverse audit history for a record. For a long time, I've wanted a way to view the Dataverse audit history for a record within a Canvas app. This solution enables that - providing a fast, responsive and clean view of the Dataverse audit history for a given record within a Canvas app.

There's no native data source available to Canvas apps that provide all the information required to construct the audit history, so this solution provides both a **Dataverse Plugin** enabling a custom data provider that pipes all the information required to construct the audit history to the canvas app, as well as a **PCF Component** that provides a visualisation of that audit history data within the Canvas app.

## Setup

Due to the complexity of getting a PCF Component in a canvas app receiving data from a plugin, there are some setup steps that must be completed to make this solution work:

1. **Import the latest version of the managed solution.** You can download this from the [releases](https://github.com/yannicowie/CanvasAuditHistory/releases) page. On completion of import you may see a warning advising you need to re-enter data source secrets, you can disregard this as no secrets are required - the plugin doesn't query any external data sources and is only using the Dataverse API to construct the audit data.

2. **Add the PCF Component** (code component) into your Canvas App.

3. **Add the `Canvas Audit Histories`** Dataverse table to your app's data sources. This is the virtual table included in the solution that enables the Canvas App to talk to the plugin and retreive the audit data.

4. Enter the following PowerFx code into the component's `auditDataJson` property. **You need to customise this PowerFx to your requirements** - passing a Target ID (record GUID) and Table Name (schema name) to retreive the record history for. Below shows an example record GUID from the `account` table.
  ```
  First(
      Filter(
          'Canvas Audit Histories', 
          'Target ID' = "0b70805c-b463-f111-a826-0022480b4c69", 
          'Table Name' = "account"
      )
  ).'Audit Payload'
  ```

5. Enter the following PowerFx code into the component's OnChange property:
  ```
  Refresh('Canvas Audit Histories')
  ```

5. **Optional configuration.** You can change the `Field Name Display` to choose if you'd like the component to show the display name, the schema name or both the display and schema name for changed fields. You can also change the `Date Format` property to either show the user's local settings (e.g. the date & time format configured in their web browser) or enforce a specific date format for all users (US, UK or ISO).
