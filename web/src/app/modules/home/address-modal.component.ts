import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { UFS_BRASIL } from '../../utils/_constantes/constantes';
import { EnderecoResponse, UsuarioResponse } from '../../services/auth.models';
import { NotificacoesService } from '../../services/notificacoes.service';
import { UsuarioService } from '../../services/usuario.service';

interface ViaCepResponse {
	cep: string;
	logradouro: string;
	bairro: string;
	localidade: string;
	uf: string;
	erro?: boolean;
}

@Component({
	selector: 'app-address-modal',
	standalone: false,
	templateUrl: './address-modal.component.html',
	styleUrl: './address-modal.component.scss',
})
export class AddressModalComponent implements OnChanges {
	@Input() visible = false;
	@Input() isFirstAccess = false;
	@Input() enderecoInicial: EnderecoResponse | null = null;
	@Output() visibleChange = new EventEmitter<boolean>();
	@Output() salvo = new EventEmitter<UsuarioResponse>();

	readonly ufs = UFS_BRASIL;
	readonly salvando = signal(false);
	readonly buscandoCep = signal(false);

	readonly form = new FormGroup({
		cep: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)] }),
		rua: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
		bairro: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
		numero: new FormControl<string>('', {
			nonNullable: true,
			validators: [Validators.required, Validators.pattern(/^[0-9A-Za-z/-]{1,10}$/)],
		}),
		cidade: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
		estado: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
		complemento: new FormControl<string>('', { nonNullable: true, validators: [Validators.maxLength(60)] }),
	});

	constructor(
		private readonly http: HttpClient,
		private readonly usuarioService: UsuarioService,
		private readonly notificacoesService: NotificacoesService,
	) {}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['enderecoInicial'] && this.enderecoInicial) {
			this.form.patchValue({
				cep: this.enderecoInicial.cep ?? '',
				rua: this.enderecoInicial.rua ?? '',
				bairro: this.enderecoInicial.bairro ?? '',
				numero: this.enderecoInicial.numero ?? '',
				cidade: this.enderecoInicial.cidade ?? '',
				estado: this.enderecoInicial.estado ?? '',
				complemento: this.enderecoInicial.complemento ?? '',
			});
		}
	}

	buscarCep(): void {
		const cep = this.form.controls.cep.value.replace(/\D/g, '');
		if (cep.length !== 8) {
			this.notificacoesService.erro('CEP inválido. Use 8 dígitos.');
			return;
		}

		this.buscandoCep.set(true);
		this.http
			.get<ViaCepResponse>(`https://viacep.com.br/ws/${cep}/json/`)
			.pipe(catchError(() => of(null)))
			.subscribe((resultado) => {
				this.buscandoCep.set(false);
				if (!resultado || resultado.erro) {
					this.notificacoesService.erro('CEP não encontrado.');
					return;
				}
				this.form.patchValue({
					rua: resultado.logradouro,
					bairro: resultado.bairro,
					cidade: resultado.localidade,
					estado: resultado.uf,
				});
			});
	}

	cancelar(): void {
		if (this.isFirstAccess) {
			return;
		}
		this.visible = false;
		this.visibleChange.emit(false);
	}

	salvar(): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		this.salvando.set(true);
		this.usuarioService.atualizarEndereco(this.form.getRawValue()).subscribe({
			next: (usuario) => {
				this.salvando.set(false);
				this.notificacoesService.sucesso('Endereço salvo com sucesso!');
				this.visible = false;
				this.visibleChange.emit(false);
				this.salvo.emit(usuario);
			},
			error: (erro) => {
				this.salvando.set(false);
				this.notificacoesService.erro(erro?.message ?? 'Não foi possível salvar o endereço.');
			},
		});
	}
}
