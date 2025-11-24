import 'dart:async';
import 'dart:io';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with WidgetsBindingObserver {
  late final WebViewController _controller;
  static const platform = MethodChannel('com.example.rushless_apk/lock');
  bool _isLoading = true;
  String? _errorMessage;
  String? _currentUrl;
  String _pageTitle = 'Aplikasi Ujian';
  bool _canGoBack = false;
  bool _canGoForward = false;
  bool _isLocked = false; // Status lock/unlock

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // URL default
    final String url = 'http://192.168.0.13:3000';
    _currentUrl = url;

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'FlutterConsole',
        onMessageReceived: (JavaScriptMessage message) {
          _handleConsoleMessage(message.message);
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            if (mounted) {
              setState(() {
                _isLoading = true;
                _errorMessage = null;
                _currentUrl = url;
              });
            }
            _updateNavigationState();
            print('Page started loading: $url');
          },
          onPageFinished: (String url) async {
            if (mounted) {
              final title = await _controller.getTitle();
              setState(() {
                _isLoading = false;
                _currentUrl = url;
                _pageTitle = title ?? 'Aplikasi Ujian';
              });
            }
            _updateNavigationState();
            print('Page finished loading: $url');

            // Inject JavaScript untuk intercept console.log
            await _injectConsoleInterceptor();
          },
          onWebResourceError: (WebResourceError error) {
            // Hanya tampilkan error screen untuk error koneksi pada halaman utama
            // Error untuk resource tambahan (API, SSE, dll) tidak perlu tampilkan error screen
            if (mounted) {
              final code = error.errorCode;
              final failedUrl = error.url ?? '';

              // Cek apakah ini error untuk halaman utama atau resource tambahan
              final isMainPageError = _isMainPageError(failedUrl);

              // Hanya tampilkan error screen jika:
              // 1. Ini adalah error koneksi (code -1, -2, -7, -105)
              // 2. DAN ini adalah error untuk halaman utama (bukan resource tambahan)
              if (_isConnectionError(code) && isMainPageError) {
                String errorMsg = _getErrorMessage(error);
                setState(() {
                  _isLoading = false;
                  _errorMessage = errorMsg;
                });
              } else {
                // Untuk error resource tambahan atau error lainnya, biarkan webview menampilkan kontennya
                setState(() {
                  _isLoading = false;
                  _errorMessage = null; // Jangan tampilkan error screen
                });
                // Log error resource tambahan dengan level yang lebih rendah
                print('Resource error (ignored): ${error.description}');
                print('Failed resource URL: $failedUrl');
              }
            }
            _updateNavigationState();
          },
          onHttpError: (HttpResponseError error) {
            // HTTP error (404, 500, dll) biarkan webview menampilkan error page dari server
            if (mounted) {
              setState(() {
                _isLoading = false;
                _errorMessage =
                    null; // Jangan tampilkan error screen, biarkan webview menampilkan
              });
            }
            _updateNavigationState();
            print('HTTP error: ${error.response?.statusCode}');
          },
          onNavigationRequest: (NavigationRequest request) {
            // Allow all navigation requests
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(url));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _stopSystemBarHiding();
    _unlockDevice();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_isLocked && Platform.isAndroid) {
      if (state == AppLifecycleState.resumed) {
        // Pastikan system bars tetap tersembunyi saat resume
        SystemChrome.setEnabledSystemUIMode(
          SystemUiMode.immersiveSticky,
          overlays: [],
        );
      }
    }
  }

  // Inject JavaScript untuk intercept console.log
  Future<void> _injectConsoleInterceptor() async {
    const script = '''
      (function() {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalInfo = console.info;
        
        function interceptConsole(method, original) {
          return function(...args) {
            const message = args.map(arg => {
              if (typeof arg === 'object') {
                try {
                  return JSON.stringify(arg);
                } catch(e) {
                  return String(arg);
                }
              }
              return String(arg);
            }).join(' ');
            
            const lowerMessage = message.toLowerCase();
            
            // Kirim ke Flutter jika mengandung "locked" atau "unlocked"
            if (lowerMessage.includes('locked') || lowerMessage.includes('unlocked')) {
              if (window.FlutterConsole) {
                window.FlutterConsole.postMessage(message);
              }
            }
            
            // Panggil original console method
            original.apply(console, args);
          };
        }
        
        console.log = interceptConsole('log', originalLog);
        console.error = interceptConsole('error', originalError);
        console.warn = interceptConsole('warn', originalWarn);
        console.info = interceptConsole('info', originalInfo);
      })();
    ''';

    try {
      await _controller.runJavaScript(script);
    } catch (e) {
      print('Error injecting console interceptor: $e');
    }
  }

  // Handle console message dari web
  void _handleConsoleMessage(String message) {
    final lowerMessage = message.toLowerCase().trim();

    if (lowerMessage.contains('locked') && !_isLocked) {
      _lockDevice();
    } else if (lowerMessage.contains('unlocked') && _isLocked) {
      _unlockDevice();
    }
  }

  // Enable kiosk mode
  Future<void> _lockDevice() async {
    if (_isLocked) return;

    setState(() {
      _isLocked = true;
    });

    if (Platform.isAndroid) {
      // Lock orientation to portrait only during kiosk mode
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.portraitDown,
      ]);

      // Hide system bars (notification bar and navigation bar) for kiosk mode
      SystemChrome.setEnabledSystemUIMode(
        SystemUiMode.immersiveSticky,
        overlays: [], // Hide all system overlays
      );

      // Notify native code untuk enable kiosk mode (lock task mode)
      try {
        await platform.invokeMethod('setLocked', {'locked': true});
      } catch (e) {
        print('Error enabling kiosk mode: $e');
      }

      // Periodically re-hide system bars to prevent notification bar from appearing
      _startSystemBarHiding();
    }

    print(
        'Kiosk mode ENABLED - Device locked, navigation and notification bar blocked');
  }

  // Disable kiosk mode
  Future<void> _unlockDevice() async {
    if (!_isLocked) return;

    setState(() {
      _isLocked = false;
    });

    if (Platform.isAndroid) {
      // Stop hiding system bars
      _stopSystemBarHiding();

      // Restore all orientations when exiting kiosk mode
      SystemChrome.setPreferredOrientations(DeviceOrientation.values);

      // Show system bars when exiting kiosk mode
      SystemChrome.setEnabledSystemUIMode(
        SystemUiMode.edgeToEdge,
        overlays: SystemUiOverlay.values, // Show all system overlays
      );

      // Notify native code untuk disable kiosk mode (stop lock task)
      try {
        await platform.invokeMethod('setLocked', {'locked': false});
      } catch (e) {
        print('Error disabling kiosk mode: $e');
      }
    }

    print(
        'Kiosk mode DISABLED - Device unlocked, navigation and notification bar restored');
  }

  // Timer untuk terus menyembunyikan system bars
  Timer? _systemBarHidingTimer;

  void _startSystemBarHiding() {
    _stopSystemBarHiding(); // Stop existing timer if any
    // Hide system bars every 2 seconds to prevent notification bar from appearing
    _systemBarHidingTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (_isLocked && Platform.isAndroid) {
        // Re-hide system bars periodically
        SystemChrome.setEnabledSystemUIMode(
          SystemUiMode.immersiveSticky,
          overlays: [], // Hide all system overlays
        );
      } else {
        _stopSystemBarHiding();
      }
    });
  }

  void _stopSystemBarHiding() {
    _systemBarHidingTimer?.cancel();
    _systemBarHidingTimer = null;
  }

  // Cek apakah error adalah error koneksi yang perlu ditampilkan error screen
  bool _isConnectionError(int errorCode) {
    // Error koneksi yang perlu ditampilkan error screen:
    // -1: ERR_FAILED (koneksi gagal)
    // -2: ERR_INTERNET_DISCONNECTED (tidak ada internet)
    // -7: ERR_TIMED_OUT (timeout koneksi)
    // -105: ERR_NAME_NOT_RESOLVED (DNS tidak bisa resolve)
    return errorCode == -1 ||
        errorCode == -2 ||
        errorCode == -7 ||
        errorCode == -105;
  }

  // Cek apakah error terjadi pada halaman utama atau resource tambahan
  bool _isMainPageError(String failedUrl) {
    if (failedUrl.isEmpty || _currentUrl == null) {
      return true; // Jika tidak bisa ditentukan, anggap sebagai error utama
    }

    final currentUri = Uri.tryParse(_currentUrl!);
    final failedUri = Uri.tryParse(failedUrl);

    if (currentUri == null || failedUri == null) {
      return true;
    }

    // Jika URL error sama dengan URL utama, ini adalah error halaman utama
    if (failedUrl == _currentUrl) {
      return true;
    }

    // Jika host berbeda, ini adalah resource tambahan (API, SSE, dll)
    if (currentUri.host != failedUri.host ||
        currentUri.port != failedUri.port) {
      return false; // Resource tambahan dari server lain/port lain
    }

    // Jika path berbeda dan mengandung /api/ atau /stream/, ini adalah resource tambahan
    if (failedUri.path.contains('/api/') ||
        failedUri.path.contains('/stream') ||
        failedUri.path.contains('/static/') ||
        failedUri.path.contains('/assets/')) {
      return false; // Resource tambahan (API, SSE, static files)
    }

    // Default: anggap sebagai error halaman utama
    return true;
  }

  String _getErrorMessage(WebResourceError error) {
    final code = error.errorCode;

    // Handle specific error codes (hanya error koneksi)
    if (code == -1 || code == -2) {
      // ERR_FAILED or ERR_INTERNET_DISCONNECTED
      return 'Gagal memuat halaman\n\n'
          'Kemungkinan penyebab:\n'
          '• Server tidak berjalan\n'
          '• Koneksi jaringan terputus\n'
          '• Firewall memblokir koneksi\n\n'
          'Error Code: $code';
    } else if (code == -7) {
      // ERR_TIMED_OUT
      return 'Waktu koneksi habis\n\n'
          'Server tidak merespons dalam waktu yang ditentukan.\n'
          'Pastikan server berjalan dan dapat diakses.\n\n'
          'Error Code: $code';
    } else if (code == -105) {
      // ERR_NAME_NOT_RESOLVED
      return 'Tidak dapat menemukan server\n\n'
          'DNS tidak dapat menyelesaikan alamat.\n'
          'Pastikan koneksi jaringan aktif.\n\n'
          'Error Code: $code';
    }

    // Fallback untuk error koneksi lainnya
    return 'Gagal memuat halaman\n\n'
        'Koneksi tidak dapat dibuat.\n'
        'Pastikan koneksi jaringan aktif dan server berjalan.\n\n'
        'Error Code: $code';
  }

  Future<void> _updateNavigationState() async {
    final canGoBack = await _controller.canGoBack();
    final canGoForward = await _controller.canGoForward();
    if (mounted) {
      setState(() {
        _canGoBack = canGoBack;
        _canGoForward = canGoForward;
      });
    }
  }

  void _goBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      _updateNavigationState();
    }
  }

  void _goForward() async {
    if (await _controller.canGoForward()) {
      await _controller.goForward();
      _updateNavigationState();
    }
  }

  void _reload() {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    _controller.reload();
  }

  void _retryWithDelay() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    // Wait a bit before retrying
    await Future.delayed(const Duration(seconds: 1));

    if (mounted && _currentUrl != null) {
      _controller.loadRequest(Uri.parse(_currentUrl!));
    }
  }

  // Password untuk unlock kiosk mode (default: "admin123")
  // Bisa diubah sesuai kebutuhan
  static const String _unlockPassword = "admin123";

  void _showHelpDialog() {
    if (_isLocked) {
      // Jika dalam mode lock, tampilkan prompt yang lebih tersembunyi
      _showHiddenUnlockPrompt();
    } else {
      // Jika tidak dalam mode lock, tampilkan info bantuan biasa
      showDialog(
        context: context,
        builder: (BuildContext context) {
          return AlertDialog(
            title: const Text('Bantuan'),
            content: const Text(
              'Aplikasi ini digunakan untuk ujian online dengan mode kiosk.\n\n'
              'Fitur:\n'
              '• Mode kiosk untuk mencegah keluar dari aplikasi\n'
              '• Blokir tombol navigasi (Home, Back, Recent Apps)\n'
              '• Blokir panel notifikasi\n\n'
              'Untuk membuka mode lock, gunakan tombol bantuan saat mode lock aktif.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Tutup'),
              ),
            ],
          );
        },
      );
    }
  }

  void _showHiddenUnlockPrompt() {
    final TextEditingController passwordController = TextEditingController();
    final tapRecognizer = TapGestureRecognizer();

    showDialog(
      context: context,
      barrierDismissible: true, // Bisa ditutup dengan tap di luar
      builder: (BuildContext dialogContext) {
        bool isPasswordVisible = false;
        bool showPasswordField = false;

        return PopScope(
          canPop:
              false, // Tidak bisa ditutup dengan back button saat dalam mode lock
          child: StatefulBuilder(
            builder: (context, setDialogState) {
              tapRecognizer.onTap = () {
                setDialogState(() {
                  showPasswordField = true;
                });
              };

              return AlertDialog(
                title: Row(
                  children: [
                    Icon(
                      showPasswordField
                          ? Icons.lock_open_outlined
                          : Icons.info_outline,
                      size: 24,
                      color: Colors.blueGrey[700],
                    ),
                    const SizedBox(width: 8),
                    Text(
                      showPasswordField
                          ? 'Masukkan Password'
                          : 'Mode Lock Aktif',
                    ),
                  ],
                ),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (!showPasswordField) ...[
                      RichText(
                        textAlign: TextAlign.center,
                        text: TextSpan(
                          style: const TextStyle(
                            fontSize: 14,
                            color: Colors.black87,
                          ),
                          children: [
                            const TextSpan(
                              text:
                                  'Aplikasi ini dalam mode pengembangan, ',
                            ),
                            TextSpan(
                              text: 'buka kunci',
                              style: const TextStyle(
                                color: Colors.blue,
                                decoration: TextDecoration.underline,
                                fontWeight: FontWeight.w600,
                              ),
                              recognizer: tapRecognizer,
                            ),
                            const TextSpan(
                              text:
                                  ' untuk membatalkan isolate mode. Hanya pengawas yang boleh melanjutkan.',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (showPasswordField) ...[
                      const Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Masukkan password pengawas:',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: passwordController,
                        obscureText: !isPasswordVisible,
                        autofocus: true,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          border: const OutlineInputBorder(),
                          prefixIcon: const Icon(Icons.lock),
                          suffixIcon: IconButton(
                            icon: Icon(
                              isPasswordVisible
                                  ? Icons.visibility
                                  : Icons.visibility_off,
                            ),
                            onPressed: () {
                              setDialogState(() {
                                isPasswordVisible = !isPasswordVisible;
                              });
                            },
                          ),
                        ),
                        onSubmitted: (value) {
                          _handleUnlockPassword(value, dialogContext);
                        },
                      ),
                    ],
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(dialogContext).pop(),
                    child: const Text('Tutup'),
                  ),
                  if (showPasswordField)
                    ElevatedButton.icon(
                      onPressed: () {
                        _handleUnlockPassword(
                          passwordController.text,
                          dialogContext,
                        );
                      },
                      icon: const Icon(Icons.lock_open),
                      label: const Text('Buka'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                      ),
                    ),
                ],
              );
            },
          ),
        );
      },
    ).then((_) {
      tapRecognizer.dispose();
    });
  }

  void _handleUnlockPassword(String password, BuildContext dialogContext) {
    if (password == _unlockPassword) {
      // Password benar, unlock device
      Navigator.of(dialogContext).pop(); // Tutup dialog
      _unlockDevice();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Mode lock berhasil dibuka'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 2),
        ),
      );
    } else {
      // Password salah
      showDialog(
        context: dialogContext,
        builder: (BuildContext context) {
          return AlertDialog(
            title: const Text('Password Salah'),
            content: const Text('Password yang Anda masukkan tidak benar.'),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop(); // Tutup dialog error
                  // Tampilkan kembali dialog password
                  Navigator.of(dialogContext).pop();
                  _showHiddenUnlockPrompt();
                },
                child: const Text('Coba Lagi'),
              ),
            ],
          );
        },
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_isLocked, // Block back button saat kiosk mode aktif
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            _pageTitle,
            style: const TextStyle(fontSize: 16),
            overflow: TextOverflow.ellipsis,
          ),
          backgroundColor: Colors.blue[900],
          foregroundColor: Colors.white,
          leading: _isLocked
              ? null // Hide back button saat kiosk mode aktif
              : IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: _canGoBack ? _goBack : null,
                  tooltip: 'Back',
                ),
          actions: [
            if (!_isLocked) // Hanya tampilkan saat tidak locked
              ...[
                IconButton(
                  icon: const Icon(Icons.arrow_forward),
                  onPressed: _canGoForward ? _goForward : null,
                  tooltip: 'Forward',
                ),
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: _reload,
                  tooltip: 'Reload',
                ),
              ],
          ],
        ),
        body: Column(
          children: [
            if (_isLoading && _errorMessage == null)
              const LinearProgressIndicator(
                backgroundColor: Colors.grey,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
              ),
            Expanded(
              child: Stack(
                children: [
                  WebViewWidget(controller: _controller),
                  if (_isLoading && _errorMessage == null)
                    Container(
                      color: Colors.white,
                      child: const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(),
                            SizedBox(height: 16),
                            Text('Memuat halaman...'),
                          ],
                        ),
                      ),
                    ),
                  if (_errorMessage != null)
                    Container(
                      color: Colors.white,
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.error_outline,
                                size: 64,
                                color: Colors.red,
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'Gagal memuat halaman',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _errorMessage!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: Colors.grey),
                              ),
                              const SizedBox(height: 24),
                              ElevatedButton.icon(
                                onPressed: _retryWithDelay,
                                icon: const Icon(Icons.refresh),
                                label: const Text('Coba Lagi'),
                                style: ElevatedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 20,
                                    vertical: 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  // Floating help button - fixed di pojok kanan bawah
                  Positioned(
                    right: 16,
                    bottom: 16,
                    child: Material(
                      color: Colors.transparent,
                      child: Tooltip(
                        message: 'Bantuan',
                        child: InkWell(
                          onTap: _showHelpDialog,
                          borderRadius: BorderRadius.circular(24),
                          child: Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.85),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.blueGrey.withOpacity(0.4),
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.15),
                                  blurRadius: 6,
                                  spreadRadius: 1,
                                ),
                              ],
                            ),
                            child: Icon(
                              Icons.help_outline,
                              color: Colors.blueGrey[700],
                              size: 22,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
