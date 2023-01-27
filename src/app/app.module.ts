import {NgModule} from "@angular/core";
import {BrowserModule} from "@angular/platform-browser";
import {AppComponent} from "./app.component";
import {HeatmapComponent} from "../core/components/heatmap/heatmap.component";
import {SkillRadarComponent} from "../core/components/skillradar/skill-radar.component";
import {DescriptionsComponent} from "../core/components/descriptions/descriptions.component";
import {InfoDialogComponent} from "../core/components/info-dialog/info-dialog.component";

/**
 * Covers the whole application.
 * No need for lazy-loading and submodules in this one.
 */
@NgModule({
    declarations: [
        AppComponent,
        SkillRadarComponent,
        DescriptionsComponent,
        InfoDialogComponent,
        HeatmapComponent,
    ],
    imports: [
        BrowserModule,
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}
