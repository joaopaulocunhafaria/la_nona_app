import { Component, OnInit } from '@angular/core';
import { TelemetryService } from './services/telemetry.service';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	standalone: false,
	styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
	constructor(private readonly telemetryService: TelemetryService) {}

	ngOnInit(): void {
		this.telemetryService.iniciar();
	}
}
