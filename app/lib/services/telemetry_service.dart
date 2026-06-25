import 'dart:async';
import 'dart:math';

import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/api/api_client.dart';

/// Coleta de telemetria de uso no app mobile. Cria uma sessao ao abrir, conta o
/// tempo ativo (apenas com o app em primeiro plano), envia heartbeats e marca o
/// fim ao encerrar o app. Identifica anonimos por um id local persistido; o
/// usuario logado e' associado no backend via JWT (anexado pelo [ApiClient]).
///
/// Singleton observador do ciclo de vida do app. Todas as chamadas sao
/// best-effort: falhas sao silenciosas e nunca afetam o uso do app.
class TelemetryService with WidgetsBindingObserver {
  TelemetryService._();

  static final TelemetryService instance = TelemetryService._();

  static const String _anonymousIdKey = 'telemetryAnonymousId';
  static const Duration _heartbeatInterval = Duration(seconds: 30);

  final ApiClient _api = ApiClient.instance;
  final Stopwatch _stopwatch = Stopwatch();

  String? _anonymousId;
  String? _sessionId;
  Timer? _heartbeatTimer;
  bool _iniciado = false;

  int get _activeSeconds => _stopwatch.elapsed.inSeconds;

  /// Inicia a coleta. Idempotente. Deve ser chamado no `main()` apos o
  /// SessionStore estar inicializado.
  Future<void> iniciar() async {
    if (_iniciado) return;
    _iniciado = true;

    _anonymousId = await _carregarAnonymousId();
    WidgetsBinding.instance.addObserver(this);
    _stopwatch.start();
    _iniciarHeartbeat();
    await _iniciarSessao();
  }

  /// Registra a visualizacao do detalhe de um item do cardapio.
  void registrarVisualizacaoItem(String menuItemId) {
    _api.post(
      '/telemetry/item-views',
      body: {
        'menuItemId': menuItemId,
        'anonymousId': _anonymousId,
        'platform': 'MOBILE',
      },
    ).catchError((_) => null);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        if (!_stopwatch.isRunning) _stopwatch.start();
        _iniciarHeartbeat();
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
        _stopwatch.stop();
        _pararHeartbeat();
        _enviarHeartbeat();
        break;
      case AppLifecycleState.detached:
        _encerrarSessao();
        break;
    }
  }

  Future<void> _iniciarSessao() async {
    try {
      final resposta = await _api.post(
        '/telemetry/sessions',
        body: {'anonymousId': _anonymousId, 'platform': 'MOBILE'},
      );
      if (resposta is Map && resposta['sessionId'] is String) {
        _sessionId = resposta['sessionId'] as String;
      }
    } catch (_) {
      // best-effort: segue sem sessao
    }
  }

  void _iniciarHeartbeat() {
    _heartbeatTimer ??= Timer.periodic(_heartbeatInterval, (_) => _enviarHeartbeat());
  }

  void _pararHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  void _enviarHeartbeat() {
    final id = _sessionId;
    if (id == null) return;
    _api.post(
      '/telemetry/sessions/$id/heartbeat',
      body: {'activeSeconds': _activeSeconds},
    ).catchError((_) => null);
  }

  void _encerrarSessao() {
    final id = _sessionId;
    if (id == null) return;
    _api.post(
      '/telemetry/sessions/$id/end',
      body: {'activeSeconds': _activeSeconds},
    ).catchError((_) => null);
  }

  Future<String> _carregarAnonymousId() async {
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(_anonymousIdKey);
    if (id == null || id.isEmpty) {
      id = _gerarId();
      await prefs.setString(_anonymousIdKey, id);
    }
    return id;
  }

  String _gerarId() {
    final rnd = Random.secure();
    final bytes = List<int>.generate(16, (_) => rnd.nextInt(256));
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }
}
