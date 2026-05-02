import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/gym.dart';
import '../config/app_theme.dart';

class GymCardPriceSummary {
  final double basePrice;
  final double finalPrice;
  final int discountPercent;
  final String durationLabel;
  final String? tierName;

  const GymCardPriceSummary({
    required this.basePrice,
    required this.finalPrice,
    required this.discountPercent,
    required this.durationLabel,
    this.tierName,
  });

  bool get hasDiscount =>
      discountPercent > 0 && finalPrice > 0 && finalPrice < basePrice;
}

class GymCard extends StatelessWidget {
  final Gym gym;
  final VoidCallback onTap;
  final bool showActiveMemberBadge;
  final double? ratingOverride;
  final int? reviewCountOverride;
  final String? logoOverride;
  final GymCardPriceSummary? priceSummary;
  final bool isPriceLoading;
  final VoidCallback? onPriceTap;

  const GymCard({
    Key? key,
    required this.gym,
    required this.onTap,
    this.showActiveMemberBadge = false,
    this.ratingOverride,
    this.reviewCountOverride,
    this.logoOverride,
    this.priceSummary,
    this.isPriceLoading = false,
    this.onPriceTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final rating = ratingOverride ?? gym.rating;
    final reviewCount = reviewCountOverride ?? gym.reviewCount;
    final resolvedLogoUrl = (logoOverride != null && logoOverride!.isNotEmpty)
        ? logoOverride!
        : (gym.logoUrl ?? '');

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Gym Image
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(16),
                  ),
                  child: gym.images.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: gym.images.first,
                          height: 180,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          placeholder: (context, url) => Container(
                            height: 180,
                            color: AppTheme.backgroundColor,
                            child: const Center(
                              child: CircularProgressIndicator(),
                            ),
                          ),
                          errorWidget: (context, url, error) => Container(
                            height: 180,
                            color: AppTheme.backgroundColor,
                            child: const Icon(
                              Icons.fitness_center,
                              size: 48,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        )
                      : Container(
                          height: 180,
                          color: AppTheme.backgroundColor,
                          child: const Icon(
                            Icons.fitness_center,
                            size: 48,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                ),
                
                // Rating Badge
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.star,
                          size: 16,
                          color: Colors.amber,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          rating > 0 ? rating.toStringAsFixed(1) : '--',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                        if (reviewCount > 0) ...[
                          const SizedBox(width: 4),
                          Text(
                            '($reviewCount)',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 11,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                
                // Favorite Icon
                if (gym.isFavorite)
                  const Positioned(
                    top: 12,
                    left: 12,
                    child: Icon(
                      Icons.favorite,
                      color: AppTheme.accentColor,
                      size: 24,
                    ),
                  ),
              ],
            ),
            
            // Gym Details
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // Gym Logo
                      if (resolvedLogoUrl.isNotEmpty)
                        Container(
                          width: 40,
                          height: 40,
                          margin: const EdgeInsets.only(right: 12),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Theme.of(context).dividerColor, width: 2),
                            color: Theme.of(context).colorScheme.surface,
                          ),
                          child: ClipOval(
                            child: CachedNetworkImage(
                              imageUrl: resolvedLogoUrl,
                              fit: BoxFit.cover,
                              placeholder: (context, url) => const Center(
                                child: SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                              ),
                              errorWidget: (context, url, error) => const Icon(
                                Icons.fitness_center,
                                color: AppTheme.primaryColor,
                                size: 20,
                              ),
                            ),
                          ),
                        ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              gym.name,
                              style: Theme.of(context).textTheme.titleLarge,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (isPriceLoading || priceSummary != null) ...[
                              const SizedBox(height: 6),
                              GestureDetector(
                                onTap: onPriceTap,
                                child: Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryColor.withOpacity(0.08),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: AppTheme.primaryColor.withOpacity(0.2),
                                    ),
                                  ),
                                  child: isPriceLoading
                                      ? Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            SizedBox(
                                              width: 12,
                                              height: 12,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: AppTheme.primaryColor.withOpacity(0.8),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Text(
                                                'Fetching starting price...',
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  color: Theme.of(context).textTheme.bodySmall?.color,
                                                  fontWeight: FontWeight.w500,
                                                ),
                                              ),
                                            ),
                                          ],
                                        )
                                      : priceSummary != null
                                          ? Row(
                                              children: [
                                                Expanded(
                                                  child: Wrap(
                                                    crossAxisAlignment: WrapCrossAlignment.center,
                                                    spacing: 6,
                                                    runSpacing: 2,
                                                    children: [
                                                      Text(
                                                        'INR ${priceSummary!.finalPrice.toInt()}/month',
                                                        style: const TextStyle(
                                                          fontSize: 12,
                                                          fontWeight: FontWeight.w900,
                                                          color: Color.fromARGB(255, 226, 190, 44),
                                                        ),
                                                      ),
                                                      if (priceSummary!.hasDiscount)
                                                        Text(
                                                          'INR ${priceSummary!.basePrice.toInt()}',
                                                          style: TextStyle(
                                                            fontSize: 10,
                                                            color: Theme.of(context)
                                                                .textTheme
                                                                .bodySmall
                                                                ?.color,
                                                            decoration: TextDecoration.lineThrough,
                                                          ),
                                                        ),
                                                      if (priceSummary!.hasDiscount)
                                                        Container(
                                                          padding: const EdgeInsets.symmetric(
                                                              horizontal: 6, vertical: 2),
                                                          decoration: BoxDecoration(
                                                            color: Colors.green.withOpacity(0.16),
                                                            borderRadius: BorderRadius.circular(20),
                                                          ),
                                                          child: Text(
                                                            'SAVE ${priceSummary!.discountPercent}%',
                                                            style: TextStyle(
                                                              color: Colors.green.shade700,
                                                              fontSize: 10,
                                                              fontWeight: FontWeight.w800,
                                                            ),
                                                          ),
                                                        ),
                                                    ],
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                Text(
                                                  'View Plans',
                                                  style: const TextStyle(
                                                    fontSize: 11,
                                                    color: AppTheme.primaryColor,
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                                ),
                                              ],
                                            )
                                          : const SizedBox.shrink(),
                                ),
                              ),
                            ],
                            if (showActiveMemberBadge) ...[
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.green.shade600,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: const [
                                    Icon(
                                      Icons.check_circle,
                                      size: 14,
                                      color: Colors.white,
                                    ),
                                    SizedBox(width: 4),
                                    Text(
                                      'Active Member',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 8),
                  
                  Row(
                    children: [
                      Icon(
                        Icons.location_on_outlined,
                        size: 16,
                        color: AppTheme.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          gym.address,
                          style: Theme.of(context).textTheme.bodyMedium,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (gym.distance != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '${gym.distance!.toStringAsFixed(1)} km',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  
                  if (gym.amenities.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: gym.amenities.take(3).map((amenity) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            amenity,
                            style: TextStyle(
                              fontSize: 12,
                              color: Theme.of(context).textTheme.bodyMedium?.color,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                  
                  const SizedBox(height: 12),
                  
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.people_outline,
                            size: 16,
                            color: AppTheme.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '$reviewCount reviews',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                      Text(
                        'View Details →',
                        style: TextStyle(
                          color: AppTheme.primaryColor,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ],
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
