import {Component, EventEmitter, Output} from "@angular/core";

/**
 * This component represents the "About & Controls" modal.
 */
@Component({
    selector: "viz-info-dialog",
    templateUrl: "./info-dialog.component.html",
    styleUrls: ["./info-dialog.component.scss"]
})
export class InfoDialogComponent {
    // Makes creation of the table at the end a breeze.
    readonly SKILL_QUESTIONS: { name: string; question: string }[] = [{
        name: "Visualization", question: "How would you rate your Information Visualization skills?"
    }, {
        name: "Statistics", question: "How would you rate your statistical skills?"
    }, {
        name: "Maths", question: "How would you rate your mathematics skills?"
    }, {
        name: "Art", question: "How would you rate your drawing and artistic skills?"
    }, {
        name: "Computers", question: "How would you rate your computer usage skills?"
    }, {
        name: "Programming", question: "How would you rate your programming skills?"
    }, {
        name: "Graphics", question: "How would you rate your computer graphics programming skills?"
    }, {
        name: "HCI", question: "How would you rate your human-computer interaction programming skills?"
    }, {
        name: "UX", question: "How would you rate your user experience evaluation skills?"
    }, {
        name: "Communication", question: "How would you rate your communication skills?"
    }, {
        name: "Collab", question: "How would you rate your collaboration skills?"
    }, {
        name: "Repositories", question: "How would you rate your code repository skills?"
    }];

    // When the component wants to be removed, e.g. background clicked or close button clicked.
    @Output() closeRequested = new EventEmitter<void>();

    constructor() {
    }
}
