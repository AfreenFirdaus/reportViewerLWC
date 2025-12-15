# Dynamic Report Viewer (LWC)

A reusable **Lightning Web Component** that renders **Salesforce tabular reports** anywhere in Lightning using the report’s **Developer Name**.

This component executes reports using Salesforce’s **standard reporting engine** and dynamically displays the report data, groupings, and aggregate values inside custom pages.

---

## 🚨 Problem This Solves

Salesforce does **not** allow tabular reports to be placed on:
- Record Pages  
- Home Pages  
- App Pages  

Only **report charts** and **dashboards** are supported. Dashboards come with layout, filtering, and performance limitations, and often hide the raw data users actually need.

This component allows you to:
- Display the **full report table**
- Show **groupings and aggregate values**
- Place reports **anywhere in Lightning**

No dashboards. No charts. Just data.

---

## ✨ Features

- Runs reports using **`ReportManager.runReport`** in Apex  
- Supports **grouped tabular reports**
- Displays **aggregate values** (SUM, COUNT, etc.) in a summary card
- Dynamically generates table columns in LWC
- Reusable and configuration-driven
- Works on **Record Pages, Home Pages, and App Pages**

---

## 🛠️ Architecture Overview

### Apex
- Uses `ReportManager.runReport()` to execute the report
- Extracts:
  - Report metadata
  - Groupings
  - Aggregate results
  - Row-level data
- Sends a structured response to LWC

### Lightning Web Component
- Accepts the **report developer name** as input
- Dynamically renders:
  - Aggregate summary card
  - Report table with groupings
- No hardcoded columns or report-specific logic

---

## ⚙️ Configuration

### LWC Properties

| Property | Type | Description |
|--------|------|------------|
| `reportDeveloperName` | String | Developer Name of the report |
| `reportTitle` | String | Title displayed on the component |
| `showReportTable` | Boolean | Toggle visibility of report table |
| `aggregateFieldNames` | String | Comma-separated aggregate field API names |
| `lookups` | Object | Optional lookup field mappings |

_Adjust property names as needed to match your implementation._

---

## 📦 Installation

1. Clone the repository or download the ZIP
2. Deploy using SFDX:
   ```bash
   sf project deploy start
