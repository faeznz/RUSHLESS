import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late final WebViewController _controller;
  bool _isLoading = true;
  String? _errorMessage;
  String? _currentUrl;
  String _pageTitle = 'Aplikasi Ujian';
  bool _canGoBack = false;
  bool _canGoForward = false;

  @override
  void initState() {
    super.initState();

    // URL default
    final String url = 'http://192.168.0.13:3000';
    _currentUrl = url;

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
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
    final description = error.description;

    // Handle specific error codes (hanya error koneksi)
    if (code == -1 || code == -2) {
      // ERR_FAILED or ERR_INTERNET_DISCONNECTED
      return 'Gagal memuat halaman\n\n'
          'Kemungkinan penyebab:\n'
          '• Server tidak berjalan di $_currentUrl\n'
          '• Koneksi jaringan terputus\n'
          '• Firewall memblokir koneksi\n'
          '• IP address tidak benar\n\n'
          'Error Code: $code\n'
          'Detail: ${description.isNotEmpty ? description : "Unknown error"}';
    } else if (code == -7) {
      // ERR_TIMED_OUT
      return 'Waktu koneksi habis\n\n'
          'Server tidak merespons dalam waktu yang ditentukan.\n'
          'Pastikan server berjalan dan dapat diakses.\n\n'
          'Error Code: $code';
    } else if (code == -105) {
      // ERR_NAME_NOT_RESOLVED
      return 'Tidak dapat menemukan server\n\n'
          'DNS tidak dapat menyelesaikan alamat:\n$_currentUrl\n\n'
          'Pastikan IP address atau hostname benar.\n'
          'Error Code: $code';
    }

    // Fallback untuk error koneksi lainnya
    return 'Gagal memuat halaman\n\n'
        'Koneksi tidak dapat dibuat ke:\n$_currentUrl\n\n'
        'Error Code: $code\n'
        'Detail: ${description.isNotEmpty ? description : "Unknown error"}';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _pageTitle,
              style: const TextStyle(fontSize: 16),
              overflow: TextOverflow.ellipsis,
            ),
            if (_currentUrl != null)
              Text(
                _currentUrl!,
                style: const TextStyle(
                    fontSize: 12, fontWeight: FontWeight.normal),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
          ],
        ),
        backgroundColor: Colors.blue[900],
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _canGoBack ? _goBack : null,
          tooltip: 'Back',
        ),
        actions: [
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
                            const SizedBox(height: 8),
                            Text(
                              'URL: $_currentUrl',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Colors.grey,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 24),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
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
                                const SizedBox(width: 12),
                                OutlinedButton.icon(
                                  onPressed: () {
                                    _showUrlDialog(context);
                                  },
                                  icon: const Icon(Icons.settings),
                                  label: const Text('Ubah URL'),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 20,
                                      vertical: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 16.0),
                              child: Text(
                                'Tips: Pastikan server berjalan dan dapat diakses dari device/emulator ini.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showUrlDialog(BuildContext context) {
    final TextEditingController urlController = TextEditingController(
      text: _currentUrl ?? 'http://192.168.0.13:3000',
    );

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Ubah URL'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Masukkan URL server yang ingin diakses:',
                style: TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: urlController,
                decoration: const InputDecoration(
                  labelText: 'URL',
                  hintText: 'http://192.168.0.13:3000',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.url,
              ),
              const SizedBox(height: 8),
              const Text(
                'Contoh:\n'
                '• Emulator: http://10.0.2.2:3000\n'
                '• Device: http://192.168.x.x:3000',
                style: TextStyle(fontSize: 11, color: Colors.grey),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Batal'),
            ),
            ElevatedButton(
              onPressed: () {
                final newUrl = urlController.text.trim();
                if (newUrl.isNotEmpty) {
                  setState(() {
                    _currentUrl = newUrl;
                    _isLoading = true;
                    _errorMessage = null;
                  });
                  _controller.loadRequest(Uri.parse(newUrl));
                  Navigator.of(context).pop();
                }
              },
              child: const Text('Muat'),
            ),
          ],
        );
      },
    );
  }
}
