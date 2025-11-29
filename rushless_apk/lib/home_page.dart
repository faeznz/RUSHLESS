// home_page.dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:webview_flutter/webview_flutter.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late Future<String> _webUrlFuture;
  late final WebViewController _controller;

  Future<String> _fetchWebUrl() async {
    final response = await http.get(
      Uri.parse(
          'https://rushless-mobile-config.faeznz.my.id/api/config/mobile'),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final url = data['link_web'] as String;
      if (url.isEmpty) throw Exception('URL kosong');
      return url;
    } else {
      throw Exception('Gagal mengambil konfigurasi (${response.statusCode})');
    }
  }

  @override
  void initState() {
    super.initState();
    _webUrlFuture = _fetchWebUrl();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Aplikasi Ujian'),
        backgroundColor: Colors.blue[900],
        actions: [
          FutureBuilder<String>(
            future: _webUrlFuture,
            builder: (context, snapshot) {
              if (snapshot.hasData) {
                return IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () {
                    _controller.reload();
                  },
                  tooltip: 'Muat Ulang Halaman',
                );
              } else {
                return const SizedBox(); // Sembunyikan tombol saat loading/error
              }
            },
          ),
        ],
      ),
      body: FutureBuilder<String>(
        future: _webUrlFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    'Gagal memuat halaman.\n${snapshot.error.toString()}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      setState(() {
                        _webUrlFuture = _fetchWebUrl();
                      });
                    },
                    child: const Text('Coba Lagi'),
                  ),
                ],
              ),
            );
          } else if (snapshot.hasData) {
            final url = snapshot.data!;

            _controller = WebViewController()
              ..setJavaScriptMode(JavaScriptMode.unrestricted)
              ..setBackgroundColor(Colors.white)
              ..enableZoom(false)
              ..loadRequest(Uri.parse(url));

            return WebViewWidget(controller: _controller);
          } else {
            return const Center(child: Text('Tidak ada URL.'));
          }
        },
      ),
    );
  }
}
