import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { AuditHistoryApp, IAuditHistoryAppProps } from "./AuditHistoryApp";

export class CanvasAuditHistory implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container: HTMLDivElement;
    private notifyOutputChanged: () => void;
    private refreshCount = 0;

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        this.container = container;
        this.notifyOutputChanged = notifyOutputChanged;
        // Keep track of the bound value
        this.refreshCount = context.parameters.refreshTrigger?.raw ?? 0;
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        const props: IAuditHistoryAppProps = {
            auditDataJson: context.parameters.auditDataJson?.raw ?? "",
            fieldNameDisplay: context.parameters.fieldNameDisplay?.raw ?? "DisplayName",
            dateFormat: context.parameters.dateFormat?.raw ?? "Local",
            
            // Pass a callback function down to React so the button can trigger an output change
            onRefreshRequested: () => {
                this.refreshCount++;
                this.notifyOutputChanged();
            }
        };

        ReactDOM.render(
            React.createElement(AuditHistoryApp, props),
            this.container
        );
    }

    public getOutputs(): IOutputs {
        return {
            refreshTrigger: this.refreshCount
        };
    }

    public destroy(): void {
        ReactDOM.unmountComponentAtNode(this.container);
    }
}