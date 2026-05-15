import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';

/// Saves [bytes] as a PNG file named [filename] to the device's
/// Downloads (Android) or Documents folder (iOS / macOS / Windows / Linux).
Future<String> downloadFile(Uint8List bytes, String filename) async {
  final Directory dir;
  if (Platform.isAndroid) {
    final dl = Directory('/storage/emulated/0/Download');
    dir = dl.existsSync()
        ? dl
        : (await getExternalStorageDirectory() ??
            await getApplicationDocumentsDirectory());
  } else if (Platform.isIOS || Platform.isMacOS) {
    dir = await getApplicationDocumentsDirectory();
  } else {
    dir = await getDownloadsDirectory() ??
        await getApplicationDocumentsDirectory();
  }
  final file = File('${dir.path}/$filename');
  await file.writeAsBytes(bytes, flush: true);
  return file.path;
}
