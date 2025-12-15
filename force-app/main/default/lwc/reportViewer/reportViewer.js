import { LightningElement, api, track } from "lwc";
import runReport from "@salesforce/apex/ReportController.runReport";

export default class ReportViewer extends LightningElement {
    @api reportDeveloperName;
    @api reportTitle;
    @api reportIcon;
    @api lookups;
    @api aggregateFieldNames;
    @api showReportTable;

    @track reportData;
    @track aggregateFieldsList = [];

    columns = [];
    aggregateFieldNamesInput;
    isLoading = false;
    error;
    isGrouped = false;
    loadingText = "loading..."
    reportURL;
    groupingLabel;

    connectedCallback() {
        this.getReportData();
    }

    get reportLink() {
        return this.reportURL;
    }

    async getReportData() {
        this.isLoading = true;

        try {
            const data = await runReport({ reportName: this.reportDeveloperName });

            if (data === "Report not found") {
                this.error = data;
                return;
            }

            const result = JSON.parse(data);
            this.isGrouped = result.groupingsDown?.groupings?.length > 0;

            this.parseAggregateFields(result);
            this.parseColumns(result);
            this.parseRows(result);
        } catch (error) {
            console.error(error);
            this.error = error;
        } finally {
            this.isLoading = false;
        }
    }

    // -----------------------------------------------------
    // AGGREGATES
    // -----------------------------------------------------
    parseAggregateFields(result) {
        this.aggregateFieldNamesInput = (this.aggregateFieldNames || "")
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);

        const columnInfo = result?.reportExtendedMetadata?.aggregateColumnInfo || {};
        const columnValues = result?.factMap?.["T!T"]?.aggregates || [];

        this.aggregateFieldsList = [];

        const labelMap = {};
        Object.keys(columnInfo).forEach((key, idx) => {
            const col = columnInfo[key];
            labelMap[col.label] = idx;
        });

        this.aggregateFieldNamesInput.forEach((name) => {
            const index = labelMap[name];
            if (index !== undefined) {
                const raw = columnValues[index];
                this.aggregateFieldsList.push({
                    fieldName: name,
                    value: raw?.label ?? null
                });
            }
        });
    }

    // -----------------------------------------------------
    // COLUMNS (preserve detailColumns order)
    // -----------------------------------------------------
    parseColumns(result) {
        const detailColumnInfo = result.reportExtendedMetadata.detailColumnInfo || {};
        const detailColumnOrder = result.reportMetadata?.detailColumns || Object.keys(detailColumnInfo);
        const lookupArray = this.lookups ? this.lookups.split(",") : [];

        this.reportURL = "/" + result.reportMetadata.id;

        // build columns in the exact order of reportMetadata.detailColumns
        this.columns = detailColumnOrder.reduce((acc, colKey) => {
            const colDef = detailColumnInfo[colKey];
            if (!colDef) return acc; // skip if metadata missing

            if (lookupArray.includes(colKey)) {
                acc.push({
                    label: colDef.label,
                    fieldName: colDef.name + "Link",
                    type: "url",
                    typeAttributes: {
                        label: { fieldName: colDef.name },
                        target: "_blank"
                    }
                });
            } else {
                // use the report column key as fieldName (may contain dots)
                acc.push({
                    label: colDef.label,
                    fieldName: colKey,
                    type: "text"
                });
            }
            return acc;
        }, []);

        // Prepend Grouping column if grouped (so tree-grid first column shows group)
        if (this.isGrouped) {
            // extract grouping field label from groupingColumnInfo
            const groupingInfo = Object.values(result.reportExtendedMetadata.groupingColumnInfo)[0];
            this.groupingLabel = groupingInfo?.label || "Group";
            this.groupingLabel = this.groupingLabel.replace(
                /(\w)(\w*)/g,
                (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase()
            );

            this.columns.unshift({
                label: this.groupingLabel,
                fieldName: "groupLabel",
                type: "text"
            });
        }
    }

    // -----------------------------------------------------
    // ROWS
    // -----------------------------------------------------
    parseRows(result) {
        if (this.isGrouped) {
            this.reportData = this.buildGroupedData(result);
        } else {
            const rows = result.factMap?.["T!T"]?.rows || [];
            this.reportData = this.getData(rows);
        }
    }

    getData(rawRows) {
        return (rawRows || []).map((row, idx) => this.mapRow(row, `row-${idx}`));
    }

    // MAP ROW (non-grouped rows)
    mapRow(row, id) {
        const obj = { Id: id };

        // ALWAYS start at 0 — dataCells correspond to detailColumns order
        let dataCellIndex = 0;

        // iterate columns in the same order as built earlier; skip the synthetic "groupLabel" column
        for (let ci = 0; ci < this.columns.length; ci++) {
            const col = this.columns[ci];
            if (col.fieldName === "groupLabel") {
                // DO NOT increment dataCellIndex when skipping the synthetic grouping column
                continue;
            }

            const cell = row.dataCells[dataCellIndex];
            const isLookup = !!col.typeAttributes?.label?.fieldName;
            const keyName = isLookup ? col.typeAttributes.label.fieldName : col.fieldName;

            obj[keyName] = cell?.label ?? null;

            if (isLookup && cell?.value) {
                obj[keyName + "Link"] = "/" + cell.value;
            }

            dataCellIndex++;
        }

        return obj;
    }

    // -----------------------------------------------------
    // GROUPED ROWS
    // -----------------------------------------------------
    buildGroupedData(result) {
        const groups = result.groupingsDown?.groupings || [];
        const factMap = result.factMap || {};
        const data = [];

        groups.forEach((group) => {
            const factKey = `${group.key}!T`;
            const fact = factMap[factKey] || {};
            const rows = fact.rows || [];

            const children = rows.map((r, idx) => this.mapRowToColumns(r, idx, group.key));

            data.push({
                Id: `group-${group.key}`,
                groupLabel: group.label,
                _children: children
            });
        });

        return data;
    }

    // map grouped child row (same logic as mapRow)
    mapRowToColumns(row, index, groupKey) {
        const obj = { Id: `row-${groupKey}-${index}` };

        // ALWAYS start at 0 for dataCells
        let dataCellIndex = 0;

        for (let ci = 0; ci < this.columns.length; ci++) {
            const col = this.columns[ci];
            if (col.fieldName === "groupLabel") continue;

            const cell = row.dataCells[dataCellIndex];
            const isLookup = !!col.typeAttributes?.label?.fieldName;
            const keyName = isLookup ? col.typeAttributes.label.fieldName : col.fieldName;

            obj[keyName] = cell?.label ?? null;
            if (isLookup && cell?.value) {
                obj[keyName + "Link"] = "/" + cell.value;
            }

            dataCellIndex++;
        }

        return obj;
    }
}