import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../config/app_theme.dart';

/// A standardized responsive topbar widget for all screens
/// Handles overflow gracefully and provides consistent UI across the app
class ResponsiveTopBar extends StatelessWidget {
  final GlobalKey<ScaffoldState> scaffoldKey;
  final String title;
  final IconData icon;
  final bool isDesktop;
  final List<Widget>? actions;
  final VoidCallback? onMenuPressed;

  const ResponsiveTopBar({
    super.key,
    required this.scaffoldKey,
    required this.title,
    required this.icon,
    required this.isDesktop,
    this.actions,
    this.onMenuPressed,
  });

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;
    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;

    return Container(
      padding: EdgeInsets.only(
        top: isDesktop ? 24 : (topPadding > 0 ? topPadding + 8 : 16),
        bottom: isDesktop ? 24 : 16,
        left: isDesktop ? 24 : 12,
        right: isDesktop ? 24 : 12,
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withValues(alpha: 0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Menu button for mobile/tablet
          if (!isDesktop)
            IconButton(
              icon: const FaIcon(FontAwesomeIcons.bars, size: 24),
              onPressed: onMenuPressed ?? () => scaffoldKey.currentState?.openDrawer(),
              padding: const EdgeInsets.all(8),
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
            ),
          
          // Title section - responsive
          Expanded(
            child: Row(
              children: [
                FaIcon(icon, color: AppTheme.primaryColor, size: isMobile ? 20 : 24),
                const SizedBox(width: 12),
                Flexible(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontSize: isMobile ? 18 : 24,
                      fontWeight: FontWeight.bold,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          
          // Actions section
          if (actions != null && actions!.isNotEmpty) ...[
            const SizedBox(width: 8),
            // Show actions based on screen size
            if (isDesktop)
              // Desktop: Show all actions
              ...actions!
            else if (!isMobile && actions!.length <= 2)
              // Tablet: Show up to 2 actions as buttons
              ...actions!
            else
              // Mobile/Tablet with many actions: Show as menu
              PopupMenuButton<int>(
                icon: const Icon(Icons.more_vert),
                tooltip: 'More actions',
                onSelected: (index) {
                  // Trigger the action based on index
                  if (index < actions!.length) {
                    // Find the button and simulate tap
                    // Note: This requires actions to be wrapped in a specific way
                  }
                },
                itemBuilder: (context) => List.generate(
                  actions!.length,
                  (index) => PopupMenuItem<int>(
                    value: index,
                    child: _extractActionInfo(actions![index]),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _extractActionInfo(Widget action) {
    // Extract text and icon from button widgets
    if (action is ElevatedButton) {
      return Row(
        children: [
          if (action.child is Row) ...[
            ...((action.child as Row).children),
          ] else ...[
            action.child ?? const SizedBox(),
          ],
        ],
      );
    } else if (action is OutlinedButton) {
      return Row(
        children: [
          if (action.child is Row) ...[
            ...((action.child as Row).children),
          ] else ...[
            action.child ?? const SizedBox(),
          ],
        ],
      );
    }
    return action;
  }
}

/// Action button item for ResponsiveTopBar
class TopBarAction {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final Color? color;
  final bool isPrimary;

  const TopBarAction({
    required this.label,
    required this.icon,
    required this.onTap,
    this.color,
    this.isPrimary = true,
  });

  Widget build(BuildContext context, {required bool isCompact}) {
    if (isPrimary) {
      return ElevatedButton.icon(
        onPressed: onTap,
        icon: FaIcon(icon, size: 16),
        label: isCompact ? const SizedBox() : Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          padding: isCompact 
              ? const EdgeInsets.all(12)
              : const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          minimumSize: isCompact ? const Size(48, 48) : null,
        ),
      );
    } else {
      return OutlinedButton.icon(
        onPressed: onTap,
        icon: FaIcon(icon, size: 16),
        label: isCompact ? const SizedBox() : Text(label),
        style: OutlinedButton.styleFrom(
          foregroundColor: color ?? AppTheme.errorColor,
          padding: isCompact 
              ? const EdgeInsets.all(12)
              : const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          minimumSize: isCompact ? const Size(48, 48) : null,
        ),
      );
    }
  }
}

/// Responsive actions row that handles overflow gracefully
class ResponsiveActionsRow extends StatelessWidget {
  final List<TopBarAction> actions;
  final bool isDesktop;

  const ResponsiveActionsRow({
    super.key,
    required this.actions,
    required this.isDesktop,
  });

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isMobile = size.width <= 600;
    final isTablet = size.width > 600 && size.width <= 900;

    if (isDesktop) {
      // Desktop: Show all actions with full labels
      return Row(
        children: actions.map((action) {
          return Padding(
            padding: const EdgeInsets.only(left: 12),
            child: action.build(context, isCompact: false),
          );
        }).toList(),
      );
    } else if (isTablet && actions.length <= 2) {
      // Tablet with few actions: Show compact buttons
      return Row(
        children: actions.map((action) {
          return Padding(
            padding: const EdgeInsets.only(left: 8),
            child: action.build(context, isCompact: true),
          );
        }).toList(),
      );
    } else {
      // Mobile or many actions: Show as menu
      return PopupMenuButton<int>(
        icon: const Icon(Icons.more_vert),
        tooltip: 'More actions',
        onSelected: (index) {
          if (index >= 0 && index < actions.length) {
            actions[index].onTap();
          }
        },
        itemBuilder: (context) => actions.asMap().entries.map((entry) {
          return PopupMenuItem<int>(
            value: entry.key,
            child: Row(
              children: [
                FaIcon(entry.value.icon, size: 18, color: entry.value.color),
                const SizedBox(width: 12),
                Text(entry.value.label),
              ],
            ),
          );
        }).toList(),
      );
    }
  }
}
