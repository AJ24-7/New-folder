import 'package:flutter/material.dart';
import '../config/app_theme.dart';

class StatCard extends Widget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final double? trend;

  const StatCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    this.trend,
  });

  @override
  Element createElement() => _StatCardElement(this);
}

class _StatCardElement extends ComponentElement {
  _StatCardElement(StatCard super.widget);

  @override
  StatCard get widget => super.widget as StatCard;

  @override
  Widget build() {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Determine if this is a mobile layout based on available width
        final isMobile = constraints.maxWidth < 150;
        final cardPadding = isMobile ? 8.0 : 12.0;
        final iconSize = isMobile ? 16.0 : 18.0;
        final iconPadding = isMobile ? 6.0 : 8.0;
        final spacing = isMobile ? 3.0 : 6.0;
        
        // Responsive font sizes that prevent overflow
        final valueFontSize = isMobile 
            ? 18.0 
            : (constraints.maxWidth > 200 ? 22.0 : 20.0);
        final titleFontSize = isMobile ? 10.0 : 12.0;
        
        return Card(
          elevation: 2,
          child: Padding(
            padding: EdgeInsets.all(cardPadding),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: EdgeInsets.all(iconPadding),
                      decoration: BoxDecoration(
                        color: widget.color.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        widget.icon,
                        color: widget.color,
                        size: iconSize,
                      ),
                    ),
                    if (widget.trend != null)
                      Flexible(
                        child: Container(
                          padding: EdgeInsets.symmetric(
                            horizontal: isMobile ? 4 : 6,
                            vertical: isMobile ? 2 : 3,
                          ),
                          decoration: BoxDecoration(
                            color: widget.trend! >= 0
                                ? AppTheme.successColor.withOpacity(0.1)
                                : AppTheme.errorColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                widget.trend! >= 0
                                    ? Icons.trending_up
                                    : Icons.trending_down,
                                size: isMobile ? 11 : 12,
                                color: widget.trend! >= 0
                                    ? AppTheme.successColor
                                    : AppTheme.errorColor,
                              ),
                              SizedBox(width: isMobile ? 1 : 2),
                              Text(
                                '${widget.trend!.abs().toStringAsFixed(1)}%',
                                style: TextStyle(
                                  color: widget.trend! >= 0
                                      ? AppTheme.successColor
                                      : AppTheme.errorColor,
                                  fontWeight: FontWeight.w600,
                                  fontSize: isMobile ? 9 : 10,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
                SizedBox(height: spacing),
                Flexible(
                  child: Text(
                    widget.value,
                    style: TextStyle(
                      fontSize: valueFontSize,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(this).colorScheme.onSurface,
                      height: 1.1,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                SizedBox(height: isMobile ? 2 : 3),
                Text(
                  widget.title,
                  style: TextStyle(
                    fontSize: titleFontSize,
                    color: Theme.of(this).colorScheme.onSurface.withOpacity(0.6),
                    fontWeight: FontWeight.w500,
                    height: 1.2,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
