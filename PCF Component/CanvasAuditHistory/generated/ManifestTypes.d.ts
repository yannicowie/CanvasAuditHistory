/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    auditDataJson: ComponentFramework.PropertyTypes.StringProperty;
    fieldNameDisplay: ComponentFramework.PropertyTypes.EnumProperty<"DisplayName" | "LogicalName" | "Both">;
    dateFormat: ComponentFramework.PropertyTypes.EnumProperty<"Local" | "US" | "UK" | "ISO">;
    refreshTrigger: ComponentFramework.PropertyTypes.WholeNumberProperty;
}
export interface IOutputs {
    refreshTrigger?: number;
}
