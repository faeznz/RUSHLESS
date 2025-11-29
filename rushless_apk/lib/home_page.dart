import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:wakelock/wakelock.dart';
import 'package:flutter_windowmanager/flutter_windowmanager.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _Config {
  final String url;
  final String pin;

  _Config({required this.url, required this.pin});
}

class _HomePageState extends State<HomePage> with WidgetsBindingObserver {
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  late Future<_Config> _configFuture;
  late final WebViewController _controller;

  bool _cheatingDetected = false;
  bool _isSubmitting = false;

  Timer? _heartbeatTimer;

  /// NEW → lock app until supervisor enters PIN
  bool _initialPinVerified = false;

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addObserver(this);

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFFFFFFF))
      ..enableZoom(false);

    /// Prevent screen off
    Wakelock.enable();

    /// Prevent screen recording & screenshot
    FlutterWindowManager.addFlags(FlutterWindowManager.FLAG_SECURE);

    /// Load config from server
    _configFuture = _fetchConfig().then((config) {
      return config;
    });

    /// Force immersive mode
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

    /// Keep immersive mode active
    Timer.periodic(const Duration(seconds: 3), (_) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    });

    /// Detect jika status bar / navigation bar muncul
    SystemChrome.setSystemUIChangeCallback((bool visible) async {
      await Future.delayed(Duration.zero);
      if (visible) {
        _triggerCheating(reason: "system_ui_visible");
      }
    });

    _startHeartbeat();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _heartbeatTimer?.cancel();
    Wakelock.disable();
    super.dispose();
  }

  // LIFECYCLE — detect keluar aplikasi / background langsung lock
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);

    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      _triggerCheating(reason: "app_backgrounded");
    }
  }

  Future<_Config> _fetchConfig() async {
    final response = await http.get(
      Uri.parse(
          'https://rushless-mobile-config.faeznz.my.id/api/config/mobile'),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final url = (data['link_web'] as String?)?.trim() ?? '';
      final pin = (data['pin_app'] as String?)?.trim() ?? '';

      if (url.isEmpty) throw Exception('URL kosong');
      if (pin.isEmpty) throw Exception('PIN tidak disediakan oleh API');

      return _Config(url: url, pin: pin);
    } else {
      throw Exception('Gagal mengambil konfigurasi (${response.statusCode})');
    }
  }

  Future<String?> _fetchRealtimePin() async {
    try {
      final response = await http.get(
        Uri.parse(
            'https://rushless-mobile-config.faeznz.my.id/api/config/mobile'),
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final pin = (json['pin_app'] as String?)?.trim();
        return pin;
      }
    } catch (e) {}

    return null; // error
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      try {
        // Kirim heartbeat jika perlu
      } catch (e) {}
    });
  }

  // === CHEATING HANDLER ===
  void _triggerCheating({required String reason}) {
    if (_cheatingDetected) return;

    setState(() {
      _cheatingDetected = true;
    });

    _reportCheating(reason: reason, ts: DateTime.now());
  }

  Future<void> _reportCheating(
      {required String reason, required DateTime ts}) async {
    if (_isSubmitting) return;
    _isSubmitting = true;

    try {
      // await http.post(...)
    } catch (e) {
      // ignore
    } finally {
      _isSubmitting = false;
    }
  }

  Future<bool> _verifySupervisorPin(String inputPin) async {
    final realtimePin = await _fetchRealtimePin();

    if (realtimePin == null || realtimePin.isEmpty) {
      return false; // gagal ambil pin → tetap tolak
    }

    return inputPin == realtimePin;
  }

  // ============================================================
  //   NEW: PIN SCREEN BEFORE OPENING THE TEST (FIRST LAUNCH)
  // ============================================================
  Widget _initialPinScreen(_Config config) {
    final controller = TextEditingController();

    return Scaffold(
      backgroundColor: Colors.white,
      body: WillPopScope(
        onWillPop: () async => false,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  "Masukkan PIN Aplikasi",
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: controller,
                  obscureText: true,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: "PIN",
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () async {
                    final input = controller.text.trim();
                    if (input == config.pin) {
                      setState(() {
                        _initialPinVerified = true;
                      });

                      _controller.loadRequest(Uri.parse(config.url));
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("PIN salah!")),
                      );
                    }
                  },
                  child: const Text("Masuk"),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ============================================================
  //       PIN SUPERVISOR (when cheating detected)
  // ============================================================
  void _showSupervisorUnlockDialog() {
    final pinController = TextEditingController();

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Verifikasi Pengawas'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Masukkan PIN pengawas untuk membuka aplikasi.'),
            const SizedBox(height: 8),
            TextFormField(
              controller: pinController,
              obscureText: true,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(hintText: 'PIN Pengawas'),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () async {
              final pin = pinController.text.trim();
              if (pin.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('PIN pengawas tidak boleh kosong'),
                  ),
                );
                return;
              }

              final ok = await _verifySupervisorPin(pin);
              if (ok) {
                setState(() {
                  _cheatingDetected = false;
                });
                if (mounted) Navigator.of(context).pop();
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('PIN pengawas tidak valid')),
                );
              }
            },
            child: const Text('Buka'),
          ),
        ],
      ),
    );
  }

  // ============================================================
  //                          UI
  // ============================================================
  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_Config>(
      future: _configFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasError) {
          return _errorView(snapshot.error.toString());
        }

        if (!snapshot.hasData) {
          return const Scaffold(
            body: Center(child: Text("Tidak ada data konfigurasi")),
          );
        }

        final config = snapshot.data!;

        // === NEW — FIRST LAUNCH PIN GATE ===
        if (!_initialPinVerified) {
          return _initialPinScreen(config);
        }

        return WillPopScope(
          onWillPop: () async => false,
          child: Scaffold(
            key: _scaffoldKey,
            appBar: AppBar(
              title: const Text('Aplikasi Ujian',
                  style: TextStyle(color: Colors.white)),
              backgroundColor: Colors.blue[900],
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Muat Ulang Halaman',
                  color: Colors.white,
                  onPressed: () {
                    _controller.reload();
                  },
                ),
              ],
            ),
            body: Stack(
              children: [
                WebViewWidget(controller: _controller),
                if (_cheatingDetected) _lockOverlay(),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _errorView(String message) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Gagal memuat.\n$message',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _configFuture = _fetchConfig();
                });
              },
              child: const Text('Coba Lagi'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _lockOverlay() {
    return Positioned.fill(
      child: Container(
        color: Colors.black.withOpacity(0.85),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.lock, size: 64, color: Colors.white),
              const SizedBox(height: 16),
              const Text(
                'Aplikasi dikunci.\nMinimal pengawas untuk membuka kunci.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontSize: 18),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _showSupervisorUnlockDialog,
                child: const Text('Buka Aplikasi'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
