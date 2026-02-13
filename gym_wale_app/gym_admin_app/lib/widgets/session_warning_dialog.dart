import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/app_localizations.dart';
import '../providers/auth_provider.dart';
import '../services/auth_service.dart';

/// Global session warning dialog
class SessionWarningDialog {
  static bool _isShowing = false;

  static void show(BuildContext context) {
    if (_isShowing) return; // Prevent multiple dialogs
    
    _isShowing = true;
    final l10n = AppLocalizations.of(context)!;
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final sessionTimer = authProvider.sessionTimer;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => PopScope(
        canPop: false, // Prevent dismissing with back button
        child: AlertDialog(
          title: Row(
            children: [
              Icon(
                Icons.warning_amber_rounded,
                color: Colors.orange,
              ),
              const SizedBox(width: 8),
              Expanded(child: Text(l10n.sessionWarningTitle)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.sessionWarningMessage(sessionTimer.humanReadableTime),
              ),
              const SizedBox(height: 16),
              Text(
                'Would you like to continue working? Your session will be automatically extended.',
                style: TextStyle(
                  fontSize: 13,
                  color: Theme.of(dialogContext).textTheme.bodySmall?.color,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () async {
                _isShowing = false;
                Navigator.of(dialogContext).pop();
                // Logout immediately
                await authProvider.logout();
                if (context.mounted) {
                  Navigator.of(context).pushReplacementNamed('/login');
                }
              },
              child: Text(l10n.logout),
            ),
            ElevatedButton.icon(
              onPressed: () async {
                _isShowing = false;
                Navigator.of(dialogContext).pop();
                
                // Try to refresh the token
                try {
                  final authService = AuthService();
                  await authService.refreshToken();
                  
                  // Reset the session timer
                  sessionTimer.resetTimer();
                  
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Session extended successfully'),
                        backgroundColor: Colors.green,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                } catch (e) {
                  // If refresh fails, logout
                  await authProvider.logout();
                  if (context.mounted) {
                    Navigator.of(context).pushReplacementNamed('/login');
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Session could not be extended. Please login again.'),
                        backgroundColor: Colors.red,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                }
              },
              icon: const Icon(Icons.refresh),
              label: Text(l10n.extendSession),
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(dialogContext).colorScheme.primary,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    ).then((_) => _isShowing = false);
  }
}
