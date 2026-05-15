/// Platform-aware file download helper.
/// Web  → triggers browser Save As dialog.
/// IO   → saves to device Downloads / Documents folder.
export 'download_helper_web.dart' if (dart.library.io) 'download_helper_io.dart';
