import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:flutter/widgets.dart';

/// Helper class to map FontAwesome icon names to IconData
class FontAwesomeIconMapper {
  static IconData getIcon(String iconName) {
    // Remove 'fa-' prefix if present
    final cleanName = iconName.startsWith('fa-') 
        ? iconName.substring(3) 
        : iconName;

    switch (cleanName) {
      case 'person-praying':
        return FontAwesomeIcons.personPraying;
      case 'music':
        return FontAwesomeIcons.music;
      case 'dumbbell':
        return FontAwesomeIcons.dumbbell;
      case 'weight-hanging':
        return FontAwesomeIcons.weightHanging;
      case 'heartbeat':
        return FontAwesomeIcons.heartPulse;
      case 'child':
        return FontAwesomeIcons.child;
      case 'bolt':
        return FontAwesomeIcons.bolt;
      case 'running':
        return FontAwesomeIcons.personRunning;
      case 'hand-fist':
        return FontAwesomeIcons.handFist;
      case 'bicycle':
        return FontAwesomeIcons.personBiking;
      case 'person-swimming':
        return FontAwesomeIcons.personSwimming;
      case 'hand-rock':
        return FontAwesomeIcons.handBackFist;
      case 'user-tie':
        return FontAwesomeIcons.userTie;
      case 'shoe-prints':
        return FontAwesomeIcons.shoePrints;
      case 'arrows-up-down':
        return FontAwesomeIcons.arrowsUpDown;
      default:
        return FontAwesomeIcons.dumbbell; // Default fallback
    }
  }
}
